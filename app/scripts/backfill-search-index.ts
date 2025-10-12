
/**
 * Backfill Search Index
 * 
 * One-time script to populate SearchIndex for existing listings
 * 
 * Usage:
 *   tsx scripts/backfill-search-index.ts [--limit=N] [--status=ACTIVE,POSTED]
 */

import { prisma } from '../lib/db';
import { reindexListing } from '../lib/search-indexing';

interface BackfillOptions {
  limit?: number;
  status?: string[];
  skipExisting?: boolean;
}

interface BackfillStats {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  duration: number;
}

async function backfillSearchIndex(options: BackfillOptions = {}): Promise<BackfillStats> {
  const startTime = Date.now();
  
  console.log('🚀 Starting SearchIndex backfill...');
  console.log('Options:', JSON.stringify(options, null, 2));
  
  // Build query
  const where: any = {};
  
  if (options.status && options.status.length > 0) {
    where.status = { in: options.status };
  } else {
    // Default: only active and posted listings
    where.status = { in: ['ACTIVE', 'POSTED'] };
  }
  
  // Get listings to backfill
  const listings = await prisma.listing.findMany({
    where,
    select: { 
      id: true,
      title: true,
      status: true,
      searchIndex: { select: { id: true } }
    },
    orderBy: { createdAt: 'asc' },
    take: options.limit,
  });
  
  console.log(`\n📊 Found ${listings.length} listings to process\n`);
  
  const stats: BackfillStats = {
    total: listings.length,
    successful: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
  };
  
  // Process each listing
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const progress = `[${i + 1}/${listings.length}]`;
    
    // Skip if already indexed and skipExisting is true
    if (options.skipExisting && listing.searchIndex) {
      console.log(`${progress} ⏭️  Skipping ${listing.id} (already indexed)`);
      stats.skipped++;
      continue;
    }
    
    try {
      const result = await reindexListing(listing.id);
      
      if (result) {
        console.log(
          `${progress} ✅ ${listing.id} | ${listing.title?.substring(0, 40) || 'Untitled'} | ` +
          `grade=${result.gradeScore.toFixed(3)} | ${result.verifiedCount}/${result.totalTargets} verified`
        );
        stats.successful++;
      } else {
        console.log(`${progress} ❌ ${listing.id} | Failed to index`);
        stats.failed++;
      }
    } catch (error) {
      console.error(`${progress} ❌ ${listing.id} | Error:`, error);
      stats.failed++;
    }
    
    // Rate limiting: pause every 50 listings to avoid overwhelming the database
    if ((i + 1) % 50 === 0) {
      console.log(`\n⏸️  Pausing for 1 second (processed ${i + 1} listings)...\n`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  stats.duration = Date.now() - startTime;
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 Backfill Summary:');
  console.log('='.repeat(60));
  console.log(`Total:      ${stats.total}`);
  console.log(`Successful: ${stats.successful} (${((stats.successful / stats.total) * 100).toFixed(1)}%)`);
  console.log(`Failed:     ${stats.failed}`);
  console.log(`Skipped:    ${stats.skipped}`);
  console.log(`Duration:   ${(stats.duration / 1000).toFixed(1)}s`);
  console.log('='.repeat(60));
  
  return stats;
}

// ========== CLI ENTRY POINT ==========

async function main() {
  const args = process.argv.slice(2);
  const options: BackfillOptions = {
    skipExisting: false,
  };
  
  // Parse CLI arguments
  for (const arg of args) {
    if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.replace('--limit=', ''), 10);
    } else if (arg.startsWith('--status=')) {
      options.status = arg.replace('--status=', '').split(',');
    } else if (arg === '--skip-existing') {
      options.skipExisting = true;
    } else if (arg === '--help') {
      console.log(`
Usage: tsx scripts/backfill-search-index.ts [OPTIONS]

Options:
  --limit=N              Limit number of listings to process (default: all)
  --status=STATUS1,...   Filter by listing status (default: ACTIVE,POSTED)
  --skip-existing        Skip listings that are already indexed
  --help                 Show this help message

Examples:
  tsx scripts/backfill-search-index.ts
  tsx scripts/backfill-search-index.ts --limit=100
  tsx scripts/backfill-search-index.ts --status=DRAFT,ACTIVE,POSTED
  tsx scripts/backfill-search-index.ts --skip-existing --limit=1000
      `);
      process.exit(0);
    }
  }
  
  try {
    await backfillSearchIndex(options);
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { backfillSearchIndex };
