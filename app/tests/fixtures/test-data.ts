/**
 * Test Data Fixtures for GISTer E2E Tests
 *
 * This file contains test data for various listing scenarios:
 * - Standard listings (no premium features)
 * - Premium items with facets and uplifts
 * - Listings with partial data
 * - For Parts items
 */

export interface TestListing {
  id: string;
  userId: string;
  status: string;
  title: string;
  description: string;
  condition: string;
  price: number;
  category: string;
  brandNewPrice: number;
  priceRangeHigh: number;
  priceRangeMid: number;
  priceRangeLow: number;
  priceForParts: number;
  isPremiumItem?: boolean;
  specialClass?: string;
  facets?: any[];
  priceUplifts?: any;
  verifiedCondition?: string;
  verifiedConditionScore?: any;
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
  fullName: string;
  subscriptionTier: string;
  conditionReportMode: string;
  premiumPostsUsed: number;
  premiumPostsTotal: number;
}

export interface TestNotification {
  id: string;
  listingId: string;
  type: string;
  message: string;
  field?: string;
  actionType?: string;
  actionData?: string;
  section?: string;
  resolved: boolean;
}

/**
 * Test Users
 */
export const testUsers: { [key: string]: TestUser } = {
  freeTier: {
    id: 'test-free-user-001',
    email: 'test-free@gister.test',
    password: 'TestPassword123!',
    fullName: 'Free Tier Test User',
    subscriptionTier: 'FREE',
    conditionReportMode: 'all',
    premiumPostsUsed: 2,
    premiumPostsTotal: 4,
  },
  premiumTier: {
    id: 'test-premium-user-001',
    email: 'test-premium@gister.test',
    password: 'TestPassword123!',
    fullName: 'Premium Tier Test User',
    subscriptionTier: 'PRO',
    conditionReportMode: 'premium',
    premiumPostsUsed: 0,
    premiumPostsTotal: 999,
  },
  preferenceOff: {
    id: 'test-off-user-001',
    email: 'test-off@gister.test',
    password: 'TestPassword123!',
    fullName: 'Preference Off Test User',
    subscriptionTier: 'FREE',
    conditionReportMode: 'off',
    premiumPostsUsed: 0,
    premiumPostsTotal: 4,
  },
};

/**
 * Test Listing 1: Standard Item (No Premium Features)
 */
export const standardListing: TestListing = {
  id: 'test-listing-standard-001',
  userId: testUsers.freeTier.id,
  status: 'DRAFT',
  title: 'Vintage Electronic Keyboard',
  description: 'Classic 1980s electronic keyboard in good working condition.',
  condition: 'Good',
  price: 80.00,
  category: 'Electronics',
  brandNewPrice: 150.00,
  priceRangeHigh: 130.00,
  priceRangeMid: 80.00,
  priceRangeLow: 45.00,
  priceForParts: 30.00,
};

/**
 * Test Listing 2: Premium Item - Vintage Doll
 */
export const premiumListing: TestListing = {
  id: 'test-listing-premium-001',
  userId: testUsers.premiumTier.id,
  status: 'DRAFT',
  title: '1959 Original Barbie Doll',
  description: 'First year production Barbie with original swimsuit and box.',
  condition: 'Like New',
  price: 118.00,
  category: 'Collectibles',
  brandNewPrice: 150.00,
  priceRangeHigh: 130.00,
  priceRangeMid: 100.00,
  priceRangeLow: 55.00,
  priceForParts: 40.00,
  isPremiumItem: true,
  specialClass: 'vintage',
  facets: [
    {
      name: 'Original packaging',
      category: 'Provenance',
      status: 'present',
      confidence: 0.95,
    },
    {
      name: 'Serial number verified',
      category: 'Authentication',
      status: 'present',
      confidence: 0.92,
    },
    {
      name: 'First year production',
      category: 'Rarity',
      status: 'present',
      confidence: 0.88,
    },
    {
      name: 'All accessories included',
      category: 'Completeness',
      status: 'present',
      confidence: 0.85,
    },
  ],
  priceUplifts: {
    total: 0.18,
    special: 0.05,
    facets: {
      Authentication: 0.05,
      Rarity: 0.04,
      Provenance: 0.04,
    },
  },
  verifiedCondition: 'Like New',
  verifiedConditionScore: {
    surface: 0.85,
    function: 0.90,
    clean: 0.88,
    complete: 0.80,
    avg: 0.8575,
  },
};

/**
 * Test Listing 3: Collectible with Partial Data
 */
export const partialDataListing: TestListing = {
  id: 'test-listing-partial-001',
  userId: testUsers.freeTier.id,
  status: 'DRAFT',
  title: 'Limited Edition Sneakers',
  description: 'Rare colorway, excellent condition.',
  condition: 'Very Good',
  price: 85.00,
  category: 'Shoes',
  brandNewPrice: 150.00,
  priceRangeHigh: 120.00,
  priceRangeMid: 90.00,
  priceRangeLow: 60.00,
  priceForParts: 25.00,
  isPremiumItem: true,
  specialClass: 'collectible',
  verifiedConditionScore: {
    surface: 0.85,
    function: 0.90,
    clean: null,
    complete: null,
    avg: 0.875,
  },
};

