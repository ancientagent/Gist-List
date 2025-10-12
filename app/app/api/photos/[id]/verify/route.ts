import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logTelemetryEvent } from '@/lib/telemetry';
import { reindexListing } from '@/lib/search-index';
import { Prisma } from '@prisma/client';
import { downloadFileBuffer } from '@/lib/s3';
import { appendConditionLine, evaluatePhotoQuality, generatePhotoAnalysis } from '../../utils';
type PhotoWithListing = Prisma.PhotoGetPayload<{
  include: {
    listing: {
      select: {
        id: true;
        userId: true;
        conditionNotes: true;
        facets: true;
        priceUplifts: true;
        specialClass: true;
        category: true;
        usePremium: true;
        condition: true;
        price: true;
      };
    };
  };
}>;

type ListingUpdateWithPremium = Prisma.ListingUpdateInput & {
  isPremiumItem?: boolean | Prisma.BoolFieldUpdateOperationsInput;
};

const determineConditionLabel = (avg: number) => {
  if (avg >= 0.95) return 'New';
  if (avg >= 0.88) return 'Like New';
  if (avg >= 0.80) return 'Very Good';
  if (avg >= 0.70) return 'Good';
  if (avg >= 0.55) return 'Fair';
  if (avg >= 0.40) return 'Poor';
  return 'Parts';
};

const aggregateScores = (entries: { analysisData: Prisma.JsonValue | null }[]) => {
  let count = 0;
  const totals = { surface: 0, function: 0, clean: 0, complete: 0 };

  for (const entry of entries) {
    const data = entry.analysisData as any;
    const scores = data?.scores;
    if (!scores) continue;

    totals.surface += Number(scores.surface ?? 0);
    totals.function += Number(scores.function ?? 0);
    totals.clean += Number(scores.clean ?? 0);
    totals.complete += Number(scores.complete ?? 0);
    count += 1;
  }

  if (count === 0) {
    return null;
  }

  const averages = {
    surface: totals.surface / count,
    function: totals.function / count,
    clean: totals.clean / count,
    complete: totals.complete / count,
  };

  const avg = (averages.surface + averages.function + averages.clean + averages.complete) / 4;

  return {
    scores: {
      surface: Number(averages.surface.toFixed(3)),
      function: Number(averages.function.toFixed(3)),
      clean: Number(averages.clean.toFixed(3)),
      complete: Number(averages.complete.toFixed(3)),
      avg: Number(avg.toFixed(3)),
    },
    condition: determineConditionLabel(avg),
  };
};

const FACET_KEYWORDS: Array<{ category: string; patterns: RegExp[] }> = [
  { category: 'Authentication', patterns: [/serial/i, /hallmark/i, /stamp/i, /hologram/i, /signature/i, /certificate/i, /auth/i] },
  { category: 'Condition', patterns: [/scratch/i, /crack/i, /patina/i, /surface/i, /wear/i, /damage/i] },
  { category: 'Rarity', patterns: [/limited/i, /variant/i, /prototype/i, /rare/i, /first run/i] },
  { category: 'Provenance', patterns: [/box/i, /packaging/i, /receipt/i, /paperwork/i, /manual/i, /documentation/i, /history/i] },
  { category: 'Completeness', patterns: [/complete/i, /accessories/i, /includes/i, /components/i, /set/i] },
];

const determineFacetCategory = (facetTag?: string | null, requirement?: string | null, summary?: string | null) => {
  const haystack = [facetTag, requirement, summary]
    .filter(Boolean)
    .map((value) => value!.toLowerCase())
    .join(' ');

  for (const { category, patterns } of FACET_KEYWORDS) {
    if (patterns.some((pattern) => pattern.test(haystack))) {
      return category;
    }
  }

  return 'Condition';
};

const sanitizeFacetName = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|\s)[a-z]/g, (match) => match.toUpperCase());

