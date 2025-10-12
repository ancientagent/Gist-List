
/**
 * Search Indexing Service for Buyer Marketplace
 * 
 * Computes facet-based quality grades and maintains SearchIndex table
 */

import { prisma } from './db';
import type { Listing, SearchIndex } from '@prisma/client';

// ========== FACET GRADING CONFIGURATION ==========

/**
 * Base weights for different facet types
 * These define how important each facet is in the overall grade
 */
const FACET_BASE_WEIGHTS: Record<string, number> = {
  authenticity: 0.35,      // Highest weight - critical for collectibles
  condition: 0.25,         // Second highest - affects value
  provenance: 0.15,        // Documentation/history
  completeness: 0.10,      // Missing parts/accessories
  functionality: 0.10,     // Working condition
  grading: 0.05,           // Official grading (PSA, CGC, etc.)
  default: 0.05,           // Other facets
};

/**
 * Status multipliers for facet verification levels
 */
const STATUS_MULTIPLIERS: Record<string, number> = {
  verified: 1.0,           // AI-verified via close-up or API
  user_supplied: 0.6,      // User provided, not verified
  missing: 0.0,            // Facet not provided
  pending: 0.3,            // Verification in progress
};

/**
 * Condition score modifiers for baseline grading
 */
const CONDITION_MODIFIERS: Record<string, number> = {
  'Brand New': 0.3,
  'Like New': 0.25,
  'Excellent': 0.2,
  'Very Good': 0.15,
  'Good': 0.1,
  'Fair': 0.05,
  'Poor': 0.0,
  'For Parts': 0.0,
};

// ========== TYPES ==========

interface FacetData {
  name: string;
  value: string | number | boolean;
  status: 'verified' | 'user_supplied' | 'missing' | 'pending';
  confidence: number;        // 0-1 from AI
  source: string;            // 'ai', 'user', 'api', 'closeup'
  lastVerifiedAt?: Date;
}

interface GradeSignals {
  facetGrades: Record<string, number>;
  gradeMeta?: {
    system: string;          // "PSA", "CGC", etc.
    value: string;           // "9", "Mint"
    score: number;           // Normalized 0-1
  };
  verifiedFacetCount: number;
  totalFacetTargets: number;
}

interface IndexingResult {
  searchIndex: SearchIndex;
  gradeScore: number;
  verifiedCount: number;
  totalTargets: number;
}

// ========== CORE INDEXING LOGIC ==========

/**
 * Main entry point: Reindex a listing
 */
export async function reindexListing(listingId: string): Promise<IndexingResult | null> {
  try {
    // Load listing with all related data
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        photos: true,
        category_rel: true,
      },
    });

    if (!listing) {
      console.error(`[SearchIndex] Listing ${listingId} not found`);
      return null;
    }

    // Build search index data
    const indexData = await buildSearchIndexData(listing);

    // Upsert SearchIndex
    const searchIndex = await prisma.searchIndex.upsert({
      where: { listingId },
      create: {
        listingId,
        ...indexData,
      },
      update: indexData,
    });

    console.log(`[SearchIndex] Indexed listing ${listingId} with gradeScore=${indexData.gradeScore.toFixed(3)}`);

    return {
      searchIndex,
      gradeScore: indexData.gradeScore,
      verifiedCount: indexData.gradeSignals?.verifiedFacetCount || 0,
      totalTargets: indexData.gradeSignals?.totalFacetTargets || 0,
    };
  } catch (error) {
    console.error(`[SearchIndex] Failed to index listing ${listingId}:`, error);
    return null;
  }
}

/**
 * Build complete search index data structure
 */