/**
 * Test Listing 4: For Parts Item
 */
export const forPartsListing: TestListing = {
  id: 'test-listing-parts-001',
  userId: testUsers.freeTier.id,
  status: 'DRAFT',
  title: 'Broken Laptop - For Parts',
  description: 'Non-functional laptop with cracked screen. Good for parts.',
  condition: 'For Parts / Not Working',
  price: 40.00,
  category: 'Electronics',
  brandNewPrice: 800.00,
  priceRangeHigh: 600.00,
  priceRangeMid: 400.00,
  priceRangeLow: 200.00,
  priceForParts: 40.00,
  isPremiumItem: true, // Was premium before breaking
  specialClass: 'electronics',
  priceUplifts: {
    total: 0.00, // Should be 0 for parts condition
    special: 0.05,
    facets: {},
  },
};

/**
 * Test Listing 5: High Value Item with Cap
 */
export const highValueListing: TestListing = {
  id: 'test-listing-highvalue-001',
  userId: testUsers.premiumTier.id,
  status: 'DRAFT',
  title: 'Vintage Rolex Watch',
  description: 'Authentic vintage Rolex with papers and box.',
  condition: 'Very Good',
  price: 3600.00,
  category: 'Jewelry',
  brandNewPrice: 5000.00,
  priceRangeHigh: 4200.00,
  priceRangeMid: 3000.00,
  priceRangeLow: 1800.00,
  priceForParts: 500.00,
  isPremiumItem: true,
  specialClass: 'luxury',
  facets: [
    { name: 'Serial verified', category: 'Authentication', status: 'present', confidence: 0.98 },
    { name: 'Original papers', category: 'Provenance', status: 'present', confidence: 0.95 },
    { name: 'Original box', category: 'Provenance', status: 'present', confidence: 0.93 },
    { name: 'All links present', category: 'Completeness', status: 'present', confidence: 0.90 },
  ],
  priceUplifts: {
    total: 0.20, // Capped at 20%
    special: 0.12,
    facets: {
      Authentication: 0.08,
      Rarity: 0.07,
      Provenance: 0.06,
      Completeness: 0.05,
    },
  },
};

/**
 * Test Notifications
 */
export const testNotifications = {
  photoSerial: {
    id: 'notif-photo-serial-001',
    listingId: premiumListing.id,
    type: 'PHOTO',
    message: 'Add close-up of serial number tag',
    field: 'photos',
    actionType: 'add_photo',
    actionData: JSON.stringify({
      requirement: 'serial_tag_macro',
      facetTag: 'serial_number',
      section: 'photos',
    }),
    section: 'photos',
    resolved: false,
  },
  photoFacePaint: {
    id: 'notif-photo-face-001',
    listingId: premiumListing.id,
    type: 'PHOTO',
    message: 'Add close-up of hair rooting and face paint',
    field: 'photos',
    actionType: 'add_photo',
    actionData: JSON.stringify({
      requirement: 'face_detail',
      facetTag: 'face_paint',
      section: 'photos',
    }),
    section: 'photos',
    resolved: false,
  },
  photoBox: {
    id: 'notif-photo-box-001',
    listingId: premiumListing.id,
    type: 'PHOTO',
    message: 'Add photo of original box',
    field: 'photos',
    actionType: 'add_photo',
    actionData: JSON.stringify({
      requirement: 'original_packaging',
      facetTag: 'original_box',
      section: 'photos',
    }),
    section: 'photos',
    resolved: false,
  },
  photoAccessories: {
    id: 'notif-photo-accessories-001',
    listingId: premiumListing.id,
    type: 'PHOTO',
    message: 'Add photo of all accessories',
    field: 'photos',
    actionType: 'add_photo',
    actionData: JSON.stringify({
      requirement: 'accessories_complete',
      facetTag: 'accessories',
      section: 'photos',
    }),
    section: 'photos',
    resolved: false,
  },
  priceDeviation: {
    id: 'notif-price-deviation-001',
    listingId: standardListing.id,
    type: 'INSIGHT',
    message: 'Price is 15% above suggested',
    field: 'price',
    actionType: 'insight',
    section: 'pricing',
    resolved: false,
  },
};

/**
 * Market Data Scenarios
 */
