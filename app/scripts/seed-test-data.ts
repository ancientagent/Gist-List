/**
 * Seed Test Data for E2E Tests
 *
 * Creates test users and sample listings for Playwright tests
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding test data...\n');

  // Test users
  const testUsers = [
    {
      id: 'test-free-user-001',
      email: 'test-free@gister.test',
      password: 'TestPassword123!',
      fullName: 'Free Tier Test User',
      subscriptionTier: 'FREE',
      conditionReportMode: 'all',
      premiumPostsUsed: 2,
      premiumPostsTotal: 4,
    },
    {
      id: 'test-premium-user-001',
      email: 'test-premium@gister.test',
      password: 'TestPassword123!',
      fullName: 'Premium Tier Test User',
      subscriptionTier: 'PRO',
      conditionReportMode: 'premium',
      premiumPostsUsed: 0,
      premiumPostsTotal: 999,
    },
    {
      id: 'test-off-user-001',
      email: 'test-off@gister.test',
      password: 'TestPassword123!',
      fullName: 'Preference Off Test User',
      subscriptionTier: 'FREE',
      conditionReportMode: 'off',
      premiumPostsUsed: 0,
      premiumPostsTotal: 4,
    },
  ];

  // Create test users
  console.log('Creating test users...');
  for (const userData of testUsers) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        password: hashedPassword,
        fullName: userData.fullName,
        subscriptionTier: userData.subscriptionTier,
        conditionReportMode: userData.conditionReportMode,
        premiumPostsUsed: userData.premiumPostsUsed,
        premiumPostsTotal: userData.premiumPostsTotal,
      },
      create: {
        id: userData.id,
        email: userData.email,
        password: hashedPassword,
        fullName: userData.fullName,
        subscriptionTier: userData.subscriptionTier,
        conditionReportMode: userData.conditionReportMode,
        premiumPostsUsed: userData.premiumPostsUsed,
        premiumPostsTotal: userData.premiumPostsTotal,
      },
    });

    console.log(`  ✓ Created ${user.email} (${user.subscriptionTier})`);
  }

  // Create test listings
  console.log('\nCreating test listings...');

  // 1. Standard Item
  const standardListing = await prisma.listing.upsert({
    where: { id: 'test-listing-standard-001' },
    update: {},
    create: {
      id: 'test-listing-standard-001',
      userId: 'test-free-user-001',
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
    },
  });
  console.log(`  ✓ Created listing: ${standardListing.title}`);

  // 2. Premium Item - Vintage Doll
  const premiumListing = await prisma.listing.upsert({
    where: { id: 'test-listing-premium-001' },
    update: {},
    create: {
      id: 'test-listing-premium-001',
      userId: 'test-premium-user-001',
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
    },
  });
  console.log(`  ✓ Created listing: ${premiumListing.title}`);

  // 3. For Parts Item
  const forPartsListing = await prisma.listing.upsert({
    where: { id: 'test-listing-parts-001' },
    update: {},
    create: {
      id: 'test-listing-parts-001',
      userId: 'test-free-user-001',
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
      isPremiumItem: true,
      specialClass: 'electronics',
      priceUplifts: {
        total: 0.00,
        special: 0.05,
        facets: {},
      },
    },
  });
  console.log(`  ✓ Created listing: ${forPartsListing.title}`);

  // Create test notifications for premium listing
  console.log('\nCreating test notifications...');

  const notifications = [
    {
      id: 'notif-photo-serial-001',
      listingId: 'test-listing-premium-001',
      type: 'PHOTO',
      message: 'Add close-up of serial number tag',
      field: 'photos',
      actionType: 'add_photo',
      actionData: JSON.stringify({
        requirement: 'serial_tag_macro',
        facetTag: 'serial_number',
        section: 'photos',
      }),
      resolved: false,
    },
    {
      id: 'notif-photo-face-001',
      listingId: 'test-listing-premium-001',
      type: 'PHOTO',
      message: 'Add close-up of hair rooting and face paint',
      field: 'photos',
      actionType: 'add_photo',
      actionData: JSON.stringify({
        requirement: 'face_detail',
        facetTag: 'face_paint',
        section: 'photos',
      }),
      resolved: false,
    },
  ];

  for (const notif of notifications) {
    const notification = await prisma.aINotification.upsert({
      where: { id: notif.id },
      update: {},
      create: notif,
    });
    console.log(`  ✓ Created notification: ${notification.message}`);
  }

  console.log('\n✅ Test data seeding complete!\n');
  console.log('Test Users:');
  console.log('  - test-free@gister.test (password: TestPassword123!)');
  console.log('  - test-premium@gister.test (password: TestPassword123!)');
  console.log('  - test-off@gister.test (password: TestPassword123!)');
  console.log('\nTest Listings:');
  console.log('  - test-listing-standard-001 (Vintage Electronic Keyboard)');
  console.log('  - test-listing-premium-001 (1959 Original Barbie Doll)');
  console.log('  - test-listing-parts-001 (Broken Laptop - For Parts)');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding test data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
