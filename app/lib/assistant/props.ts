/**
 * GISTer Props Mapping System
 *
 * Maps listing categories to visual props (monocle, goggles, bowtie)
 * and controls their visibility based on mood state.
 *
 * See: /public/assets/gister/rive/PROPS_SPEC.md
 */

export type PropKind = 0 | 1 | 2 | 3; // 0=none, 1=monocle, 2=goggles, 3=bowtie

export const PROP_NAMES: Record<PropKind, string> = {
  0: 'none',
  1: 'monocle',
  2: 'goggles',
  3: 'bowtie',
};

export type GisterMood = 'neutral' | 'curious' | 'encouraging' | 'exasperated' | 'contrite' | 'reflective' | 'joyful';

export const MOOD_TO_NUMBER: Record<GisterMood, number> = {
  neutral: 0,
  curious: 1,
  encouraging: 2,
  exasperated: 3,
  contrite: 4,
  reflective: 5,
  joyful: 6,
};

interface ListingSnapshot {
  category?: string;
  specialItemCategory?: string;
}

/**
 * Determines which prop to show based on listing category.
 *
 * Priority: Monocle → Goggles → Bowtie → None
 *
 * @param listing - Listing with category and specialItemCategory
 * @returns PropKind (0=none, 1=monocle, 2=goggles, 3=bowtie)
 */
export function pickProp(listing: ListingSnapshot): PropKind {
  const cat = (listing.category || '').toLowerCase();
  const special = (listing.specialItemCategory || '').toLowerCase();

  // Monocle: Luxury items, jewelry, watches, gems (appraiser mode)
  if (special === 'luxury' || ['jewelry', 'watches', 'gems'].some(k => cat.includes(k))) {
    return 1;
  }

  // Goggles: Electronics (bench tech / repair energy)
  if (['electronics', 'vintage electronics', 'cameras', 'audio'].some(k => cat.includes(k))) {
    return 2;
  }

  // Bowtie: Vintage, antiques, collectibles, instruments (curator/archivist tone)
  if (
    special === 'vintage' ||
    [
      'antiques',
      'furniture',
      'historical',
      'collectibles',
      'ephemera',
      'instruments',
      'pro audio gear',
      'trading cards',
      'comics',
    ].some(k => cat.includes(k))
  ) {
    return 3;
  }

  // Dolls: explicitly no props (let copy deliver the gag)
  if (['dolls', 'toys (plush/dolls)'].some(k => cat.includes(k))) {
    return 0;
  }

  // Default: no prop (minimalism)
  return 0;
}

/**
 * Determines if a prop should be visible for the current mood.
 *
 * Mood visibility matrix:
 * - Neutral: all hidden
 * - Curious: all shown
 * - Encouraging: monocle/bowtie (subtle), no goggles
 * - Exasperated: only goggles (brief)
 * - Contrite: all hidden
 * - Reflective: monocle/bowtie (dim), no goggles
 * - Joyful: all shown (quick)
 *
 * @param mood - Mood number (0-6)
 * @param kind - Prop kind (0-3)
 * @returns true if prop should be visible
 */
export function shouldShowPropForMood(mood: number, kind: PropKind): boolean {
  if (kind === 0) return false;

  switch (mood) {
    case 0: // neutral
      return false;
    case 1: // curious
      return true;
    case 2: // encouraging
      return kind !== 2; // no goggles on encouraging
    case 3: // exasperated
      return kind === 2; // only goggles briefly
    case 4: // contrite
      return false;
    case 5: // reflective
      return kind !== 2; // dim monocle/bowtie, no goggles
    case 6: // joyful
      return true; // quick show for all
    default:
      return false;
  }
}

/**
 * Get prop opacity multiplier for mood-specific variants.
 *
 * @param mood - Mood number (0-6)
 * @returns Opacity multiplier (0.6 for dim, 1.0 for normal)
 */
export function getPropOpacityForMood(mood: number): number {
  // Reflective mood: dim to 0.6
  if (mood === 5) return 0.6;
  // All others: full opacity
  return 1.0;
}
