
'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PLATFORMS = [
  'eBay',
  'Mercari',
  'OfferUp',
  'Facebook Marketplace',
  'Craigslist',
  'Reverb',
  'Nextdoor',
  'Poshmark',
  'Vinted',
];

export default function PlatformPreview({
  recommendedPlatforms,
  qualifiedPlatforms,
  listingId,
}: {
  recommendedPlatforms: string[];
  qualifiedPlatforms: string[];
  listingId: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const displayPlatforms = qualifiedPlatforms.length > 0 ? qualifiedPlatforms : PLATFORMS;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : displayPlatforms.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < displayPlatforms.length - 1 ? prev + 1 : 0));
  };

  if (displayPlatforms.length === 0) {
    return null;
  }

  const currentPlatform = displayPlatforms[currentIndex];
  const isRecommended = recommendedPlatforms.includes(currentPlatform);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Platform Preview</h3>
        {isRecommended && (
          <div className="flex items-center gap-1 text-amber-600 text-sm">
            <Star className="w-4 h-4 fill-current" />
            <span>Recommended</span>
          </div>
        )}
      </div>

      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            className="h-8 w-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex-1 text-center">
            <h4 className="font-semibold text-lg">{currentPlatform}</h4>
            <p className="text-xs text-gray-500">
              {currentIndex + 1} of {displayPlatforms.length}
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="h-8 w-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 min-h-[120px]">
          <p className="text-sm text-gray-600">
            Platform-specific fields and requirements will appear here.
          </p>
          <div className="mt-3 space-y-2">
            <div className="text-xs text-gray-500">
              <strong>Category:</strong> Auto-detected
            </div>
            <div className="text-xs text-gray-500">
              <strong>Shipping:</strong> Based on your preferences
            </div>
            <div className="text-xs text-gray-500">
              <strong>Format:</strong> Optimized for {currentPlatform}
            </div>
          </div>
        </div>

        {recommendedPlatforms.length > 0 && (
          <div className="mt-3 text-xs text-gray-500">
            <strong>Best for this item:</strong>{' '}
            {recommendedPlatforms.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}