async function buildSearchIndexData(listing: any): Promise<{
  title: string;
  searchableText: string;
  category: string;
  subcategory: string | null;
  condition: string;
  priceMin: number | null;
  priceMax: number | null;
  location: string | null;
  geoHash: string | null;
  facets: any;
  highlightedFacets: string[];
  gradeSignals: any;
  gradeScore: number;
  popularityScore: number;
  relevanceScore: number;
  lastIndexedAt: Date;
}> {
  // Extract facets (placeholder - will be populated when facet system is implemented)
  const facets = extractFacets(listing);
  
  // Get seller's highlighted facets (placeholder - from user preferences)
  const highlightedFacets = listing.highlightedFacets || [];
  
  // Compute facet grades
  const gradeSignals = computeGradeSignals(facets, highlightedFacets);
  
  // Calculate composite grade score
  const gradeScore = computeCompositeGrade(facets, highlightedFacets, listing.condition);
  
  // Build searchable text
  const searchableText = buildSearchableText(listing, facets);
  
  // Extract category info
  const category = listing.category || 'Uncategorized';
  const subcategory = listing.category_rel?.parentId ? listing.category_rel.name : null;
  
  // Location data
  const location = formatLocation(listing);
  
  return {
    title: listing.title || 'Untitled',
    searchableText,
    category,
    subcategory,
    condition: listing.condition || 'Unknown',
    priceMin: listing.price || null,
    priceMax: listing.price || null, // For now, same as price
    location,
    geoHash: null, // Placeholder for future geo search
    facets: facets.length > 0 ? facets as any : null,
    highlightedFacets,
    gradeSignals: gradeSignals as any,
    gradeScore,
    popularityScore: 0, // Placeholder
    relevanceScore: 0,  // Placeholder
    lastIndexedAt: new Date(),
  };
}

// ========== FACET EXTRACTION ==========

/**
 * Extract facets from listing
 * Placeholder: This will be enhanced when facet system is fully implemented
 */
function extractFacets(listing: any): FacetData[] {
  const facets: FacetData[] = [];
  
  // Basic facets from existing fields
  if (listing.brand) {
    facets.push({
      name: 'brand',
      value: listing.brand,
      status: 'user_supplied',
      confidence: 0.8,
      source: 'user',
    });
  }
  
  if (listing.condition) {
    facets.push({
      name: 'condition',
      value: listing.condition,
      status: 'user_supplied',
      confidence: 0.9,
      source: 'user',
    });
  }
  
  if (listing.model) {
    facets.push({
      name: 'model',
      value: listing.model,
      status: 'user_supplied',
      confidence: 0.8,
      source: 'user',
    });
  }
  
  // TODO: Load actual facet records from database when facet system is implemented
  // const facetRecords = await prisma.facet.findMany({ where: { listingId: listing.id } });
  
  return facets;
}

// ========== GRADE COMPUTATION ==========

/**
 * Compute per-facet grades and aggregate signals
 */
function computeGradeSignals(
  facets: FacetData[],
  highlightedFacets: string[]
): GradeSignals {
  const facetGrades: Record<string, number> = {};
  let verifiedCount = 0;
  
  // Compute grade for each facet
  facets.forEach((facet) => {
    const baseWeight = FACET_BASE_WEIGHTS[facet.name] || FACET_BASE_WEIGHTS.default;
    const statusMultiplier = STATUS_MULTIPLIERS[facet.status] || 0;
    const grade = baseWeight * facet.confidence * statusMultiplier;
    
    facetGrades[facet.name] = grade;
    
    if (facet.status === 'verified') {
      verifiedCount++;
    }
  });
  
  // Check for special grading facet (PSA, CGC, etc.)
  const gradingFacet = facets.find((f) => f.name === 'grading');
  const gradeMeta = gradingFacet
    ? parseGradingFacet(gradingFacet)
    : undefined;
  
  // Total targets = number of highlighted facets (or all facets if none highlighted)
  const totalFacetTargets = highlightedFacets.length > 0
    ? highlightedFacets.length
    : facets.length;
  
  return {
    facetGrades,
    gradeMeta,
    verifiedFacetCount: verifiedCount,
    totalFacetTargets,
  };
}

/**
 * Calculate composite grade score (0-1)
 */
function computeCompositeGrade(
  facets: FacetData[],
  highlightedFacets: string[],
  condition?: string | null
): number {
  // If no facets, use baseline condition score
  if (facets.length === 0) {
    const conditionMod = CONDITION_MODIFIERS[condition || ''] || 0;
    return Math.min(0.3 + conditionMod, 1.0);
  }
  
  // If seller hasn't highlighted any facets, use baseline
  if (highlightedFacets.length === 0) {
    const conditionMod = CONDITION_MODIFIERS[condition || ''] || 0;
    return Math.min(0.3 + conditionMod, 1.0);
  }
  
  // Calculate weighted average of highlighted facets
  const highlightedGrades = facets
    .filter((f) => highlightedFacets.includes(f.name))
    .map((f) => {
      const baseWeight = FACET_BASE_WEIGHTS[f.name] || FACET_BASE_WEIGHTS.default;
      const statusMultiplier = STATUS_MULTIPLIERS[f.status] || 0;
      return baseWeight * f.confidence * statusMultiplier;
    });
  
  if (highlightedGrades.length === 0) {
    const conditionMod = CONDITION_MODIFIERS[condition || ''] || 0;
    return Math.min(0.3 + conditionMod, 1.0);
  }
  
  const avgGrade = highlightedGrades.reduce((sum, g) => sum + g, 0) / highlightedGrades.length;
  
  // Clamp to 0-1
  return Math.max(0, Math.min(1, avgGrade));
}

