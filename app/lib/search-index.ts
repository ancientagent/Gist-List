import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

const FACET_CATEGORY_WEIGHTS: Record<string, number> = {
  Authentication: 1,
  Provenance: 0.9,
  Rarity: 0.85,
  Completeness: 0.8,
  Condition: 0.75,
};

const CONDITION_BASELINES: Record<string, number> = {
  new: 0.9,
  'like new': 0.85,
  'very good': 0.75,
  good: 0.65,
  fair: 0.55,
  poor: 0.45,
  'for parts': 0.25,
  'for parts / not working': 0.25,
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, value));

type FacetRecord = {
  name: string;
  category?: string;
  status?: string;
  confidence?: number;
  source?: string;
};

const normalizeFacetArray = (
  facets: Prisma.JsonValue | null | undefined,
): FacetRecord[] => {
  if (!facets || typeof facets !== 'object') {
    return [];
  }

  if (Array.isArray(facets)) {
    return facets
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }
        const record = entry as Record<string, unknown>;
        const name =
          typeof record.name === 'string' && record.name.trim()
            ? record.name.trim()
            : null;
        if (!name) return null;
        const category =
          typeof record.category === 'string' && record.category.trim()
            ? record.category.trim()
            : undefined;
        const status =
          typeof record.status === 'string' && record.status.trim()
            ? record.status.trim()
            : undefined;
        const confidence =
          typeof record.confidence === 'number'
            ? record.confidence
            : typeof record.confidence === 'string'
              ? Number(record.confidence)
              : undefined;
        const source =
          typeof record.source === 'string' && record.source.trim()
            ? record.source.trim()
            : undefined;
        return {
          name,
          category,
          status,
          confidence: Number.isFinite(confidence) ? Number(confidence) : undefined,
          source,
        } as FacetRecord;
      })
      .filter((value): value is FacetRecord => Boolean(value));
  }

  return [];
};

const getFacetWeight = (category?: string): number => {
  if (!category) return 0.7;
  const normalized = category.trim();
  return FACET_CATEGORY_WEIGHTS[normalized] ?? 0.7;
};

const getStatusMultiplier = (status?: string): number => {
  if (!status) return 0.6;
  const normalized = status.toLowerCase();
  if (normalized === 'present' || normalized === 'verified') {
    return 1;
  }
  if (normalized === 'partial' || normalized === 'user') {
    return 0.6;
  }
  if (normalized === 'missing') {
    return 0;
  }
  return 0.6;
};

const computeFacetGrade = (facet: FacetRecord): number => {
  const confidence = clamp(
    typeof facet.confidence === 'number' && Number.isFinite(facet.confidence)
      ? facet.confidence
      : 0.6,
  );
  const multiplier = getStatusMultiplier(facet.status);
  const weight = getFacetWeight(facet.category);
  return clamp(confidence * multiplier * weight);
};

const computeConditionScore = (
  condition: string | null | undefined,
  verifiedScore: Prisma.JsonValue | null | undefined,
): number => {
  if (verifiedScore && typeof verifiedScore === 'object') {
    const record = verifiedScore as Record<string, unknown>;
    const avg = record.avg ?? record.average ?? record.score;
    const numeric =
      typeof avg === 'number'
        ? avg
        : typeof avg === 'string'
          ? Number(avg)
          : null;
    if (numeric !== null && Number.isFinite(numeric)) {
      return clamp(Number(numeric));
    }
  }

  if (!condition) {
    return 0.45;
  }
  const normalized = condition.toLowerCase();
  const score = CONDITION_BASELINES[normalized];
  if (typeof score === 'number') {
    return clamp(score);
  }
  const fallbackKey = Object.keys(CONDITION_BASELINES).find((key) =>
    normalized.includes(key),
  );
  if (fallbackKey) {
    return clamp(CONDITION_BASELINES[fallbackKey]);
  }
  return 0.45;
};

const extractGradeMeta = (
  facets: FacetRecord[],
): { system?: string; value?: string; score?: number } | null => {
  const gradingFacet = facets.find((facet) => {
    const name = facet.name.toLowerCase();
    return name.includes('grade') || name.includes('graded');
  });
  if (!gradingFacet) {
    return null;
  }

  const numeric = computeFacetGrade(gradingFacet);
  return {
    system: gradingFacet.category,
    value: gradingFacet.name,
    score: numeric,
  };
};

const normalizeCategory = (
  rawCategory: string | null | undefined,
): { category: string; subcategory: string | null } => {
  const fallback = { category: 'uncategorized', subcategory: null as string | null };
  if (!rawCategory) return fallback;
  const trimmed = rawCategory.trim();
  if (!trimmed) return fallback;
  if (trimmed.includes('>')) {
    const parts = trimmed.split('>').map((part) => part.trim()).filter(Boolean);
    if (parts.length === 0) return fallback;
    return {
      category: parts[0],
      subcategory: parts.slice(1).join(' > ') || null,
    };
  }
  if (trimmed.includes('::')) {
    const [head, ...rest] = trimmed.split('::').map((part) => part.trim());
    return {
      category: head || fallback.category,
      subcategory: rest.join(' :: ') || null,
    };
  }
  return { category: trimmed, subcategory: null };
};

