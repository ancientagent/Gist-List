
// Cost calculation utilities for API usage and storage

// Pricing constants (update these as needed)
export const PRICING = {
  // LLM API pricing per 1M tokens (Gemini 2.5 Flash via Abacus.AI)
  LLM_INPUT_PER_MILLION: 0.075,  // $0.075 per 1M input tokens
  LLM_OUTPUT_PER_MILLION: 0.30,  // $0.30 per 1M output tokens
  
  // S3 Storage pricing
  S3_STORAGE_PER_GB_MONTH: 0.023, // $0.023 per GB per month
  S3_REQUEST_PUT: 0.005 / 1000,   // $0.005 per 1000 PUT requests
  S3_REQUEST_GET: 0.0004 / 1000,  // $0.0004 per 1000 GET requests
  S3_DATA_TRANSFER_PER_GB: 0.09,  // $0.09 per GB transferred out
};

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface StorageUsage {
  bytes: number;
  putRequests: number;
  getRequests: number;
  transferBytes: number;
}

/**
 * Calculate cost for LLM API usage
 */
export function calculateLLMCost(usage: TokenUsage): number {
  const inputCost = (usage.inputTokens / 1_000_000) * PRICING.LLM_INPUT_PER_MILLION;
  const outputCost = (usage.outputTokens / 1_000_000) * PRICING.LLM_OUTPUT_PER_MILLION;
  return inputCost + outputCost;
}

/**
 * Calculate cost for S3 storage usage
 */
export function calculateStorageCost(usage: StorageUsage): number {
  const storageCost = (usage.bytes / 1_073_741_824) * PRICING.S3_STORAGE_PER_GB_MONTH;
  const putCost = usage.putRequests * PRICING.S3_REQUEST_PUT;
  const getCost = usage.getRequests * PRICING.S3_REQUEST_GET;
  const transferCost = (usage.transferBytes / 1_073_741_824) * PRICING.S3_DATA_TRANSFER_PER_GB;
  return storageCost + putCost + getCost + transferCost;
}

/**
 * Estimate token count from text (rough approximation: 1 token ≈ 4 characters)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate token count for image (base64 encoded)
 * Images in vision models typically consume more tokens based on resolution
 */
export function estimateImageTokens(sizeBytes: number): number {
  // Rough estimation: ~85 tokens per image for low-res, more for high-res
  // Gemini Flash uses up to 258 tokens per image depending on resolution
  const sizeMB = sizeBytes / (1024 * 1024);
  if (sizeMB < 0.5) return 85;   // Low res
  if (sizeMB < 2) return 170;    // Medium res
  return 258;                     // High res
}

/**
 * Calculate total cost for a listing
 */
export function calculateListingCost(
  tokensUsed: number,
  storageBytes: number,
  putRequests: number = 1,
  getRequests: number = 1
): { apiCost: number; storageCost: number; totalCost: number } {
  const apiCost = calculateLLMCost({
    inputTokens: tokensUsed * 0.6, // Rough split: 60% input, 40% output
    outputTokens: tokensUsed * 0.4,
  });
  
  const storageCost = calculateStorageCost({
    bytes: storageBytes,
    putRequests,
    getRequests,
    transferBytes: storageBytes, // Assume we transfer what we store
  });
  
  return {
    apiCost,
    storageCost,
    totalCost: apiCost + storageCost,
  };
}
