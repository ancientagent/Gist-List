export type ConditionKey =
  | 'new'
  | 'likeNew'
  | 'veryGood'
  | 'good'
  | 'fair'
  | 'poor'
  | 'parts';

export interface PriceBands {
  new: number | null;
  likeNew: number | null;
  veryGood: number | null;
  good: number | null;
  fair: number | null;
  poor: number | null;
  parts: number | null;
  lowerBound: number | null;
  upperBound: number | null;
}

export interface LadderInputs {
  newMedian?: number | null;
  usedQ90?: number | null;
  usedQ50?: number | null;
  usedQ10?: number | null;
  partsMedian?: number | null;
}

export interface LadderNudges {
  hasBoxOrManual?: boolean;
  missingPowerSupply?: boolean;
  manualPercentBoost?: number;
  manualPercentPenalty?: number;
}

export interface ComputePriceBandsOptions {
  nudges?: LadderNudges;
}

export interface PriceUpliftsBreakdown {
  total?: number | null;
  special?: number | null;
  facets?: Record<string, number> | null;
}

const CONDITION_ALIAS: Record<string, ConditionKey> = {
  New: 'new',
  'Like New': 'likeNew',
  'Like-New': 'likeNew',
  'Like new': 'likeNew',
  'Very Good': 'veryGood',
  Excellent: 'veryGood',
  Good: 'good',
  Fair: 'fair',
  Poor: 'poor',
  'For Parts': 'parts',
  'For parts': 'parts',
  'For parts / not working': 'parts',
  'For Parts / Not Working': 'parts',
};

const DEFAULT_MANUAL_BOOST = 0.04; // +4%
const DEFAULT_MANUAL_PENALTY = 0.08; // -8%

const toNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return numeric;
};

export const roundToCents = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
};

const clamp = (value: number | null, lower: number | null, upper: number | null): number | null => {
  if (value === null) return null;
  let result = value;
  if (upper !== null && result > upper) {
    result = upper;
  }
  if (lower !== null && result < lower) {
    result = lower;
  }
  return result;
};

const applyNudges = (value: number | null, bounds: { lower: number | null; upper: number | null }, nudges?: LadderNudges): number | null => {
  if (value === null) return null;

  if (!nudges) return roundToCents(clamp(value, bounds.lower, bounds.upper));

  const boostPct = nudges.manualPercentBoost ?? (nudges.hasBoxOrManual ? DEFAULT_MANUAL_BOOST : 0);
  const penaltyPct = nudges.manualPercentPenalty ?? (nudges.missingPowerSupply ? DEFAULT_MANUAL_PENALTY : 0);
  const netPct = boostPct - penaltyPct;

  const adjusted = value * (1 + netPct);
  return roundToCents(clamp(adjusted, bounds.lower, bounds.upper));
};