const buildSearchableText = (parts: Array<string | null | undefined>): string => {
  const normalized = parts
    .flatMap((part) => (part ? String(part).split(/\s+/) : []))
    .map((token) => token.replace(/[^a-z0-9]/gi, '').toLowerCase())
    .filter(Boolean);

  if (normalized.length === 0) {
    return 'listing';
  }

  return normalized.join(' ');
};

export const reindexListing = async (listingId: string): Promise<void> => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        title: true,
        description: true,
        theGist: true,
        condition: true,
        conditionNotes: true,
        category: true,
        tags: true,
        searchTags: true,
        brand: true,
        model: true,
        color: true,
        size: true,
        material: true,
        location: true,
        price: true,
        priceRangeLow: true,
        priceRangeHigh: true,
        priceRangeMid: true,
        priceForParts: true,
        facets: true,
        highlightedFacets: true,
        verifiedCondition: true,
        verifiedConditionScore: true,
        specialClass: true,
        isPremiumItem: true,
        updatedAt: true,
      },
    });

    if (!listing) {
      await prisma.searchIndex
        .delete({
          where: { listingId },
        })
        .catch(() => undefined);
      return;
    }

    const { category, subcategory } = normalizeCategory(listing.category);
    const title = listing.title?.trim() || 'Untitled Listing';

    const facets = normalizeFacetArray(listing.facets);

    const facetGrades: Record<string, number> = {};
    for (const facet of facets) {
      const grade = computeFacetGrade(facet);
      if (grade > 0) {
        facetGrades[facet.name] = Number(grade.toFixed(3));
      }
    }

    const highlighted =
      Array.isArray(listing.highlightedFacets) && listing.highlightedFacets.length > 0
        ? listing.highlightedFacets.filter((facet) => facetGrades[facet] !== undefined)
        : facets.map((facet) => facet.name);

    const selectedFacetGrades =
      highlighted.length > 0
        ? highlighted.map((name) => facetGrades[name] ?? 0)
        : Object.values(facetGrades);

    const averageFacetGrade =
      selectedFacetGrades.length > 0
        ? selectedFacetGrades.reduce((sum, value) => sum + value, 0) /
          selectedFacetGrades.length
        : 0;

    const conditionBaseline = computeConditionScore(
      listing.verifiedCondition ?? listing.condition ?? null,
      listing.verifiedConditionScore,
    );

    let gradeScore = averageFacetGrade > 0 ? averageFacetGrade : conditionBaseline;
    gradeScore = clamp(0.5 * gradeScore + 0.5 * conditionBaseline);

    const gradeMeta = extractGradeMeta(facets);

    const searchableText = buildSearchableText([
      listing.title,
      listing.theGist,
      listing.description,
      listing.conditionNotes,
      listing.brand,
      listing.model,
      listing.color,
      listing.material,
      listing.size,
      ...(listing.tags ?? []),
      ...(listing.searchTags ?? []),
      ...facets.map((facet) => `${facet.category ?? ''} ${facet.name}`),
    ]);

    const priceCandidates = [
      listing.price,
      listing.priceRangeLow,
      listing.priceRangeMid,
      listing.priceRangeHigh,
      listing.priceForParts,
    ].filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

    const priceMin =
      priceCandidates.length > 0 ? Math.min(...priceCandidates) : listing.price ?? null;
    const priceMax =
      priceCandidates.length > 0 ? Math.max(...priceCandidates) : listing.price ?? null;

    const gradeSignals: Prisma.InputJsonObject = {
      facetGrades,
      highlightedFacets: highlighted,
      verifiedFacetCount: facets.length,
      conditionBaseline,
      gradeMeta,
      isPremium: listing.isPremiumItem,
      specialClass: listing.specialClass,
    };

    await prisma.searchIndex.upsert({
      where: { listingId },
      create: {
        listingId,
        title,
        searchableText,
        category,
        subcategory,
        condition: listing.verifiedCondition ?? listing.condition ?? 'Unknown',
        priceMin: priceMin ?? undefined,
        priceMax: priceMax ?? undefined,
        location: listing.location ?? undefined,
        geoHash: null,
        facets,
        highlightedFacets: highlighted,
        gradeSignals,
        gradeScore,
        popularityScore: 0,
        relevanceScore: 0,
      },
      update: {
        title,
        searchableText,
        category,
        subcategory,
        condition: listing.verifiedCondition ?? listing.condition ?? 'Unknown',
        priceMin: priceMin ?? undefined,
        priceMax: priceMax ?? undefined,
        location: listing.location ?? undefined,
        geoHash: null,
        facets,
        highlightedFacets: highlighted,
        gradeSignals,
        gradeScore,
        popularityScore: 0,
        relevanceScore: 0,
        lastIndexedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Search index update failed:', error);
  }
};

export const reindexAllListings = async (): Promise<void> => {
  try {
    const listings = await prisma.listing.findMany({
      select: { id: true },
    });

    for (const { id } of listings) {
      await reindexListing(id);
    }
  } catch (error) {
    console.error('Search index backfill failed:', error);
  }
};
