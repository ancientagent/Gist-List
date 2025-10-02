
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Loader2, 
  Check,
  Truck,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  avgMarketPrice: number | null;
  suggestedPriceMin: number | null;
  suggestedPriceMax: number | null;
  marketInsights: string | null;
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
  photos: any[];
  notifications: any[];
  user?: {
    subscriptionTier: string;
  };
}

export default function ListingDetail({ listingId }: { listingId: string }) {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [highlightedField, setHighlightedField] = useState<string | null>(null);

  useEffect(() => {
    fetchListing();
    startAnalysis();
  }, [listingId]);

  const scrollToField = (field: string) => {
    setHighlightedField(field);
    // Scroll to element with id matching field name
    const element = document.getElementById(`field-${field}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Remove highlight after 3 seconds
      setTimeout(() => setHighlightedField(null), 3000);
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

      if (!response.ok) throw new Error('Analysis failed');

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
                toast.success('Analysis complete!');
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
      toast.error('Analysis failed');
      setIsAnalyzing(false);
    }
  };

  // Price calculation based on condition
  const calculatePriceForCondition = (condition: string): number | null => {
    if (!listing?.avgMarketPrice) return null;
    
    const basePrice = listing.avgMarketPrice;
    const multipliers: Record<string, number> = {
      'New': 1.0,
      'Like New': 0.85,
      'Very Good': 0.75,
      'Good': 0.65,
      'Fair': 0.50,
      'Poor': 0.35,
      'For Parts': 0.20
    };
    
    return basePrice * (multipliers[condition] || 0.65);
  };

  const handleConditionChange = (value: string) => {
    const newPrice = calculatePriceForCondition(value);
    setListing({
      ...listing!,
      condition: value,
      // Only update price if user hasn't set their own price yet
      price: listing?.price ? listing.price : newPrice
    });
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
        body: JSON.stringify(listing),
      });

      if (!response.ok) throw new Error('Failed to save');
      
      toast.success('Listing saved!');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Failed to save listing');
    } finally {
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
            />
          </div>
        )}

        {/* The Gist */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <Label>The Gist</Label>
          <Textarea
            value={listing.theGist || ''}
            onChange={(e) => setListing({ ...listing, theGist: e.target.value })}
            className="mt-2"
            rows={3}
          />
        </div>

        {/* Photo Gallery */}
        <div id="photo-gallery">
          <PhotoGallery photos={listing.photos || []} listingId={listingId} />
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
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <Label className="text-base font-medium mb-3 block">Price & Condition</Label>
          <div className="space-y-4">
            <div id="field-conditionNotes" className={highlightedField === 'conditionNotes' ? 'ring-2 ring-red-500 rounded-lg p-2 -m-2' : ''}>
              <Label className="text-sm">Condition Description</Label>
              <Textarea
                value={listing.conditionNotes || ''}
                onChange={(e) => setListing({ ...listing, conditionNotes: e.target.value })}
                className="mt-1 min-h-[60px] resize-none overflow-hidden"
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
                placeholder="Describe the item's condition in detail (scratches, wear, damage, etc.)"
              />
            </div>

            <div id="field-condition" className={highlightedField === 'condition' ? 'ring-2 ring-red-500 rounded-lg p-2 -m-2' : ''}>
              <Label className="text-sm">Condition</Label>
              <Select
                value={listing.condition || 'undefined'}
                onValueChange={handleConditionChange}
              >
                <SelectTrigger className="mt-1 w-fit min-w-[180px]">
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
                value={listing.price || ''}
                onChange={(e) => setListing({ ...listing, price: parseFloat(e.target.value) || null })}
                className="mt-1"
                placeholder="0.00"
              />
              {/* Show suggested price only when field is empty OR when user price differs significantly */}
              {!listing.price && listing.avgMarketPrice && listing.condition && (
                <p className="text-xs text-gray-600 mt-1">
                  AI suggested: ${calculatePriceForCondition(listing.condition)?.toFixed(2) || listing.avgMarketPrice.toFixed(2)}
                </p>
              )}
              {listing.price && getConditionAwarePriceInsight() && (
                <p className={`text-xs mt-1 font-medium ${
                  getPriceSuggestionColor() === 'green' ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {getConditionAwarePriceInsight()}
                </p>
              )}
            </div>
          </div>
        </div>

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

        {/* Fine Details (Platform Preview + Search Tags) */}
        <PlatformPreview 
          recommendedPlatforms={listing.recommendedPlatforms || []}
          qualifiedPlatforms={listing.qualifiedPlatforms || []}
          listingId={listingId}
          listing={listing}
          userTier={listing.user?.subscriptionTier}
        />

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
              className="flex-1 bg-purple-600 hover:bg-purple-700"
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
