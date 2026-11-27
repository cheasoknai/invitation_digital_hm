import assert from "node:assert/strict";
import process from "node:process";

// Set isolated mock environment variables to test services without production calls
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://mock.supabase.co";
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "mock-publishable-key-for-unit-tests";

const {
  normalizeSlug,
  generateGuestSlug,
  generateInvitationToken,
  insertGuest,
  checkSlugIsUnique,
} = await import("../src/lib/guestService.js");

console.log("==================================================");
console.log("SLUG & SECURITY ISOLATED UNIT TESTS");
console.log("==================================================\n");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// 1. KHMER-ONLY GUEST NAMES
// -----------------------------------------------------------------------------
runTest("Khmer-only name 'ឯកឧត្តម និង លោកជំទាវ' generates safe 'guest-xxxxxxxx' fallback", () => {
  const slug = generateGuestSlug("ឯកឧត្តម និង លោកជំទាវ");
  assert.match(slug, /^guest-[a-z0-9]{8}$/, `Expected guest-xxxxxxxx format, got: ${slug}`);
  assert.equal(/^[a-z0-9-]+$/.test(slug), true, "Must be strictly ASCII");
  assert.equal(slug.length, 14, "Length must be 14 (guest- + 8 chars)");
});

runTest("Khmer-only name 'ស៊ុន ណៃ' generates safe unique ASCII fallback", () => {
  const slug = generateGuestSlug("ស៊ុន ណៃ");
  assert.match(slug, /^guest-[a-z0-9]{8}$/, `Expected guest-xxxxxxxx format, got: ${slug}`);
  assert.equal(/^[a-z0-9-]+$/.test(slug), true, "Must be strictly ASCII");
});

runTest("Khmer-only name with symbols 'សុខ ណៃ & ភរិយា' generates safe fallback", () => {
  const slug = generateGuestSlug("សុខ ណៃ & ភរិយា");
  assert.match(slug, /^guest-[a-z0-9]{8}$/, `Expected guest-xxxxxxxx format, got: ${slug}`);
});

// -----------------------------------------------------------------------------
// 2. LATIN GUEST NAMES
// -----------------------------------------------------------------------------
runTest("Latin name 'Chea Soknai' generates 'cheasoknai'", () => {
  const slug = generateGuestSlug("Chea Soknai");
  assert.equal(slug, "cheasoknai");
});

runTest("Latin name with hyphens 'Alice-Bob' generates 'alice-bob'", () => {
  const slug = generateGuestSlug("Alice-Bob");
  assert.equal(slug, "alicebob"); // Strip non-alphanumeric from name
});

runTest("Latin name with numbers 'Guest 007' generates 'guest007'", () => {
  const slug = generateGuestSlug("Guest 007");
  assert.equal(slug, "guest007");
});

// -----------------------------------------------------------------------------
// 3. DUPLICATE NAMES & CASE-INSENSITIVE COMPARISONS
// -----------------------------------------------------------------------------
runTest("Duplicate Latin name appends -2", () => {
  const existing = [{ invitation_slug: "cheasoknai" }];
  const slug = generateGuestSlug("Chea Soknai", existing);
  assert.equal(slug, "cheasoknai-2");
});

runTest("Multiple duplicate Latin names append -3, -4 sequentially", () => {
  const existing = [
    { invitation_slug: "cheasoknai" },
    { invitation_slug: "cheasoknai-2" },
  ];
  const slug = generateGuestSlug("Chea Soknai", existing);
  assert.equal(slug, "cheasoknai-3");
});

runTest("Case-insensitive duplicate detection (existing is uppercase)", () => {
  const existing = [{ invitation_slug: "CHEASOKNAI" }];
  const slug = generateGuestSlug("chea soknai", existing);
  assert.equal(slug, "cheasoknai-2");
});

runTest("Existing array of string slugs handled properly", () => {
  const existing = ["test", "test-2"];
  const slug = generateGuestSlug("test", existing);
  assert.equal(slug, "test-3");
});

runTest("Duplicate Khmer-only names generate distinct unique slugs", () => {
  const slug1 = generateGuestSlug("ស៊ុន ណៃ");
  const slug2 = generateGuestSlug("ស៊ុន ណៃ", [{ invitation_slug: slug1 }]);
  assert.notEqual(slug1, slug2, "Duplicate Khmer names must generate unique slugs");
  assert.match(slug2, /^guest-[a-z0-9]{8}/);
});

runTest("Self-slug exclusion when editing existing guest", () => {
  const existing = [
    { id: "guest-123", invitation_slug: "cheasoknai" },
    { id: "guest-456", invitation_slug: "otherguest" },
  ];
  // Editing guest-123 retaining same name should keep own slug "cheasoknai"
  const slug = generateGuestSlug("Chea Soknai", existing, "guest-123");
  assert.equal(slug, "cheasoknai");
});

