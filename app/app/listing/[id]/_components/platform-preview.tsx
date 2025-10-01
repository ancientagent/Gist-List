
'use client';

import { useState, useEffect } from 'react';
import { Star, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface PlatformField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select';
  required: boolean;
  value?: string;
  options?: string[];
  placeholder?: string;
}

const PLATFORM_FIELDS: Record<string, (category?: string) => PlatformField[]> = {
  'eBay': (category) => {
    const baseFields: PlatformField[] = [
      { name: 'condition', label: 'Condition', type: 'select', required: true, options: ['New', 'Like New', 'Very Good', 'Good', 'Acceptable', 'For Parts'] },
      { name: 'brand', label: 'Brand', type: 'text', required: true },
      { name: 'model', label: 'Model', type: 'text', required: false },
      { name: 'shipping_weight', label: 'Shipping Weight (lbs)', type: 'number', required: true },
      { name: 'handling_time', label: 'Handling Time (days)', type: 'number', required: true, placeholder: 'e.g., 1-3' },
    ];
    
    if (category?.toLowerCase().includes('clothing') || category?.toLowerCase().includes('shoe')) {
      baseFields.push({ name: 'size', label: 'Size', type: 'text', required: true });
      baseFields.push({ name: 'color', label: 'Color', type: 'text', required: true });
    }
    
    if (category?.toLowerCase().includes('electronics')) {
      baseFields.push({ name: 'upc', label: 'UPC/EAN', type: 'text', required: false });
    }
    
    return baseFields;
  },
  'Mercari': (category) => [
    { name: 'condition', label: 'Condition', type: 'select', required: true, options: ['New', 'Like New', 'Good', 'Fair', 'Poor'] },
    { name: 'brand', label: 'Brand', type: 'text', required: true },
    { name: 'size', label: 'Size', type: 'text', required: !!(category?.toLowerCase().includes('clothing') || category?.toLowerCase().includes('shoe')) },
    { name: 'color', label: 'Color', type: 'text', required: !!(category?.toLowerCase().includes('clothing')) },
    { name: 'shipping_weight', label: 'Weight (lbs)', type: 'number', required: true },
  ],
  'Poshmark': (category) => [
    { name: 'brand', label: 'Brand', type: 'text', required: true },
    { name: 'size', label: 'Size', type: 'text', required: true },
    { name: 'color', label: 'Color', type: 'text', required: true },
    { name: 'condition', label: 'Condition', type: 'select', required: true, options: ['New with Tags', 'New without Tags', 'Excellent Used', 'Good Used', 'Fair Used'] },
    { name: 'material', label: 'Material', type: 'text', required: false },
  ],
  'Facebook Marketplace': (category) => [
    { name: 'condition', label: 'Condition', type: 'select', required: true, options: ['New', 'Used - Like New', 'Used - Good', 'Used - Fair'] },
    { name: 'location', label: 'Location', type: 'text', required: true, placeholder: 'City, State' },
  ],
  'OfferUp': (category) => [
    { name: 'condition', label: 'Condition', type: 'select', required: true, options: ['New', 'Like New', 'Good', 'Fair', 'Poor'] },
    { name: 'location', label: 'Location', type: 'text', required: true, placeholder: 'City, State' },
  ],
  'Reverb': (category) => [
    { name: 'brand', label: 'Brand', type: 'text', required: true },
    { name: 'model', label: 'Model', type: 'text', required: true },
    { name: 'year', label: 'Year', type: 'text', required: false },
    { name: 'condition', label: 'Condition', type: 'select', required: true, options: ['Brand New', 'Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor', 'Non-Functioning'] },
    { name: 'finish', label: 'Finish/Color', type: 'text', required: false },
    { name: 'shipping_weight', label: 'Weight (lbs)', type: 'number', required: true },
  ],
  'Vinted': (category) => [
    { name: 'brand', label: 'Brand', type: 'text', required: true },
    { name: 'size', label: 'Size', type: 'text', required: true },
    { name: 'color', label: 'Color', type: 'text', required: true },
    { name: 'condition', label: 'Condition', type: 'select', required: true, options: ['New with tags', 'New without tags', 'Very good', 'Good', 'Satisfactory'] },
  ],
};

