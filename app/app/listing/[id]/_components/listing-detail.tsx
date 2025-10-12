
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Loader2,
  Check,
  Truck,
  MapPin,
  ChevronDown,
  ChevronUp,
  Crown,
  Gem,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import PhotoGallery from './photo-gallery';
import PlatformPreview from './platform-preview';
import InsightsSection from './insights-section';
import NotificationList, { type Notification as NotificationPayload, type QuickFactsPayload } from './notification-list';
import AlternativeItemsSelector from './alternative-items-selector';
import PremiumPacksSection from './premium-packs-section';
import ChipsRow from '@/src/components/ChipsRow';
import QuickFactsPanel from '@/src/components/QuickFactsPanel';
import {
  applyPremiumUplift,
  computeDelta,
  computePriceBands,
  ensureUniqueLine,
  getSuggestedPrice,
  PriceBands,
  PriceUpliftsBreakdown,
  roundToCents,
} from '@/src/lib/priceLogic';
import { GisterNotification } from '@/src/notifications/types';

const CONDITION_OPTIONS = [
  'New',
  'Like New',
  'Very Good',
  'Good',
  'Fair',
  'Poor',
  'For Parts'
];

type ListingFacet = {
  name: string;
  category: string;
  status: string;
  confidence: number;
  source?: string;
};

const MARKET_CONDITION_MULTIPLIERS: Record<string, number> = {
  New: 1,
  'Like New': 0.9,
  'Very Good': 0.75,
  Good: 0.65,
  Fair: 0.5,
  Poor: 0.375,
  'For Parts': 0.2,
  'For parts / not working': 0.2,
  'For Parts / Not Working': 0.2,
};

const clampConfidence = (value: unknown) => {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;
  if (!Number.isFinite(numeric)) return 0.8;
  return Math.max(0, Math.min(1, numeric));
};

const clampUpliftValue = (value: unknown) => {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(0.2, Math.max(0, numeric));
};

const toTitleCase = (value: string | null | undefined) => {
  if (!value) return null;
  return value
    .split(/[_\s\-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const normalizeFacets = (raw: unknown): ListingFacet[] => {
  if (!raw) return [];
  let data = raw;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(data)) return [];

  return data
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const name = typeof record.name === 'string' && record.name.trim()
        ? record.name.trim()
        : undefined;
      const category = typeof record.category === 'string' && record.category.trim()
        ? record.category.trim()
        : undefined;
      const status = typeof record.status === 'string' && record.status.trim()
        ? record.status.trim()
        : 'present';
      const confidence = clampConfidence(record.confidence);
      const source = typeof record.source === 'string' && record.source.trim()
        ? record.source.trim()
        : undefined;

      return {
        name: name ?? (category ? `${category} facet` : 'Verified facet'),
        category: category ?? 'Facet',
        status,
        confidence,
        source,
      } as ListingFacet;
    })
    .filter((entry): entry is ListingFacet => Boolean(entry));
};

const normalizePriceUplifts = (raw: unknown): PriceUpliftsBreakdown | null => {
  if (!raw) return null;
  let data = raw;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }

  if (!data || typeof data !== 'object') return null;

  const record = data as Record<string, unknown>;
  const total = clampUpliftValue(record.total);
  const specialValue = clampUpliftValue(record.special);

  let facets: Record<string, number> | undefined;
  if (record.facets && typeof record.facets === 'object') {
    const mapped = Object.entries(record.facets as Record<string, unknown>).reduce<Record<string, number>>(
      (acc, [key, value]) => {
        const pct = clampUpliftValue(value);
        if (pct > 0) {
          acc[key] = pct;
        }
        return acc;
      },
      {}
    );
    facets = Object.keys(mapped).length > 0 ? mapped : undefined;
  }

  if (!total && !specialValue && !facets) {
    return null;
  }

  return {
    total,
    special: specialValue > 0 ? specialValue : undefined,
    facets,
  };
};
interface Listing {
  id: string;
  theGist: string | null;
  title: string | null;
  description: string | null;
  price: number | null;
  condition: string | null;
  conditionNotes: string | null;
  brand: string | null;
  model: string | null;
  year: string | null;
  color: string | null;
  material: string | null;
  size: string | null;
  specs: string | null;
  imageQualityIssue: string | null;
  itemIdentified: boolean;
  confidence: number | null;
  alternativeItems: string | null;
  category: string | null;
  tags: string[];
  searchTags: string[];
  brandNewPrice: number | null;
  priceRangeHigh: number | null;
  priceRangeMid: number | null;
  priceRangeLow: number | null;
  priceForParts: number | null;
  avgMarketPrice: number | null; // DEPRECATED
  suggestedPriceMin: number | null; // DEPRECATED
  suggestedPriceMax: number | null; // DEPRECATED
  marketInsights: string | null;
  premiumFacts: string | null;
  usefulLinks: string | null;
  usePremium: boolean;
  recommendedPlatforms: string[];
  qualifiedPlatforms: string[];
  fulfillmentType: string | null;
  willingToShip: boolean;
  okForLocals: boolean;
  weight: number | null;
  dimensions: string | null;
  shippingCostEst: number | null;
  location: string | null;
  meetupPreference: string | null;
  editedFields: string[];
  // Cost & Profit tracking
  purchasePrice: number | null;
  estimatedProfit: number | null;
  profitMargin: number | null;
  tokensUsed: number | null;
  storageBytes: number | null;
  apiCost: number | null;
  storageCost: number | null;
  photos: any[];
  notifications: any[];
  ladderStats?: PriceBands | null;
  user?: {
    subscriptionTier: string;
    premiumPostsUsed: number;
    premiumPostsTotal: number;
    conditionReportMode?: string;
  };
  verifiedCondition?: string | null;
  verifiedConditionScore?: {
    surface?: number;
    function?: number;
    clean?: number;
    complete?: number;
    avg?: number;
    [key: string]: unknown;
  } | null;
  specialClass?: string | null;
  facets?: unknown;
  priceUplifts?: unknown;
  isPremiumItem?: boolean | null;
}

