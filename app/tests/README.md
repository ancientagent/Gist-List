# GISTer E2E Test Suite

Comprehensive Playwright test suite for GISTer Sweep B features (Slices 1-4).

## Overview

This test suite provides automated end-to-end testing for:
- **Slice 1**: Pricing Ladder + Quick Facts
- **Slice 2**: Purple Photo Workflow
- **Slice 3**: Verified Condition Report
- **Slice 4**: Premium Special Items + Roadshow Reveal

**Total Test Coverage**: 35+ automated test cases covering 61 manual test scenarios

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

Playwright should already be installed as a dev dependency. If not:

```bash
npm install -D @playwright/test
```

### 2. Install Playwright Browsers

```bash
npx playwright install
```

This downloads Chromium, Firefox, and WebKit browsers.

### 3. Setup Test Environment

Ensure your development environment is configured:

```bash
# Start PostgreSQL database
docker start gister_postgres

# Start dev server on port 3001
npm run dev
```

The test suite is configured to start the dev server automatically, but you may want to start it manually for faster test execution.

### 4. Add Test Photos (Optional)

See `tests/fixtures/photos/README.md` for instructions on adding test photos. Photo workflow tests will be skipped if photos are missing.

### 5. Run Tests

```bash
# Run all tests headless
npm run test:e2e

# Run tests with browser UI visible
npm run test:e2e:headed

# Run specific test file
npm run test:e2e tests/e2e/pricing-ladder.spec.ts

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Debug tests step-by-step
npm run test:e2e:debug
```

## Test Scripts

All test scripts are defined in `package.json`:

| Script | Description |
|--------|-------------|
| `test:e2e` | Run all tests headless in all browsers |
| `test:e2e:headed` | Run tests with browser UI visible |
| `test:e2e:debug` | Debug tests with Playwright Inspector |
| `test:e2e:ui` | Launch interactive Playwright Test UI |
| `test:e2e:report` | View HTML test report |
| `test:e2e:codegen` | Record new tests with Code Generator |

## Test Files

### E2E Test Specs

Located in `tests/e2e/`:

- **`pricing-ladder.spec.ts`** (10 tests)
  - Condition-based price suggestions
  - Poor ≥ 1.2× Parts constraint
  - Price deviation chips
  - Premium uplift integration
  - Edge cases

- **`photo-workflow.spec.ts`** (8 tests)
  - Purple notification display
  - Photo upload/rejection flows
  - Quality verification
  - Condition text append
  - Multiple photo handling

- **`verified-condition.spec.ts`** (7 tests)
  - 4-dimension score display
  - Verified badge
  - Tightened ±7% price band
  - User preferences
  - Partial verification

- **`premium-items.spec.ts`** (10 tests)
  - Premium item badges
  - Special class labels
  - Facet display
  - Roadshow Reveal
  - Price uplifts and cap
  - Upgrade CTA

### Test Fixtures

Located in `tests/fixtures/`:

- **`test-data.ts`** - Test listings, users, notifications, market data
- **`auth.ts`** - Authentication helpers (login, logout, session management)
- **`photos/`** - Test photo files (see photos/README.md)

### Test Helpers

Located in `tests/helpers/`:

- **`assertions.ts`** - Custom assertion functions for common checks

### Page Objects (Future)

Located in `tests/pages/`:

- Currently empty, can add Page Object Models as tests grow

## Configuration

### Playwright Config (`playwright.config.ts`)

Key settings:
- **Base URL**: `http://localhost:3001`
- **Test Directory**: `tests/e2e`
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Parallel Execution**: Enabled
- **Screenshots**: On failure
- **Video**: On failure
- **Test Timeout**: 60 seconds
- **Expect Timeout**: 5 seconds

### Environment Variables

Required environment variables (in `.env`):

```bash
DATABASE_URL=postgresql://gister_user:password@localhost:5432/gister_dev
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3001

# Feature flags (should be enabled for tests)
NEXT_PUBLIC_PREMIUM_ENABLED=true
NEXT_PUBLIC_PRICE_LADDER_ENABLED=true
NEXT_PUBLIC_CONDITION_REPORT_ENABLED=true
NEXT_PUBLIC_PHOTO_NOTIFICATIONS_ENABLED=true
```