export const computePriceBands = (
  rawInputs: LadderInputs,
  options?: ComputePriceBandsOptions,
): PriceBands => {
  const newMedian = toNumber(rawInputs.newMedian);
  const usedQ90 = toNumber(rawInputs.usedQ90);
  const usedQ50 = toNumber(rawInputs.usedQ50);
  const usedQ10 = toNumber(rawInputs.usedQ10);
  const partsMedian = toNumber(rawInputs.partsMedian);

  const upperBound = (() => {
    const upperCandidates = [newMedian, usedQ90].filter((v): v is number => typeof v === 'number');
    if (upperCandidates.length === 0) return null;
    return Math.max(...upperCandidates);
  })();

  const lowerBound = usedQ10 ?? null;

  const q80 = (() => {
    if (usedQ50 === null && usedQ90 === null) return null;
    const mid = usedQ50 ?? usedQ90;
    const top = usedQ90 ?? usedQ50;
    if (mid === null || top === null) return null;
    return (2 * mid + top) / 3;
  })();

  const q25 = (() => {
    if (usedQ10 === null && usedQ50 === null) return null;
    const low = usedQ10 ?? usedQ50;
    const mid = usedQ50 ?? usedQ10;
    if (low === null || mid === null) return null;
    return (low + 2 * mid) / 3;
  })();

  const poorBase = (() => {
    const floorFromUsed = usedQ10;
    const floorFromParts = partsMedian !== null ? partsMedian * 1.2 : null;
    const candidates = [floorFromUsed, floorFromParts].filter((v): v is number => typeof v === 'number');
    if (candidates.length === 0) return null;
    return Math.max(...candidates);
  })();

  const bands: PriceBands = {
    new: roundToCents(newMedian),
    likeNew: null,
    veryGood: null,
    good: roundToCents(usedQ50),
    fair: roundToCents(q25),
    poor: roundToCents(poorBase),
    parts: roundToCents(partsMedian),
    lowerBound: roundToCents(lowerBound),
    upperBound: roundToCents(upperBound),
  };

  const likeNewBaseCandidates: number[] = [];
  if (usedQ90 !== null) likeNewBaseCandidates.push(usedQ90);
  if (newMedian !== null) likeNewBaseCandidates.push(newMedian * 0.98);
  if (likeNewBaseCandidates.length > 0) {
    bands.likeNew = roundToCents(Math.min(...likeNewBaseCandidates));
  }

  bands.veryGood = roundToCents(q80 ?? usedQ90 ?? usedQ50 ?? null);

  const usedBounds = { lower: bands.lowerBound, upper: bands.upperBound };
  bands.likeNew = applyNudges(bands.likeNew, usedBounds, options?.nudges) ?? bands.likeNew;
  bands.veryGood = applyNudges(bands.veryGood, usedBounds, options?.nudges) ?? bands.veryGood;
  bands.good = applyNudges(bands.good, usedBounds, options?.nudges) ?? bands.good;
  bands.fair = applyNudges(bands.fair, usedBounds, options?.nudges) ?? bands.fair;
  bands.poor = applyNudges(bands.poor, usedBounds, options?.nudges) ?? bands.poor;

  return bands;
};

export const getSuggestedPrice = (bands: PriceBands | null | undefined, condition: string): number | null => {
  if (!bands) return null;
  const key = CONDITION_ALIAS[condition] ?? null;
  if (!key) return null;
  const value = bands[key];
  return value ?? null;
};

export const computeDelta = (current: number | null | undefined, suggested: number | null | undefined) => {
  if (current === null || current === undefined || suggested === null || suggested === undefined) {
    return null;
  }
  if (!Number.isFinite(current) || !Number.isFinite(suggested)) {
    return null;
  }
  if (suggested === 0) return null;
  const delta = current - suggested;
  const pct = delta / suggested;
  return {
    delta,
    pct,
  };
};

export const ensureUniqueLine = (currentText: string | null | undefined, line: string): string => {
  const existingLines = (currentText || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (existingLines.includes(line.trim())) {
    return existingLines.join('\n');
  }

  return [...existingLines, line.trim()].join('\n');
};

const clampUplift = (value: number | null | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(0.2, Math.max(0, value));
};

export const applyPremiumUplift = (
  basePrice: number | null | undefined,
  uplifts?: PriceUpliftsBreakdown | null,
  condition?: string | null
): number | null => {
  if (basePrice === null || basePrice === undefined || !Number.isFinite(basePrice)) {
    return null;
  }

  const normalized = typeof basePrice === 'number' ? basePrice : Number(basePrice);
  if (!Number.isFinite(normalized)) return null;

  if (!uplifts || typeof uplifts !== 'object') {
    return roundToCents(normalized);
  }

  const conditionText = (condition ?? '').toLowerCase();
  if (conditionText.includes('part')) {
    return roundToCents(normalized);
  }

  const total = clampUplift(uplifts.total ?? null);
  if (total <= 0) {
    return roundToCents(normalized);
  }

  return roundToCents(normalized * (1 + total));
};
