'use client';

import { useState } from 'react';
import AssistantRive from '@/components/assistant/AssistantRive';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { pickProp, shouldShowPropForMood, PROP_NAMES } from '@/lib/assistant/props';

type GisterMood = 'curious' | 'nudging' | 'exasperated' | 'contrite' | 'reflective' | 'joyful';

interface CategoryOption {
  label: string;
  category: string;
  specialItemCategory?: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { label: 'Jewelry (Monocle)', category: 'Jewelry' },
  { label: 'Luxury Watch (Monocle)', category: 'Watches', specialItemCategory: 'luxury' },
  { label: 'Vintage Electronics (Goggles)', category: 'Vintage Electronics' },
  { label: 'Camera Equipment (Goggles)', category: 'Cameras' },
  { label: 'Vintage Furniture (Bowtie)', category: 'Furniture', specialItemCategory: 'vintage' },
  { label: 'Antique Clock (Bowtie)', category: 'Antiques' },
  { label: 'Musical Instruments (Bowtie)', category: 'Instruments' },
  { label: 'Trading Cards (Bowtie)', category: 'Trading Cards' },
  { label: 'Dolls (No Prop)', category: 'Dolls' },
  { label: 'Generic Item (No Prop)', category: 'General' },
];

export default function GisterPropsTest() {
  const [currentMood, setCurrentMood] = useState<GisterMood>('curious');
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption>(CATEGORY_OPTIONS[0]);

  const moods: GisterMood[] = ['curious', 'nudging', 'exasperated', 'contrite', 'reflective', 'joyful'];

  const moodDescriptions: Record<GisterMood, string> = {
    curious: 'First special item detection - eyes wide, questioning',
    nudging: 'Second prompt - friendly smile, encouraging',
    exasperated: 'Third decline - eye roll, hands on hips',
    contrite: 'After exasperation - sheepish, apologetic',
    reflective: 'End of session - calm, contemplative',
    joyful: 'Premium analysis success - excited, bouncing',
  };

  const propKind = pickProp(selectedCategory);
  const propName = PROP_NAMES[propKind];
  const moodNumber = moods.indexOf(currentMood);
  const isVisible = shouldShowPropForMood(moodNumber + 1, propKind);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">GISTer Props Test</h1>
          <p className="text-gray-600">Test prop mapping and mood visibility matrix</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Animation Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Animation Preview</CardTitle>
              <CardDescription>
                Current: {currentMood} • {selectedCategory.label}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Animation Display */}
              <div className="flex justify-center bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg p-8 min-h-[350px] items-center">
                <AssistantRive
                  mood={currentMood}
                  listing={selectedCategory}
                  width={280}
                  height={280}
                  useFallback={true}
                />
              </div>

              {/* Prop Status */}
              <div className="space-y-2 bg-slate-50 p-4 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Detected Prop:</span>
                  <Badge variant="outline" className="text-base capitalize">
                    {propName}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Visibility:</span>
                  <Badge variant={isVisible ? 'default' : 'secondary'}>
                    {isVisible ? 'Visible' : 'Hidden'}
                  </Badge>
                </div>
                {propKind === 2 && currentMood === 'exasperated' && isVisible && (
                  <div className="text-xs text-amber-600 mt-2">
                    ⚠️ Goggles will auto-hide after 800ms in exasperated mood
                  </div>
                )}
              </div>

              {/* Current Mood Info */}
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">{moodDescriptions[currentMood]}</p>
              </div>
            </CardContent>
          </Card>

          {/* Right: Controls */}
          <div className="space-y-8">
            {/* Category Selector */}
            <Card>
              <CardHeader>
                <CardTitle>Category Selection</CardTitle>
                <CardDescription>Choose a listing category to test prop mapping</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={selectedCategory.label}
                  onValueChange={(value) => {
                    const option = CATEGORY_OPTIONS.find(o => o.label === value);
                    if (option) setSelectedCategory(option);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.label} value={option.label}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="text-xs text-gray-500 space-y-1">
                  <div><strong>Category:</strong> {selectedCategory.category}</div>
                  {selectedCategory.specialItemCategory && (
                    <div><strong>Special:</strong> {selectedCategory.specialItemCategory}</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mood Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Mood Selection</CardTitle>
                <CardDescription>Switch between different mood states</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {moods.map((mood) => (
                    <Button
                      key={mood}
                      onClick={() => setCurrentMood(mood)}
                      variant={currentMood === mood ? 'default' : 'outline'}
                      size="sm"
                      className="capitalize"
                    >
                      {mood}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Visibility Matrix */}
            <Card>
              <CardHeader>
                <CardTitle>Visibility Matrix</CardTitle>
                <CardDescription>Prop visibility by mood</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Mood</th>
                        <th className="text-center py-2">Monocle</th>
                        <th className="text-center py-2">Goggles</th>
                        <th className="text-center py-2">Bowtie</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600">
                      <tr><td>Neutral</td><td className="text-center">❌</td><td className="text-center">❌</td><td className="text-center">❌</td></tr>
                      <tr><td>Curious</td><td className="text-center">✅</td><td className="text-center">✅</td><td className="text-center">✅</td></tr>
                      <tr><td>Nudging</td><td className="text-center">✅</td><td className="text-center">❌</td><td className="text-center">✅</td></tr>
                      <tr><td>Exasperated</td><td className="text-center">❌</td><td className="text-center">⏱️</td><td className="text-center">❌</td></tr>
                      <tr><td>Contrite</td><td className="text-center">❌</td><td className="text-center">❌</td><td className="text-center">❌</td></tr>
                      <tr><td>Reflective</td><td className="text-center">🔅</td><td className="text-center">❌</td><td className="text-center">🔅</td></tr>
                      <tr><td>Joyful</td><td className="text-center">✅</td><td className="text-center">✅</td><td className="text-center">✅</td></tr>
                    </tbody>
                  </table>
                  <div className="mt-3 text-gray-500">
                    <div>✅ = visible • ❌ = hidden</div>
                    <div>🔅 = dim (0.6 opacity) • ⏱️ = brief (auto-hide 800ms)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Prop Priority Info */}
        <Card>
          <CardHeader>
            <CardTitle>Prop Selection Priority</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-2">
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <strong className="text-amber-600">1. Monocle</strong>
                <div className="text-xs text-gray-600 mt-1">
                  Luxury, Jewelry, Watches, Gems
                </div>
              </div>
              <div>
                <strong className="text-cyan-600">2. Goggles</strong>
                <div className="text-xs text-gray-600 mt-1">
                  Electronics, Cameras, Audio
                </div>
              </div>
              <div>
                <strong className="text-purple-600">3. Bowtie</strong>
                <div className="text-xs text-gray-600 mt-1">
                  Vintage, Antiques, Collectibles, Instruments
                </div>
              </div>
              <div>
                <strong className="text-gray-600">4. None</strong>
                <div className="text-xs text-gray-600 mt-1">
                  Dolls, Generic items
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