## Test Data

### Test Users

Defined in `tests/fixtures/test-data.ts`:

- **Free Tier User**
  - Email: `test-free@gister.test`
  - Password: `TestPassword123!`
  - Tier: FREE
  - Condition Report Mode: all

- **Premium Tier User**
  - Email: `test-premium@gister.test`
  - Password: `TestPassword123!`
  - Tier: PRO
  - Condition Report Mode: premium

- **Preference Off User**
  - Email: `test-off@gister.test`
  - Password: `TestPassword123!`
  - Tier: FREE
  - Condition Report Mode: off

### Test Listings

- **Standard Listing**: Basic item without premium features
- **Premium Listing**: Vintage doll with facets and uplifts
- **Partial Data Listing**: Collectible with incomplete verification
- **For Parts Listing**: Broken item to test uplift removal
- **High Value Listing**: Luxury item testing 20% cap

### Creating Test Data

Before running tests, you may need to seed the database:

```bash
# Run seed script (if available)
npm run seed

# Or manually create test users/listings via SQL
# See test-data.ts for SQL generation functions
```

## Data-TestId Attributes

Tests rely on `data-testid` attributes for stable element selection.

**See `DATA_TESTID_RECOMMENDATIONS.md` for complete implementation guide.**

Critical attributes needed:
- `data-testid="price-input"`
- `data-testid="condition-select"`
- `data-testid="notification-photo"`
- `data-testid="premium-badge"`
- `data-testid="verified-condition-badge"`
- And many more (see recommendations doc)

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { loginAsFreeTier } from '../fixtures/auth';
import { standardListing } from '../fixtures/test-data';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login, navigate, etc.
    await loginAsFreeTier(page);
  });

  test('TC-XX-XXX: Test description', async ({ page }) => {
    // Arrange
    await page.goto(`/listing/${standardListing.id}`);

    // Act
    await page.fill('[data-testid="price-input"]', '100');

    // Assert
    const price = await page.locator('[data-testid="price-input"]').inputValue();
    expect(price).toBe('100');
  });
});
```

### Using Fixtures

```typescript
import { testUsers, premiumListing, testNotifications } from '../fixtures/test-data';
import { loginAsPremiumTier, logout } from '../fixtures/auth';
import { expectPriceValue, expectConditionValue } from '../helpers/assertions';

