'use client';

import { useEffect, useState } from 'react';
import { useRive, Layout } from '@rive-app/react-canvas';
import { pickProp, shouldShowPropForMood, PropKind } from '@/lib/assistant/props';

type GisterMood = 'curious' | 'nudging' | 'exasperated' | 'contrite' | 'reflective' | 'joyful';

interface ListingSnapshot {
  category?: string;
  specialItemCategory?: string;
}

interface AssistantRiveProps {
  mood: GisterMood;
  listing?: ListingSnapshot;
  className?: string;
  width?: number;
  height?: number;
  useFallback?: boolean; // Force SVG fallback for testing
}

// Map mood strings to numeric values for Rive state machine
const moodToNumber = (mood: GisterMood): number => {
  const moodValues: Record<GisterMood, number> = {
    curious: 0,
    nudging: 1,
    exasperated: 2,
    contrite: 3,
    reflective: 4,
    joyful: 5,
  };
  return moodValues[mood];
};

// SVG Fallback Component (until mark1_moods.riv is created)
function GisterFallback({ mood, prop, showProp, width, height }: {
  mood: GisterMood;
  prop: PropKind;
  showProp: boolean;
  width: number;
  height: number;
}) {
  // Mood-specific colors and expressions
  const moodConfig: Record<GisterMood, { bg: string; eyes: string; mouth: string; label: string }> = {
    curious: { bg: '#4CC6C4', eyes: '○  ○', mouth: '  ○', label: 'Curious' },
    nudging: { bg: '#FFD77A', eyes: '^  ^', mouth: ' ‿ ', label: 'Encouraging' },
    exasperated: { bg: '#F47B7B', eyes: '╯  ╯', mouth: ' ︵ ', label: 'Exasperated' },
    contrite: { bg: '#A8A8D8', eyes: '•  •', mouth: ' ︶ ', label: 'Reflective' },
    reflective: { bg: '#4951A5', eyes: '─  ─', mouth: ' — ', label: 'Contemplative' },
    joyful: { bg: '#FFD55C', eyes: '★  ★', mouth: ' ◡ ', label: 'Joyful!' },
  };

  const { bg, eyes, mouth, label } = moodConfig[mood];

  const propLabels: Record<PropKind, string> = {
    0: '',
    1: '🧐', // monocle
    2: '🥽', // goggles
    3: '🎀', // bowtie
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width, height }}>
      {/* Character body */}
      <div
        className="relative rounded-2xl shadow-lg transition-all duration-300"
        style={{
          width: width * 0.8,
          height: height * 0.8,
          backgroundColor: '#B9BAB7',
        }}
      >
        {/* LCD Screen */}
        <div
          className="absolute inset-4 rounded-lg transition-colors duration-500"
          style={{
            background: `linear-gradient(135deg, ${bg}dd, ${bg}aa)`,
          }}
        >
          {/* Face */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-800 font-mono">
            <div className="text-2xl tracking-widest mb-2">{eyes}</div>
            <div className="text-xl">{mouth}</div>
          </div>

          {/* Mood label */}
          <div className="absolute bottom-2 left-0 right-0 text-center text-xs font-semibold text-gray-700 opacity-60">
            {label}
          </div>
        </div>

        {/* LEDs */}
        <div className="absolute top-1 left-2 w-1.5 h-1.5 rounded-full bg-green-400 shadow-sm"></div>
        <div className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full shadow-sm" style={{ backgroundColor: bg }}></div>

        {/* Props overlay */}
        {showProp && prop !== 0 && (
          <div className="absolute -top-4 -right-4 text-4xl animate-bounce">
            {propLabels[prop]}
          </div>
        )}
      </div>

      {/* Placeholder notice */}
      <div className="absolute -bottom-8 left-0 right-0 text-center text-xs text-gray-400">
        SVG Fallback • mark1_moods.riv pending
      </div>
    </div>
  );
}

export default function AssistantRive({
  mood,
  listing,
  className = '',
  width = 200,
  height = 200,
  useFallback = false,
}: AssistantRiveProps) {
  const [riveError, setRiveError] = useState(false);
  const moodNumber = moodToNumber(mood);
  const prop: PropKind = listing ? pickProp(listing) : 0;
  const showProp = shouldShowPropForMood(moodNumber, prop);

  // If fallback is forced or Rive fails, use SVG
  if (useFallback || riveError) {
    return (
      <div className={`gister-rive-container ${className}`} style={{ width, height }}>
        <GisterFallback mood={mood} prop={prop} showProp={showProp} width={width} height={height} />
      </div>
    );
  }

  const { rive, RiveComponent } = useRive({
    src: '/assets/gister/rive/mark1_moods.riv',
    stateMachines: 'GisterMoods',
    layout: new Layout({ fit: 'contain' }),
    autoplay: true,
    onLoadError: () => {
      console.warn('[GISTer] mark1_moods.riv not found, using SVG fallback');
      setRiveError(true);
    },
  });

  // Update mood and prop inputs when props change
  useEffect(() => {
    if (!rive) return;

    const inputs = rive.stateMachineInputs('GisterMoods');
    if (!inputs) return;

    const moodInput = inputs.find(i => i.name === 'mood');
    const propKindInput = inputs.find(i => i.name === 'prop_kind');
    const propToggleInput = inputs.find(i => i.name === 'prop_toggle');

    // Set mood
    if (moodInput && moodInput.type === 'Number') {
      moodInput.value = moodNumber;
      console.log(`GISTer mood → ${mood} (${moodNumber})`);
    }

    // Set prop if listing provided
    if (listing && propKindInput && propToggleInput) {
      if (propKindInput.type === 'Number') {
        propKindInput.value = prop;
      }
      if (propToggleInput.type === 'Boolean') {
        propToggleInput.value = showProp;
      }

      console.log(`GISTer prop → ${prop} (${showProp ? 'visible' : 'hidden'})`);

      // Special case: auto-hide goggles after 800ms when exasperated
      if (showProp && prop === 2 && moodNumber === 3) {
        const timer = setTimeout(() => {
          if (propToggleInput.type === 'Boolean') {
            propToggleInput.value = false;
            console.log('GISTer prop → goggles auto-hidden after exasperation');
          }
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [rive, mood, moodNumber, listing, prop, showProp]);

  return (
    <div className={`gister-rive-container ${className}`} style={{ width, height }}>
      <RiveComponent style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
