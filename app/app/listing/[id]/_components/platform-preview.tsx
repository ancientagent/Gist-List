
'use client';

import { useState, useEffect } from 'react';
import { Star, Info, Crown, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface PlatformField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select';
  value?: string;
  confidence?: number; // 0-1, how confident AI is
  isUnique?: boolean; // unique to this platform
  placeholder?: string;
}

// These are fields that AI might not be confident about or are platform-specific
const PLATFORM_UNCERTAIN_FIELDS: Record<string, (listing: any) => PlatformField[]> = {
  'eBay': (listing) => {
    const fields: PlatformField[] = [];
    
    // UPC/EAN for electronics (unique to eBay)
    if (listing.category?.toLowerCase().includes('electronics')) {
      fields.push({
        name: 'upc',
        label: 'UPC/EAN',
        type: 'text',
        value: '',
        confidence: 0,
        isUnique: true,
        placeholder: 'If you have the barcode...'
      });
    }
    
    // Handling time (unique field)
    fields.push({
      name: 'handling_time',
      label: 'Handling Time (days)',
      type: 'number',
      value: listing.handlingTime || '1',
      confidence: listing.handlingTime ? 1 : 0.5,
      isUnique: true,
      placeholder: '1-3'
    });
    
    return fields;
  },
  'Mercari': (listing) => {
    // Mercari uses standard fields mostly
    return [];
  },
  'Poshmark': (listing) => {
    const fields: PlatformField[] = [];
    
    // Original price (unique to Poshmark)
    fields.push({
      name: 'original_price',
      label: 'Original Retail Price',
      type: 'number',
      value: '',
      confidence: 0,
      isUnique: true,
      placeholder: 'Original purchase price'
    });
    
    return fields;
  },
  'Facebook Marketplace': (listing) => {
    // Facebook uses standard fields
    return [];
  },
  'OfferUp': (listing) => {
    // OfferUp uses standard fields
    return [];
  },
  'Craigslist': (listing) => {
    // Craigslist uses standard fields
    return [];
  },
  'Nextdoor': (listing) => {
    // Nextdoor uses standard fields
    return [];
  },
  'Reverb': (listing) => {
    const fields: PlatformField[] = [];
    
    // Serial number (unique to Reverb for instruments)
    fields.push({
      name: 'serial_number',
      label: 'Serial Number',
      type: 'text',
      value: listing.serialNumber || '',
      confidence: listing.serialNumber ? 1 : 0,
      isUnique: true,
      placeholder: 'If visible on instrument'
    });
    
    // Finish/color for instruments
    fields.push({
      name: 'finish',
      label: 'Finish/Color',
      type: 'text',
      value: listing.color || '',
      confidence: listing.color ? 0.8 : 0.3,
      placeholder: 'e.g., Sunburst, Matte Black'
    });
    
    return fields;
  },
  'Vinted': (listing) => {
    // Vinted uses standard fields
    return [];
  },
};

