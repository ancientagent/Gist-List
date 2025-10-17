'use client';

import { useRef } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';

// Direct imports for better bundling and tree-shaking
import blinkData from '@/public/assets/gister/lottie/gister_blink.json';
import glowData from '@/public/assets/gister/lottie/gister_glow.json';
import monocleData from '@/public/assets/gister/lottie/gister_monocle.json';

type LottieAnimation = 'blink' | 'glow' | 'monocle';

interface AssistantLottieProps {
  animation: LottieAnimation;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  width?: number;
  height?: number;
  onComplete?: () => void;
}

// Map animation names to imported data
const animationMap: Record<LottieAnimation, any> = {
  blink: blinkData,
  glow: glowData,
  monocle: monocleData,
};

export default function AssistantLottie({
  animation,
  loop = true,
  autoplay = true,
  className = '',
  width = 100,
  height = 100,
  onComplete,
}: AssistantLottieProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const animationData = animationMap[animation];

  return (
    <div className={`gister-lottie-container ${className}`} style={{ width, height }}>
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={loop}
        autoplay={autoplay}
        onComplete={onComplete}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