/**
 * Parse grading facet for special items (PSA, CGC, etc.)
 */
function parseGradingFacet(facet: FacetData): GradeSignals['gradeMeta'] {
  // Expected format: "PSA 9" or "CGC 9.6"
  const valueStr = String(facet.value);
  const match = valueStr.match(/^([A-Z]+)\s+([\d.]+)$/);
  
  if (!match) {
    return undefined;
  }
  
  const [, system, value] = match;
  
  // Normalize grade to 0-1 (assuming 10-point scale)
  const numericValue = parseFloat(value);
  const score = Math.min(numericValue / 10, 1.0);
  
  return {
    system,
    value,
    score,
  };
}

// ========== TEXT SEARCH ==========

/**
 * Build searchable text blob for full-text search
 */
function buildSearchableText(listing: any, facets: FacetData[]): string {
  const parts: string[] = [];
  
  // Add title
  if (listing.title) {
    parts.push(listing.title);
  }
  
  // Add gist (description summary)
  if (listing.theGist) {
    parts.push(listing.theGist);
  }
  
  // Add condition notes
  if (listing.conditionNotes) {
    parts.push(listing.conditionNotes);
  }
  
  // Add premium facts
  if (listing.premiumFacts) {
    parts.push(listing.premiumFacts);
  }
  
  // Add facet labels
  facets.forEach((facet) => {
    parts.push(`${facet.name}:${facet.value}`);
  });
  
  // Combine and normalize
  return parts
    .join(' ')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove special chars
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .trim();
}

// ========== LOCATION FORMATTING ==========

/**
 * Format location string for display
 */
function formatLocation(listing: any): string | null {
  if (listing.locationCity && listing.locationState) {
    return `${listing.locationCity}, ${listing.locationState}`;
  }
  
  if (listing.location) {
    return listing.location;
  }
  
  return null;
}

// ========== BATCH OPERATIONS ==========

/**
 * Reindex multiple listings (for backfill or bulk updates)
 */
export async function reindexListings(listingIds: string[]): Promise<void> {
  console.log(`[SearchIndex] Reindexing ${listingIds.length} listings...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const listingId of listingIds) {
    const result = await reindexListing(listingId);
    if (result) {
      successCount++;
    } else {
      errorCount++;
    }
  }
  
  console.log(`[SearchIndex] Reindex complete: ${successCount} success, ${errorCount} errors`);
}

/**
 * Reindex all active listings (for backfill)
 */
export async function reindexAllListings(): Promise<void> {
  console.log('[SearchIndex] Starting full reindex...');
  
  const listings = await prisma.listing.findMany({
    where: {
      status: { in: ['ACTIVE', 'POSTED'] },
    },
    select: { id: true },
  });
  
  await reindexListings(listings.map((l) => l.id));
}

// ========== QUEUE MANAGEMENT ==========

/**
 * Queue a listing for reindexing (async job)
 * Placeholder: In production, this would use a job queue (Bull, BullMQ, etc.)
 */
export async function queueReindex(listingId: string, reason: string): Promise<void> {
  console.log(`[SearchIndex] Queued reindex for listing ${listingId}: ${reason}`);
  
  // For now, reindex immediately
  // TODO: Implement proper job queue
  await reindexListing(listingId);
}

/**
 * Trigger reindex when specific fields change
 */
export function shouldReindex(changes: Record<string, any>): boolean {
  const triggerFields = [
    'title',
    'theGist',
    'description',
    'condition',
    'conditionNotes',
    'price',
    'category',
    'location',
    'locationCity',
    'locationState',
    'premiumFacts',
    // Add more trigger fields as needed
  ];
  
  return triggerFields.some((field) => field in changes);
}