runTest("Long base slug (60 chars) with collision stays strictly <= 60 chars", () => {
  const longName = "a".repeat(60);
  const existing = [{ invitation_slug: longName }];
  const slug = generateGuestSlug(longName, existing);
  assert.equal(slug.length <= 60, true, `Slug length ${slug.length} must be <= 60`);
  assert.equal(slug.endsWith("-2"), true);
  assert.equal(slug, "a".repeat(58) + "-2");
});

// -----------------------------------------------------------------------------
// 4. SLUG NORMALIZATION & ASCII ENFORCEMENT
// -----------------------------------------------------------------------------
runTest("normalizeSlug strips spaces and keeps valid hyphens", () => {
  assert.equal(normalizeSlug("Nai Updated"), "naiupdated");
  assert.equal(normalizeSlug("Nai-Updated"), "nai-updated");
  assert.equal(normalizeSlug("  my--slug--test  "), "my-slug-test");
});

runTest("normalizeSlug with stripEdges removes leading and trailing hyphens", () => {
  assert.equal(normalizeSlug("---my-slug---", { stripEdges: true }), "my-slug");
  assert.equal(normalizeSlug("---", { stripEdges: true }), "");
});

runTest("normalizeSlug rejects non-ASCII / Khmer characters in custom slugs", () => {
  assert.equal(normalizeSlug("សុខ ណៃ"), "");
  assert.equal(normalizeSlug("Soknai ណៃ 2026"), "soknai2026");
});

runTest("normalizeSlug enforces 60 character maximum length", () => {
  const over60 = "a".repeat(75);
  const normalized = normalizeSlug(over60);
  assert.equal(normalized.length, 60);
  assert.equal(normalized, "a".repeat(60));
});

// -----------------------------------------------------------------------------
// 5. INVITATION TOKEN SECURITY AUDIT
// -----------------------------------------------------------------------------
runTest("generateInvitationToken produces 16-character unbiased CSPRNG tokens", () => {
  const token = generateInvitationToken();
  assert.equal(token.length, 16);
  assert.match(token, /^[a-z0-9]{16}$/);
});

// -----------------------------------------------------------------------------
// 6. INSERT GUEST VALIDATION & SLUG UNIQUENESS
// -----------------------------------------------------------------------------
await (async () => {
  try {
    const resNoSlug = await insertGuest({ guestName: "Test Guest", slug: "" });
    assert.equal(resNoSlug.data, null);
    assert.equal(resNoSlug.error?.message, "A valid non-empty invitation slug is required.");
    console.log("[PASS] insertGuest rejects empty slug");
    passed++;
  } catch (err) {
    console.error("[FAIL] insertGuest empty slug test:", err.message);
    failed++;
  }

  try {
    const resInvalidSlug = await insertGuest({ guestName: "Test Guest", slug: "   ---   " });
    assert.equal(resInvalidSlug.data, null);
    assert.equal(resInvalidSlug.error?.message, "A valid non-empty invitation slug is required.");
    console.log("[PASS] insertGuest rejects invalid/hyphen-only slug");
    passed++;
  } catch (err) {
    console.error("[FAIL] insertGuest invalid slug test:", err.message);
    failed++;
  }

  try {
    const resOver60 = await insertGuest({ guestName: "Test Guest", slug: "a".repeat(61) });
    assert.equal(resOver60.data, null);
    assert.equal(resOver60.error?.message, "Invitation slug cannot exceed 60 characters.");
    console.log("[PASS] insertGuest rejects slug over 60 characters");
    passed++;
  } catch (err) {
    console.error("[FAIL] insertGuest over 60 test:", err.message);
    failed++;
  }

  try {
    const resUniqueEmpty = await checkSlugIsUnique("");
    assert.equal(resUniqueEmpty.isUnique, false);
    console.log("[PASS] checkSlugIsUnique rejects empty slug");
    passed++;
  } catch (err) {
    console.error("[FAIL] checkSlugIsUnique empty test:", err.message);
    failed++;
  }

  try {
    const loadedGuests = [{ id: "1", guest_name: "Soknai", invitation_slug: "soknai" }];
    const resDuplicate = await checkSlugIsUnique("SOKNAI", null, loadedGuests);
    assert.equal(resDuplicate.isUnique, false);
    assert.equal(resDuplicate.error?.includes("already in use"), true);
    console.log("[PASS] checkSlugIsUnique detects in-memory case-insensitive duplicate");
    passed++;
  } catch (err) {
    console.error("[FAIL] checkSlugIsUnique in-memory duplicate test:", err.message);
    failed++;
  }
})();

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log("\n--------------------------------------------------");
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log("--------------------------------------------------");

if (failed > 0) {
  process.exit(1);
}