export default function PlatformPreview({
  recommendedPlatforms,
  qualifiedPlatforms,
  listingId,
  listing,
  userTier,
}: {
  recommendedPlatforms: string[];
  qualifiedPlatforms: string[];
  listingId: string;
  listing: any;
  userTier?: string;
}) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [platformData, setPlatformData] = useState<Record<string, Record<string, string>>>({});
  const isPremium = userTier === 'BASIC' || userTier === 'PRO';

  useEffect(() => {
    // Pre-select top 2-3 recommended platforms
    const topRecommended = recommendedPlatforms.slice(0, 3);
    setSelectedPlatforms(topRecommended);
  }, [recommendedPlatforms]);

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleFieldChange = (platform: string, field: string, value: string) => {
    setPlatformData(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value,
      },
    }));
  };

  const getPlatformFields = (platform: string): PlatformField[] => {
    const fieldGenerator = PLATFORM_UNCERTAIN_FIELDS[platform];
    if (!fieldGenerator) return [];
    
    return fieldGenerator(listing);
  };

  const displayPlatforms = qualifiedPlatforms.length > 0 ? qualifiedPlatforms : Object.keys(PLATFORM_UNCERTAIN_FIELDS);
  const selectedDisplayPlatforms = displayPlatforms.filter(p => selectedPlatforms.includes(p));

  const isUnlocked = isPremium || listing.usedPremiumPost;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-medium text-base">Platforms to Post</h3>
        {isUnlocked && (
          <Badge className="bg-green-600 text-white">
            <Crown className="w-3 h-3 mr-1" />
            Premium
          </Badge>
        )}
      </div>

      {/* Platform Selection */}
      <div className="mb-6">
        <div className="grid grid-cols-3 gap-2">
          {displayPlatforms.map((platform) => {
            const isRecommended = recommendedPlatforms.includes(platform);
            const isSelected = selectedPlatforms.includes(platform);
            const canSelect = isUnlocked || isRecommended;
            
            return (
              <div
                key={platform}
                className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-all ${
                  canSelect ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                } ${
                  isSelected
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  if (!canSelect) {
                    toast.info('This platform requires Premium features. Use a premium post to unlock!', {
                      icon: '⭐',
                    });
                  } else {
                    handlePlatformToggle(platform);
                  }
                }}
              >
                <Checkbox
                  checked={isSelected}
                  disabled={!canSelect}
                  onCheckedChange={() => {
                    if (canSelect) {
                      handlePlatformToggle(platform);
                    }
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="font-medium text-xs truncate">{platform}</span>
                    {isRecommended && (
                      <Star className="w-3 h-3 fill-green-500 text-green-500 flex-shrink-0" />
                    )}
                    {!canSelect && (
                      <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Platform-Specific Fields with Tabs */}
      {selectedDisplayPlatforms.length > 0 && (
        <div className="border-t pt-4">
          {isUnlocked ? (
            <Tabs defaultValue={selectedDisplayPlatforms[0]} className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${selectedDisplayPlatforms.length}, 1fr)` }}>
              {selectedDisplayPlatforms.map((platform) => (
                <TabsTrigger key={platform} value={platform} className="text-xs">
                  {platform}
                </TabsTrigger>
              ))}
            </TabsList>

            {selectedDisplayPlatforms.map((platform) => {
              const fields = getPlatformFields(platform);
              const hasFields = fields.length > 0;
              
              return (
                <TabsContent key={platform} value={platform} className="mt-4">
                  {!hasFields ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No additional fields needed for {platform}</p>
                      <p className="text-xs mt-1">All required information is in the main listing form.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {fields.map((field) => (
                        <div key={field.name}>
                          <Label className="text-sm flex items-center gap-2">
                            {field.label}
                            {field.isUnique && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                {platform} only
                              </span>
                            )}
                            {field.confidence !== undefined && field.confidence < 0.7 && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                AI uncertain
                              </span>
                            )}
                          </Label>
                          <Input
                            type={field.type}
                            value={platformData[platform]?.[field.name] || field.value || ''}
                            onChange={(e) => handleFieldChange(platform, field.name, e.target.value)}
                            placeholder={field.placeholder || 'Optional'}
                            className="mt-1"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
          ) : null}
        </div>
      )}

      {selectedPlatforms.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Select at least one platform to see preview</p>
        </div>
      )}

      {/* Search Tags (Premium Feature) */}
      {isUnlocked && listing.searchTags && listing.searchTags.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-green-600" />
            <Label className="text-sm font-medium">SEO Search Tags</Label>
            <Badge variant="outline" className="text-xs">
              Ordered by effectiveness
            </Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {listing.searchTags.map((tag: string, index: number) => (
              <Badge
                key={index}
                variant="secondary"
                className={`${
                  index < 5
                    ? 'bg-green-100 text-green-800 border-green-300'
                    : index < 10
                    ? 'bg-gray-100 text-gray-800 border-gray-300'
                    : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                #{index + 1} {tag}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Use these tags in your listings for better search visibility and discoverability.
          </p>
        </div>
      )}
    </div>
  );
}