export default function PlatformPreview({
  recommendedPlatforms,
  qualifiedPlatforms,
  listingId,
}: {
  recommendedPlatforms: string[];
  qualifiedPlatforms: string[];
  listingId: string;
}) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [platformData, setPlatformData] = useState<Record<string, Record<string, string>>>({});
  const [listingData, setListingData] = useState<any>(null);

  useEffect(() => {
    // Pre-select top 2-3 recommended platforms
    const topRecommended = recommendedPlatforms.slice(0, 3);
    setSelectedPlatforms(topRecommended);
    
    // Fetch listing data
    fetchListingData();
  }, [recommendedPlatforms]);

  const fetchListingData = async () => {
    try {
      const response = await fetch(`/api/listings/${listingId}`);
      const data = await response.json();
      setListingData(data);
    } catch (error) {
      console.error('Failed to fetch listing:', error);
    }
  };

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
    const fieldGenerator = PLATFORM_FIELDS[platform];
    if (!fieldGenerator) return [];
    
    const fields = fieldGenerator(listingData?.category);
    
    // Pre-fill fields with AI-detected data
    return fields.map(field => {
      let value = platformData[platform]?.[field.name] || '';
      
      // Auto-populate from listing data if available
      if (!value) {
        switch (field.name) {
          case 'condition':
            value = listingData?.condition || '';
            break;
          case 'brand':
            // Extract brand from title or description
            value = extractBrand(listingData?.title, listingData?.description) || '';
            break;
          case 'model':
            value = extractModel(listingData?.title, listingData?.description) || '';
            break;
          case 'shipping_weight':
            value = listingData?.weight?.toString() || '';
            break;
          case 'location':
            value = ''; // User needs to provide
            break;
        }
      }
      
      return { ...field, value };
    });
  };

  const extractBrand = (title?: string, description?: string): string => {
    // Simple brand extraction (can be enhanced with AI)
    const text = `${title} ${description}`.toLowerCase();
    const brands = ['nike', 'adidas', 'apple', 'samsung', 'sony', 'lg', 'canon', 'nikon', 'fender', 'gibson'];
    
    for (const brand of brands) {
      if (text.includes(brand)) {
        return brand.charAt(0).toUpperCase() + brand.slice(1);
      }
    }
    return '';
  };

  const extractModel = (title?: string, description?: string): string => {
    // Extract model number patterns (e.g., "iPhone 13", "Galaxy S21")
    const text = `${title} ${description}`;
    const modelPattern = /\b([A-Z0-9]+-?[A-Z0-9]+)\b/;
    const match = text.match(modelPattern);
    return match ? match[1] : '';
  };

  const displayPlatforms = qualifiedPlatforms.length > 0 ? qualifiedPlatforms : Object.keys(PLATFORM_FIELDS);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <h3 className="font-medium mb-4">Platform Preview</h3>
      
      {/* Platform Selection */}
      <div className="mb-6">
        <Label className="mb-3 block text-sm font-medium">Select Platforms to Post</Label>
        <div className="grid grid-cols-2 gap-3">
          {displayPlatforms.map((platform) => {
            const isRecommended = recommendedPlatforms.includes(platform);
            const isSelected = selectedPlatforms.includes(platform);
            
            return (
              <div
                key={platform}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handlePlatformToggle(platform)}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handlePlatformToggle(platform)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{platform}</span>
                    {isRecommended && (
                      <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Platform-Specific Fields */}
      {selectedPlatforms.length > 0 && (
        <div className="space-y-6">
          <div className="border-t pt-4">
            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Required Platform Fields
            </h4>
            <p className="text-xs text-gray-600 mb-4">
              Complete all required fields to ensure successful posting. Missing fields may cause your post to fail.
            </p>
          </div>

          {selectedPlatforms.map((platform) => {
            const fields = getPlatformFields(platform);
            const requiredFields = fields.filter(f => f.required);
            const missingRequired = requiredFields.filter(f => !f.value);
            
            return (
              <div key={platform} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium flex items-center gap-2">
                    {platform}
                    {recommendedPlatforms.includes(platform) && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    )}
                  </h5>
                  {missingRequired.length > 0 && (
                    <span className="text-xs text-red-600 font-medium">
                      {missingRequired.length} required field{missingRequired.length > 1 ? 's' : ''} missing
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {fields.map((field) => (
                    <div key={field.name} className={field.type === 'text' ? 'col-span-2' : ''}>
                      <Label className="text-xs">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {field.type === 'select' ? (
                        <select
                          value={field.value || ''}
                          onChange={(e) => handleFieldChange(platform, field.name, e.target.value)}
                          className={`w-full mt-1 px-3 py-2 text-sm border rounded-md ${
                            field.required && !field.value
                              ? 'border-red-300 bg-red-50'
                              : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select...</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          type={field.type}
                          value={field.value || ''}
                          onChange={(e) => handleFieldChange(platform, field.name, e.target.value)}
                          placeholder={field.placeholder || field.required ? 'Required' : 'Optional'}
                          className={`mt-1 ${
                            field.required && !field.value
                              ? 'border-red-300 bg-red-50'
                              : ''
                          }`}
                        />
                      )}
                      {field.required && !field.value && (
                        <p className="text-xs text-red-600 mt-1">This field is required by {platform}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedPlatforms.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Select at least one platform to see required fields</p>
        </div>
      )}
    </div>
  );
}
