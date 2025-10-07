
// Profit estimation utilities

export interface PlatformFees {
  platform: string;
  sellingFeePercent: number;  // % of sale price
  fixedFee: number;           // Fixed fee per transaction
  paymentProcessingPercent: number; // Payment processing %
  paymentProcessingFixed: number;   // Payment processing fixed fee
}

// Platform fee structures (as of 2025)
export const PLATFORM_FEES: Record<string, PlatformFees> = {
  'eBay': {
    platform: 'eBay',
    sellingFeePercent: 12.9,  // Average final value fee
    fixedFee: 0.30,
    paymentProcessingPercent: 2.9,
    paymentProcessingFixed: 0.30,
  },
  'Mercari': {
    platform: 'Mercari',
    sellingFeePercent: 12.9,  // 12.9% selling fee
    fixedFee: 0,
    paymentProcessingPercent: 2.9,
    paymentProcessingFixed: 0.30,
  },
  'Poshmark': {
    platform: 'Poshmark',
    sellingFeePercent: 20,    // 20% for sales over $15
    fixedFee: 0,
    paymentProcessingPercent: 0, // Included in selling fee
    paymentProcessingFixed: 0,
  },
  'Facebook Marketplace': {
    platform: 'Facebook Marketplace',
    sellingFeePercent: 0,     // Free for local sales
    fixedFee: 0,
    paymentProcessingPercent: 0,
    paymentProcessingFixed: 0,
  },
  'OfferUp': {
    platform: 'OfferUp',
    sellingFeePercent: 12.9,  // For shipped items
    fixedFee: 0,
    paymentProcessingPercent: 2.9,
    paymentProcessingFixed: 0.30,
  },
  'Craigslist': {
    platform: 'Craigslist',
    sellingFeePercent: 0,     // Free for most listings
    fixedFee: 0,
    paymentProcessingPercent: 0,
    paymentProcessingFixed: 0,
  },
  'Nextdoor': {
    platform: 'Nextdoor',
    sellingFeePercent: 0,     // Free
    fixedFee: 0,
    paymentProcessingPercent: 0,
    paymentProcessingFixed: 0,
  },
  'Reverb': {
    platform: 'Reverb',
    sellingFeePercent: 5,     // 5% selling fee for instruments
    fixedFee: 0,
    paymentProcessingPercent: 2.7,
    paymentProcessingFixed: 0.30,
  },
  'Vinted': {
    platform: 'Vinted',
    sellingFeePercent: 0,     // Buyer pays fees
    fixedFee: 0,
    paymentProcessingPercent: 0,
    paymentProcessingFixed: 0,
  },
};

export interface ProfitBreakdown {
  sellingPrice: number;
  purchasePrice: number;
  platformFee: number;
  paymentProcessingFee: number;
  shippingCost: number;
  gistListCost: number;      // AI + storage costs
  totalCosts: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;      // As percentage
  roi: number;               // Return on investment as percentage
}

/**
 * Calculate profit breakdown for a listing on a specific platform
 */
export function calculateProfit(
  sellingPrice: number,
  purchasePrice: number,
  platform: string,
  shippingCost: number = 0,
  gistListCost: number = 0
): ProfitBreakdown {
  const platformFees = PLATFORM_FEES[platform] || PLATFORM_FEES['eBay']; // Default to eBay
  
  // Calculate platform selling fee
  const platformFee = (sellingPrice * platformFees.sellingFeePercent / 100) + platformFees.fixedFee;
  
  // Calculate payment processing fee
  const paymentProcessingFee = 
    (sellingPrice * platformFees.paymentProcessingPercent / 100) + 
    platformFees.paymentProcessingFixed;
  
  // Total costs
  const totalCosts = purchasePrice + platformFee + paymentProcessingFee + shippingCost + gistListCost;
  
  // Gross profit (before GistList costs)
  const grossProfit = sellingPrice - purchasePrice - platformFee - paymentProcessingFee - shippingCost;
  
  // Net profit (after all costs)
  const netProfit = sellingPrice - totalCosts;
  
  // Profit margin (net profit as % of selling price)
  const profitMargin = (netProfit / sellingPrice) * 100;
  
  // ROI (return on investment)
  const roi = ((netProfit / purchasePrice) * 100);
  
  return {
    sellingPrice,
    purchasePrice,
    platformFee,
    paymentProcessingFee,
    shippingCost,
    gistListCost,
    totalCosts,
    grossProfit,
    netProfit,
    profitMargin,
    roi,
  };
}

/**
 * Calculate profit for all recommended platforms
 */
export function calculateProfitForAllPlatforms(
  sellingPrice: number,
  purchasePrice: number,
  platforms: string[],
  shippingCost: number = 0,
  gistListCost: number = 0
): Record<string, ProfitBreakdown> {
  const results: Record<string, ProfitBreakdown> = {};
  
  for (const platform of platforms) {
    results[platform] = calculateProfit(
      sellingPrice,
      purchasePrice,
      platform,
      shippingCost,
      gistListCost
    );
  }
  
  return results;
}

/**
 * Get the best platform by net profit
 */
export function getBestPlatformByProfit(
  profitBreakdowns: Record<string, ProfitBreakdown>
): { platform: string; profit: ProfitBreakdown } | null {
  let bestPlatform: string | null = null;
  let maxProfit = -Infinity;
  
  for (const [platform, breakdown] of Object.entries(profitBreakdowns)) {
    if (breakdown.netProfit > maxProfit) {
      maxProfit = breakdown.netProfit;
      bestPlatform = platform;
    }
  }
  
  if (!bestPlatform) return null;
  
  return {
    platform: bestPlatform,
    profit: profitBreakdowns[bestPlatform],
  };
}