const guessSpecialClass = (
  current: string | null | undefined,
  listingCategory?: string | null,
  facetCategories: string[] = []
) => {
  if (current) return current;
  const cat = (listingCategory ?? '').toLowerCase();
  const categories = facetCategories.map((c) => c.toLowerCase());

  if (cat.includes('watch') || cat.includes('handbag') || cat.includes('jewelry') || cat.includes('luxury')) {
    return 'luxury';
  }
  if (cat.includes('art') || categories.includes('provenance')) {
    return 'art';
  }
  if (cat.includes('antique') || cat.includes('historic') || categories.includes('provenance')) {
    return 'historic';
  }
  if (cat.includes('collect') || cat.includes('vintage') || categories.includes('rarity') || categories.includes('authentication')) {
    return 'collectible';
  }

  return null;
};

const FACET_WEIGHTS: Record<string, number> = {
  Authentication: 0.12,
  Condition: 0.06,
  Rarity: 0.12,
  Provenance: 0.08,
  Completeness: 0.05,
};

const clampPercentage = (value: number) => Math.max(0, Math.min(1, value));

const computeFacetUplifts = (facets: Array<{ category?: string; confidence?: number }>, specialClass: string | null) => {
  const categoryBoosts: Record<string, number> = {};

  for (const facet of facets) {
    if (!facet || facet.category == null) continue;
    const base = FACET_WEIGHTS[facet.category] ?? 0.05;
    const confidence = clampPercentage(typeof facet.confidence === 'number' ? facet.confidence : 0.8);
    const uplift = base * (0.6 + 0.4 * confidence);
    categoryBoosts[facet.category] = Math.max(categoryBoosts[facet.category] ?? 0, uplift);
  }

  const facetsTotal = Object.values(categoryBoosts).reduce((sum, val) => sum + val, 0);
  let special = specialClass ? 0.05 : 0;
  let total = facetsTotal + special;

  if (total > 0.2) {
    const scale = 0.2 / total;
    total = 0.2;
    special *= scale;
    Object.keys(categoryBoosts).forEach((key) => {
      categoryBoosts[key] = categoryBoosts[key] * scale;
    });
  }

  return {
    total,
    special,
    facets: categoryBoosts,
  };
};

const buildFacetSummary = (
  photos: Array<{ facetTag: string | null; requirement: string | null; analysisData: Prisma.JsonValue | null }>,
  listingCategory?: string | null,
  currentSpecialClass?: string | null
) => {
  const facetMap = new Map<
    string,
    { name: string; category: string; status: string; confidence: number; source: string }
  >();

  for (const photo of photos) {
    const data = photo.analysisData as any;
    const scores = data?.scores;
    const avgScore = clampPercentage(typeof scores?.avg === 'number' ? scores.avg : 0.8);
    const summary = typeof data?.summary === 'string' ? data.summary : null;
    const requirementLabel = photo.requirement ? sanitizeFacetName(photo.requirement) : null;
    const rawName = photo.facetTag || requirementLabel || summary || 'Verified facet';
    const name = sanitizeFacetName(rawName);
    const category = determineFacetCategory(photo.facetTag, requirementLabel, summary);

    const key = `${category}::${name}`;
    const candidate = {
      name,
      category,
      status: 'present',
      confidence: Number(avgScore.toFixed(3)),
      source: 'photo',
    } as const;

    const existing = facetMap.get(key);
    if (!existing || existing.confidence < candidate.confidence) {
      facetMap.set(key, { ...candidate });
    }
  }

  const facets = Array.from(facetMap.values());
  const categories = facets.map((facet) => facet.category);
  const specialClass = guessSpecialClass(currentSpecialClass, listingCategory, categories);
  const uplifts = computeFacetUplifts(facets, specialClass);

  return {
    facets,
    specialClass,
    priceUplifts: uplifts,
    isPremiumItem: Boolean(specialClass) || facets.length > 0,
  };
};

export const dynamic = 'force-dynamic';

type VerifyStatus = 'accepted' | 'rejected';

