
'use client';

import { useState, useEffect } from 'react';
import { Star, Info, Crown, Tag, Loader2 } from 'lucide-react';
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
    const category = listing.category?.toLowerCase() || '';

    // Handling time (universal eBay field)
    fields.push({
      name: 'handling_time',
      label: 'Handling Time (days)',
      type: 'number',
      value: listing.handlingTime || '1',
      confidence: listing.handlingTime ? 1 : 0.5,
      isUnique: true,
      placeholder: '1-3'
    });

    // Electronics
    if (category.includes('electronics') || category.includes('computer') || category.includes('phone') || category.includes('camera')) {
      fields.push({
        name: 'upc',
        label: 'UPC/EAN',
        type: 'text',
        value: listing.upc || '',
        confidence: listing.upc ? 1 : 0,
        isUnique: true,
        placeholder: 'Barcode number'
      });
      fields.push({
        name: 'mpn',
        label: 'MPN (Manufacturer Part Number)',
        type: 'text',
        value: listing.mpn || '',
        confidence: 0,
        isUnique: true,
        placeholder: 'e.g., A1234'
      });
    }

    // Books
    if (category.includes('book')) {
      fields.push({
        name: 'isbn',
        label: 'ISBN',
        type: 'text',
        value: listing.isbn || '',
        confidence: 0,
        isUnique: true,
        placeholder: '10 or 13 digit ISBN'
      });
      fields.push({
        name: 'publication_year',
        label: 'Publication Year',
        type: 'text',
        value: listing.year || '',
        confidence: listing.year ? 0.8 : 0,
        placeholder: 'e.g., 2020'
      });
    }

    // Clothing
    if (category.includes('clothing') || category.includes('apparel') || category.includes('fashion')) {
      fields.push({
        name: 'size_type',
        label: 'Size Type',
        type: 'text',
        value: '',
        confidence: 0,
        isUnique: true,
        placeholder: 'Regular, Petite, Plus, Big & Tall'
      });
    }

    // Collectibles
    if (category.includes('collectible') || category.includes('vintage') || category.includes('antique')) {
      fields.push({
        name: 'country_manufacture',
        label: 'Country/Region of Manufacture',
        type: 'text',
        value: '',
        confidence: 0,
        isUnique: true,
        placeholder: 'e.g., United States, Japan'
      });
    }

    return fields;
  },
  'Mercari': (listing) => {
    const fields: PlatformField[] = [];
    const category = listing.category?.toLowerCase() || '';

    // Shipping weight (required for Mercari shipping labels)
    fields.push({
      name: 'shipping_weight',
      label: 'Item Weight (lbs)',
      type: 'number',
      value: listing.weight?.toString() || '',
      confidence: listing.weight ? 1 : 0.3,
      isUnique: true,
      placeholder: 'Required for shipping'
    });

    // Clothing-specific
    if (category.includes('clothing') || category.includes('apparel') || category.includes('fashion')) {
      fields.push({
        name: 'department',
        label: 'Department',
        type: 'text',
        value: '',
        confidence: 0,
        isUnique: true,
        placeholder: 'Women, Men, Kids, Unisex'
      });
    }

    return fields;
  },
  'Poshmark': (listing) => {
    const fields: PlatformField[] = [];
    const category = listing.category?.toLowerCase() || '';

    // Department (required for Poshmark)
    fields.push({
      name: 'department',
      label: 'Department',
      type: 'text',
      value: '',
      confidence: 0,
      isUnique: true,
      placeholder: 'Women, Men, Kids, Home'
    });

    // Original price (unique to Poshmark)
    fields.push({
      name: 'original_price',
      label: 'Original Retail Price',
      type: 'number',
      value: '',
      confidence: 0,
      isUnique: true,
      placeholder: 'What you originally paid'
    });

    // NWT indicator for clothing
    if (category.includes('clothing') || category.includes('apparel') || category.includes('fashion')) {
      fields.push({
        name: 'nwt',
        label: 'New With Tags (NWT)?',
        type: 'text',
        value: '',
        confidence: 0,
        isUnique: true,
        placeholder: 'Yes or No'
      });
    }

    return fields;
  },
  'Facebook Marketplace': (listing) => {
    const fields: PlatformField[] = [];
    const category = listing.category?.toLowerCase() || '';

    // Pickup/Delivery options
    fields.push({
      name: 'fulfillment_options',
      label: 'Fulfillment Options',
      type: 'text',
      value: listing.fulfillmentType === 'local' ? 'Local pickup only' : 'Local pickup or shipping',
      confidence: listing.fulfillmentType ? 0.9 : 0.5,
      isUnique: true,
      placeholder: 'Local pickup, Shipping, or Both'
    });

    // Vehicles need special fields
    if (category.includes('car') || category.includes('vehicle') || category.includes('auto')) {
      fields.push({
        name: 'mileage',
        label: 'Mileage',
        type: 'number',
        value: '',
        confidence: 0,
        isUnique: true,
        placeholder: 'e.g., 50000'
      });
      fields.push({
        name: 'vin',
        label: 'VIN',
        type: 'text',
        value: '',
        confidence: 0,
        isUnique: true,
        placeholder: '17-character VIN'
      });
    }

    return fields;
  },
  'OfferUp': (listing) => {
    const fields: PlatformField[] = [];
    const category = listing.category?.toLowerCase() || '';

    // Firm price indicator
    fields.push({
      name: 'firm_price',
      label: 'Firm Price?',
      type: 'text',
      value: '',
      confidence: 0,
      isUnique: true,
      placeholder: 'Yes or No (negotiable)'
    });

    // Vehicles
    if (category.includes('car') || category.includes('vehicle') || category.includes('auto')) {
      fields.push({
        name: 'mileage',
        label: 'Mileage',
        type: 'number',
        value: '',
        confidence: 0,
        isUnique: true,
        placeholder: 'e.g., 50000'
      });
    }

    return fields;
  },
  'Craigslist': (listing) => {
    const fields: PlatformField[] = [];
    const category = listing.category?.toLowerCase() || '';

    // Neighborhood/Area (important for local pickup)
    fields.push({
      name: 'neighborhood',
      label: 'Neighborhood/Area',
      type: 'text',
      value: listing.location || '',
      confidence: listing.location ? 0.8 : 0,
      isUnique: true,
      placeholder: 'e.g., Downtown, Westside'
    });

    // Delivery option
    fields.push({
      name: 'delivery_available',
      label: 'Delivery Available?',
      type: 'text',
      value: '',
      confidence: 0,
      isUnique: true,
      placeholder: 'Yes or No'
    });

    // VIN for vehicles
    if (category.includes('car') || category.includes('vehicle') || category.includes('auto')) {
      fields.push({
        name: 'vin',
        label: 'VIN',
        type: 'text',
        value: '',
        confidence: 0,
        isUnique: true,
        placeholder: '17-character VIN'
      });
      fields.push({
        name: 'mileage',
        label: 'Mileage',
        type: 'number',
        value: '',
        confidence: 0,
        isUnique: true,
        placeholder: 'e.g., 50000'
      });
    }

    return fields;
  },
  'Nextdoor': (listing) => {
    const fields: PlatformField[] = [];
    const category = listing.category?.toLowerCase() || '';

    // Pickup details (critical for Nextdoor)
    fields.push({
      name: 'pickup_instructions',
      label: 'Pickup Instructions',
      type: 'text',
      value: listing.meetupPreference || '',
      confidence: listing.meetupPreference ? 0.8 : 0,
      isUnique: true,
      placeholder: 'e.g., Front porch pickup, contact first'
    });

    // Cross-posted indicator
    fields.push({
      name: 'cross_posted',
      label: 'Cross-posted elsewhere?',
      type: 'text',
      value: '',
      confidence: 0,
      isUnique: true,
      placeholder: 'Yes or No (transparency for neighbors)'
    });

    return fields;
  },
  'Reverb': (listing) => {
    const fields: PlatformField[] = [];
    const category = listing.category?.toLowerCase() || '';

    // Year (important for instruments)
    fields.push({
      name: 'year',
      label: 'Year',
      type: 'text',
      value: listing.year || '',
      confidence: listing.year ? 0.9 : 0,
      isUnique: true,
      placeholder: 'e.g., 2015 or 1980s'
    });

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

    // Country of manufacture
    fields.push({
      name: 'country_manufacture',
      label: 'Country/Region of Manufacture',
      type: 'text',
      value: '',
      confidence: 0,
      isUnique: true,
      placeholder: 'e.g., USA, Japan, Mexico'
    });

    // Handedness (for guitars/basses)
    if (category.includes('guitar') || category.includes('bass')) {
      fields.push({
        name: 'handedness',
        label: 'Handedness',
        type: 'text',
        value: '',
        confidence: 0,
        isUnique: true,
        placeholder: 'Right-Handed or Left-Handed'
      });
    }

    // Includes (accessories)
    fields.push({
      name: 'includes',
      label: 'Includes',
      type: 'text',
      value: '',
      confidence: 0,
      isUnique: true,
      placeholder: 'e.g., Hard case, cables, manual'
    });

    return fields;
  },
  'Vinted': (listing) => {
    const fields: PlatformField[] = [];
    const category = listing.category?.toLowerCase() || '';

    // Package size (required for Vinted shipping)
    fields.push({
      name: 'package_size',
      label: 'Package Size',
      type: 'text',
      value: '',
      confidence: 0,
      isUnique: true,
      placeholder: 'Small, Medium, Large, Extra Large'
    });

    // Clothing-specific fields
    if (category.includes('clothing') || category.includes('apparel') || category.includes('fashion')) {
      fields.push({
        name: 'gender',
        label: 'Gender',
        type: 'text',
        value: '',
        confidence: 0,
        isUnique: true,
        placeholder: 'Women, Men, Unisex'
      });
    }

    return fields;
  },
};

