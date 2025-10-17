'use client';

import { useState } from 'react';
import AssistantRive from '@/components/assistant/AssistantRive';
import AssistantLottie from '@/components/assistant/AssistantLottie';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type GisterMood = 'curious' | 'nudging' | 'exasperated' | 'contrite' | 'reflective' | 'joyful';
type LottieAnimation = 'blink' | 'glow' | 'monocle';

export default function GisterAnimationTest() {
  const [currentMood, setCurrentMood] = useState<GisterMood>('curious');
  const [currentLottie, setCurrentLottie] = useState<LottieAnimation>('blink');
  const [showLottie, setShowLottie] = useState(true);

  const moods: GisterMood[] = ['curious', 'nudging', 'exasperated', 'contrite', 'reflective', 'joyful'];
  const lottieAnimations: LottieAnimation[] = ['blink', 'glow', 'monocle'];

  const moodDescriptions: Record<GisterMood, string> = {
    curious: 'First special item detection - eyes wide, questioning',
    nudging: 'Second prompt - friendly smile, encouraging',
    exasperated: 'Third decline - eye roll, hands on hips',
    contrite: 'After exasperation - sheepish, apologetic',
    reflective: 'End of session - calm, contemplative',
    joyful: 'Premium analysis success - excited, bouncing',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">GISTer Animation Test</h1>
          <p className="text-gray-600">Preview Rive moods and Lottie loops</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Rive Mood Tester */}
          <Card>
            <CardHeader>
              <CardTitle>Rive Mood States</CardTitle>
              <CardDescription>
                State machine with 6 moods (mark1_moods.riv)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Animation Display */}
              <div className="flex justify-center bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg p-8 min-h-[300px] items-center">
                <AssistantRive mood={currentMood} width={250} height={250} useFallback={true} />
              </div>

              {/* Current Mood Info */}
              <div className="text-center space-y-2">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {currentMood}
                </Badge>
                <p className="text-sm text-gray-600">{moodDescriptions[currentMood]}</p>
              </div>

              {/* Mood Controls */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Switch Mood:</p>
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
              </div>

              {/* Performance Note */}
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                <strong>Target:</strong> Mood transitions &lt;150ms • No layout shift
              </div>
            </CardContent>
          </Card>

          {/* Lottie Loop Tester */}
          <Card>
            <CardHeader>
              <CardTitle>Lottie Micro-Loops</CardTitle>
              <CardDescription>
                Marketing and ambient animations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Animation Display */}
              <div className="flex justify-center bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg p-8 min-h-[300px] items-center">
                {showLottie ? (
                  <AssistantLottie
                    animation={currentLottie}
                    loop={true}
                    autoplay={true}
                    width={250}
                    height={250}
                  />
                ) : (
                  <div className="text-gray-400">Lottie paused</div>
                )}
              </div>

              {/* Current Animation Info */}
              <div className="text-center space-y-2">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {currentLottie}.json
                </Badge>
              </div>

              {/* Lottie Controls */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Select Animation:</p>
                <div className="grid grid-cols-3 gap-2">
                  {lottieAnimations.map((anim) => (
                    <Button
                      key={anim}
                      onClick={() => setCurrentLottie(anim)}
                      variant={currentLottie === anim ? 'default' : 'outline'}
                      size="sm"
                      className="capitalize"
                    >
                      {anim}
                    </Button>
                  ))}
                </div>

                <Button
                  onClick={() => setShowLottie(!showLottie)}
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                >
                  {showLottie ? 'Pause' : 'Play'}
                </Button>
              </div>

              {/* Animation Descriptions */}
              <div className="text-xs space-y-1 bg-gray-50 p-3 rounded">
                <div><strong>blink:</strong> Idle micro-loop (2-3s)</div>
                <div><strong>glow:</strong> Analysis/discovery particle effect</div>
                <div><strong>monocle:</strong> Luxury item appraisal mode</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Combined Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Combined Preview</CardTitle>
            <CardDescription>
              Rive character + Lottie overlay (as it would appear in production)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center bg-gradient-to-br from-purple-200 to-blue-200 rounded-lg p-8 min-h-[350px] items-center relative">
              {/* Rive Base */}
              <div className="relative">
                <AssistantRive mood={currentMood} width={300} height={300} useFallback={true} />

                {/* Lottie Overlay (positioned absolutely) */}
                {showLottie && (
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
                    <AssistantLottie
                      animation={currentLottie}
                      loop={true}
                      autoplay={true}
                      width={300}
                      height={300}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Asset Info */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <strong>Rive File:</strong>
                <div className="text-gray-600">
                  /public/assets/gister/rive/mark1_moods.riv
                </div>
                <div className="text-xs text-gray-500">Max 200KB • State machine: GisterMoods</div>
              </div>
              <div>
                <strong>Lottie Files:</strong>
                <div className="text-gray-600">
                  /public/assets/gister/lottie/*.json
                </div>
                <div className="text-xs text-gray-500">Max 50KB each • JSON format</div>
              </div>
              <div>
                <strong>Bundle Impact:</strong>
                <div className="text-gray-600">
                  Target: &lt;150KB gzipped
                </div>
                <div className="text-xs text-gray-500">Rive: ~80KB • Lottie runtime: ~40KB</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