export const marketData = {
  complete: {
    newMedian: 150,
    usedQ90: 130,
    usedQ50: 80,
    usedQ10: 45,
    partsMedian: 30,
  },
  noNewItems: {
    newMedian: null,
    usedQ90: 130,
    usedQ50: 80,
    usedQ10: 45,
    partsMedian: 30,
  },
  limitedData: {
    newMedian: 150,
    usedQ90: null,
    usedQ50: 80,
    usedQ10: null,
    partsMedian: 30,
  },
  highValue: {
    newMedian: 5000,
    usedQ90: 4200,
    usedQ50: 3000,
    usedQ10: 1800,
    partsMedian: 500,
  },
};

/**
 * Helper Functions
 */

export function calculatePriceLadder(marketData: any, uplifts?: any) {
  const upliftMultiplier = uplifts?.total ? 1 + uplifts.total : 1;

  return {
    new: marketData.newMedian,
    likeNew: Math.round((marketData.usedQ90 || marketData.usedQ50 * 1.3) * upliftMultiplier),
    veryGood: Math.round((marketData.usedQ90 || marketData.usedQ50 * 1.2) * upliftMultiplier),
    good: Math.round((marketData.usedQ50) * upliftMultiplier),
    fair: Math.round((marketData.usedQ10 || marketData.usedQ50 * 0.7) * upliftMultiplier),
    poor: Math.max(
      Math.round((marketData.usedQ10 || marketData.usedQ50 * 0.5) * upliftMultiplier),
      Math.round(marketData.partsMedian * 1.2) // Poor must be ≥ 1.2× Parts
    ),
    parts: marketData.partsMedian,
  };
}

export function createTestListing(overrides: Partial<TestListing> = {}): TestListing {
  return {
    ...standardListing,
    ...overrides,
    id: overrides.id || `test-listing-${Date.now()}`,
  };
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    ...testUsers.freeTier,
    ...overrides,
    id: overrides.id || `test-user-${Date.now()}`,
    email: overrides.email || `test-${Date.now()}@gister.test`,
  };
}

export function createTestNotification(overrides: Partial<TestNotification> = {}): TestNotification {
  return {
    ...testNotifications.photoSerial,
    ...overrides,
    id: overrides.id || `notif-${Date.now()}`,
  };
}

/**
 * SQL Helper Functions
 */

export function generateInsertListingSQL(listing: TestListing): string {
  const facetsJSON = listing.facets ? JSON.stringify(listing.facets) : null;
  const upliftsJSON = listing.priceUplifts ? JSON.stringify(listing.priceUplifts) : null;
  const scoreJSON = listing.verifiedConditionScore ? JSON.stringify(listing.verifiedConditionScore) : null;

  return `
INSERT INTO "Listing" (
  id, "userId", status, title, description, condition, price, category,
  "brandNewPrice", "priceRangeHigh", "priceRangeMid", "priceRangeLow", "priceForParts",
  "isPremiumItem", "specialClass", facets, "priceUplifts",
  "verifiedCondition", "verifiedConditionScore"
) VALUES (
  '${listing.id}',
  '${listing.userId}',
  '${listing.status}',
  '${listing.title}',
  '${listing.description}',
  '${listing.condition}',
  ${listing.price},
  '${listing.category}',
  ${listing.brandNewPrice},
  ${listing.priceRangeHigh},
  ${listing.priceRangeMid},
  ${listing.priceRangeLow},
  ${listing.priceForParts},
  ${listing.isPremiumItem || false},
  ${listing.specialClass ? `'${listing.specialClass}'` : 'NULL'},
  ${facetsJSON ? `'${facetsJSON}'::json` : 'NULL'},
  ${upliftsJSON ? `'${upliftsJSON}'::json` : 'NULL'},
  ${listing.verifiedCondition ? `'${listing.verifiedCondition}'` : 'NULL'},
  ${scoreJSON ? `'${scoreJSON}'::json` : 'NULL'}
);
  `.trim();
}

export function generateInsertUserSQL(user: TestUser): string {
  return `
INSERT INTO "User" (
  id, email, password, "fullName", "subscriptionTier", "conditionReportMode",
  "premiumPostsUsed", "premiumPostsTotal"
) VALUES (
  '${user.id}',
  '${user.email}',
  '$2a$10$YourHashedPasswordHere', -- bcrypt hash of password
  '${user.fullName}',
  '${user.subscriptionTier}',
  '${user.conditionReportMode}',
  ${user.premiumPostsUsed},
  ${user.premiumPostsTotal}
);
  `.trim();
}

export function generateInsertNotificationSQL(notification: TestNotification): string {
  return `
INSERT INTO "AINotification" (
  id, "listingId", type, message, field, "actionType", "actionData", section, resolved
) VALUES (
  '${notification.id}',
  '${notification.listingId}',
  '${notification.type}',
  '${notification.message}',
  ${notification.field ? `'${notification.field}'` : 'NULL'},
  ${notification.actionType ? `'${notification.actionType}'` : 'NULL'},
  ${notification.actionData ? `'${notification.actionData}'` : 'NULL'},
  ${notification.section ? `'${notification.section}'` : 'NULL'},
  ${notification.resolved}
);
  `.trim();
}