export default function ListingDetail({ listingId }: { listingId: string }) {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [showQuickFacts, setShowQuickFacts] = useState(false);
  const [quickFactsSource, setQuickFactsSource] = useState<GisterNotification | null>(null);

  const userId = (session?.user as any)?.id ?? null;
  
  // Collapsible sections state
  const [sectionsCollapsed, setSectionsCollapsed] = useState({
    gist: false,
    itemDetails: false,
    priceCondition: false,
    fulfillment: false,
    fineDetails: false,
    insights: false,
  });

  const fetchListing = useCallback(async () => {
    try {
      const response = await fetch(`/api/listings/${listingId}`);
      if (!response.ok) throw new Error('Failed to fetch listing');
      const data = await response.json();
      setListing(data);
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error('Failed to load listing');
    }
  }, [listingId]);

  const startAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch(`/api/listings/${listingId}/analyze`, {
        method: 'POST',
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          const errorMsg = errorData.error || 'Analysis failed';
          console.error('Analysis API error:', errorMsg, errorData.details);
          toast.error(errorMsg.length > 100 ? 'Analysis failed - check console for details' : errorMsg);
        } catch (e) {
          toast.error('Analysis failed');
        }
        setIsAnalyzing(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let partialRead = '';

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        partialRead += decoder.decode(value, { stream: true });
        let lines = partialRead.split('\n');
        partialRead = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setIsAnalyzing(false);
              await fetchListing();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.status === 'completed') {
                setIsAnalyzing(false);
                await fetchListing();

                if (parsed.result?.itemIdentified) {
                  toast.success('Analysis complete! Item identified.');
                } else {
                  toast.success('Analysis complete.');
                }
                return;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error('Analysis failed - ' + (error?.message || 'unknown error'));
      setIsAnalyzing(false);
    }
  }, [fetchListing, listingId]);

  useEffect(() => {
    fetchListing();
    startAnalysis();
  }, [fetchListing, startAnalysis]);

  // Auto-collapse Gist section if empty
  useEffect(() => {
    if (listing && (!listing.theGist || listing.theGist.trim() === '')) {
      setSectionsCollapsed(prev => ({ ...prev, gist: true }));
    }
  }, [listing]);

  const scrollToField = (field: string) => {
    setHighlightedField(field);
    const element = document.getElementById(`field-${field}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => setHighlightedField(null), 3000);
    }
  };

  // Track field edits for AI learning
  const handleFieldEdit = (fieldName: string, value: any) => {
    setListing((prev) => {
      if (!prev) return prev;
      const newEditedFields = new Set([...(prev.editedFields || []), fieldName]);
      return {
        ...prev,
        [fieldName]: value,
        editedFields: Array.from(newEditedFields),
      };
    });
  };

  const priceBands = useMemo<PriceBands | null>(() => {
    if (!listing) return null;
    if (listing.ladderStats) {
      return listing.ladderStats;
    }
    return computePriceBands({
      newMedian: listing.brandNewPrice ?? null,
      usedQ90: listing.priceRangeHigh ?? null,
      usedQ50: listing.priceRangeMid ?? null,
      usedQ10: listing.priceRangeLow ?? null,
      partsMedian: listing.priceForParts ?? null,
    });
  }, [listing]);

  const premiumFacets = useMemo(() => normalizeFacets(listing?.facets ?? null), [listing?.facets]);
  const priceUplifts = useMemo(
    () => normalizePriceUplifts(listing?.priceUplifts ?? null),
    [listing?.priceUplifts]
  );
  const specialClassLabel = useMemo(
    () => toTitleCase(listing?.specialClass ?? null),
    [listing?.specialClass]
  );

  const verifiedScoreRaw = listing?.verifiedConditionScore as Record<string, unknown> | null | undefined;
  const parseScoreValue = (value: unknown): number | null => {
    const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (!Number.isFinite(num)) return null;
    return Math.min(1, Math.max(0, num));
  };

  const verifiedScores = verifiedScoreRaw
    ? {
        surface: parseScoreValue(verifiedScoreRaw.surface),
        function: parseScoreValue(verifiedScoreRaw.function),
        clean: parseScoreValue(verifiedScoreRaw.clean),
        complete: parseScoreValue(verifiedScoreRaw.complete),
        avg: parseScoreValue(verifiedScoreRaw.avg),
      }
    : null;

  const computedAvgScore = (() => {
    if (!verifiedScores) return null;
    if (verifiedScores.avg != null) return verifiedScores.avg;
    const values = ['surface', 'function', 'clean', 'complete']
      .map((key) => {
        const val = verifiedScores[key as keyof typeof verifiedScores];
        return typeof val === 'number' ? val : null;
      })
      .filter((val): val is number => val != null);
    if (!values.length) return null;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  })();

  const hasVerifiedCondition = Boolean(listing?.verifiedCondition && verifiedScores);
  const priceDeviationThreshold = hasVerifiedCondition ? 0.07 : 0.15;
  const conditionReportMode = listing?.user?.conditionReportMode ?? 'all';
  const showConditionReport = hasVerifiedCondition && (
    conditionReportMode === 'all' || (conditionReportMode === 'premium' && listing?.usePremium)
  );

  const roadshowReveal = useMemo(() => {
    if (!listing || !priceUplifts) return null;

    const conditionCandidates = [listing.verifiedCondition, listing.condition, 'Good'].filter(Boolean) as string[];
    let baseline: number | null = null;
    let conditionUsed: string | null = null;

    for (const candidate of conditionCandidates) {
      const base = getBaselinePriceForCondition(candidate);
      if (base !== null) {
        baseline = base;
        conditionUsed = candidate;
        break;
      }
    }

    if (baseline === null) return null;
    const uplifted = applyPremiumUplift(baseline, priceUplifts, conditionUsed ?? undefined);
    if (uplifted === null || uplifted <= baseline) {
      return null;
    }

    const totalPct = typeof priceUplifts.total === 'number' ? priceUplifts.total : 0;
    const specialPct = typeof priceUplifts.special === 'number' ? priceUplifts.special : 0;
    const deltaValue = roundToCents(uplifted - baseline) ?? 0;
    const totalPercentDisplay = Math.round(totalPct * 100);
    const breakdown = priceUplifts.facets
      ? Object.entries(priceUplifts.facets).map(([category, pct]) => {
          const pctValue = typeof pct === 'number' ? pct : 0;
          const matchedFacet = premiumFacets.find(
            (facet) => facet.category.toLowerCase() === category.toLowerCase()
          );
          return {
            category,
            pct: pctValue,
            pctDisplay: Math.round(pctValue * 100),
            name: matchedFacet?.name ?? category,
            confidence: matchedFacet ? Math.round(matchedFacet.confidence * 100) : null,
          };
        }).sort((a, b) => b.pct - a.pct)
      : [];

    return {
      baseline,
      uplifted,
      deltaValue,
      totalPercentDisplay,
      conditionUsed,
      breakdown,
      specialPercentDisplay: specialPct > 0 ? Math.round(specialPct * 100) : 0,
      totalPct,
    };
  }, [listing, priceUplifts, premiumFacets, priceBands]);
  const getBaselinePriceForCondition = (condition: string): number | null => {
    if (!listing) return null;
    if (!condition) return null;

    const ladderPrice = getSuggestedPrice(priceBands, condition);
    if (ladderPrice !== null && ladderPrice !== undefined) {
      return roundToCents(ladderPrice);
    }

    if (!listing.avgMarketPrice) return null;
    const normalizedCondition = condition.toLowerCase();
    const multiplier =
      MARKET_CONDITION_MULTIPLIERS[condition] ??
      (normalizedCondition.includes('part')
        ? MARKET_CONDITION_MULTIPLIERS['For Parts']
        : MARKET_CONDITION_MULTIPLIERS['Good']);

    return roundToCents(listing.avgMarketPrice * multiplier);
  };

  const calculatePriceForCondition = (condition: string): number | null => {
    const baseline = getBaselinePriceForCondition(condition);
    if (baseline === null) return null;
    return applyPremiumUplift(baseline, priceUplifts, condition);
  };

  const handleConditionChange = (value: string) => {
    const conditionPrice = calculatePriceForCondition(value);
    setListing((prev) => {
      if (!prev) return prev;
      const editedFields = new Set([...(prev.editedFields || []), 'condition']);
      const next: Listing = {
        ...prev,
        condition: value,
        editedFields: Array.from(editedFields),
      };
      if (conditionPrice !== null) {
        const priceEdited = new Set([...(next.editedFields || []), 'price']);
        next.price = conditionPrice;
        next.editedFields = Array.from(priceEdited);
      }
      return next;
    });
  };

  const handleUpgradePremium = async () => {
    if (!listing) return;

    const premiumPostsUsed = listing.user?.premiumPostsUsed || 0;
    const premiumPostsTotal = listing.user?.premiumPostsTotal || 4; // Default to 4 for free users
    const canUsePremium = premiumPostsUsed < premiumPostsTotal;

    if (!canUsePremium) {
      toast.error('Premium upgrades exhausted');
      return;
    }

    // Toggle usePremium
    const newUsePremium = !listing.usePremium;
    
    // If enabling premium, increment counter
    if (newUsePremium) {
      toast.success('Upgrading to premium post...');
      
      // Update listing with premium flag
      try {
        const response = await fetch(`/api/listings/${listingId}/upgrade-premium`, {
          method: 'POST',
        });
        
        if (!response.ok) {
          toast.error('Failed to activate premium features');
          return;
        }
        
        const data = await response.json();
        
        // Update listing with new counter
        setListing({
          ...listing,
          usePremium: true,
          user: listing.user ? {
            subscriptionTier: listing.user.subscriptionTier,
            premiumPostsUsed: data.premiumPostsUsed,
            premiumPostsTotal: listing.user.premiumPostsTotal,
          } : undefined,
        });
        
        // Trigger re-analysis
        await startAnalysis();
      } catch (error) {
        console.error('Premium upgrade error:', error);
        toast.error('Failed to activate premium features');
      }
    } else {
      // Disabling premium - just toggle locally
      setListing({ ...listing, usePremium: false });
      toast.success('Premium features disabled');
    }
  };

  // Determine if user's price is reasonable for the condition
  const getPriceSuggestionColor = (): string | null => {
    if (!listing?.price || !listing?.condition) return null;

    const conditionPrice = calculatePriceForCondition(listing.condition);
    if (!conditionPrice) return null;

    const priceDiff = listing.price - conditionPrice;
    const percentDiff = priceDiff / conditionPrice;

    if (percentDiff <= -priceDeviationThreshold) return 'green';
    if (percentDiff >= priceDeviationThreshold) return 'red';

    return null;
  };

  const getConditionAwarePriceInsight = (): string | null => {
    if (!listing?.price || !listing?.condition) return null;

    const conditionPrice = calculatePriceForCondition(listing.condition);
    if (!conditionPrice) return null;

    const priceDiff = listing.price - conditionPrice;
    const percentDiff = priceDiff / conditionPrice;

    if (Math.abs(percentDiff) < priceDeviationThreshold) return null;

    const guidancePrefix = hasVerifiedCondition
      ? 'Verified condition pricing suggests'
      : 'Market data suggests';

    if (percentDiff > 0) {
      return `Your price seems high for "${listing.condition}" condition. ${guidancePrefix} $${conditionPrice.toFixed(2)}`;
    }

    return `You could ask for more! Items in "${listing.condition}" condition typically sell for $${conditionPrice.toFixed(2)} (${hasVerifiedCondition ? '±7% verified band' : 'market average'})`;
  };

  const formatCurrency = (value: number) => {
    const fractionDigits = value >= 100 ? 0 : 2;
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  };

  const renderScoreRow = (label: string, score: number | null) => {
    if (score == null) return null;
    const percent = Math.round(score * 100);
    return (
      <div key={label} className="space-y-1">
        <div className="flex items-center justify-between text-xs font-medium text-gray-600">
          <span>{label}</span>
          <span>{percent}%</span>
        </div>
        <div className="h-2 rounded-full bg-emerald-100 overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
        </div>
      </div>
    );
  };

  const appendConditionLine = (line: string) => {
    setListing((prev) => {
      if (!prev) return prev;
      const updatedNotes = ensureUniqueLine(prev.conditionNotes ?? '', line);
      const editedFields = new Set([...(prev.editedFields || []), 'conditionNotes']);
      return {
        ...prev,
        conditionNotes: updatedNotes,
        editedFields: Array.from(editedFields),
      };
    });
  };

  const resolveNotification = async (notificationId: string) => {
    if (!notificationId) return;
    try {
      const response = await fetch(`/api/notifications/${notificationId}/resolve`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to resolve notification');
      await fetchListing();
    } catch (error) {
      console.error(error);
      toast.error('Failed to resolve notification');
    }
  };

  const handleQuickFactsInsert = (line: string, resolveId?: string) => {
    appendConditionLine(line);
    toast.success('Detail added to condition assessment');
    if (resolveId) {
      resolveNotification(resolveId);
    }
  };

  const handleInoperableSelection = (note: string, resolveId?: string) => {
    const trimmed = note.trim();
    if (!trimmed) return;
    appendConditionLine(`Inoperable: ${trimmed} (sold for parts).`);
    handleConditionChange('For Parts');
    if (resolveId) {
      resolveNotification(resolveId);
    }
    toast.success('Condition updated for inoperable item');
  };

  const handleFulfillmentChange = (type: string) => {
    const updates: Partial<Listing> = { fulfillmentType: type as any };
    
    if (type === 'local') {
      // Suggest local platforms
      updates.recommendedPlatforms = ['Facebook Marketplace', 'Craigslist', 'OfferUp'];
      updates.qualifiedPlatforms = ['Facebook Marketplace', 'Craigslist', 'OfferUp', 'Nextdoor'];
    } else {
      // Keep original platform recommendations
      // (these come from AI analysis)
    }
    
    setListing({ ...listing!, ...updates });
  };

  const handleSave = async () => {
    if (!listing) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...listing,
          editedFields: listing.editedFields || [], // Send edited fields for AI learning
        }),
      });

      if (!response.ok) throw new Error('Failed to save');
      
      toast.success('Listing saved! Redirecting to storage...');
      
      // Redirect to storage page after save
      setTimeout(() => {
        router.push('/listings');
      }, 500);
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Failed to save listing');
      setIsSaving(false);
    }
  };

  if (!listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const notifications = (listing.notifications || []) as any[];
  const grouped: Record<string, GisterNotification[]> = {
    photos: [],
    condition: [],
    price: [],
    shipping: [],
    fineDetails: [],
  };
  let buyerDisclosureSource: GisterNotification | null = null;
  // Best-effort mapping for existing notifications lacking section: infer by field/actionType
  notifications.forEach((n: any) => {
    const data = n.actionData ? (() => { try { return JSON.parse(n.actionData); } catch { return null; } })() : null;
    const notificationType: GisterNotification['type'] =
      n.type === 'ALERT' || n.type === 'INSIGHT' || n.type === 'PHOTO' || n.type === 'QUESTION'
        ? n.type
        : 'QUESTION';
    const section = n.section || data?.section ||
      (n.field === 'price' || n.actionType === 'insight' ? 'price' :
      n.field === 'dimensions' || n.field === 'weight' ? 'shipping' :
      n.field === 'condition' || n.actionType === 'buyer_disclosure' ? 'condition' :
      n.actionType === 'retake_photo' || n.actionType === 'add_photo' ? 'photos' :
      'fineDetails');
    const parsedNotification: GisterNotification = {
      id: n.id,
      type: notificationType,
      message: n.message,
      actionType: n.actionType,
      actionData: data,
      field: n.field,
      section,
      mood: n.mood || data?.mood,
      context: n.context || data?.context,
      resolved: !!n.resolved,
    };
    grouped[section].push(parsedNotification);
    if (n.actionType === 'buyer_disclosure' && !buyerDisclosureSource) {
      buyerDisclosureSource = parsedNotification;
    }
  });

  if (!grouped.condition.find((n) => n.actionType === 'quickFacts')) {
    grouped.condition = grouped.condition.filter((n) => n.actionType !== 'buyer_disclosure');
    const buyerSeed: Partial<GisterNotification> = buyerDisclosureSource ?? {};
    const quickFactsNotification: GisterNotification = {
      id: 'quick-facts',
      type: 'QUESTION',
      message: typeof buyerSeed.message === 'string'
        ? buyerSeed.message
        : 'Add Quick Facts (Comes with / Missing / Inoperable)',
      actionType: 'quickFacts',
      actionData: buyerSeed.actionData ?? null,
      field: typeof buyerSeed.field === 'string' && buyerSeed.field.length > 0
        ? buyerSeed.field
        : 'conditionNotes',
      section: 'condition',
      mood: buyerSeed.mood ?? 'neutral',
      context: buyerSeed.context,
      resolved: buyerSeed.resolved ?? false,
    };
    grouped.condition.unshift(quickFactsNotification);
  }

  if (listing.price !== null && listing.condition) {
    const suggested = calculatePriceForCondition(listing.condition);
    const delta = computeDelta(listing.price, suggested ?? null);
    if (suggested !== null && delta && Math.abs(delta.pct) >= priceDeviationThreshold) {
      const direction = delta.delta < 0 ? '↑' : '↓';
      if (!grouped.price.some((n) => n.id === 'ladder-suggested')) {
        const ladderNotification: GisterNotification = {
          id: 'ladder-suggested',
          type: 'INSIGHT',
          message: `Set ${formatCurrency(suggested)} (${direction})`,
          actionType: 'setPrice',
          actionData: {
            section: 'price',
            suggested,
            deltaPct: Math.abs(delta.pct),
          },
          field: 'price',
          section: 'price',
          mood: 'neutral',
          resolved: false,
        };
        grouped.price.unshift(ladderNotification);
      }
    }
  }

  const quickFactsSeed = (buyerDisclosureSource as GisterNotification | null) ?? null;

  const openQuickFacts = (notification?: GisterNotification | null) => {
    setQuickFactsSource(notification ?? quickFactsSeed ?? null);
    setShowQuickFacts(true);
  };

  const seedActionData = quickFactsSeed?.actionData ?? null;
  const effectiveQuickFacts = quickFactsSource?.actionData ?? seedActionData ?? null;
  const quickFactsData = (effectiveQuickFacts ?? {}) as Record<string, unknown>;
  const quickFactsResolveId = quickFactsSource?.id && quickFactsSource.id !== 'quick-facts'
    ? quickFactsSource.id
    : quickFactsSeed?.id && quickFactsSeed.id !== 'quick-facts'
      ? quickFactsSeed.id
      : undefined;

  const quickFactsHints = {
    missingCandidates: Array.isArray((quickFactsData as any).detectedIssues)
      ? (quickFactsData as any).detectedIssues
      : Array.isArray((quickFactsData as any).missingCandidates)
        ? (quickFactsData as any).missingCandidates
        : Array.isArray((quickFactsData as any).missing)
          ? (quickFactsData as any).missing
          : [],
    presentItems: Array.isArray((quickFactsData as any).presentItems)
      ? (quickFactsData as any).presentItems
      : Array.isArray((quickFactsData as any).alreadyIncluded)
        ? (quickFactsData as any).alreadyIncluded
        : Array.isArray((quickFactsData as any).detectedItems)
          ? (quickFactsData as any).detectedItems
          : [],
    inoperableReasons: Array.isArray((quickFactsData as any).issues)
      ? (quickFactsData as any).issues
      : Array.isArray((quickFactsData as any).inoperableReasons)
        ? (quickFactsData as any).inoperableReasons
        : [],
  } as const;

  const ladderPartsPrice = getBaselinePriceForCondition('For Parts');
  const partsPrice = ladderPartsPrice ?? (listing.priceForParts != null ? roundToCents(listing.priceForParts) : null);

  const handleQuickFactsLine = (line: string, _kind: 'comesWith' | 'missing') => {
    handleQuickFactsInsert(line, quickFactsResolveId);
  };

  const handleQuickFactsInoperable = (note: string) => {
    handleInoperableSelection(note, quickFactsResolveId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* List Mode Content */}
      <div className="max-w-2xl mx-auto p-4 pb-24">
        {/* Analysis Loading */}
        {isAnalyzing && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            <span className="text-purple-900 font-medium">Analyzing your item...</span>
          </div>
        )}

        {listing?.isPremiumItem && (
          <div className="mb-4 bg-gradient-to-r from-purple-50 via-emerald-50 to-white border border-purple-200 rounded-lg p-3 flex items-start gap-3">
            <Gem className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-purple-900">
                Special item detected{specialClassLabel ? ` — ${specialClassLabel}` : ''}
              </p>
              <p className="text-xs text-purple-700">
                Verified facets can unlock up to 20% more value. Keep adding close-ups to complete the Roadshow Reveal.
              </p>
            </div>
          </div>
        )}

        {/* Alerts and Actions */}
        {listing.notifications && listing.notifications.length > 0 && (
          <div className="mb-4">
            <NotificationList
              notifications={listing.notifications}
              listingId={listingId}
              onResolve={fetchListing}
              onScrollToField={scrollToField}
              itemCategory={listing.category}
              fulfillmentType={listing.fulfillmentType}
              onAddDetail={(text) => {
                // Append chip text to description
                const currentDesc = listing.description || '';
                const newDesc = currentDesc ? `${currentDesc}\n${text}` : text;
                setListing({ ...listing, description: newDesc });
              }}
              onQuickFacts={({ notification, actionData }: QuickFactsPayload) => {
                openQuickFacts({
                  id: notification.id,
                  type: notification.type,
                  message: notification.message,
                  actionType: 'buyer_disclosure',
                  actionData: actionData || null,
                  field: notification.field,
                  section: 'condition',
                  mood: 'neutral',
                  context: undefined,
                  resolved: notification.resolved,
                });
              }}
            />
          </div>
        )}

        {/* The Gist */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-4">
          <button
            onClick={() => setSectionsCollapsed(prev => ({ ...prev, gist: !prev.gist }))}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <Label className="font-medium cursor-pointer">The Gist</Label>
            {sectionsCollapsed.gist ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronUp className="w-5 h-5 text-gray-500" />}
          </button>
          {!sectionsCollapsed.gist && (
            <div className="px-4 pb-4 border-t">
              <Textarea
                value={listing.theGist || ''}
                onChange={(e) => handleFieldEdit('theGist', e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Photo Gallery */}
        <div id="photo-gallery">
          <PhotoGallery photos={listing.photos || []} listingId={listingId} onPhotoUpdate={fetchListing} />
          <div className="px-1 mt-2">
            <ChipsRow
              title="Photos"
              section="photos"
              notifications={grouped.photos}
              onApply={(n) => {
                if (n.type === 'PHOTO') {
                  // Navigate to camera with listing ID and photo requirement
                  router.push(`/camera?listing=${listingId}&requirement=${encodeURIComponent(n.message)}`);
                } else if (n.actionType === 'serial_closeup' || n.actionType === 'retake_photo' || n.actionType === 'add_photo') {
                  // Reuse existing flow: open camera by scrolling to gallery; actual camera open handled elsewhere
                  document.getElementById('photo-gallery')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              onJump={scrollToField}
            />
          </div>
        </div>

        {/* Title */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <Label>Title</Label>
          <Input
            value={listing.title || ''}
            onChange={(e) => setListing({ ...listing, title: e.target.value })}
            className="mt-2"
            placeholder="Item title..."
          />
          <div className="mt-2 flex justify-start">
            <AlternativeItemsSelector
              alternativeItems={listing.alternativeItems}
              listingId={listingId}
              onItemSelected={fetchListing}
            />
          </div>
        </div>

        {/* Description */}
        <div id="field-description" className={`bg-white rounded-lg shadow-sm p-4 mb-4 ${highlightedField === 'description' ? 'ring-2 ring-purple-500' : ''}`}>
          <Label>Description</Label>
          <Textarea
            value={listing.description || ''}
            onChange={(e) => setListing({ ...listing, description: e.target.value })}
            className="mt-2"
            rows={6}
            placeholder="Detailed description..."
          />
          <div className="mt-2">
            <ChipsRow
              title="Fine Details"
              section="fineDetails"
              notifications={grouped.fineDetails}
              onApply={() => { /* no-op */ }}
              onJump={scrollToField}
            />
          </div>
        </div>

        {/* Item Details - All required fields from any platform */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <Label className="text-base font-medium mb-3 block">Item Details</Label>
          <p className="text-xs text-gray-600 mb-3">Complete all applicable fields. Use &quot;N/A&quot; if not applicable.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Brand</Label>
              <Input
                value={listing.brand || ''}
                onChange={(e) => setListing({ ...listing, brand: e.target.value })}
                className="mt-1"
                placeholder="e.g., Nike, Apple"
              />
            </div>
            <div>
              <Label className="text-sm">Model</Label>
              <Input
                value={listing.model || ''}
                onChange={(e) => setListing({ ...listing, model: e.target.value })}
                className="mt-1"
                placeholder="e.g., Air Jordan 1"
              />
            </div>
            <div>
              <Label className="text-sm">Year/Version</Label>
              <Input
                value={listing.year || ''}
                onChange={(e) => setListing({ ...listing, year: e.target.value })}
                className="mt-1"
                placeholder="e.g., 2023"
              />
            </div>
            <div>
              <Label className="text-sm">Size</Label>
              <Input
                value={listing.size || ''}
                onChange={(e) => setListing({ ...listing, size: e.target.value })}
                className="mt-1"
                placeholder="e.g., 10, Medium, L"
              />
            </div>
            <div>
              <Label className="text-sm">Color</Label>
              <Input
                value={listing.color || ''}
                onChange={(e) => setListing({ ...listing, color: e.target.value })}
                className="mt-1"
                placeholder="e.g., Blue, Red"
              />
            </div>
            <div>
              <Label className="text-sm">Material</Label>
              <Input
                value={listing.material || ''}
                onChange={(e) => setListing({ ...listing, material: e.target.value })}
                className="mt-1"
                placeholder="e.g., Leather, Cotton"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-sm">Category</Label>
              <Input
                value={listing.category || ''}
                onChange={(e) => setListing({ ...listing, category: e.target.value })}
                className="mt-1"
                placeholder="e.g., Electronics, Clothing"
              />
            </div>
          </div>
        </div>

        {/* Price & Condition */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-4">
          <button
            onClick={() => setSectionsCollapsed(prev => ({ ...prev, priceCondition: !prev.priceCondition }))}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <Label className="text-base font-medium cursor-pointer">Price & Condition</Label>
            {sectionsCollapsed.priceCondition ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronUp className="w-5 h-5 text-gray-500" />}
          </button>
          {!sectionsCollapsed.priceCondition && (
            <div className="px-4 pb-4 border-t">
              <div className="space-y-4 mt-4">
                <div className="-mt-2">
                  <ChipsRow
                    title="Condition"
                    section="condition"
                    notifications={grouped.condition}
                    onApply={(n) => {
                      if (n.actionType === 'quickFacts' || n.actionType === 'buyer_disclosure') {
                        openQuickFacts(n);
                        return;
                      } else if (n.actionType === 'inoperable_check') {
                        handleFieldEdit('condition', 'For Parts');
                        return;
                      }
                    }}
                    onJump={scrollToField}
                  />
                </div>
                {roadshowReveal && (
                  <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-emerald-50 border border-purple-200 rounded-lg p-4 space-y-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Gem className="w-5 h-5 text-purple-600" />
                        <div>
                          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Roadshow Reveal</p>
                          <h4 className="text-lg font-semibold text-gray-900">
                            +{roadshowReveal.totalPercentDisplay}% value unlocked
                          </h4>
                        </div>
                      </div>
                      {listing.usePremium ? (
                        <Badge className="bg-emerald-600 text-white text-xs">Quality Verification Active</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-white text-purple-700 border-purple-300 text-xs">
                          Premium item
                        </Badge>
                      )}
                    </div>
                    {specialClassLabel && (
                      <div className="flex items-center gap-2 text-sm text-purple-800">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        <span>{specialClassLabel} special class</span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white/70 border border-purple-100 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase">
                          Baseline ({roadshowReveal.conditionUsed || listing.condition || 'Good'})
                        </p>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(roadshowReveal.baseline)}</p>
                      </div>
                      <div className="bg-white/80 border border-emerald-100 rounded-lg p-3">
                        <p className="text-xs font-semibold text-emerald-600 uppercase">Verified value</p>
                        <p className="text-lg font-semibold text-emerald-700">
                          {formatCurrency(roadshowReveal.uplifted)}
                          <span className="ml-2 text-sm font-medium text-emerald-600">
                            +{formatCurrency(roadshowReveal.deltaValue)} ({roadshowReveal.totalPercentDisplay}%)
                          </span>
                        </p>
                        {listing.usePremium && roadshowReveal.specialPercentDisplay > 0 && (
                          <p className="text-xs text-emerald-600 mt-1">
                            Includes +{roadshowReveal.specialPercentDisplay}% special recognition uplift.
                          </p>
                        )}
                      </div>
                    </div>
                    {roadshowReveal.breakdown.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">
                          Verified facets contributing to value
                        </p>
                        <ul className="space-y-1">
                          {roadshowReveal.breakdown.slice(0, 4).map((facet) => (
                            <li key={`${facet.category}-${facet.name}`} className="flex items-center gap-2 text-sm text-gray-700">
                              <span className="text-purple-600 font-semibold">+{facet.pctDisplay}%</span>
                              <span className="flex-1">
                                {facet.name}
                                <span className="text-xs text-gray-500 ml-1">
                                  {facet.category}
                                  {facet.confidence != null ? ` • ${facet.confidence}% confidence` : ''}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!listing.usePremium && (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-purple-100">
                        <p className="text-sm text-purple-800">
                          Lock in the verified price with the Quality Verification Pack.
                        </p>
                        <Button
                          onClick={handleUpgradePremium}
                          className="bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-700 hover:to-emerald-700 text-white"
                          size="sm"
                        >
                          <Crown className="w-4 h-4 mr-2" />
                          Unlock Quality Verification Pack
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {showConditionReport && verifiedScores && (
                  <div className="bg-white border border-emerald-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Verified</Badge>
                        <span className="font-semibold text-gray-900">GISTer Verified Condition</span>
                      </div>
                      <span className="text-sm font-medium text-emerald-700">
                        {listing?.verifiedCondition ?? 'Verified'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { label: 'Surface', value: verifiedScores.surface ?? null },
                        { label: 'Function', value: verifiedScores.function ?? null },
                        { label: 'Cleanliness', value: verifiedScores.clean ?? null },
                        { label: 'Completeness', value: verifiedScores.complete ?? null },
                      ]
                        .map(({ label, value }) => renderScoreRow(label, typeof value === 'number' ? value : null))
                        .filter(Boolean)}
                    </div>
                    <div className="flex flex-col gap-2 text-sm text-gray-700">
                      {computedAvgScore != null && (
                        <div className="flex items-center justify-between">
                          <span>Average score</span>
                          <span className="font-semibold">{Math.round(computedAvgScore * 100)}%</span>
                        </div>
                      )}
                      {(() => {
                        if (!listing?.condition) return null;
                        const conditionPrice = calculatePriceForCondition(listing.condition);
                        if (!conditionPrice) return null;
                        const lower = Number((conditionPrice * 0.93).toFixed(2));
                        const upper = Number((conditionPrice * 1.07).toFixed(2));
                        return (
                          <div className="flex items-center justify-between">
                            <span>Verified price band (±7%)</span>
                            <span className="font-semibold">
                              {formatCurrency(lower)} – {formatCurrency(upper)}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
                <div id="field-conditionNotes" className={highlightedField === 'conditionNotes' ? 'ring-2 ring-red-500 rounded-lg p-2 -m-2' : ''}>
                  <Label className="text-sm">Condition Assessment</Label>
                  <Textarea
                    value={listing.conditionNotes || ''}
                    onChange={(e) => {
                      handleFieldEdit('conditionNotes', e.target.value);
                      // Auto-resize for desktop, keep scrollable for mobile
                      const target = e.target as HTMLTextAreaElement;
                      if (window.innerWidth >= 768) {
                        target.style.height = 'auto';
                        target.style.height = Math.max(140, target.scrollHeight) + 'px';
                      }
                    }}
                    className="mt-1 resize-none overflow-y-auto max-h-[300px] md:overflow-hidden"
                    style={{ minHeight: '140px' }}
                    rows={6}
                    placeholder="Describe the item&apos;s condition in detail (scratches, wear, damage, etc.)"
                  />
                </div>

                {/* Condition and Price fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div id="field-condition" className={highlightedField === 'condition' ? 'ring-2 ring-red-500 rounded-lg p-2 -m-2' : ''}>
                      <Label className="text-sm">Condition</Label>
                      <Select
                        value={listing.condition || 'undefined'}
                        onValueChange={handleConditionChange}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div id="field-price" className={highlightedField === 'price' ? 'ring-2 ring-red-500 rounded-lg p-2 -m-2' : ''}>
                      <Label className="text-sm">Price ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={listing.price ?? ''}
                        onChange={(e) => handleFieldEdit('price', parseFloat(e.target.value) || null)}
                        className="mt-1"
                        placeholder="0.00"
                      />
                      <div className="mt-2">
                        <ChipsRow
                          title="Price"
                          section="price"
                          notifications={grouped.price}
                          onApply={(n) => {
                            if (n.actionType === 'setPrice' && n.actionData?.suggested) {
                              handleFieldEdit('price', n.actionData.suggested);
                            }
                          }}
                          onJump={scrollToField}
                        />
                      </div>
                      {/* Show suggested price only when user manually edits the price */}
                      {listing.price && listing.editedFields?.includes('price') && getConditionAwarePriceInsight() && (
                        <p className={`text-xs mt-1 font-medium ${
                          getPriceSuggestionColor() === 'green' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {getConditionAwarePriceInsight()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Platforms to Post (Platform Preview + Search Tags) */}
        <PlatformPreview 
          recommendedPlatforms={listing.recommendedPlatforms || []}
          qualifiedPlatforms={listing.qualifiedPlatforms || []}
          listingId={listingId}
          listing={listing}
          userTier={listing.user?.subscriptionTier}
        />

        {/* Premium Packs Section - Combined tabs for Pro Lister Pack, Fine Details Pack, and Insights & Automation */}
        <PremiumPacksSection
          listing={listing}
          usePremium={listing.usePremium}
          onUpgradePremium={handleUpgradePremium}
          userTier={listing.user?.subscriptionTier}
          premiumPostsUsed={listing.user?.premiumPostsUsed}
          premiumPostsTotal={listing.user?.premiumPostsTotal}
        />

        {/* Fulfillment Type: Local vs Shipping */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <Label className="text-base font-medium mb-3 block">Fulfillment Method</Label>
          
          <RadioGroup
            value={listing.fulfillmentType || 'shipping'}
            onValueChange={handleFulfillmentChange}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="shipping" id="shipping" />
              <Label htmlFor="shipping" className="flex items-center gap-2 cursor-pointer">
                <Truck className="w-4 h-4" />
                <span>Shipping</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="local" id="local" />
              <Label htmlFor="local" className="flex items-center gap-2 cursor-pointer">
                <MapPin className="w-4 h-4" />
                <span>Locals Only</span>
              </Label>
            </div>
          </RadioGroup>

          {/* Shipping Fields */}
          {listing.fulfillmentType === 'shipping' && (
            <div className="mt-4 space-y-4 border-t pt-4">
              <ChipsRow
                title="Shipping"
                section="shipping"
                notifications={grouped.shipping}
                onApply={() => { /* no-op */ }}
                onJump={scrollToField}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Weight (lbs)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={listing.weight || ''}
                    onChange={(e) => setListing({ ...listing, weight: parseFloat(e.target.value) || null })}
                    className="mt-1"
                    placeholder="e.g., 2.5"
                  />
                </div>
                <div>
                  <Label className="text-sm">Dimensions (L×W×H)</Label>
                  <Input
                    value={listing.dimensions || ''}
                    onChange={(e) => setListing({ ...listing, dimensions: e.target.value })}
                    className="mt-1"
                    placeholder="e.g., 12×8×4"
                  />
                </div>
              </div>
              
              {listing.shippingCostEst && (
                <p className="text-sm text-emerald-600">
                  Estimated shipping cost: ${listing.shippingCostEst.toFixed(2)}
                </p>
              )}

              {/* OK for locals to contact */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="okForLocals"
                  checked={listing.okForLocals}
                  onCheckedChange={(checked) => setListing({ ...listing, okForLocals: !!checked })}
                />
                <Label htmlFor="okForLocals" className="text-sm cursor-pointer">
                  OK for locals to contact for pickup
                </Label>
              </div>

              {listing.okForLocals && (
                <div className="space-y-3 pl-6 border-l-2 border-purple-200">
                  <div>
                    <Label className="text-sm">Location (City, State)</Label>
                    <Input
                      value={listing.location || ''}
                      onChange={(e) => setListing({ ...listing, location: e.target.value })}
                      className="mt-1"
                      placeholder="e.g., Los Angeles, CA"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Meetup Preference</Label>
                    <Input
                      value={listing.meetupPreference || ''}
                      onChange={(e) => setListing({ ...listing, meetupPreference: e.target.value })}
                      className="mt-1"
                      placeholder="e.g., Public location, your place, or delivery"
                    />
                  </div>
                  <p className="text-xs text-gray-600">These preferences will be saved for future local posts.</p>
                </div>
              )}
            </div>
          )}

          {/* Local Only Fields */}
          {listing.fulfillmentType === 'local' && (
            <div className="mt-4 space-y-3 border-t pt-4">
              <div>
                <Label className="text-sm">Location (City, State)</Label>
                <Input
                  value={listing.location || ''}
                  onChange={(e) => setListing({ ...listing, location: e.target.value })}
                  className="mt-1"
                  placeholder="e.g., Los Angeles, CA"
                />
              </div>
              <div>
                <Label className="text-sm">Delivery/Meetup Preference</Label>
                <Input
                  value={listing.meetupPreference || ''}
                  onChange={(e) => setListing({ ...listing, meetupPreference: e.target.value })}
                  className="mt-1"
                  placeholder="e.g., Public location, your place, or delivery"
                />
              </div>
              <p className="text-xs text-gray-600">These preferences will be saved for future local posts.</p>
            </div>
          )}
        </div>

        {/* Insights */}
        <InsightsSection listing={listing} />

        <QuickFactsPanel
          isOpen={showQuickFacts}
          onClose={() => setShowQuickFacts(false)}
          onInsert={(line, kind) => handleQuickFactsLine(line, kind)}
          onDeclareInoperable={(note) => handleQuickFactsInoperable(note)}
          hints={quickFactsHints}
          userId={userId}
          category={listing.category}
          existingNotes={listing.conditionNotes}
          partsPrice={partsPrice}
          listingId={listingId}
        />

        {/* Save Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-10">
          <div className="max-w-2xl mx-auto flex gap-3">
            <Button
              onClick={() => router.push('/listings')}
              variant="outline"
              className="flex-1"
            >
              Listings
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
