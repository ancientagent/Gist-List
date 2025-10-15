
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Loader2, 
  Check,
  Truck,
  MapPin,
  ChevronDown,
  ChevronUp,
  Crown
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
import NotificationList from './notification-list';
import AlternativeItemsSelector from './alternative-items-selector';
import PremiumPacksSection from './premium-packs-section';
import ChipsRow from '@/src/components/ChipsRow';
import QuickFactsPanel from '@/src/components/QuickFactsPanel';
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
  isPremiumItem: boolean;
  specialClass: string | null;
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
  user?: {
    subscriptionTier: string;
    premiumPostsUsed: number;
    premiumPostsTotal: number;
  };
}

export default function ListingDetail({ listingId }: { listingId: string }) {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [showQuickFacts, setShowQuickFacts] = useState(false);
  
  // Collapsible sections state
  const [sectionsCollapsed, setSectionsCollapsed] = useState({
    gist: false,
    itemDetails: false,
    priceCondition: false,
    fulfillment: false,
    fineDetails: false,
    insights: false,
  });

  useEffect(() => {
    fetchListing();
    startAnalysis();
  }, [listingId]);

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
    if (listing) {
      const newEditedFields = [...new Set([...(listing.editedFields || []), fieldName])];
      setListing({
        ...listing,
        [fieldName]: value,
        editedFields: newEditedFields,
      });
    }
  };



  const fetchListing = async () => {
    try {
      const response = await fetch(`/api/listings/${listingId}`);
      if (!response.ok) throw new Error('Failed to fetch listing');
      const data = await response.json();
      setListing(data);
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error('Failed to load listing');
    }
  };

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    
    // Show persistent loading toast
    const toastId = toast.loading('Analyzing your item with AI...', {
      duration: Infinity,
    });
    
    try {
      console.log('🔍 Starting analysis for listing:', listingId);
      const response = await fetch(`/api/listings/${listingId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        // Try to get error details from response
        try {
          const errorData = await response.json();
          const errorMsg = errorData.error || 'Analysis failed';
          console.error('❌ Analysis API error:', errorMsg, errorData.details);
          toast.error(errorMsg.length > 100 ? 'Analysis failed - see console for details' : errorMsg, {
            id: toastId,
            duration: 8000,
          });
        } catch (e) {
          toast.error('Analysis failed - network error', { id: toastId, duration: 8000 });
        }
        setIsAnalyzing(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }
      
      const decoder = new TextDecoder();
      let partialRead = '';
      let streamTimeout: NodeJS.Timeout | undefined = undefined;
      
      // Set timeout for stream inactivity
      const resetStreamTimeout = () => {
        if (streamTimeout) clearTimeout(streamTimeout);
        streamTimeout = setTimeout(() => {
          console.error('⏱️ Stream timeout - no data received for 30 seconds');
          toast.error('Analysis timed out. Please try again.', { id: toastId, duration: 8000 });
          setIsAnalyzing(false);
        }, 30000); // 30 second timeout
      };
      
      resetStreamTimeout();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          clearTimeout(streamTimeout);
          console.log('📡 Stream ended');
          break;
        }

        resetStreamTimeout();
        partialRead += decoder.decode(value, { stream: true });
        let lines = partialRead.split('\n');
        partialRead = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              clearTimeout(streamTimeout);
              setIsAnalyzing(false);
              await fetchListing();
              toast.success('Analysis complete!', { id: toastId, duration: 3000 });
              console.log('✅ Analysis completed successfully');
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.status === 'completed') {
                clearTimeout(streamTimeout);
                setIsAnalyzing(false);
                await fetchListing();
                
                // Check if item was identified
                if (parsed.result?.itemIdentified) {
                  toast.success('Analysis complete! Item identified.', { id: toastId, duration: 3000 });
                } else {
                  toast.success('Analysis complete.', { id: toastId, duration: 3000 });
                }
                console.log('✅ Analysis completed successfully');
                return;
              } else if (parsed.status === 'processing') {
                // Update toast with progress
                toast.loading(parsed.message || 'Analyzing...', { id: toastId });
              }
            } catch (e) {
              // Skip invalid JSON
              console.log('⚠️ Skipped invalid JSON chunk');
            }
          }
        }
      }
      
      // If we exit the loop without getting completion signal
      clearTimeout(streamTimeout);
      setIsAnalyzing(false);
      await fetchListing();
      toast.success('Analysis complete!', { id: toastId, duration: 3000 });
      console.log('✅ Analysis stream ended, refreshing data');
      
    } catch (error: any) {
      console.error('❌ Analysis error:', error);
      console.error('Error stack:', error?.stack);
      toast.error('Analysis failed: ' + (error?.message || 'unknown error'), {
        id: toastId,
        duration: 8000,
      });
      setIsAnalyzing(false);
    }
  };

  // Price calculation based on condition using comprehensive pricing
  const calculatePriceForCondition = (condition: string, currentPrice: number | null = null): number | null => {
    if (!listing) return null;
    
    // Use comprehensive pricing if available
    if (listing.brandNewPrice || listing.priceRangeHigh) {
      switch (condition) {
        case 'New':
          return listing.brandNewPrice ?? listing.priceRangeHigh ?? null;
        case 'Like New':
          // Like New = +20% of Very Good (priceRangeHigh)
          return listing.priceRangeHigh ? listing.priceRangeHigh * 1.20 : null;
        case 'Very Good':
          return listing.priceRangeHigh ?? null;
        case 'Good':
          return listing.priceRangeMid ?? listing.priceRangeHigh ?? null;
        case 'Fair':
          return listing.priceRangeLow ?? listing.priceRangeMid ?? null;
        case 'Poor':
          // Poor = -25% of Fair (priceRangeLow)
          return listing.priceRangeLow ? listing.priceRangeLow * 0.75 : null;
        case 'For Parts':
          return listing.priceForParts ?? listing.priceRangeLow ?? null;
        default:
          return listing.priceRangeMid ?? null;
      }
    }
    
    // Fallback to old logic for backwards compatibility
    if (!listing.avgMarketPrice) return null;
    const basePrice = listing.avgMarketPrice;
    const multipliers: Record<string, number> = {
      'New': 1.0,
      'Like New': 0.90,  // Updated from 0.85
      'Very Good': 0.75,
      'Good': 0.65,
      'Fair': 0.50,
      'Poor': 0.375,  // Updated: 0.50 * 0.75 = 0.375
      'For Parts': 0.20
    };
    return basePrice * (multipliers[condition] || 0.65);
  };

  const handleConditionChange = (value: string) => {
    const conditionPrice = calculatePriceForCondition(value);
    
    // Update both condition and price
    if (listing && conditionPrice) {
      setListing({
        ...listing,
        condition: value,
        price: conditionPrice,
        editedFields: [...new Set([...(listing.editedFields || []), 'condition'])],
      });
    } else {
      handleFieldEdit('condition', value);
    }
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
    if (!listing?.price || !listing?.condition || !listing?.avgMarketPrice) return null;
    
    const conditionPrice = calculatePriceForCondition(listing.condition);
    if (!conditionPrice) return null;
    
    const priceDiff = listing.price - conditionPrice;
    const percentDiff = (priceDiff / conditionPrice) * 100;
    
    // If more than 15% off, suggest higher (green)
    if (percentDiff < -15) return 'green';
    // If more than 15% over, suggest lower (red)
    if (percentDiff > 15) return 'red';
    
    return null;
  };

  const getConditionAwarePriceInsight = (): string | null => {
    if (!listing?.price || !listing?.condition || !listing?.avgMarketPrice) return null;
    
    const conditionPrice = calculatePriceForCondition(listing.condition);
    if (!conditionPrice) return null;
    
    const priceDiff = listing.price - conditionPrice;
    const percentDiff = (priceDiff / conditionPrice) * 100;
    
    if (Math.abs(percentDiff) < 15) return null; // Price is reasonable
    
    if (percentDiff > 15) {
      return `Your price seems high for "${listing.condition}" condition. Market data suggests $${conditionPrice?.toFixed(2) ?? '0.00'}`;
    } else {
      return `You could ask for more! Items in "${listing.condition}" condition typically sell for $${conditionPrice?.toFixed(2) ?? '0.00'}`;
    }
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

  const handleProcess = async () => {
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

      if (!response.ok) throw new Error('Failed to process');
      
      toast.success('Listing processed! Ready for posting...');
      
      // Redirect to listings page where posting process begins
      setTimeout(() => {
        router.push('/listings');
      }, 500);
    } catch (error: any) {
      console.error('Process error:', error);
      toast.error('Failed to process listing');
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
  // Best-effort mapping for existing notifications lacking section: infer by field/actionType
  notifications.forEach((n: any) => {
    const data = n.actionData ? (() => { try { return JSON.parse(n.actionData); } catch { return null; } })() : null;
    const section = n.section || data?.section ||
      (n.field === 'price' || n.actionType === 'insight' ? 'price' :
      n.field === 'dimensions' || n.field === 'weight' ? 'shipping' :
      n.field === 'condition' || n.actionType === 'buyer_disclosure' ? 'condition' :
      n.actionType === 'retake_photo' || n.actionType === 'add_photo' ? 'photos' :
      'fineDetails');
    grouped[section].push({
      id: n.id,
      type: n.type,
      message: n.message,
      actionType: n.actionType,
      actionData: data,
      field: n.field,
      section,
      mood: n.mood || data?.mood,
      context: n.context || data?.context,
      resolved: !!n.resolved,
    } as GisterNotification);
  });

  // Show loading skeleton if listing data hasn't loaded yet
  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto p-4 pb-24">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            <span className="text-purple-900 font-medium">Loading your listing...</span>
          </div>
          
          {/* Loading Skeleton */}
          <div className="space-y-4 animate-pulse">
            <div className="bg-white rounded-lg p-4 h-48" />
            <div className="bg-white rounded-lg p-4 h-32" />
            <div className="bg-white rounded-lg p-4 h-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* List Mode Content */}
      <div className="max-w-2xl mx-auto p-4 pb-24">
        {/* Analysis Loading */}
        {isAnalyzing && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4 flex items-center gap-3 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            <div className="flex-1">
              <span className="text-purple-900 font-medium">Analyzing your item with AI...</span>
              <p className="text-sm text-purple-700 mt-1">This may take 10-30 seconds</p>
            </div>
          </div>
        )}

        {/* Alerts and Actions */}
        {listing.notifications && listing.notifications.length > 0 && (
          <div className="mb-4">
            <NotificationList
              notifications={listing.notifications.filter((n: any) => n.type !== 'QUESTION')} // Temporarily disable QUESTION notifications
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
              onPhotoRequest={(requirement) => {
                // Navigate to camera with the photo requirement
                router.push(`/camera?listing=${listingId}&requirement=${encodeURIComponent(requirement)}`);
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
                if (n.actionType === 'upload_photo' || n.actionType === 'add_photo_requirement') {
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
          <div className="flex justify-end mt-2">
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
          <p className="text-xs text-gray-600 mb-3">Complete all applicable fields. Use "N/A" if not applicable.</p>
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
                      if (n.actionType === 'buyer_disclosure') {
                        setShowQuickFacts(true);
                      } else if (n.actionType === 'inoperable_check') {
                        handleFieldEdit('condition', 'For Parts');
                      }
                    }}
                    onJump={scrollToField}
                  />
                </div>
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
                    placeholder="Describe the item's condition in detail (scratches, wear, damage, etc.)"
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
                        <SelectTrigger className="mt-1 touch-manipulation">
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent 
                          className="touch-manipulation"
                          position="popper"
                          sideOffset={5}
                          onCloseAutoFocus={(e) => {
                            // Prevent auto-focus and refocus that can cause accidental re-opening
                            e.preventDefault();
                          }}
                          onPointerDownOutside={(e) => {
                            // Prevent accidental triggers when scrolling
                            const target = e.target as HTMLElement;
                            if (target.closest('[role="listbox"]')) {
                              e.preventDefault();
                            }
                          }}
                        >
                          {CONDITION_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt} className="touch-manipulation py-3">
                              {opt}
                            </SelectItem>
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
                  Estimated shipping cost: ${listing.shippingCostEst?.toFixed(2) ?? '0.00'}
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

        <QuickFactsPanel isOpen={showQuickFacts} onClose={() => setShowQuickFacts(false)} />

        {/* Process Button */}
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
              onClick={handleProcess}
              disabled={isSaving}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Process
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