test('Example test', async ({ page }) => {
  // Use auth fixture
  await loginAsPremiumTier(page);

  // Use test data
  await page.goto(`/listing/${premiumListing.id}`);

  // Use custom assertions
  await expectPriceValue(page, 118.00);
});
```

### Custom Assertions

Available in `tests/helpers/assertions.ts`:

- `expectPriceValue(page, expectedPrice)`
- `expectConditionValue(page, expectedCondition)`
- `expectPriceDeviationChip(page, price, direction)`
- `expectNotification(page, type, message)`
- `expectPremiumBadge(page, specialClass)`
- `expectVerifiedConditionBadge(page, level)`
- `expectRoadshowReveal(page, baseline, verified)`
- And many more...

## Debugging Tests

### Playwright Inspector

Step through tests line by line:

```bash
npm run test:e2e:debug
```

Or add `await page.pause()` in your test code.

### UI Mode

Interactive test runner with time-travel debugging:

```bash
npm run test:e2e:ui
```

### Screenshots and Videos

Failed tests automatically capture:
- Screenshot at failure point
- Video of entire test execution

Find artifacts in:
- `test-results/` - Screenshots, videos, traces
- `playwright-report/` - HTML test report

### Viewing Test Reports

```bash
npm run test:e2e:report
```

Opens HTML report in browser showing:
- Pass/fail status
- Execution time
- Screenshots/videos
- Error messages
- Test traces

## Continuous Integration

### Running in CI

Example GitHub Actions workflow:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Setup database
        run: |
          docker-compose up -d postgres
          npx prisma migrate deploy

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Test Parallelization

Playwright runs tests in parallel by default. Configure in `playwright.config.ts`:

```typescript
workers: process.env.CI ? 1 : undefined, // Single worker in CI, parallel locally
```

## Best Practices

### DO:
- ✅ Use `data-testid` attributes for selectors
- ✅ Wait for elements with `waitForLoadState('networkidle')`
- ✅ Use custom assertion helpers for common checks
- ✅ Keep tests independent (each test should setup/teardown)
- ✅ Use meaningful test descriptions (include TC ID)
- ✅ Group related tests with `test.describe()`

### DON'T:
- ❌ Use CSS classes or text content as primary selectors
- ❌ Use arbitrary waits (`page.waitForTimeout()` except where necessary)
- ❌ Let tests depend on each other's state
- ❌ Hardcode URLs (use `baseURL` from config)
- ❌ Ignore flaky tests (investigate and fix root cause)

## Troubleshooting

### Tests Fail with "Element not found"

**Solution**: Ensure `data-testid` attributes are added to components. See `DATA_TESTID_RECOMMENDATIONS.md`.

### Tests Timeout

**Solution**:
1. Increase timeout in `playwright.config.ts`
2. Check if dev server is running
3. Use `page.waitForLoadState('networkidle')` before assertions

### Photo Upload Tests Fail

**Solution**: Add test photos to `tests/fixtures/photos/`. See `photos/README.md`.

### Database Connection Errors

**Solution**:
1. Verify PostgreSQL container is running: `docker ps`
2. Check `DATABASE_URL` in `.env`
3. Run migrations: `npx prisma migrate deploy`

### Authentication Fails

**Solution**:
1. Check test users exist in database
2. Verify `NEXTAUTH_SECRET` and `NEXTAUTH_URL` in `.env`
3. Clear cookies: Tests use `cleanAuthState()` before each test

### Flaky Tests

**Solution**:
1. Add proper waits (`waitForLoadState`, `waitForSelector`)
2. Use `expect().toBeVisible()` instead of checking DOM directly
3. Increase expect timeout for slow operations
4. Check for race conditions in parallel tests

## Test Coverage

### Current Coverage

| Slice | Manual Test Cases | Automated Tests | Coverage |
|-------|------------------|-----------------|----------|
| Slice 1: Pricing Ladder | 11 | 10 | 91% |
| Slice 2: Photo Workflow | 10 | 8 | 80% |
| Slice 3: Verified Condition | 9 | 7 | 78% |
| Slice 4: Premium Items | 11 | 10 | 91% |
| **Total** | **41** | **35** | **85%** |

Additional coverage from manual test plan:
- Integration tests: 5 scenarios
- Regression tests: 5 scenarios
- Edge cases: 10 scenarios

**Overall Coverage: ~57% of 61 total test cases automated**

### Coverage Goals

- ✅ All critical paths automated
- ✅ High-priority features at 90%+ coverage
- 🔄 Medium-priority features at 80%+ coverage
- 📅 Edge cases at 60%+ coverage (next phase)

## Maintenance

### Updating Tests

When features change:
1. Update `test-data.ts` with new fixture data
2. Add/update `data-testid` attributes in components
3. Update test expectations in spec files
4. Update `DATA_TESTID_RECOMMENDATIONS.md` if new elements added

### Adding New Tests

1. Identify test cases from `docs/QA/GISTER_TEST_PLAN.md`
2. Create spec file in `tests/e2e/`
3. Add test data to `tests/fixtures/test-data.ts`
4. Add custom assertions to `tests/helpers/assertions.ts` if needed
5. Update this README with new test count

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [GISTer Test Plan](../docs/QA/GISTER_TEST_PLAN.md)
- [Data-TestId Guide](./DATA_TESTID_RECOMMENDATIONS.md)

## Support

For questions or issues:
1. Check this README
2. Review test files for examples
3. Check Playwright docs
4. Use Playwright Inspector for debugging
5. Review `DATA_TESTID_RECOMMENDATIONS.md` for selector issues

---

**Last Updated**: 2025-10-11
**Test Framework**: Playwright 1.56+
**Node Version**: 18+
**Total Tests**: 35 automated, 61 manual scenarios
