import { ensureUniqueLine } from '@/src/lib/priceLogic';

interface QualityMetrics {
  width: number;
  height: number;
  brightness: number;
  contrast: number;
  sizeKB: number;
}

export interface QualityResult {
  passed: boolean;
  reasons: string[];
  metrics: QualityMetrics;
}

export async function evaluatePhotoQuality(buffer: Buffer): Promise<QualityResult> {
  const sharp = (await import('sharp')).default;
  const base = sharp(buffer);
  const metadata = await base.metadata();
  const stats = await base.clone().stats();

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const brightness = stats.channels?.[0]?.mean ?? 0; // 0-255 scale
  const contrast = stats.channels?.[0]?.stdev ?? 0;
  const sizeKB = buffer.length / 1024;

  const reasons: string[] = [];

  if (width < 640 || height < 640) {
    reasons.push('Photo is too small. Please capture a close-up with better framing.');
  }

  if (brightness < 28) {
    reasons.push('Lighting is too dark. Move to a brighter area or add more light.');
  }

  if (brightness > 240) {
    reasons.push('Photo is overexposed. Reduce glare or avoid direct flash.');
  }

  if (contrast < 12) {
    reasons.push('Image appears soft or blurry. Hold steady or refocus before capturing.');
  }

  if (sizeKB < 40) {
    reasons.push('Image quality is too low. Please capture at a higher resolution.');
  }

  return {
    passed: reasons.length === 0,
    reasons,
    metrics: {
      width,
      height,
      brightness: Number(brightness.toFixed(2)),
      contrast: Number(contrast.toFixed(2)),
      sizeKB: Number(sizeKB.toFixed(1)),
    },
  };
}

type ScoreMap = {
  surface: number;
  function: number;
  clean: number;
  complete: number;
};

export interface PhotoAnalysis {
  summary: string;
  conditionNotes: string | null;
  scores: ScoreMap;
  facetTag?: string | null;
  requirement?: string | null;
}

const DEFAULT_SCORES: ScoreMap = {
  surface: 0.75,
  function: 0.8,
  clean: 0.78,
  complete: 0.76,
};

const clampScore = (value: unknown, fallback: number) => {
  const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(num)) return fallback;
  return Math.min(1, Math.max(0, num));
};

export async function generatePhotoAnalysis(buffer: Buffer, requirement?: string | null, facetTag?: string | null): Promise<PhotoAnalysis> {
  let conditionNotes: string | null = null;
  let summary = 'Photo verified';
  let scores: ScoreMap = { ...DEFAULT_SCORES };

  try {
    const base64Image = buffer.toString('base64');
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
          {
            type: 'text',
            text: `You are a professional resale inspector.
Return a JSON object with:
{
  "summary": short bullet-style headline describing what this photo verifies,
  "condition_notes": 1-2 factual seller-facing sentences (or null),
  "scores": {
    "surface": number between 0 and 1 evaluating exterior surfaces,
    "function": number between 0 and 1 estimating functionality likelihood,
    "clean": number between 0 and 1 grading cleanliness,
    "complete": number between 0 and 1 grading completeness of components
  }
}

Focus only on what is observable in the image.`,
          },
        ],
      },
    ];

    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 250,
        response_format: { type: 'json_object' },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content?.trim();
      if (rawContent) {
        try {
          const parsed = JSON.parse(rawContent);
          if (typeof parsed.summary === 'string' && parsed.summary.trim()) {
            summary = parsed.summary.trim();
          }
          if (typeof parsed.condition_notes === 'string') {
            conditionNotes = parsed.condition_notes.trim() || null;
          }
          if (parsed.scores && typeof parsed.scores === 'object') {
            scores = {
              surface: clampScore(parsed.scores.surface, DEFAULT_SCORES.surface),
              function: clampScore(parsed.scores.function, DEFAULT_SCORES.function),
              clean: clampScore(parsed.scores.clean, DEFAULT_SCORES.clean),
              complete: clampScore(parsed.scores.complete, DEFAULT_SCORES.complete),
            };
          }
        } catch (error) {
          console.error('Failed to parse photo analysis JSON:', error);
        }
      }
    }
  } catch (error) {
    console.error('Photo analysis error:', error);
  }

  const requirementLabel = requirement ? requirement.replace(/[_-]+/g, ' ') : null;
  const summaryParts = [] as string[];
  if (requirementLabel) {
    summaryParts.push(`Verified ${requirementLabel}`);
  }
  if (facetTag) {
    summaryParts.push(facetTag.replace(/[_-]+/g, ' '));
  }
  if (summaryParts.length === 0) {
    summaryParts.push(summary);
  }

  return {
    summary: summaryParts.join(' • '),
    conditionNotes,
    scores,
    facetTag: facetTag ?? null,
    requirement: requirement ?? null,
  };
}

export function appendConditionLine(existing: string | null, line: string): string {
  return ensureUniqueLine(existing ?? '', line);
}
