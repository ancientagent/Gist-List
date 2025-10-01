
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  Camera,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import PhotoGallery from './photo-gallery';
import PlatformPreview from './platform-preview';
import InsightsSection from './insights-section';
import NotificationList from './notification-list';

interface Listing {
  id: string;
  theGist: string | null;
  title: string | null;
  description: string | null;
  price: number | null;
  condition: string | null;
  itemIdentified: boolean;
  confidence: number | null;
  category: string | null;
  tags: string[];
  avgMarketPrice: number | null;
  suggestedPriceMin: number | null;
  suggestedPriceMax: number | null;
  recommendedPlatforms: string[];
  qualifiedPlatforms: string[];
  willingToShip: boolean;
  weight: number | null;
  dimensions: string | null;
  shippingCostEst: number | null;
  photos: any[];
  notifications: any[];
}

export default function ListingDetail({ listingId }: { listingId: string }) {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [viewfinderCollapsed, setViewfinderCollapsed] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchListing();
    startAnalysis();
  }, [listingId]);

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
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const alertNotifications = listing.notifications?.filter((n) => n.type === 'ALERT' && !n.resolved) ?? [];
  const preferenceNotifications = listing.notifications?.filter((n) => n.type === 'PREFERENCE' && !n.resolved) ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Camera Viewfinder (Collapsed) */}
      {!viewfinderCollapsed && (
        <div className="h-48 bg-black relative">
          <Camera className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-white/50" />
          <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
            Additional photo capture coming soon
          </p>
        </div>
      )}

      {/* Pull Tab */}
      <button
        onClick={() => setViewfinderCollapsed(!viewfinderCollapsed)}
        className="w-full bg-indigo-600 hover:bg-indigo-700 py-2 flex items-center justify-center text-white transition-colors"
      >
        {viewfinderCollapsed ? (
          <ChevronDown className="w-5 h-5" />
        ) : (
          <ChevronUp className="w-5 h-5" />
        )}
      </button>

      {/* List Mode Content */}
      <div className="max-w-2xl mx-auto p-4 pb-24">
        {/* Analysis Loading */}
        {isAnalyzing && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            <span className="text-indigo-900 font-medium">Analyzing your item...</span>
          </div>
        )}

        {/* Notifications */}
        {(alertNotifications.length > 0 || preferenceNotifications.length > 0) && (
          <div className="mb-4 space-y-2">
            <NotificationList 
              notifications={alertNotifications} 
              type="alert"
              listingId={listingId}
              onResolve={fetchListing}
            />
            <NotificationList 
              notifications={preferenceNotifications} 
              type="preference"
              listingId={listingId}
              onResolve={fetchListing}
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
        <PhotoGallery photos={listing.photos || []} listingId={listingId} />

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

        {/* Price & Condition */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4 grid grid-cols-2 gap-4">
          <div>
            <Label>Price ($)</Label>
            <Input
              type="number"
              value={listing.price || ''}
              onChange={(e) => setListing({ ...listing, price: parseFloat(e.target.value) || null })}
              className="mt-2"
              placeholder="0.00"
            />
          </div>
          <div>
            <Label>Condition</Label>
            <Input
              value={listing.condition || ''}
              onChange={(e) => setListing({ ...listing, condition: e.target.value })}
              className="mt-2"
              placeholder="New, Used, etc."
            />
          </div>
        </div>

        {/* Platform Preview */}
        <PlatformPreview 
          recommendedPlatforms={listing.recommendedPlatforms || []}
          qualifiedPlatforms={listing.qualifiedPlatforms || []}
          listingId={listingId}
        />

        {/* Insights */}
        <InsightsSection listing={listing} />

        {/* Save Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
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
              className="flex-1"
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
