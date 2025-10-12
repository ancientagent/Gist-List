# Quick Start Guide - GISTer E2E Tests

Get up and running with automated tests in 5 minutes!

## ⚡ Lightning Quick Start

```bash
# 1. Install Playwright browsers
npx playwright install

# 2. Start dev server (in another terminal)
npm run dev

# 3. Run tests
npm run test:e2e
```

## 🎯 Common Commands

```bash
# Run all tests (headless)
npm run test:e2e

# Run tests with browser visible
npm run test:e2e:headed

# Run specific test file
npm run test:e2e tests/e2e/pricing-ladder.spec.ts

# Debug tests step-by-step
npm run test:e2e:debug

# Interactive test runner
npm run test:e2e:ui

# View test report
npm run test:e2e:report

# Generate new tests
npm run test:e2e:codegen
```

## 📋 Pre-Flight Checklist

Before running tests, ensure:

- [ ] PostgreSQL database is running
  ```bash
  docker start gister_postgres
  ```

- [ ] Dev server is running on port 3001
  ```bash
  npm run dev
  ```

- [ ] Environment variables are set (`.env`)
  ```
  DATABASE_URL=postgresql://...
  NEXTAUTH_SECRET=...
  NEXTAUTH_URL=http://localhost:3001
  ```

- [ ] Feature flags are enabled
  ```
  NEXT_PUBLIC_PREMIUM_ENABLED=true
  NEXT_PUBLIC_PRICE_LADDER_ENABLED=true
  NEXT_PUBLIC_CONDITION_REPORT_ENABLED=true
  NEXT_PUBLIC_PHOTO_NOTIFICATIONS_ENABLED=true
  ```

## 🚨 First Run Issues?

### Tests fail with "Element not found"
**Fix**: Add `data-testid` attributes to components
- See `DATA_TESTID_RECOMMENDATIONS.md`
- Start with critical priority items

### Tests fail with "Authentication failed"
**Fix**: Create test users in database
```sql
INSERT INTO "User" (id, email, password, subscriptionTier)
VALUES ('test-free-user-001', 'test-free@gister.test',
        '$2a$10$...', 'FREE');
```
- See `tests/fixtures/test-data.ts` for SQL

### Photo tests fail
**Fix**: Add test photos OR skip photo tests
```typescript
// Skip photo tests temporarily
test.skip('Photo upload test', async ({ page }) => {
  // ...
});
```
- See `tests/fixtures/photos/README.md`

## 📊 Test Results

After running tests, view results:

```bash
# HTML report (automatic after test run)
npm run test:e2e:report

# Or open directly
open playwright-report/index.html
```

Results include:
- ✅ Pass/fail status
- ⏱️ Execution time
- 📸 Screenshots on failure
- 🎥 Video recordings
- 📋 Full test traces

## 🎓 Learning Resources

| Resource | Description |
|----------|-------------|
| `tests/README.md` | Complete test documentation |
| `DATA_TESTID_RECOMMENDATIONS.md` | How to add test attributes |
| `TEST_AUTOMATION_SUMMARY.md` | Project overview and coverage |
| [Playwright Docs](https://playwright.dev) | Official documentation |

## 🔧 Debugging Tips

### Use Playwright Inspector
```bash
npm run test:e2e:debug
```
- Step through tests line by line
- Inspect element locators
- Try selectors in console

### Add pause() to tests
```typescript
test('Debug this test', async ({ page }) => {
  await page.goto('/listing/123');
  await page.pause(); // Opens Playwright Inspector
  // ... rest of test
});
```

### Check console errors
```typescript
page.on('console', msg => console.log(msg.text()));
page.on('pageerror', err => console.error(err));
```

## 📈 Test Coverage

Current Status:
- **35 automated tests**
- **57% coverage** of 61 manual test cases
- **85% coverage** of Sweep B features (Slices 1-4)

Test Suites:
- ✅ Pricing Ladder (10 tests)
- ✅ Photo Workflow (8 tests)
- ✅ Verified Condition (7 tests)
- ✅ Premium Items (10 tests)

## 🆘 Need Help?

1. Check `tests/README.md` troubleshooting section
2. Review test files for examples
3. Use Playwright Inspector for debugging
4. Check Playwright docs: https://playwright.dev/docs/debug

## 🚀 Next Steps

1. Run tests locally: `npm run test:e2e`
2. Add missing `data-testid` attributes
3. Create test users in database
4. Set up CI/CD pipeline
5. Expand test coverage

---

**Quick Reference**:
- 📁 Test files: `tests/e2e/*.spec.ts`
- 🎯 Test data: `tests/fixtures/test-data.ts`
- 🔍 Custom assertions: `tests/helpers/assertions.ts`
- 📖 Full docs: `tests/README.md`

---

*Last Updated: 2025-10-11*