// Free tier platforms
const FREE_TIER_PLATFORMS = ['eBay', 'Reverb', 'Etsy'];

// Platform connection status interface
interface PlatformConnectionStatus {
  eBay: boolean;
  Reverb: boolean;
  Etsy: boolean;
}

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
  const [connectedPlatforms, setConnectedPlatforms] = useState<PlatformConnectionStatus>({
    eBay: false,
    Reverb: false,
    Etsy: false,
  });
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  
  // Check if premium features are unlocked for this listing
  const isPremiumUnlocked = listing.usePremium === true;
  
  // Free tier: max 3 platforms, Premium: unlimited
  const MAX_PLATFORMS_FREE = 3;

  // Fetch platform connection status
  useEffect(() => {
    const fetchConnectionStatus = async () => {
      try {
        const [ebayRes, reverbRes, etsyRes] = await Promise.all([
          fetch('/api/marketplace/ebay/status'),
          fetch('/api/marketplace/reverb/status'),
          fetch('/api/marketplace/etsy/status'),
        ]);

        const [ebayData, reverbData, etsyData] = await Promise.all([
          ebayRes.json(),
          reverbRes.json(),
          etsyRes.json(),
        ]);

        setConnectedPlatforms({
          eBay: ebayData.connected || false,
          Reverb: reverbData.connected || false,
          Etsy: etsyData.connected || false,
        });
      } catch (error) {
        console.error('Failed to fetch connection status:', error);
      } finally {
        setIsLoadingConnections(false);
      }
    };

    fetchConnectionStatus();
  }, []);

  useEffect(() => {
    // Pre-select top 2-3 recommended platforms that are connected
    const topRecommended = recommendedPlatforms
      .filter(platform => FREE_TIER_PLATFORMS.includes(platform))
      .filter(platform => connectedPlatforms[platform as keyof PlatformConnectionStatus])
      .slice(0, 3);
    setSelectedPlatforms(topRecommended);
  }, [recommendedPlatforms, connectedPlatforms]);

  const handlePlatformToggle = (platform: string) => {
    // Check if platform is connected
    const isConnected = connectedPlatforms[platform as keyof PlatformConnectionStatus];
    if (!isConnected) {
      toast.info(`Please connect your ${platform} account in Settings first!`, {
        icon: '🔗',
      });
      return;
    }

    // Check if platform is allowed in free tier (unless premium is unlocked)
    if (!isPremiumUnlocked && !FREE_TIER_PLATFORMS.includes(platform)) {
      toast.info(`${platform} requires Premium features. Use a premium post to unlock!`, {
        icon: '⭐',
      });
      return;
    }

    setSelectedPlatforms(prev => {
      const isCurrentlySelected = prev.includes(platform);
      
      if (isCurrentlySelected) {
        // Deselecting - always allowed
        return prev.filter(p => p !== platform);
      } else {
        // Selecting - check limits
        if (!isPremiumUnlocked && prev.length >= MAX_PLATFORMS_FREE) {
          toast.info(`Free tier limited to ${MAX_PLATFORMS_FREE} platforms. Upgrade to Premium to unlock more!`, {
            icon: '⭐',
          });
          return prev;
        }
        return [...prev, platform];
      }
    });
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

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-medium text-base">Platforms to Post</h3>
        {isPremiumUnlocked && (
          <Badge className="bg-green-600 text-white">
            <Crown className="w-3 h-3 mr-1" />
            Premium
          </Badge>
        )}
      </div>

      {/* Platform Selection */}
      <div className="mb-6">
        {isLoadingConnections ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {displayPlatforms.map((platform, index) => {
              const isRecommended = recommendedPlatforms.includes(platform);
              const isSelected = selectedPlatforms.includes(platform);
              const isConnected = connectedPlatforms[platform as keyof PlatformConnectionStatus];
              const isFreeTier = FREE_TIER_PLATFORMS.includes(platform);
              
              // Can select if:
              // 1. Platform is connected
              // 2. AND (Platform is in free tier OR premium is unlocked)
              const canSelect = isConnected && (isFreeTier || isPremiumUnlocked);
              
              return (
                <div
                  key={platform}
                  className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-all ${
                    canSelect ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
                  } ${
                    isSelected
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    if (canSelect) {
                      handlePlatformToggle(platform);
                    } else {
                      handlePlatformToggle(platform); // Will show appropriate toast
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
                      <span className="font-medium text-xs truncate">
                        {platform === 'Facebook Marketplace' ? 'FB Marketplace' : platform}
                      </span>
                      {isRecommended && isConnected && (
                        <Star className="w-3 h-3 fill-green-500 text-green-500 flex-shrink-0" />
                      )}
                      {!isConnected && (
                        <span className="text-[10px] text-red-600 flex-shrink-0">🔒</span>
                      )}
                      {isConnected && !isFreeTier && !isPremiumUnlocked && (
                        <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Platform-Specific Fields with Tabs - PREMIUM ONLY */}
      {isPremiumUnlocked && selectedDisplayPlatforms.length > 0 && (
        <div className="border-t pt-4">
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
        </div>
      )}

      {selectedPlatforms.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Select at least one platform to see preview</p>
        </div>
      )}

      {/* SEO Search Tags - PREMIUM ONLY */}
      {isPremiumUnlocked && listing.searchTags && listing.searchTags.length > 0 && (
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
