
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
    try {
      const response = await fetch(`/api/listings/${listingId}/analyze`, {
        method: 'POST',
      });

      if (!response.ok) {
        // Try to get error details from response
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
                
                // Check if item was identified
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
      return `Your price seems high for "${listing.condition}" condition. Market data suggests $${conditionPrice.toFixed(2)}`;
    } else {
      return `You could ask for more! Items in "${listing.condition}" condition typically sell for $${conditionPrice.toFixed(2)}`;
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

  const alertNotifications = listing.notifications?.filter((n) => n.type === 'ALERT' && !n.resolved) ?? [];
  const preferenceNotifications = listing.notifications?.filter((n) => n.type === 'PREFERENCE' && !n.resolved) ?? [];

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

        {/* Alerts and Actions */}
        {listing.notifications && listing.notifications.length > 0 && (
          <div className="mb-4">
            <NotificationList 
              notifications={listing.notifications} 
              listingId={listingId}
              onResolve={fetchListing}
              onScrollToField={scrollToField}
              itemCategory={listing.category}
              onAddDetail={(text) => {
                // Append chip text to description
                const currentDesc = listing.description || '';
                const newDesc = currentDesc ? `${currentDesc}\n${text}` : text;
                setListing({ ...listing, description: newDesc });
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
        </div>

        {/* Description */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <Label>Description</Label>
          <Textarea
            value={listing.description || ''}
            onChange={(e) => setListing({ ...listing, description: e.target.value })}
            className="mt-2"
            rows={6}
            placeholder="Detailed description..."
          />
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
                <div id="field-conditionNotes" className={highlightedField === 'conditionNotes' ? 'ring-2 ring-red-500 rounded-lg p-2 -m-2' : ''}>
                  <Label className="text-sm">Condition Description</Label>
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

                {/* Grid Layout: Left side - Condition & Price stack, Middle - Pro Lister Pack, Right - Pro Seller Box */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Left Column - Condition and Price (stacked vertically) */}
                  <div className="lg:col-span-1 space-y-4">
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
                      {/* Show suggested price only when user price differs significantly */}
                      {listing.price && getConditionAwarePriceInsight() && (
                        <p className={`text-xs mt-1 font-medium ${
                          getPriceSuggestionColor() === 'green' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {getConditionAwarePriceInsight()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Middle Column - Pro Lister Pack (Shows when premium is NOT active OR shows features when active) */}
                  <div className="lg:col-span-1">
                    {!listing.usePremium ? (
                      <div className="bg-gradient-to-br from-purple-50 via-green-50 to-purple-50 border-2 border-purple-400 rounded-lg p-4 h-full">
                        <div className="flex items-center gap-2 mb-3">
                          <Crown className="w-5 h-5 text-purple-600 flex-shrink-0" />
                          <Label className="text-sm font-bold text-gray-900">Pro Lister Pack</Label>
                        </div>
                        
                        <p className="text-xs text-gray-700 mb-3">
                          Check Upgrade to Premium Post to unlock
                        </p>
                        
                        <p className="text-xs font-semibold text-gray-800 mb-2">Pack for this item includes:</p>
                        
                        <ul className="space-y-2 text-xs text-gray-600">
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 text-sm">✓</span>
                            <span>Link to manual</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 text-sm">✓</span>
                            <span>Contact info for local parts dealer</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-600 text-sm">✓</span>
                            <span>Links to item tutorial</span>
                          </li>
                        </ul>
                      </div>
                    ) : listing.premiumFacts || listing.usefulLinks ? (
                      // Show actual features when premium is active
                      <div className="bg-gradient-to-br from-purple-50 via-green-50 to-purple-50 border-2 border-green-500 rounded-lg p-4 h-full">
                        <div className="flex items-center gap-2 mb-3">
                          <Crown className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <Label className="text-sm font-bold text-gray-900">Pro Lister Pack</Label>
                          <Badge className="bg-green-600 text-white text-xs">Active</Badge>
                        </div>
                        
                        <p className="text-xs font-semibold text-gray-800 mb-2">Pack for this item includes:</p>
                        
                        {listing.usefulLinks && (() => {
                          try {
                            const links = JSON.parse(listing.usefulLinks);
                            if (Array.isArray(links) && links.length > 0) {
                              return (
                                <ul className="space-y-2 text-xs">
                                  {links.map((link: any, idx: number) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <span className="text-green-600 text-sm">✓</span>
                                      <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-700 hover:text-blue-900 underline hover:no-underline flex-1"
                                      >
                                        {link.title}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              );
                            }
                          } catch (e) {
                            return null;
                          }
                          return null;
                        })()}
                      </div>
                    ) : (
                      // Premium active but no data yet
                      <div className="bg-gradient-to-br from-purple-50 via-green-50 to-purple-50 border-2 border-purple-400 rounded-lg p-4 h-full flex items-center justify-center">
                        <div className="text-center">
                          <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto mb-2" />
                          <p className="text-xs text-gray-600">Loading pack features...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Pro Seller Box (Premium Facts) */}
                  <div className="lg:col-span-1">
                    {listing.usePremium && listing.premiumFacts ? (
                      // PREMIUM TIER - Show premium facts
                      <div className="bg-gradient-to-br from-yellow-100 via-amber-100 to-yellow-200 border-2 border-amber-500 rounded-lg p-4 shadow-md h-full">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                          <Label className="text-sm font-bold text-amber-900">Pro Seller's Box</Label>
                          <Badge className="bg-green-600 text-white text-xs">Active</Badge>
                        </div>
                        
                        <p className="text-xs text-amber-900 mb-3 font-medium">This information will be added to your post:</p>
                        
                        <div className="mb-3">
                          <p className="text-sm text-amber-950 leading-relaxed whitespace-pre-wrap">
                            {listing.premiumFacts}
                          </p>
                        </div>
                      </div>
                    ) : listing.usePremium ? (
                      // Premium requested but AI hasn't analyzed yet
                      <div className="bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 border-2 border-amber-300 rounded-lg p-4 h-full flex items-center justify-center">
                        <div className="text-center">
                          <Loader2 className="w-6 h-6 animate-spin text-amber-600 mx-auto mb-2" />
                          <p className="text-xs text-gray-600">Loading premium facts...</p>
                        </div>
                      </div>
                    ) : null}
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

        {/* Save Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg z-10">
          <div className="max-w-2xl mx-auto flex gap-3">
            <Button
              onClick={() => router.push('/listings')}
              variant="outline"
              className="flex-1"
            >
              Back
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