interface VerifyBody {
  status: VerifyStatus;
  reason?: string | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const photoId = params.id;
    const body = (await request.json()) as VerifyBody;

    if (!body?.status) {
      return NextResponse.json({ error: 'Missing status' }, { status: 400 });
    }

    const photo = (await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        listing: {
          select: {
            id: true,
            userId: true,
            conditionNotes: true,
            facets: true,
            priceUplifts: true,
            specialClass: true,
            category: true,
            usePremium: true,
            condition: true,
            price: true,
          },
        },
      },
    })) as PhotoWithListing | null;

    if (!photo || !photo.listing) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    if (photo.listing.userId !== (session.user as any).id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (body.status === 'rejected') {
      const rejectionReason = body.reason ?? 'Photo rejected by seller';

      await prisma.photo.update({
        where: { id: photo.id },
        data: {
          status: 'rejected',
          verificationReason: rejectionReason,
        },
      });

      await logTelemetryEvent({
        userId: photo.listing.userId,
        listingId: photo.listing.id,
        eventType: 'photo_verified',
        metadata: {
          status: 'rejected_by_user',
          photoId: photo.id,
          reason: rejectionReason,
        },
      });

      return NextResponse.json({
        status: 'rejected',
        reason: rejectionReason,
      });
    }

    const buffer = await downloadFileBuffer(photo.cloudStoragePath);
    const quality = await evaluatePhotoQuality(buffer);

    if (!quality.passed) {
      await prisma.photo.update({
        where: { id: photo.id },
        data: {
          status: 'rejected',
          verificationReason: quality.reasons.join(' '),
        },
      });

      await logTelemetryEvent({
        userId: photo.listing.userId,
        listingId: photo.listing.id,
        eventType: 'photo_verified',
        metadata: {
          status: 'rejected_quality',
          photoId: photo.id,
          reasons: quality.reasons,
          metrics: quality.metrics,
        },
      });

      return NextResponse.json(
        {
          status: 'rejected',
          reasons: quality.reasons,
          metrics: quality.metrics,
        },
        { status: 422 }
      );
    }

    const analysis = await generatePhotoAnalysis(buffer, photo.requirement, photo.facetTag);
    const requirementLabel = photo.requirement ? sanitizeFacetName(photo.requirement) : null;
    const facetCategory = determineFacetCategory(photo.facetTag, requirementLabel, analysis.summary);
    const analysisJson: Prisma.JsonObject = {
      summary: analysis.summary,
      conditionNotes: analysis.conditionNotes ?? null,
      facetTag: analysis.facetTag ?? null,
      requirement: analysis.requirement ?? null,
      category: facetCategory,
      scores: analysis.scores,
    };

    let updatedNotes = appendConditionLine(photo.listing.conditionNotes ?? '', `Photo verified: ${analysis.summary}.`);
    if (analysis.conditionNotes) {
      updatedNotes = appendConditionLine(updatedNotes, analysis.conditionNotes);
    }

    await prisma.photo.update({
      where: { id: photo.id },
      data: {
        status: 'accepted',
        verificationReason: 'Quality verified',
        analysisData: analysisJson,
        verifiedAt: new Date(),
      },
    });

    await logTelemetryEvent({
      userId: photo.listing.userId,
      listingId: photo.listing.id,
      eventType: 'photo_verified',
      metadata: {
        status: 'accepted',
        photoId: photo.id,
        requirement: photo.requirement ?? null,
        facetTag: photo.facetTag ?? null,
        metrics: quality.metrics,
      },
    });

    const acceptedPhotos = await prisma.photo.findMany({
      where: {
        listingId: photo.listing.id,
        status: 'accepted',
      },
      select: {
        facetTag: true,
        requirement: true,
        analysisData: true,
      },
    });

    const aggregated = aggregateScores(acceptedPhotos);

    const facetSummary = buildFacetSummary(
      acceptedPhotos,
      photo.listing.category ?? null,
      photo.listing.specialClass ?? null
    );

    if (aggregated) {
      await logTelemetryEvent({
        userId: photo.listing.userId,
        listingId: photo.listing.id,
        eventType: 'condition_verified',
        metadata: {
          photoId: photo.id,
          condition: aggregated.condition,
          scores: aggregated.scores,
        },
      });
    }

    if (facetSummary.facets.length > 0 || facetSummary.priceUplifts.total > 0) {
      await logTelemetryEvent({
        userId: photo.listing.userId,
        listingId: photo.listing.id,
        eventType: 'facet_value_computed',
        metadata: {
          photoId: photo.id,
          facets: facetSummary.facets,
          priceUplifts: facetSummary.priceUplifts,
          specialClass: facetSummary.specialClass,
        },
      });
    }

    const listingUpdate: ListingUpdateWithPremium = {
      conditionNotes: updatedNotes,
    };

    if (aggregated) {
      listingUpdate.verifiedConditionScore = aggregated.scores as unknown as Prisma.JsonObject;
      listingUpdate.verifiedCondition = aggregated.condition;
    } else {
      listingUpdate.verifiedConditionScore = Prisma.JsonNull;
      listingUpdate.verifiedCondition = null;
    }

    if (facetSummary.facets.length > 0) {
      listingUpdate.facets = facetSummary.facets as unknown as Prisma.JsonArray;
    } else {
      listingUpdate.facets = Prisma.JsonNull;
    }

    const inferredCondition = (() => {
      if (listingUpdate.verifiedCondition) {
        return String(listingUpdate.verifiedCondition).toLowerCase();
      }
      return (photo.listing.condition ?? '').toLowerCase();
    })();

    const isPartsCondition = inferredCondition.includes('part');

    if (facetSummary.priceUplifts.total > 0 && !isPartsCondition) {
      listingUpdate.priceUplifts = {
        total: Number(facetSummary.priceUplifts.total.toFixed(4)),
        special: Number(facetSummary.priceUplifts.special.toFixed(4)),
        facets: Object.fromEntries(
          Object.entries(facetSummary.priceUplifts.facets).map(([key, val]) => [key, Number(val.toFixed(4))])
        ),
      } as Prisma.JsonObject;

      await logTelemetryEvent({
        userId: photo.listing.userId,
        listingId: photo.listing.id,
        eventType: 'price_updated',
        metadata: {
          photoId: photo.id,
          upliftTotal: facetSummary.priceUplifts.total,
          specialPercent: facetSummary.priceUplifts.special,
          facets: facetSummary.priceUplifts.facets,
          currentPrice: photo.listing.price,
        },
      });
    } else {
      listingUpdate.priceUplifts = Prisma.JsonNull;
    }

    listingUpdate.specialClass = isPartsCondition ? null : facetSummary.specialClass;
    listingUpdate.isPremiumItem = { set: !isPartsCondition && facetSummary.isPremiumItem };

    await prisma.listing.update({
      where: { id: photo.listing.id },
      data: listingUpdate,
    });

    await reindexListing(photo.listing.id);

    if (photo.notificationId) {
      await prisma.aINotification.updateMany({
        where: {
          id: photo.notificationId,
          listingId: photo.listing.id,
        },
        data: {
          resolved: true,
        },
      });
    }

    await prisma.aINotification.create({
      data: {
        listingId: photo.listing.id,
        type: 'INSIGHT',
        message: `Photo verified: ${analysis.summary}`,
        field: 'photos',
        actionType: 'photo_verified',
        actionData: JSON.stringify({
          photoId: photo.id,
          requirement: photo.requirement,
          facetTag: photo.facetTag,
          metrics: quality.metrics,
          scores: analysis.scores,
        }),
      },
    });

    return NextResponse.json({
      status: 'accepted',
      analysis,
      metrics: quality.metrics,
    });
  } catch (error: any) {
    console.error('Photo verify error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to verify photo' },
      { status: 500 }
    );
  }
}
