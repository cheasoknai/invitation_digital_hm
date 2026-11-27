# FINAL PRODUCTION RELEASE RUNBOOK — COMPREHENSIVE VERIFICATION, ACL & RECOVERY (HARDENED REVISION)

**គម្រោង (Project):** Invitation Digital H&M  
**Supabase Project ID:** `khbmrpqojgzevajqjuxa`  
**GitHub Repository:** `cheasoknai/invitation_digital_hm`  
**Production Branch:** `main`  
**Hosting Platform:** Vercel  
**ឯកសារ Migration:** [`supabase/slug_only_security_migration.sql`](file:///d:/Invitation%20Digital%20HM/invitation_digital_hm/supabase/slug_only_security_migration.sql)  
**ឯកសារ Diagnostic:** [`supabase/production_preflight_diagnostics.sql`](file:///d:/Invitation%20Digital%20HM/invitation_digital_hm/supabase/production_preflight_diagnostics.sql)

> [!CAUTION]
> ### **PRODUCTION EXECUTION: NOT APPROVED — A separate human approval is required.**
> **វិធានការសុវត្ថិភាពដាច់ខាត (STRICT RESTRICTIONS):**  
> ឯកសារនេះជា Runbook បច្ចេកទេសសម្រាប់ត្រួតពិនិត្យ និងរៀបចំឯកសារតែប៉ុណ្ណោះ (Documentation & Static Review Only)។ គ្មានការតភ្ជាប់ Database ផ្ទាល់, គ្មានការ Execute SQL លើ Production, គ្មានការ Commit/Push Git, និងគ្មានការ Deploy ទៅកាន់ Vercel ឡើយ។ មិនត្រូវអះអាងថា Production ត្រូវបាន Migrate ឬមានសុវត្ថិភាពរួចរាល់នោះទេ។

> [!IMPORTANT]
> ### **ស្ថានភាពឯកសារបច្ចេកទេស (DOCUMENT STATUS & LIMITATIONS):**
> 1. **Documentation Only:** ឯកសារនេះត្រូវបានបង្កើតឡើងសម្រាប់ជាគោលការណ៍ណែនាំបច្ចេកទេស និងសវនកម្មកូដ (Static Review) តែប៉ុណ្ណោះ។
> 2. **Static Review != PostgreSQL Runtime Verification:** ការពិនិត្យកូដ និង Unit Tests នៅលើ Local មិនស្មើនឹងការផ្ទៀងផ្ទាត់លើ Runtime នៃ Supabase Production ឡើយ។
> 3. **Production Index: NOT VERIFIED:** Index `public.guests_invitation_slug_lower_idx` មិនទាន់ត្រូវបាន Query ឬ Verify លើ Live Production Database នៅឡើយទេ។
> 4. **Production Migration: NOT APPROVED — NOT EXECUTED:** គ្មានការ Migration ណាមួយត្រូវបានអនុវត្តលើ Production ឡើយ។
> 5. **Human Approval Required:** ការអនុវត្តណាមួយលើ Production Database ត្រូវតែមានការអនុញ្ញាតច្បាស់លាស់ពីម្ចាស់គម្រោង/DBA ជាមុនសិន។

---

## ១. ការចាត់ថ្នាក់ស្ថានភាព TRANSACTION (Transaction State Classification)

> [!IMPORTANT]
> **ការកែតម្រូវលក្ខខណ្ឌវិនិច្ឆ័យ (Object-Level vs. Complete Transaction State):**  
> 1. ការពិនិត្យឃើញវត្ថុ (Objects) ទាំងអស់ដែលរំពឹងទុក **មិនអាចចាត់ទុកជាភស្តុតាងដាច់ខាតនៃការ COMMIT ពេញលេញនៃ Transaction ឡើយ** — ត្រូវចាត់ថ្នាក់ត្រឹមតែជា **`OBJECT-LEVEL PASS — CONSISTENT WITH MIGRATION APPLIED`**។  
> 2. ផ្ទុយមកវិញ ការមិនឃើញ Object (ដូចជា គ្មាន CHECK constraints ថ្មី, គ្មាន lower index, ឬគ្មាន canonical functions) **ដាច់ខាតមិនត្រូវចាត់ថ្នាក់ថាជា "Confirmed Rollback" ឡើយ** — ត្រូវចាត់ថ្នាក់ត្រឹមតែជា **`NOT PRESENT / INCONCLUSIVE` (មិនទាន់មានវត្ថុ / មិនទាន់អាចសន្និដ្ឋានបាន)** តែប៉ុណ្ណោះ។  
> 
> **ហេតុផលបច្ចេកទេស:** ការពិនិត្យតែលើ Object Counts មិនអាចបញ្ជាក់ពី Transaction State ពេញលេញបានឡើយ។ ការបញ្ជាក់ស្ថានភាពពិតប្រាកដនៃ Database ទាមទារឱ្យមានការផ្ទៀងផ្ទាត់ Catalog ពេញលេញគ្រប់ជ្រុងជ្រោយ (Comprehensive Verification) លើរាល់ Functions ចាស់-ថ្មី, Constraints, Indexes, ACLs, RLS Policies, និង Data Integrity។  
> 
> **វិធានពេលដាច់ Network/Timeout:** ប្រសិនបើការតភ្ជាប់ Supabase SQL Editor ត្រូវបានកាត់ផ្តាច់ ឬ Timeout ឬផ្តល់លទ្ធផលមិនច្បាស់លាស់៖
> - **ត្រូវបញ្ឈប់សកម្មភាពជាបន្ទាន់ (STOP IMMEDIATELY)**។
> - **ដាច់ខាតមិនត្រូវ Run Migration ម្តងទៀតដោយងងឹតងងល់ (Never rerun blindly) ឡើយ**។
> - ដំណើរការ Read-Only Verification ពេញលេញ។ ប្រសិនបើជួបប្រទះស្ថានភាពមិនប្រក្រតី ឬ Partial State ត្រូវតែ Escalate ជូន DBA/Lead Engineer ត្រួតពិនិត្យជាបន្ទាន់។ (គ្មានការសន្មតថា SQL Editor ចាត់ចែង Transaction បានត្រឹមត្រូវដោយគ្មានការផ្ទៀងផ្ទាត់ឡើយ)។

---

### ក. Initial Health Indicators (សម្រាប់ពិនិត្យបឋមប៉ុណ្ណោះ — Indicators Only)
```sql
SELECT
  -- Indicator 1: Index ថ្មីលើ lower(slug)
  (SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace 
   WHERE n.nspname = 'public' AND c.relname = 'guests_invitation_slug_lower_idx') AS lower_index_count,

  -- Indicator 2: CHECK Constraints ថ្មីទាំង ៤
  (SELECT count(*) FROM pg_catalog.pg_constraint 
   WHERE conrelid = 'public.guests'::regclass AND contype = 'c' 
     AND conname IN ('guests_rsvp_status_check', 'guests_rsvp_message_len_check', 
                     'guests_invitation_token_not_empty_check', 'guests_invitation_slug_format_check')
  ) AS valid_constraints_count,

  -- Indicator 3: ចំនួន Signature នៃ submit_rsvp ក្នុង schema public
  (SELECT count(*) FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace 
   WHERE n.nspname = 'public' AND p.proname = 'submit_rsvp') AS submit_rsvp_overloads_count,

  -- Indicator 4: ចំនួន Signature នៃ get_guest_by_slug ក្នុង schema public
  (SELECT count(*) FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace 
   WHERE n.nspname = 'public' AND p.proname = 'get_guest_by_slug') AS slug_lookup_overloads_count,

  -- Indicator 5: អវត្តមាននៃ get_guest_by_token (ត្រូវតែស្មើ ០)
  (SELECT count(*) FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace 
   WHERE n.nspname = 'public' AND p.proname = 'get_guest_by_token') AS legacy_token_lookup_count;
```

---

### ខ. ការផ្ទៀងផ្ទាត់ Comprehensive Catalog ជាក់ស្តែង

#### ១. ផ្ទៀងផ្ទាត់ CHECK Constraints ទាំង ៤ (រួមទាំង `convalidated = true` & Deparsed Expressions)
```sql
SELECT 
  con.conname AS constraint_name,
  con.convalidated AS is_validated,
  pg_catalog.pg_get_constraintdef(con.oid) AS constraint_definition,
  pg_catalog.pg_get_expr(con.conbin, con.conrelid) AS deparsed_expression
FROM pg_catalog.pg_constraint con
WHERE con.conrelid = 'public.guests'::regclass
  AND con.contype = 'c'
ORDER BY con.conname;
```
* **លក្ខខណ្ឌ Pass:** ត្រូវមាន Constraints ទាំង ៤ ដែលមាន `is_validated = true` ទាំងអស់៖
  1. `guests_invitation_slug_format_check`: `invitation_slug IS NOT NULL AND length(invitation_slug) <= 60 AND invitation_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`
  2. `guests_invitation_token_not_empty_check`: `invitation_token IS NOT NULL AND length(btrim(invitation_token)) > 0`
  3. `guests_rsvp_message_len_check`: `rsvp_message IS NULL OR length(rsvp_message) <= 500`
  4. `guests_rsvp_status_check`: `rsvp_status IS NOT NULL AND rsvp_status IN ('pending', 'accepted', 'declined')`
* **លក្ខខណ្ឌបរាជ័យ ឬមិនទាន់មាន:** ត្រឡប់មកវិញ **០ ជួរ** (`NOT PRESENT / INCONCLUSIVE`) -> ត្រូវបន្តពិនិត្យ Object ផ្សេងៗទៀត។

#### ២. ផ្ទៀងផ្ទាត់ Index ថ្មីលើ `lower(slug)` (`indisvalid`, `indisready`, `indisunique` & Definition)
```sql
SELECT 
  c.relname AS index_name,
  am.amname AS access_method,
  i.indisunique AS is_unique,
  i.indisvalid AS is_valid,
  i.indisready AS is_ready,
  i.indnatts AS total_attributes,
  i.indnkeyatts AS key_attributes,
  pg_catalog.pg_get_indexdef(i.indexrelid) AS index_definition,
  pg_catalog.pg_get_expr(i.indpred, i.indrelid) AS partial_predicate
FROM pg_catalog.pg_index i
JOIN pg_catalog.pg_class c ON c.oid = i.indexrelid
JOIN pg_catalog.pg_am am ON am.oid = c.relam
WHERE c.relname = 'guests_invitation_slug_lower_idx'
  AND i.indrelid = 'public.guests'::regclass;
```
* **លក្ខខណ្ឌ Pass:** `access_method = btree`, `is_unique = true`, `is_valid = true`, `is_ready = true`, `total_attributes = 1`, `key_attributes = 1`, Expression គឺ `lower(invitation_slug)`, និង Predicate គឺ `(invitation_slug IS NOT NULL)`។
* **បើមិនឃើញ:** ចាត់ថ្នាក់ជា `NOT PRESENT / INCONCLUSIVE`។

---

## ២. ការផ្ទៀងផ្ទាត់ CANONICAL FUNCTIONS & PRIVILEGES (Function ACL & `service_role`)

> [!IMPORTANT]
> **ការកែតម្រូវបច្ចេកទេសសំខាន់ៗ (Crucial Hardening):**  
> 1. `get_guest_by_slug` ត្រូវតែមាន Parameter តែមួយគត់គឺ `slug text` (គ្មាន Default, គ្មាន Token Parameter ឡើយ)។  
> 2. `submit_rsvp` ត្រូវតែមាន Parameters ចំនួន ៣៖ `slug text`, `status_input text`, និង `message_input text DEFAULT NULL` (Default ត្រូវបានអនុញ្ញាតតែលើ Message ប៉ុណ្ណោះ)។  
> 3. ទាំងពីរ Functions ត្រូវតែជា `SECURITY DEFINER` និងមាន Search Path កំណត់ជាក់លាក់ `search_path = pg_catalog, pg_temp`។  
> 4. សិទ្ធិ `service_role` ត្រូវតែផ្ទៀងផ្ទាត់ទាំងកម្រិត Direct ACL (`aclexplode()`) និង Effective Privilege (`has_function_privilege()`)។

### ក. Query ផ្ទៀងផ្ទាត់ Exact Canonical Signatures, Defaults, Return Type & search_path
```sql
SELECT 
  p.proname AS function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  p.proargnames AS argument_names,
  p.pronargs AS total_arguments,
  p.pronargdefaults AS default_arguments_count,
  p.prorettype::pg_catalog.regtype AS return_type,
  p.prosecdef AS is_security_definer,
  p.proconfig AS search_path_config,
  CASE 
    WHEN p.proname = 'get_guest_by_slug' 
     AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'text'
     AND p.proargnames = ARRAY['slug']::text[]
     AND p.pronargs = 1
     AND p.pronargdefaults = 0
     AND p.prorettype::pg_catalog.regtype = 'json'::pg_catalog.regtype
     AND p.prosecdef = true
     AND p.proconfig = ARRAY['search_path=pg_catalog, pg_temp']::text[]
    THEN 'CANONICAL_SLUG_LOOKUP (PASS)'

    WHEN p.proname = 'submit_rsvp'
     AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'text, text, text'
     AND p.proargnames = ARRAY['slug', 'status_input', 'message_input']::text[]
     AND p.pronargs = 3
     AND p.pronargdefaults = 1
     AND p.prorettype::pg_catalog.regtype = 'json'::pg_catalog.regtype
     AND p.prosecdef = true
     AND p.proconfig = ARRAY['search_path=pg_catalog, pg_temp']::text[]
    THEN 'CANONICAL_SLUG_RSVP (PASS)'

    ELSE 'UNEXPECTED_OR_LEGACY_SIGNATURE (FAIL)'
  END AS signature_classification
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('get_guest_by_slug', 'submit_rsvp', 'get_guest_by_token')
ORDER BY p.proname, identity_arguments;
```
* **លក្ខខណ្ឌ Pass:** ត្រូវតែត្រឡប់មកវិញ **២ ជួរគត់** ដែលមាន Classification ជា `(PASS)` ទាំងពីរ។ ប្រសិនបើមានលើសពី ២ ជួរ ឬមាន Legacy Signature ណាមួយនៅសេសសល់ ត្រូវតែចាត់ថ្នាក់ជា **FAIL** ភ្លាមៗ។

---

### ផ្នែកទី ២.ក.១៖ ការផ្ទៀងផ្ទាត់តួ Function (Function Body) & តក្កវិជ្ជាសុវត្ថិភាព Slug-Only (Refined)

> [!IMPORTANT]
> **វិធាននៃការផ្ទៀងផ្ទាត់ Function Body (Source-Level Comparison):**  
> ការផ្ទៀងផ្ទាត់មិនត្រូវពឹងផ្អែកតែលើឈ្មោះ Function, ប្រភេទ Arguments, Return Type ឬ Security Flags ឡើយ។ ប្រតិបត្តិករត្រូវពិនិត្យតួ PL/pgSQL Code ជាក់ស្តែងនៅក្នុង Database Catalog ដោយបែងចែករវាង Executable Statements និង Comments ឱ្យដាច់ពីគ្នា ដើម្បីផ្ទៀងផ្ទាត់ថាតក្កវិជ្ជានៅខាងក្នុងអនុវត្តតាមការរចនា Slug-Only ដែលបានពិនិត្យ និងមិនចូលប្រើប្រាស់ ឬបង្ហាញ `invitation_token` ឡើយ។ សុវត្ថិភាព Runtime ជាក់ស្តែងនៅតែអាស្រ័យលើ Production Function Definitions, Table ACLs, RLS Policies, Schema Privileges, Frontend Compatibility, និង Controlled Functional Testing។

---

#### ក. បញ្ជីផ្ទៀងផ្ទាត់សុវត្ថិភាពសម្រាប់ `get_guest_by_slug(slug text)`
- [ ] **Slug-Only Lookup:** ផ្គូផ្គងតែលើ `lower(invitation_slug) = clean_slug` ប៉ុណ្ណោះ។
- [ ] **No Token Fallback:** គ្មានពាក្យបញ្ជា ឬលក្ខខណ្ឌណាដែល Fallback ទៅរក `invitation_token` ឡើយ។
- [ ] **No Token Selection/Return:** គ្មានការ Select ឬ Return ជួរឈរ `invitation_token` ឡើយ។
- [ ] **Approved Public Fields:** JSON ត្រឡប់តែ ៦ Fields អនុញ្ញាត៖ `id`, `guest_name`, `invitation_slug`, `rsvp_status`, `rsvp_message`, `responded_at`។
- [ ] **Input Sanitization:** ប្រើ `pg_catalog.lower(pg_catalog.btrim(slug))` និងត្រឡប់ `NULL` ភ្លាមៗប្រសិនបើ Slug ជា NULL ឬ Empty String (`''`)។
- [ ] **Schema Qualification:** ប្រើប្រាស់ Schema Qualification ពេញលេញ (`public.guests`, `pg_catalog.*`)។
- [ ] **Row Isolation & Unique Index Prerequisite:** ប្រើប្រាស់ `LIMIT 1`។ `LIMIT 1` គ្រាន់តែកម្រិត Cursor ប៉ុណ្ណោះ វាមិនធានា Row Isolation ឡើយ ប្រសិនបើមាន duplicate slugs។ ភាពឯកោនៃទិន្នន័យភ្ញៀវម្នាក់ៗគឺពឹងផ្អែកជាចាំបាច់លើ **Case-Insensitive Unique Partial Index (`guests_invitation_slug_lower_idx`)** ដែលត្រូវបានផ្ទៀងផ្ទាត់ដាច់ដោយឡែក។

---

#### ខ. បញ្ជីផ្ទៀងផ្ទាត់សុវត្ថិភាពសម្រាប់ `submit_rsvp(slug, status_input, message_input)`
- [ ] **Slug-Only Identification:** សម្គាល់ភ្ញៀវតែតាម `pg_catalog.lower(invitation_slug) = clean_slug` ប៉ុណ្ណោះ។
- [ ] **No Token Matching:** មិនសម្គាល់ ឬផ្គូផ្គងតាម `invitation_token` ឬ Legacy identifier ឡើយ។
- [ ] **Strict Status Rejection:** បដិសេធដាច់ខាតចំពោះ `status_input IS NULL`, Empty String, ឬ Status មិនត្រឹមត្រូវ ដោយបោះ `RAISE EXCEPTION ... ERRCODE = '22023'`។
- [ ] **Allowed Statuses Only:** អនុញ្ញាតតែ ២ តម្លៃគត់៖ `'accepted'` និង `'declined'`។
- [ ] **Rejection of `pending`:** តម្លៃ `'pending'` ត្រូវបានបដិសេធដាច់ខាត (មិនអនុញ្ញាតឱ្យភ្ញៀវកែប្រែស្ថានភាពមកជា pending វិញឡើយ)។
- [ ] **Message Length Enforcement:** កំណត់ប្រវែងសារអតិបរមា 500 characters (`pg_catalog.length(clean_message) > 500` នឹងបោះ Exception)។
- [ ] **Message Sanitization & Null Handling:** ប្រើ `pg_catalog.btrim`; បើទទេ (`''`) បំលែងទៅជា `NULL`; បើជា `NULL` ទទួលយកជា optional។
- [ ] **Explicit Column RETURNING:** ប្រើ `RETURNING id, guest_name, invitation_slug, rsvp_status, rsvp_message, responded_at INTO ...` ចូលក្នុង Scalar Variables (ដាច់ខាតមិនប្រើ `RETURNING *`)។
- [ ] **NO EXPLICIT TOKEN SELECTION, ASSIGNMENT, OR RETURN:** កូដ Executable នៃ Function ដែលបានពិនិត្យ មិនជ្រើសរើស (SELECT), មិនកំណត់តម្លៃ (ASSIGN), មិនផ្ទុកក្នុង Declared Variables, មិនផ្គូផ្គង, និងមិនត្រឡប់ (RETURN) នូវ `invitation_token` ឡើយ។ នេះជាការរកឃើញកម្រិត Source-level review លើ Definition នៃ Migration Script។
- [ ] **Unique Index Row Isolation:** ពឹងផ្អែកលើ `guests_invitation_slug_lower_idx` ដើម្បីធានាថា Slug មួយមិនអាច Update លើ Record ភ្ញៀវផ្សេងឡើយ។

---

#### គ. Read-Only SQL Query សម្រាប់ទាញយក Function Definitions មកពិនិត្យ (`pg_get_functiondef`)

```sql
SELECT 
  p.proname AS function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  p.prosecdef AS is_security_definer,
  p.proconfig AS search_path_config,
  pg_catalog.pg_get_functiondef(p.oid) AS full_function_definition,
  
  -- សូចនាករជំនួយបឋម (Supplementary Textual Indicator Only — DO NOT REPLACE MANUAL INSPECTION)
  CASE 
    WHEN p.proname = 'get_guest_by_slug'
     AND pg_catalog.pg_get_functiondef(p.oid) ~* 'FROM\s+public\.guests'
     AND pg_catalog.pg_get_functiondef(p.oid) ~* 'pg_catalog\.lower\(g\.invitation_slug\)\s*=\s*clean_slug'
     AND pg_catalog.pg_get_functiondef(p.oid) ~* 'pg_catalog\.json_build_object'
    THEN 'INDICATOR_LOOKUP_BODY_ALIGNED'

    WHEN p.proname = 'submit_rsvp'
     AND pg_catalog.pg_get_functiondef(p.oid) ~* 'UPDATE\s+public\.guests'
     AND pg_catalog.pg_get_functiondef(p.oid) ~* 'pg_catalog\.lower\(invitation_slug\)\s*=\s*clean_slug'
     AND pg_catalog.pg_get_functiondef(p.oid) ~* 'clean_status\s+NOT\s+IN\s+\(\'accepted\',\s*\'declined\'\)'
     AND pg_catalog.pg_get_functiondef(p.oid) ~* 'pg_catalog\.length\(clean_message\)\s*>\s*500'
     AND pg_catalog.pg_get_functiondef(p.oid) ~* 'RETURNING\s+id,\s*guest_name,\s*invitation_slug,\s*rsvp_status,\s*rsvp_message,\s*responded_at'
     AND pg_catalog.pg_get_functiondef(p.oid) !~* 'RETURNING\s+\*'
    THEN 'INDICATOR_RSVP_BODY_ALIGNED'

    ELSE 'INDICATOR_UNALIGNED_OR_SUSPECT_MANUAL_REVIEW_REQUIRED'
  END AS supplementary_body_indicator
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (
    (p.proname = 'get_guest_by_slug' AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'text')
    OR
    (p.proname = 'submit_rsvp' AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'text, text, text')
  )
ORDER BY p.proname;
```

---

#### ឃ. ការផ្ទៀងផ្ទាត់ Case-Insensitive Unique Partial Index (`guests_invitation_slug_lower_idx`)

> [!IMPORTANT]
> **ការពន្យល់បច្ចេកទេសច្បាស់លាស់៖ ហេតុអ្វីបានជា `LIMIT 1` មិនអាចជំនួស Unique Index បាន?**  
> 1. ក្នុង PL/pgSQL ពាក្យបញ្ជា `SELECT ... INTO` ដែលមិនប្រើពាក្យគន្លឹះ `STRICT` នឹងជ្រើសយកតែជួរដេកទីមួយ (First Returned Row) មកបញ្ចូលទៅក្នុង Variables ហើយនឹង **មិនបោះ Error ឬ Exception ឡើយ** ទោះបីជាមាន Row ផ្គូផ្គងច្រើនជាងមួយក៏ដោយ។  
> 2. វត្តមានរបស់ `LIMIT 1` ក្នុង `get_guest_by_slug` គ្រាន់តែជួយកំណត់ចំនួន Row ត្រឡប់មកត្រឹម ១ ប៉ុណ្ណោះ ប៉ុន្តែ **មិនធានាថា Row ដែលជ្រើសរើសនោះជាភ្ញៀវដែលត្រូវគ្នានោះឡើយ** ប្រសិនបើមានទិន្នន័យ Slug ជាន់គ្នា (Case-Insensitive Slug Collision ដូចជា `dara` និង `Dara`) ក្នុងតារាងនោះទេ។  
> 3. រឹតតែគ្រោះថ្នាក់ជាងនេះទៅទៀត នៅក្នុង `submit_rsvp` ពាក្យបញ្ជាកែប្រែទិន្នន័យគឺ `UPDATE public.guests SET ... WHERE lower(invitation_slug) = clean_slug` ដែលគ្មានពាក្យបញ្ជា `LIMIT` ឡើយ។ ប្រសិនបើមាន Record ជាន់គ្នាដោយសារកង្វះ Unique Index នោះ `UPDATE` នឹងទៅកែប្រែទិន្នន័យលើ Record ភ្ញៀវច្រើននាក់ក្នុងពេលតែមួយ (Multi-Row Accidental Mutation)។  
> 4. អាស្រ័យហេតុនេះ **Case-Insensitive Unique Partial Index (`guests_invitation_slug_lower_idx`) គឺជាលក្ខខណ្ឌតម្រូវជាចាំបាច់ដាច់ខាត (Mandatory Prerequisite)** ដើម្បីធានាបាននូវ Slug Identity សុវត្ថិភាពទិន្នន័យភ្ញៀវម្នាក់ៗ (Row Isolation) និងការ Update ចំលើ Record តែមួយគត់។

##### Read-Only SQL Catalog Query សម្រាប់ផ្ទៀងផ្ទាត់ Index (Exhaustive & Conservative Specification Verification)

```sql
-- ============================================================================
-- READ-ONLY VERIFICATION: guests_invitation_slug_lower_idx CATALOG SPECIFICATION
-- Checks all required catalog metadata: key counts, expression tree, partial predicate.
-- Uses an expected-index CTE with LEFT JOIN to guarantee EXACTLY ONE output row.
-- Missing index produces 'FAIL — REQUIRED INDEX MISSING' instead of 0 rows.
-- diagnostic_indkey, diagnostic_expr_regex_match, and diagnostic_pred_regex_match
-- are preserved strictly for visual inspection and do NOT affect PASS/FAIL logic.
-- Preliminary negative regex branches are REMOVED from CASE to eliminate false FAILs;
-- unexpected deparsed formats safely yield INCONCLUSIVE rather than false FAIL/PASS.
-- ============================================================================
WITH expected_index AS (
  SELECT 
    'public'::text AS expected_schema,
    'guests'::text AS expected_table,
    'guests_invitation_slug_lower_idx'::text AS expected_index_name,
    'btree'::text AS expected_access_method,
    1::smallint AS expected_indnatts,
    1::smallint AS expected_indnkeyatts
),
catalog_index AS (
  SELECT 
    c.relname AS index_name,
    in_ns.nspname AS index_schema,
    t.relname AS table_name,
    tn_ns.nspname AS table_schema,
    am.amname AS access_method,
    i.indnatts AS total_attributes,
    i.indnkeyatts AS key_attributes,
    i.indkey::text AS diagnostic_indkey,
    i.indisunique AS is_unique,
    i.indisvalid AS is_valid,
    i.indisready AS is_ready,
    i.indisprimary AS is_primary_key,
    i.indisexclusion AS is_exclusion,
    (i.indexprs IS NOT NULL) AS has_index_expressions,
    (i.indpred IS NOT NULL) AS has_partial_predicate,
    pg_catalog.pg_get_expr(i.indexprs, i.indrelid) AS index_expression,
    pg_catalog.pg_get_expr(i.indpred, i.indrelid) AS partial_predicate,
    pg_catalog.pg_get_indexdef(i.indexrelid) AS full_index_definition
  FROM pg_catalog.pg_index i
  JOIN pg_catalog.pg_class c ON c.oid = i.indexrelid
  JOIN pg_catalog.pg_namespace in_ns ON in_ns.oid = c.relnamespace
  JOIN pg_catalog.pg_class t ON t.oid = i.indrelid
  JOIN pg_catalog.pg_namespace tn_ns ON tn_ns.oid = t.relnamespace
  JOIN pg_catalog.pg_am am ON am.oid = c.relam
  WHERE in_ns.nspname = 'public'
    AND tn_ns.nspname = 'public'
    AND t.relname = 'guests'
    AND c.relname = 'guests_invitation_slug_lower_idx'
)
SELECT 
  exp.expected_index_name,
  exp.expected_schema,
  exp.expected_table,
  ci.access_method,
  ci.total_attributes,
  ci.key_attributes,
  ci.diagnostic_indkey,
  ci.is_unique,
  ci.is_valid,
  ci.is_ready,
  ci.is_primary_key,
  ci.is_exclusion,
  ci.has_index_expressions,
  ci.has_partial_predicate,
  ci.index_expression,
  ci.partial_predicate,
  (ci.index_expression ~* 'lower\\s*\\(\\s*\\(?\\s*invitation_slug') AS diagnostic_expr_regex_match,
  (ci.partial_predicate ~* 'invitation_slug\\s+IS\\s+NOT\\s+NULL') AS diagnostic_pred_regex_match,
  ci.full_index_definition,
  CASE 
    -- ១. Definite Failure: បើ Index មិនមានក្នុង Database Catalog
    WHEN ci.index_name IS NULL 
    THEN 'FAIL — REQUIRED INDEX MISSING'

    -- ២. Definite Failure: បើ Index មិន Valid ឬមិន Ready
    WHEN ci.is_valid = false OR ci.is_ready = false 
    THEN 'FAIL — INDEX INVALID OR NOT READY'

    -- ៣. Definite Failure: បើ Index មិនមែនជា Unique
    WHEN ci.is_unique = false 
    THEN 'FAIL — INDEX NOT UNIQUE'

    -- ៤. Definite Failure: ចំនួន Attributes មិនត្រឹមត្រូវ (ត្រូវតែមាន key att = 1 និង total att = 1, គ្មាន INCLUDE columns)
    WHEN ci.total_attributes <> exp.expected_indnatts OR ci.key_attributes <> exp.expected_indnkeyatts 
    THEN 'FAIL — WRONG ATTRIBUTE OR KEY COUNT'

    -- ៥. Definite Failure: ខុស Schema, Table, Access Method, Primary Key, ឬជា Exclusion Index
    WHEN ci.index_schema <> exp.expected_schema 
      OR ci.table_schema <> exp.expected_schema 
      OR ci.table_name <> exp.expected_table 
      OR ci.access_method <> exp.expected_access_method 
      OR ci.is_primary_key = true 
      OR ci.is_exclusion = true 
    THEN 'FAIL — INDEX METADATA MISMATCH'

    -- ៦. Definite Failure: មិនមែនជា Expression Index (គ្មាន Expression Tree ឬ Expression គឺ NULL)
    WHEN ci.has_index_expressions = false OR ci.index_expression IS NULL 
    THEN 'FAIL — NOT AN EXPRESSION INDEX'

    -- ៧. Definite Failure: មិនមែនជា Partial Index (គ្មាន Predicate Tree ឬ Predicate គឺ NULL)
    WHEN ci.has_partial_predicate = false OR ci.partial_predicate IS NULL 
    THEN 'FAIL — NOT A PARTIAL INDEX'

    -- ៨. PASS: គ្រប់ Attributes ទាំងអស់ non-NULL និងផ្ទៀងផ្ទាត់ត្រូវគ្នាបេះបិទនឹង Strict Canonical Specifications
    WHEN ci.index_name IS NOT NULL
     AND ci.index_schema = exp.expected_schema
     AND ci.table_schema = exp.expected_schema
     AND ci.table_name = exp.expected_table
     AND ci.access_method = exp.expected_access_method
     AND ci.total_attributes = 1
     AND ci.key_attributes = 1
     AND ci.is_unique = true
     AND ci.is_valid = true
     AND ci.is_ready = true
     AND ci.is_primary_key = false
     AND ci.is_exclusion = false
     AND ci.has_index_expressions = true
     AND ci.has_partial_predicate = true
     AND ci.index_expression IS NOT NULL
     AND ci.partial_predicate IS NOT NULL
     AND ci.full_index_definition IS NOT NULL
     AND pg_catalog.regexp_replace(ci.index_expression, '\\s+', '', 'g') IN (
       'lower(invitation_slug)',
       'lower((invitation_slug))',
       'lower((invitation_slug)::text)'
     )
     AND pg_catalog.regexp_replace(ci.partial_predicate, '\\s+', ' ', 'g') IN (
       '(invitation_slug IS NOT NULL)',
       'invitation_slug IS NOT NULL',
       '((invitation_slug IS NOT NULL))'
     )
     AND ci.full_index_definition ~* 'CREATE\\s+UNIQUE\\s+INDEX\\s+guests_invitation_slug_lower_idx\\s+ON\\s+public\\.guests'
    THEN 'PASS'

    -- ៩. INCONCLUSIVE: ករណី Expression/Predicate មិនត្រូវគ្នានឹង Canonical List, DDL Prefix ស្រពិចស្រពិល, ឬ Metadata មិនទាន់គ្រប់គ្រាន់
    ELSE 'INCONCLUSIVE'
  END AS verification_status
FROM expected_index exp
LEFT JOIN catalog_index ci ON true;
```

##### ការពន្យល់បច្ចេកទេសលម្អិតអំពី PostgreSQL System Catalog Metadata

###### ១. ការពន្យល់ត្រឹមត្រូវអំពី `pg_index.indkey` និង `diagnostic_indkey`
- `pg_index.indkey` គឺជាប្រភេទ `int2vector` ដែលផ្ទុកនូវលេខរៀង attributes (attribute numbers) នៃតារាងមេសម្រាប់ជួរឈរនៃ index។
- តម្លៃ `0` ក្នុង `indkey` បញ្ជាក់ថាជួរឈរ index នោះគឺជា **Expression** (ដែល Expression Tree របស់វាត្រូវបានផ្ទុកក្នុង `pg_index.indexprs`) មិនមែនជាការយោងផ្ទាល់ទៅកាន់ជួរឈររបស់តារាងឡើយ។
- ទោះជាយ៉ាងណាក៏ដោយ តម្លៃ representation ជា string `'0'` មិនមែនជាការធានាជាសកលសម្រាប់គ្រប់ expression index ទាំងអស់នោះឡើយ។ ទម្រង់បង្ហាញរបស់វាអាស្រ័យលើរចនាសម្ព័ន្ធ attributes របស់ index (ឧ. ចំពោះ composite index ដែលមានទាំង direct column និង expression វាអាចបង្ហាញជា `'0 1'`, `'1 0'` ជាដើម ហើយការ formatting អាចប្រែប្រួលតាម driver/client)។
- អាស្រ័យហេតុនេះ `diagnostic_indkey` ត្រូវបានរក្សាទុកក្នុង Query Output **សម្រាប់តែជាជំនួយដល់ការពិនិត្យផ្ទាល់ភ្នែករបស់ DBA ប៉ុណ្ណោះ (Diagnostic Inspection Only)**។ ដាច់ខាតមិនត្រូវយកការប្រៀបធៀប text លើ `indkey` មកធ្វើជាលក្ខខណ្ឌវិនិច្ឆ័យ PASS ឬ FAIL ឡើយ។
- ការផ្ទៀងផ្ទាត់ Expression Index ជាក់លាក់ និងរឹងមាំត្រូវតែបន្តពឹងផ្អែកលើ `indnatts = 1`, `indnkeyatts = 1`, `indexprs IS NOT NULL`, និងការ deparse តាម `pg_catalog.pg_get_expr()` រួមជាមួយការប្រៀបធៀប Canonical Expressions។

###### ២. ការលុបចោល Preliminary Regex ចេញពីលក្ខខណ្ឌ FAIL និងការកំណត់តួនាទី Diagnostic-Only
- លក្ខខណ្ឌ Regex អវិជ្ជមាន (`!~*`) ត្រូវបាន **លុបចេញទាំងស្រុង** ពី `CASE` statement ដើម្បីលុបបំបាត់បញ្ហា False FAIL ដែលបណ្តាលមកពីការ deparse របស់ PostgreSQL មានទម្រង់ប្លែកពីការរំពឹងទុក (ដូចជា schema-qualification ឬ casing formats ស្របច្បាប់)។
- ជួរឈរជំនួយ `diagnostic_expr_regex_match` និង `diagnostic_pred_regex_match` ត្រូវបានរក្សាទុកក្នុង `SELECT` list សម្រាប់តែការពិនិត្យផ្ទាល់ភ្នែក (Visual Diagnostic Inspection) របស់ DBA ប៉ុណ្ណោះ។ ជួរឈរទាំងនេះ **មិនមានឥទ្ធិពល និងមិនអាចបង្កើតលទ្ធផល PASS ឬ FAIL ដោយឯករាជ្យបានឡើយ**។
- លទ្ធផល PASS ទាមទារជាដាច់ខាតនូវការត្រូវគ្នានឹងបញ្ជី Canonical Deparsed Representations ដ៏តឹងរ៉ឹងបំផុត (`lower(invitation_slug)` និង `invitation_slug IS NOT NULL`)។
- ប្រសិនបើការ deparse របស់ PostgreSQL បញ្ចេញទម្រង់ដែលមិនស្ថិតក្នុងបញ្ជី Canonical PASS លទ្ធផលនឹងធ្លាក់ទៅកាន់ **`INCONCLUSIVE`** ដោយស្វ័យប្រវត្តិ (មិនធ្លាក់ទៅ FAIL ខុស ឬ PASS មិនត្រឹមត្រូវឡើយ) ដើម្បីទាមទារការពិនិត្យ DDL ដោយផ្ទាល់ពី DBA។

###### ៣. តួនាទីនៃ `full_index_definition` ជា Limited Consistency Check
- លក្ខខណ្ឌ `ci.full_index_definition ~* 'CREATE\s+UNIQUE\s+INDEX\s+guests_invitation_slug_lower_idx\s+ON\s+public\.guests'` គឺគ្រាន់តែជាការផ្ទៀងផ្ទាត់លើ **កូដ DDL Prefix ដែលអាចសម្គាល់បាន (Recognizable DDL Statement Prefix)** ប៉ុណ្ណោះ (បញ្ជាក់ថា definition ចាប់ផ្តើមដោយឈ្មោះ index និង target schema.table ត្រឹមត្រូវ)។
- លក្ខខណ្ឌនេះ **មិនមែនជាភស្តុតាងនៃការផ្ទៀងផ្ទាត់ DDL ពេញលេញនោះឡើយ (Not a Proof of Full DDL Equivalence)**។
- `full_index_definition` ត្រូវបានផ្តល់ជូនក្នុង query output ជា **ព័ត៌មានជំនួយបន្ថែម (Supporting Diagnostic Information)** សម្រាប់ DBA ពិនិត្យដោយផ្ទាល់ភ្នែក។
- ប្រសិនបើ DDL Prefix នេះមានទម្រង់ខុសប្លែកខណៈដែល Catalog Fields ទាំងអស់ត្រឹមត្រូវ លទ្ធផលនឹងធ្លាក់ទៅជា `INCONCLUSIVE` ជាជាងការសន្មតថា FAIL ដោយគ្មានភស្តុតាងគ្រប់គ្រាន់។

##### វិធានការវិនិច្ឆ័យ (Index Verification Classification Rules)

| លទ្ធផល (Status) | លក្ខខណ្ឌវិនិច្ឆ័យលម្អិត (Criteria) | សកម្មភាពបន្ទាប់ (Next Action) |
| :--- | :--- | :--- |
| **`PASS`** | គ្រប់ Catalog Attributes ទាំងអស់ non-NULL និងត្រូវគ្នានឹង Approved Design: Schema `public`, Table `guests`, Name `guests_invitation_slug_lower_idx`, Method `btree`, `indnatts = 1`, `indnkeyatts = 1`, `is_unique = true`, `is_valid = true`, `is_ready = true`, `is_primary = false`, `is_exclusion = false`, `has_index_expressions = true`, `has_partial_predicate = true`, Expression ត្រូវគ្នានឹង Canonical `lower(invitation_slug)`, Predicate ត្រូវគ្នានឹង Canonical `invitation_slug IS NOT NULL`, និង DDL Prefix ត្រូវគ្នានឹង `public.guests`។ | ចាត់ទុកថា Index Specification ឆ្លងកាត់ការផ្ទៀងផ្ទាត់។ |
| **`FAIL — REQUIRED INDEX MISSING`** | Index មិនមាននៅក្នុង Catalog ឡើយ (`index_name IS NULL`) ពោលគឺមិនត្រូវបានរកឃើញនៅលើតារាង `public.guests` ក្រោម Schema `public` និងឈ្មោះ `guests_invitation_slug_lower_idx` ឡើយ។ | **STOP MIGRATION / INVESTIGATE**<br>ដាច់ខាតមិនបង្កើត Index ដោយស្វ័យប្រវត្តិឡើយ។ |
| **`FAIL — WRONG ATTRIBUTE OR KEY COUNT`** | `indnatts <> 1` ឬ `indnkeyatts <> 1` (បញ្ជាក់ថាមាន Key បន្ថែម ឬមាន INCLUDE Non-key columns)។ | **STOP MIGRATION** |
| **`FAIL — NOT AN EXPRESSION INDEX`** | `has_index_expressions = false` ឬ `index_expression IS NULL` (ខ្វះ Expression Metadata)។ | **STOP MIGRATION** |
| **`FAIL — NOT A PARTIAL INDEX`** | `has_partial_predicate = false` ឬ `partial_predicate IS NULL` (ខ្វះ Partial Filter)។ | **STOP MIGRATION** |
| **`FAIL` (ផ្សេងៗ)** | `is_valid = false`, `is_ready = false`, `is_unique = false`, ឬខុស Schema/Table/Method/Primary Key/Exclusion។ | **STOP MIGRATION** |
| **`INCONCLUSIVE`** | Essential Metadata មានតម្លៃ NULL, ការ deparse នៃ Expression ឬ Predicate មិនត្រូវគ្នានឹង canonical list, DDL prefix មិនត្រូវគ្នា, ឬទាមទារ Manual Inspection។ (ដាច់ខាតមិន Return PASS ពីលទ្ធផលស្រពិចស្រពិលឡើយ)។ | **MANUAL DDL INSPECTION REQUIRED** |

##### ការរក្សាទុក Duplicate-Slug Preflight Check ជាលក្ខខណ្ឌតម្រូវដាច់ដោយឡែក (Mandatory Prerequisite)
- **Check 5 ក្នុង `production_preflight_diagnostics.sql` ត្រូវតែរក្សាទុកដាច់ខាត៖**  
  ការផ្ទៀងផ្ទាត់ Index នៅទីនេះ គឺដើម្បីបញ្ជាក់អំពី **យន្តការអនុវត្តច្បាប់ (Enforcement Mechanism)** សម្រាប់ការពារកុំឱ្យមាន Duplicate Slug នាពេលអនាគត។ ប៉ុន្តែ Preflight Check 5 គឺពិនិត្យលើ **ទិន្នន័យដែលមានស្រាប់ក្នុង Production (Existing Production Data)** មុនពេល Migration ប្រព្រឹត្តទៅ។  
- **ការត្រួតពិនិត្យទាំងពីរមិនអាចជំនួសគ្នាបានឡើយ៖**  
  ប្រសិនបើ Preflight Check 5 រកឃើញថាមាន Duplicate Slug ក្នុងទិន្នន័យស្រាប់ ប្រតិបត្តិការ Migration ត្រូវតែ **បញ្ឈប់ជាបន្ទាន់ (STOP)**។ ដាច់ខាតមិនត្រូវកែឈ្មោះ, បញ្ចូល Record, លុប, ឬជួសជុល Record ភ្ញៀវដោយស្វ័យប្រវត្តិនោះឡើយ។

---

#### ង. ចំណាត់ថ្នាក់នៃការផ្ទៀងផ្ទាត់ Function Body (Verification Classification)

| ស្ថានភាព (Status) | និយមន័យ និងលក្ខខណ្ឌវិនិច្ឆ័យ (Criteria) |
| :--- | :--- |
| **`PASS`** | Function Definition ជាក់ស្តែងត្រូវបានទាញយក និងប្រៀបធៀបពេញលេញធៀបនឹង Migration Definition ដោយបញ្ជាក់ថាគ្រប់លក្ខខណ្ឌសុវត្ថិភាពទាំងអស់ត្រូវគ្នាបេះបិទ ហើយ `guests_invitation_slug_lower_idx` ត្រូវបានផ្ទៀងផ្ទាត់ថា Valid និង Ready ជាឯករាជ្យ។ |
| **`FAIL`** | រកឃើញភាពខុសគ្នា (Mismatch), ការផ្គូផ្គងតាម Token, ការ Select/Return Token, ការប្រើ `RETURNING *`, កង្វះ Validation លើ Status/Message, ឬ Index មិនត្រឹមត្រូវ/Invalid។ |
| **`INCONCLUSIVE`** | Function មិនមានក្នុង Catalog, មិនអាចទាញយក Definition បាន, ការប្រៀបធៀបប្រភពមិនទាន់ចប់សព្វគ្រប់, ឬ Index Metadata មិនទាន់គ្រប់គ្រាន់។ |

> [!CAUTION]
> **សូចនាករជំនួយ Regex មិនអាចបង្កើតលទ្ធផល `PASS` ដោយឯករាជ្យបានជាដាច់ខាត!**

---

#### ច. ដែនកំណត់បច្ចេកទេសសំខាន់ៗនៃ Function Body Review
1. `pg_get_functiondef()` គ្រាន់តែទាញយកកូដប្រភពដែលផ្ទុកក្នុង Catalog មកបង្ហាញប៉ុណ្ណោះ វាមិនមែនជាការ Execute ឬ Test លើ Function ឡើយ។
2. ការស្វែងរកពាក្យគន្លឹះ (Textual / Regex Matching) មិនអាចបែងចែកបានច្បាស់លាស់រវាងកូដ Executable និង Comments ឡើយ ដូច្នេះទាមទារការ Review ដោយផ្ទាល់ភ្នែកពីវិស្វករជានិច្ច។
3. សុវត្ថិភាព Runtime ជាក់ស្តែងនៅតែអាស្រ័យលើ Production Table ACLs, RLS Policies, Schema Privileges, Frontend Compatibility, និង Controlled Functional Testing។

---

### ខ. ការផ្ទៀងផ្ទាត់ Function ACLs: Direct Entries vs. Effective Privileges

> [!IMPORTANT]
> **វិធាននៃការផ្ទៀងផ្ទាត់ Function Privileges (Direct ACL vs. Effective Privileges):**  
> 1. **Direct Function ACL (`proacl` & `acldefault`):** Query 1 ប្រើប្រាស់ `COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))` សម្រាប់ `aclexplode()`៖ នៅពេល `proacl` មិនមែន NULL query នឹង explode សិទ្ធិដែលបានកត់ត្រាទុកក្នុង `proacl`។ នៅពេល `proacl` ជា NULL query នឹង explode សិទ្ធិ Function ACL លំនាំដើមរបស់ PostgreSQL ដែលបង្កើតឡើងដោយ `acldefault()`។ អាស្រ័យហេតុនេះ Query 1 វាយតម្លៃស្ថានភាពសិទ្ធិ Direct Function ACL ចុងក្រោយ (Resulting Direct Function ACL State — ទោះជា stored ACL ឬ PostgreSQL default ACL នៅពេល `proacl` ជា NULL) ដើម្បីផ្ទៀងផ្ទាត់ថាតើ `PUBLIC` មានសិទ្ធិ `EXECUTE` ដែរឬទេ និងថាតើសិទ្ធិ `EXECUTE` ដែលរំពឹងទុកមានវត្តមានសម្រាប់ `anon` និង `authenticated` ឬទេ។ ការផ្ទៀងផ្ទាត់នេះ គឺផ្ទៀងផ្ទាត់លើស្ថានភាព Catalog ACL ចុងក្រោយ (resulting catalog ACL state) ដោយមិនមែនជាការបញ្ជាក់ដោយឯករាជ្យអំពីប្រវត្តិនៃការដំណើរការ DDL statements ជាក់លាក់ណាមួយ (ដូចជា `REVOKE` ឬ `GRANT`) ឡើយ។ យន្តការនេះរក្សាការបែងចែកដាច់ដោយឡែករវាង Direct ACL entries (កត់ត្រាក្នុង Catalog) និង Effective privileges (`has_function_privilege()`)។ ការចាប់យក `PUBLIC` គឺពឹងផ្អែកលើការត្រួតពិនិត្យ ACL entries ជាក់ស្តែងដែលត្រឡប់មកវិញសម្រាប់ Functions គោលដៅ ដោយផ្ទៀងផ្ទាត់អវត្តមាននៃ Grantee OID = 0។  
> 2. **Effective Function Privileges (`has_function_privilege()`):** ផ្ទៀងផ្ទាត់សិទ្ធិប្រតិបត្តិជាក់ស្តែង (Effective PostgreSQL Function Privilege) របស់ Role នីមួយៗនៅកម្រិត Database Engine។ **អនុគមន៍នេះមិនមែនជាការធ្វើតេស្ត End-to-End RPC តាមរយៈ PostgREST ឬ Frontend ឡើយ**។  
> 3. **លក្ខខណ្ឌតម្រូវបន្ថែមសម្រាប់ RPC Call:** ការមានសិទ្ធិ `EXECUTE` លើ Function គឺជាលក្ខខណ្ឌចាំបាច់ ប៉ុន្តែ **មិនទាន់គ្រប់គ្រាន់ឡើយ** ក្នុងការហៅ RPC ពី Frontend។ Client Roles ត្រូវតែមានសិទ្ធិ **`USAGE` លើ Schema `public`** បន្ថែមទៀត ដែលត្រូវបានផ្ទៀងផ្ទាត់ដាច់ដោយឡែកក្នុង **ផ្នែកទី ៣.គ (Section 3.C)**។

---

#### ១. Direct Function ACL Matrix & Anomaly Detection (Query 1)

> [!NOTE]
> **ការពន្យល់អំពីចំនួនជួរដេកនៃ Query 1 (Row-Count Distinction):**  
> - ចំនួន **៤ ជួរដេក** គឺសំដៅតែលើ **Tier 1 (Logical Expected Checks)** ប៉ុណ្ណោះ គឺ ២ Canonical Functions × ២ Roles (`anon` និង `authenticated`) ដែលជាលក្ខខណ្ឌតម្រូវស្នូល។  
> - ចំនួនជួរដេកសរុបនៃ Query 1 **មិនត្រូវបានធានា ឬសន្មតថាត្រូវតែមាន ៦ ជួរដេកជានិច្ចនោះឡើយ**។ ចំនួនជួរដេកនៃ Tier 3 អាស្រ័យលើចំនួន ACL entries ជាក់ស្តែងដែលត្រឡប់មកវិញសម្រាប់ target functions ដែលអាចបន្ថែម owner ACL entries (បង្ហាញជា `INFO — OWNER ACL ENTRY`) ឬ entries ផ្សេងៗទៀត និង anomalies (ប្រសិនបើមាន)។ ដូច្នេះ ៤ ជួរដេកនៃ Tier 1 គឺជា expected checks ចំណែកចំនួនជួរដេកសរុបនៃ Query 1 មិនត្រូវបង្ខំឱ្យត្រូវតាមចំនួនថេរណាមួយឡើយ (កុំកែប្រែ SQL គ្រាន់តែដើម្បីបង្ខំចំនួនជួរដេកសរុប)។  
> - **ការរកឃើញ Overload ដោយឯករាជ្យពី ACL:** Tier 2 ពិនិត្យដោយផ្ទាល់ពី `pg_proc` ដូច្នេះទោះបីជា Unexpected Overload គ្មាន ACL entry ក៏ដោយ ក៏វានឹងត្រូវបញ្ចេញជា `FAIL — UNEXPECTED OVERLOAD DETECTED` ជានិច្ច។

```sql
-- ============================================================================
-- VERIFICATION 2.B.1: DIRECT FUNCTION ACL MATRIX & ANOMALY DETECTION (ROUND 3)
-- 1. Tier 1: Evaluates the 4 mandatory expected grants (2 functions x 2 roles)
--    with strict grantability validation (is_grantable = false required for PASS).
-- 2. Tier 2: Directly inspects pg_proc for unexpected overloads/legacy functions,
--    guaranteeing overload detection even if an overload has ZERO ACL entries.
-- 3. Tier 3: Explodes all actual ACLs to detect PUBLIC (OID 0), unexpected
--    privileges/grantees, and classifies owner entries strictly as INFO.
-- Note: 4 rows refer ONLY to Tier 1 logical checks. Total query rows will include
-- owner entries (typically 2 INFO rows) and any anomalies (FAIL rows).
-- ============================================================================
WITH expected_canonical_grants AS (
  SELECT 'get_guest_by_slug'::text AS proname, 'text'::text AS expected_args, 'anon'::text AS grantee_name
  UNION ALL
  SELECT 'get_guest_by_slug'::text, 'text'::text, 'authenticated'::text
  UNION ALL
  SELECT 'submit_rsvp'::text, 'text, text, text'::text, 'anon'::text
  UNION ALL
  SELECT 'submit_rsvp'::text, 'text, text, text'::text, 'authenticated'::text
),
target_functions_catalog AS (
  SELECT 
    p.oid AS proc_oid,
    p.proname,
    pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
    p.proowner,
    owner_role.rolname AS owner_name,
    p.proacl
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_catalog.pg_roles owner_role ON owner_role.oid = p.proowner
  WHERE n.nspname = 'public'
    AND p.proname IN ('get_guest_by_slug', 'submit_rsvp', 'get_guest_by_token')
),
exploded_acl AS (
  SELECT 
    p.proc_oid,
    p.proname,
    p.identity_arguments,
    p.proowner,
    p.owner_name,
    a.grantor AS grantor_oid,
    grantor_role.rolname AS grantor_name,
    a.grantee AS grantee_oid,
    COALESCE(grantee_role.rolname, 'PUBLIC') AS grantee_name,
    a.privilege_type,
    a.is_grantable
  FROM target_functions_catalog p
  CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
  LEFT JOIN pg_catalog.pg_roles grantee_role ON grantee_role.oid = a.grantee
  LEFT JOIN pg_catalog.pg_roles grantor_role ON grantor_role.oid = a.grantor
),
-- TIER 1: Expected Canonical Grants Matrix (Exactly 4 logical checks)
tier1_expected_checks AS (
  SELECT 
    ecg.proname AS function_name,
    ecg.expected_args AS identity_arguments,
    ecg.grantee_name AS grantee_role,
    acl.privilege_type,
    acl.is_grantable,
    tfc.owner_name,
    CASE 
      -- 1. Canonical function does not exist in catalog
      WHEN tfc.proc_oid IS NULL 
      THEN 'FAIL — CANONICAL FUNCTION MISSING'

      -- 2. Canonical function exists, but grant is missing from proacl
      WHEN acl.proc_oid IS NULL 
      THEN 'FAIL — EXPECTED GRANT MISSING'

      -- 3. Grant has WITH GRANT OPTION (Security defect)
      WHEN acl.is_grantable = true 
      THEN 'FAIL — EXECUTE GRANT OPTION DETECTED'

      -- 4. Valid canonical grant: EXECUTE and is_grantable = false
      WHEN acl.privilege_type = 'EXECUTE' AND acl.is_grantable = false 
      THEN 'PASS — EXPECTED EXECUTE GRANT'

      ELSE 'FAIL — UNEXPECTED PRIVILEGE OR GRANTEE'
    END AS acl_verification_status,
    1 AS sort_tier
  FROM expected_canonical_grants ecg
  LEFT JOIN target_functions_catalog tfc 
    ON tfc.proname = ecg.proname 
   AND tfc.identity_arguments = ecg.expected_args
  LEFT JOIN exploded_acl acl 
    ON acl.proc_oid = tfc.proc_oid 
   AND acl.grantee_name = ecg.grantee_name 
   AND acl.privilege_type = 'EXECUTE'
),
-- TIER 2: Overload & Legacy Function Catalog Detection (Independent of ACL presence)
tier2_overload_checks AS (
  SELECT 
    tfc.proname AS function_name,
    tfc.identity_arguments,
    'N/A (FUNCTION OVERLOAD)'::text AS grantee_role,
    NULL::text AS privilege_type,
    NULL::boolean AS is_grantable,
    tfc.owner_name,
    'FAIL — UNEXPECTED OVERLOAD DETECTED' AS acl_verification_status,
    2 AS sort_tier
  FROM target_functions_catalog tfc
  WHERE tfc.proname = 'get_guest_by_token'
     OR (tfc.proname = 'get_guest_by_slug' AND tfc.identity_arguments <> 'text')
     OR (tfc.proname = 'submit_rsvp' AND tfc.identity_arguments <> 'text, text, text')
),
-- TIER 3: Additional ACL Entries, PUBLIC Detection, Owner Entries & Anomalies
tier3_additional_acl_checks AS (
  SELECT 
    acl.proname AS function_name,
    acl.identity_arguments,
    acl.grantee_name AS grantee_role,
    acl.privilege_type,
    acl.is_grantable,
    acl.owner_name,
    CASE 
      -- 1. PUBLIC execution grant detected (grantee OID 0)
      WHEN acl.grantee_oid = 0 OR acl.grantee_name = 'PUBLIC'
      THEN 'FAIL — PUBLIC GRANT DETECTED'

      -- 2. Owner ACL entry (normal PostgreSQL owner privileges)
      WHEN acl.grantee_oid = acl.proowner
      THEN 'INFO — OWNER ACL ENTRY'

      -- 3. service_role direct ACL entry (informational if present, not required by migration)
      WHEN acl.grantee_name = 'service_role'
      THEN 'INFO — SERVICE_ROLE DIRECT ACL ENTRY (NOT REQUIRED BY MIGRATION)'

      -- 4. Any other unexpected grantee or privilege
      ELSE 'FAIL — UNEXPECTED PRIVILEGE OR GRANTEE'
    END AS acl_verification_status,
    3 AS sort_tier
  FROM exploded_acl acl
  -- Exclude the canonical (anon, authenticated) EXECUTE grants already evaluated in Tier 1
  WHERE NOT (
    (acl.proname = 'get_guest_by_slug' AND acl.identity_arguments = 'text' AND acl.grantee_name IN ('anon', 'authenticated') AND acl.privilege_type = 'EXECUTE')
    OR
    (acl.proname = 'submit_rsvp' AND acl.identity_arguments = 'text, text, text' AND acl.grantee_name IN ('anon', 'authenticated') AND acl.privilege_type = 'EXECUTE')
  )
  -- Also exclude entries for functions that are already flagged as overloads in Tier 2 unless granted to PUBLIC
  AND (
    (acl.proname = 'get_guest_by_slug' AND acl.identity_arguments = 'text')
    OR
    (acl.proname = 'submit_rsvp' AND acl.identity_arguments = 'text, text, text')
    OR
    (acl.grantee_oid = 0 OR acl.grantee_name = 'PUBLIC')
  )
)
SELECT 
  function_name,
  identity_arguments,
  grantee_role,
  privilege_type,
  is_grantable,
  owner_name,
  acl_verification_status
FROM (
  SELECT * FROM tier1_expected_checks
  UNION ALL
  SELECT * FROM tier2_overload_checks
  UNION ALL
  SELECT * FROM tier3_additional_acl_checks
) combined_acl_matrix
ORDER BY 
  sort_tier,
  function_name,
  identity_arguments,
  grantee_role;
```

---

#### ២. Effective Function Privileges (`has_function_privilege()`)

> [!NOTE]
> **EFFECTIVE FUNCTION PRIVILEGE CHECK — NOT AN END-TO-END RPC TEST:**  
> - **ការធានាចំនួន ៦ ជួរដេកគត់ (Exact 6-Row Guarantee):** Grid រវាង Canonical Functions ទាំង ២ និង Roles ទាំង ៣ (`anon`, `authenticated`, `service_role`) ធានាការបញ្ចេញ ៦ ជួរដេកជានិច្ច ទោះបីជា Canonical Function មិនមានក្នុង Catalog ក៏ដោយ (បញ្ចេញជា `FAIL — CANONICAL FUNCTION MISSING`)។  
> - **ការបកស្រាយស្ថានភាព `service_role` (Neutral & Informational):** `has_function_privilege()` បញ្ជាក់ថាតើ `service_role` អាច Run Function បាន ឬមិនបាននៅ Runtime។ Query នេះ **មិនទាញសេចក្តីសន្និដ្ឋានអំពីប្រភពនៃសិទ្ធិឡើយ (Do not infer source)** ថាតើសិទ្ធិនោះបានមកពី direct grant, role membership (inheritance), ឬ superuser bypass ឡើយ ហើយទាំងពីរស្ថានភាពមិនមែនជា failure ឡើយ ព្រោះ Migration មិនបាន grant ទៅ service_role ឡើយ។

```sql
-- ============================================================================
-- VERIFICATION 2.B.2: EFFECTIVE FUNCTION PRIVILEGES (NOT AN END-TO-END RPC TEST)
-- Evaluates net runtime execution rights via pg_catalog.has_function_privilege().
-- Guaranteed EXACTLY 6 rows (2 expected canonical functions x 3 target roles).
-- Missing canonical functions emit explicit 'FAIL — CANONICAL FUNCTION MISSING'.
-- Note: has_function_privilege() evaluates effective runtime rights, not direct ACL.
-- For service_role, both outcomes are informational; the query does not infer the
-- specific source (direct grant, membership, or superuser) from this check alone.
-- ============================================================================
WITH expected_functions AS (
  SELECT 'get_guest_by_slug'::text AS proname, 'text'::text AS expected_args
  UNION ALL
  SELECT 'submit_rsvp'::text, 'text, text, text'::text
),
expected_roles AS (
  SELECT 'anon'::text AS rolname, 1 AS role_order
  UNION ALL
  SELECT 'authenticated'::text, 2
  UNION ALL
  SELECT 'service_role'::text, 3
),
expected_grid AS (
  SELECT 
    ef.proname,
    ef.expected_args,
    er.rolname,
    er.role_order
  FROM expected_functions ef
  CROSS JOIN expected_roles er
),
canonical_proc AS (
  SELECT 
    p.oid AS proc_oid,
    p.proname,
    pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND (
      (p.proname = 'get_guest_by_slug' AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'text')
      OR
      (p.proname = 'submit_rsvp' AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'text, text, text')
    )
)
SELECT 
  eg.proname AS function_name,
  eg.expected_args,
  eg.rolname AS target_role,
  cp.proc_oid,
  cp.identity_arguments AS catalog_identity_args,
  CASE 
    WHEN cp.proc_oid IS NULL THEN NULL
    ELSE pg_catalog.has_function_privilege(eg.rolname, cp.proc_oid, 'EXECUTE')
  END AS has_effective_execute,
  CASE 
    -- 1. Missing Canonical Function
    WHEN cp.proc_oid IS NULL 
    THEN 'FAIL — CANONICAL FUNCTION MISSING'

    -- 2. anon and authenticated: Mandatory Effective Execute
    WHEN eg.rolname IN ('anon', 'authenticated') THEN
      CASE 
        WHEN pg_catalog.has_function_privilege(eg.rolname, cp.proc_oid, 'EXECUTE') = true
        THEN 'PASS — EXPECTED EFFECTIVE EXECUTE'
        ELSE 'FAIL — EXPECTED EFFECTIVE EXECUTE MISSING'
      END

    -- 3. service_role: Informational reporting only (never an automatic failure)
    WHEN eg.rolname = 'service_role' THEN
      CASE 
        WHEN pg_catalog.has_function_privilege(eg.rolname, cp.proc_oid, 'EXECUTE') = true
        THEN 'INFO — SERVICE_ROLE HAS EFFECTIVE EXECUTE'
        ELSE 'INFO — SERVICE_ROLE HAS NO EFFECTIVE EXECUTE'
      END

    ELSE 'INCONCLUSIVE'
  END AS effective_privilege_status
FROM expected_grid eg
LEFT JOIN canonical_proc cp 
  ON cp.proname = eg.proname 
 AND cp.identity_arguments = eg.expected_args
ORDER BY eg.proname, eg.role_order;
```

---

#### ៣. តារាងវិនិច្ឆ័យលទ្ធផលរំពឹងទុក (Expected Result Interpretation Matrix)

| ស្ថានភាពសេណារីយ៉ូ (Evaluation Scenario) | លទ្ធផល Query 1 (Direct ACL Status) | លទ្ធផល Query 2 (Effective Status) | ការបកស្រាយបច្ចេកទេស និងសកម្មភាពបន្ទាប់ |
| :--- | :--- | :--- | :--- |
| **Canonical Function មាន & Grants ត្រឹមត្រូវ** | `PASS — EXPECTED EXECUTE GRANT` (៤ ជួរ) | `PASS — EXPECTED EFFECTIVE EXECUTE` (៤ ជួរ) | **FUNCTION ACL VERIFICATION PASS — NOT OVERALL MIGRATION PASS:** សិទ្ធិផ្ទាល់ និងសិទ្ធិ Runtime ត្រឹមត្រូវតាមស្ថាបត្យកម្ម Slug-Only។ |
| **ខ្វះការ Grant លើ Anon ឬ Auth** | `FAIL — EXPECTED GRANT MISSING` | `FAIL — EXPECTED EFFECTIVE EXECUTE MISSING` | **FAIL:** Migration មិនបានផ្តល់សិទ្ធិគ្រប់គ្រាន់ Frontend នឹងជួប 403 Forbidden។ |
| **រកឃើញសិទ្ធិរបស់ PUBLIC** | `FAIL — PUBLIC GRANT DETECTED` | `PASS` (ប្រសិនបើ anon/auth ទទួលបានតាម public) | **CRITICAL SECURITY FAIL:** `REVOKE ALL FROM PUBLIC` បរាជ័យ ឬមិនបានដំណើរការ។ |
| **រកឃើញ Unexpected Overload ឬ Token RPC** | `FAIL — UNEXPECTED OVERLOAD DETECTED` | *(មិនឆ្លុះបញ្ចាំងក្នុង canonical grid ឡើយ)* | **FAIL:** មាន Function លើស ឬ Signature ចាស់មិនទាន់បាន DROP ចោល។ |
| **Canonical Function ត្រូវបាន DROP/បាត់បង់** | `FAIL — CANONICAL FUNCTION MISSING` | `FAIL — CANONICAL FUNCTION MISSING` | **CRITICAL FAIL:** Migration មិនបានបង្កើត Function ឬ Function ត្រូវបានលុប។ |
| **Grant មាន `WITH GRANT OPTION` (`is_grantable=true`)** | `FAIL — EXECUTE GRANT OPTION DETECTED` | `PASS — EXPECTED EFFECTIVE EXECUTE` | **SECURITY FAIL:** Role មិនត្រូវមានសិទ្ធិ Grant បន្តទៅ Role ផ្សេងឡើយ។ |
| **Owner ACL Entry មានវត្តមាន** | `INFO — OWNER ACL ENTRY` (២ ជួរ) | *(មិនបង្ហាញជួរដាច់ដោយឡែកឡើយ)* | **NORMAL/SAFE:** Function Owner (postgres) រក្សាសិទ្ធិផ្ទាល់ខ្លួន មិនរាប់ជាកំហុសឡើយ។ |
| **`service_role` មាន Effective Execute** | *(បង្ហាញជា INFO បើមាន direct grant)* | `INFO — SERVICE_ROLE HAS EFFECTIVE EXECUTE` | **INFO ONLY — Effective EXECUTE is present. The source of the privilege is not determined by this query.** |
| **`service_role` គ្មាន Effective Execute** | *(មិនបង្ហាញជួរក្នុង Tier 1 ឡើយ)* | `INFO — SERVICE_ROLE HAS NO EFFECTIVE EXECUTE` | **INFO ONLY:** `service_role` គ្មានសិទ្ធិ Run Function (ស្របតាម Migration ដែលមិនបាន grant ទៅ service_role)។ |

---

## ៣. ការផ្ទៀងផ្ទាត់ TABLE & SCHEMA ACL (Table & Schema ACL Verification)

> [!IMPORTANT]
> **វិធាននៃការផ្ទៀងផ្ទាត់ Table & Schema Privileges (Direct ACL vs. Effective Privileges):**  
> 1. **Direct Table ACL (ជួរឈរ `relacl` & `acldefault`):** Query 3.A ប្រើប្រាស់ `COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))` សម្រាប់ `aclexplode()`៖ នៅពេល `relacl` មិនមែន NULL query នឹង explode សិទ្ធិដែលបានកត់ត្រាទុកក្នុង `relacl`។ នៅពេល `relacl` ជា NULL (គ្មាន explicit DDL កត់ត្រា) query នឹង explode សិទ្ធិ Table ACL លំនាំដើមរបស់ PostgreSQL ដែលបង្កើតឡើងដោយ `acldefault('r', ...)`។ ការផ្ទៀងផ្ទាត់ Direct ACL គឺផ្ទៀងផ្ទាត់លើស្ថានភាព catalog ACL ចុងក្រោយ មិនមែនជាការបញ្ជាក់ដោយឯករាជ្យអំពីប្រវត្តិនៃការដំណើរការ DDL statements ជាក់លាក់ណាមួយឡើយ។  
> 2. **Effective Table Privileges (`has_table_privilege()`):** Query 3.B ផ្ទៀងផ្ទាត់សិទ្ធិប្រតិបត្តិជាក់ស្តែង (Effective PostgreSQL Table Privileges) របស់ Role នីមួយៗនៅកម្រិត Database Engine (រាប់បញ្ចូលទាំង direct grants, role inheritance, និង superuser bypass ប្រសិនបើមាន) ដោយមិនទាញសេចក្តីសន្និដ្ឋានអំពីប្រភពនៃសិទ្ធិឡើយ។  
> 3. **ស្ថានភាព PostgreSQL Server Version (UNKNOWN Disclaimer):** កំណែទម្រង់ (Version) ជាក់ស្តែងរបស់ Supabase Production PostgreSQL **នៅតែជា UNKNOWN (មិនទាន់ដឹងច្បាស់)** រហូតទាល់តែមានការទាញយកជាក់ស្តែងតាមរយៈ Read-Only Preflight (`SELECT version();`)។ Query 3.B ត្រូវបានរចនាឡើងដោយមាន Version Guard ដើម្បីគាំទ្រគ្រប់ version ដោយសុវត្ថិភាព។  
> 4. **ដែនកំណត់នៃ Static Review:** ការត្រួតពិនិត្យ Static Review នេះមិនមែនជា PostgreSQL Runtime Validation ឡើយ។

---

### ក. ផ្ទៀងផ្ទាត់ Direct Table ACL តាមរយៈ `aclexplode()` (Matrix & Diagnostics)

> [!NOTE]
> **រចនាសម្ព័ន្ធវិនិច្ឆ័យនៃ Query 3.A (Tiered Architecture & Multiple Entries Handling):**  
> - **Tier 0 (Independent Table & Owner Diagnostic):** ពិនិត្យវត្តមានរបស់តារាង `public.guests` និង Role Owner ដោយផ្ទាល់ពី `pg_class` និង `pg_roles` **ដោយមិនពឹងផ្អែកលើជួរដេកនៃ `aclexplode()` ឡើយ**។ វាផ្តល់ diagnostic ច្បាស់លាស់ប្រសិនបើតារាងបាត់បង់, Owner Role បាត់បង់ពី `pg_roles`, Owner ជា client role (`anon` ឬ `authenticated` — Security Defect), ឬ Owner ជា administrative role ស្របច្បាប់ (ដោយមិនសន្មតថាត្រូវតែជា `postgres` ឡើយ)។  
> - **Tier 1 (Expected Authenticated Table Grants):** វាយតម្លៃ mandatory CRUD grants (`SELECT`, `INSERT`, `UPDATE`, `DELETE`)។ ប្រើប្រាស់ CTE `authenticated_crud_summary` ដើម្បី aggregate សិទ្ធិក្នុងករណីមាន grantors ច្រើន ធានាការបញ្ចេញ **៤ ជួរដេកគត់** និងលុបបំបាត់ contradictory rows (PASS ផង និង FAIL ផងសម្រាប់សិទ្ធិតែមួយ)។ ប្រសិនបើ entry ណាមួយមាន `is_grantable = true` នោះ privilege នោះនឹងត្រូវ flag ជា `FAIL` ភ្លាមៗ។  
> - **Tier 2 (Forbidden Direct Grants & Ownership Defects):** ចាប់យកគ្រប់សិទ្ធិដែលមិនមែនជា CRUD លើ `authenticated` (ប្រើ `privilege_type NOT IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')` ចាប់យកបានទាំង `TRUNCATE`, `REFERENCES`, `TRIGGER`, `MAINTAIN` លើ PG17+, និងសិទ្ធិដទៃទៀត), ចាប់យកសិទ្ធិផ្ទាល់លើ `anon` និង `PUBLIC` (OID 0), និង grant options មិនប្រក្រតី។  
> - **Tier 3 (Informational Entries):** បញ្ចេញ legitimate owner entries (`INFO — OWNER TABLE ACL ENTRY`) និង `service_role` baseline entries (`INFO — SERVICE_ROLE BASELINE TABLE PRIVILEGE`) ដោយគ្មាន dead code ឬ contradictory status ឡើយ។

```sql
-- ============================================================================
-- VERIFICATION 3.A: DIRECT TABLE ACL MATRIX & ANOMALY DETECTION (ROUND 3.4 PRECISION)
-- 1. Tier 0: Independent Table & Owner Diagnostic (does not depend on aclexplode).
-- 2. Tier 1: Expected Authenticated Grants (Exactly 4 logical checks: CRUD only).
--    Aggregates multiple grantors per privilege into one consistent logical check:
--    - Emits PASS only if grant_count >= 1 AND has_grant_option = false.
--    - Emits FAIL if grant is missing or if ANY grant has is_grantable = true.
--    - Avoids contradictory PASS/FAIL rows for the same logical privilege.
-- 3. Tier 2: Forbidden Direct Grants & Ownership Defects:
--    - Broadly detects ANY non-CRUD privilege on authenticated (privilege_type
--      NOT IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')). Catches TRUNCATE,
--      REFERENCES, TRIGGER, MAINTAIN on PG17+, and any future table privilege.
--    - Detects table owner being a client role (anon or authenticated).
--    - Detects forbidden direct table grants to anon or PUBLIC (grantee OID 0).
--    - Detects unexpected grant options without duplicating Tier 1 checks.
-- 4. Tier 3: Explodes legitimate administrative owner entries (INFO) and service_role
--    baseline entries (INFO) without dead code or contradictory rows.
-- ============================================================================
WITH expected_table_target AS (
  SELECT 'public'::text AS schemaname, 'guests'::text AS tablename
),
expected_authenticated_grants AS (
  SELECT 'SELECT'::text AS privilege_type UNION ALL
  SELECT 'INSERT'::text UNION ALL
  SELECT 'UPDATE'::text UNION ALL
  SELECT 'DELETE'::text
),
expected_roles AS (
  SELECT 'authenticated'::text AS rolname
),
roles_catalog AS (
  SELECT 
    er.rolname,
    pr.oid AS role_oid
  FROM expected_roles er
  LEFT JOIN pg_catalog.pg_roles pr ON pr.rolname = er.rolname
),
target_table_catalog AS (
  SELECT 
    c.oid AS table_oid,
    n.nspname AS schemaname,
    c.relname AS tablename,
    c.relowner,
    owner_role.rolname AS owner_name,
    c.relacl
  FROM expected_table_target ett
  LEFT JOIN pg_catalog.pg_namespace n ON n.nspname = ett.schemaname
  LEFT JOIN pg_catalog.pg_class c ON c.relnamespace = n.oid AND c.relname = ett.tablename
  LEFT JOIN pg_catalog.pg_roles owner_role ON owner_role.oid = c.relowner
),
exploded_table_acl AS (
  SELECT 
    t.table_oid,
    t.schemaname,
    t.tablename,
    t.relowner,
    t.owner_name,
    (t.relacl IS NULL) AS is_default_table_acl,
    a.grantee AS grantee_oid,
    COALESCE(grantee_role.rolname, 'PUBLIC') AS grantee_name,
    a.grantor AS grantor_oid,
    grantor_role.rolname AS grantor_name,
    a.privilege_type,
    a.is_grantable
  FROM target_table_catalog t
  CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(t.relacl, pg_catalog.acldefault('r', t.relowner))) a
  LEFT JOIN pg_catalog.pg_roles grantee_role ON grantee_role.oid = a.grantee
  LEFT JOIN pg_catalog.pg_roles grantor_role ON grantor_role.oid = a.grantor
  WHERE t.table_oid IS NOT NULL
),
-- TIER 0: Independent Table Existence & Owner Role Diagnostic
tier0_table_owner_diagnostic AS (
  SELECT 
    COALESCE(ttc.owner_name, 'UNKNOWN / ORPHANED OID: ' || COALESCE(ttc.relowner::text, 'NULL')) AS grantee_role,
    'OWNER DIAGNOSTIC'::text AS privilege_type,
    NULL::boolean AS is_grantable,
    ttc.owner_name,
    CASE 
      -- 1. Missing target table public.guests
      WHEN ttc.table_oid IS NULL 
      THEN 'FAIL — TABLE public.guests MISSING'

      -- 2. Owner role does not exist in pg_roles (orphaned owner OID)
      WHEN ttc.owner_name IS NULL 
      THEN 'FAIL — TABLE OWNER ROLE MISSING IN pg_roles (OID: ' || ttc.relowner || ')'

      -- 3. Security violation: Owner is client role anon
      WHEN ttc.owner_name = 'anon' 
      THEN 'FAIL — SECURITY VIOLATION: TABLE OWNER IS CLIENT ROLE anon'

      -- 4. Security violation: Owner is client role authenticated
      WHEN ttc.owner_name = 'authenticated' 
      THEN 'FAIL — SECURITY VIOLATION: TABLE OWNER IS CLIENT ROLE authenticated'

      -- 5. Standard administrative owner postgres
      WHEN ttc.owner_name = 'postgres' 
      THEN 'PASS — TABLE OWNER IS postgres'

      -- 6. Other administrative owner (e.g. supabase_admin)
      ELSE 'INFO — TABLE OWNER IS ' || ttc.owner_name || ' (VERIFY ADMINISTRATIVE ROLE)'
    END AS table_acl_status,
    0 AS sort_tier
  FROM target_table_catalog ttc
),
-- Aggregate authenticated CRUD grants to handle multiple grantors safely
authenticated_crud_summary AS (
  SELECT 
    acl.privilege_type,
    count(*)::integer AS grant_count,
    bool_or(acl.is_grantable) AS has_grant_option,
    string_agg(DISTINCT acl.grantor_name, ', ' ORDER BY acl.grantor_name) AS grantors
  FROM exploded_table_acl acl
  WHERE acl.grantee_name = 'authenticated'
    AND acl.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  GROUP BY acl.privilege_type
),
-- TIER 1: Expected Authenticated Table Grants (Exactly 4 logical checks)
tier1_expected_checks AS (
  SELECT 
    'authenticated'::text AS grantee_role,
    eag.privilege_type,
    COALESCE(acs.has_grant_option, false) AS is_grantable,
    ttc.owner_name,
    CASE 
      WHEN ttc.table_oid IS NULL 
      THEN 'FAIL — TABLE public.guests MISSING'

      WHEN rc.role_oid IS NULL 
      THEN 'FAIL — REQUIRED DATABASE ROLE authenticated MISSING'

      WHEN ttc.owner_name = 'authenticated' 
      THEN 'FAIL — SECURITY VIOLATION: TABLE OWNER IS authenticated'

      WHEN acs.grant_count IS NULL OR acs.grant_count = 0 
      THEN 'FAIL — EXPECTED TABLE GRANT MISSING'

      WHEN acs.has_grant_option = true 
      THEN 'FAIL — UNEXPECTED TABLE GRANT OPTION DETECTED (grantors: ' || COALESCE(acs.grantors, 'unknown') || ')'

      WHEN acs.grant_count >= 1 AND acs.has_grant_option = false 
      THEN 
        CASE 
          WHEN acs.grant_count > 1 
          THEN 'PASS — EXPECTED TABLE GRANT (MULTIPLE GRANTORS: ' || acs.grantors || ')'
          ELSE 'PASS — EXPECTED TABLE GRANT'
        END

      ELSE 'FAIL — UNEXPECTED PRIVILEGE STATE'
    END AS table_acl_status,
    1 AS sort_tier
  FROM expected_authenticated_grants eag
  CROSS JOIN roles_catalog rc
  LEFT JOIN target_table_catalog ttc ON true
  LEFT JOIN authenticated_crud_summary acs 
    ON acs.privilege_type = eag.privilege_type
),
-- TIER 2: Forbidden Direct Grants & Ownership Defects (Preserves individual anomaly entries)
tier2_forbidden_checks AS (
  SELECT 
    acl.grantee_name AS grantee_role,
    acl.privilege_type,
    acl.is_grantable,
    acl.owner_name,
    CASE 
      -- Security violation: table owner is a client role
      WHEN acl.owner_name IN ('anon', 'authenticated') 
      THEN 'FAIL — SECURITY VIOLATION: TABLE OWNER IS CLIENT ROLE (' || acl.owner_name || ')'

      -- Forbidden direct grant to anon
      WHEN acl.grantee_name = 'anon' 
      THEN 'FAIL — FORBIDDEN ANON TABLE PRIVILEGE DETECTED (' || acl.privilege_type || ')'

      -- Forbidden direct grant to PUBLIC (grantee OID 0)
      WHEN acl.grantee_oid = 0 OR acl.grantee_name = 'PUBLIC' 
      THEN 'FAIL — FORBIDDEN PUBLIC TABLE PRIVILEGE DETECTED (' || acl.privilege_type || ')'

      -- Forbidden non-CRUD privilege on authenticated (dynamically catches TRUNCATE, REFERENCES, TRIGGER, MAINTAIN, etc.)
      WHEN acl.grantee_name = 'authenticated' AND acl.privilege_type NOT IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE') 
      THEN 'FAIL — FORBIDDEN AUTHENTICATED TABLE PRIVILEGE DETECTED (' || acl.privilege_type || ')'

      -- Non-owner grant with WITH GRANT OPTION (excluding authenticated CRUD already evaluated in Tier 1)
      WHEN acl.grantee_oid <> acl.relowner AND acl.is_grantable = true 
       AND NOT (acl.grantee_name = 'authenticated' AND acl.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE'))
      THEN 'FAIL — UNEXPECTED TABLE GRANT OPTION DETECTED'

      -- Unexpected third-party grantee
      WHEN acl.grantee_name NOT IN ('authenticated', 'service_role') AND acl.grantee_oid <> acl.relowner 
      THEN 'FAIL — UNEXPECTED TABLE GRANTEE DETECTED (' || acl.grantee_name || ')'

      ELSE 'FAIL — UNEXPECTED TABLE PRIVILEGE STATE'
    END AS table_acl_status,
    2 AS sort_tier
  FROM exploded_table_acl acl
  WHERE acl.owner_name IN ('anon', 'authenticated')
     OR acl.grantee_name = 'anon'
     OR acl.grantee_oid = 0 
     OR acl.grantee_name = 'PUBLIC'
     OR (acl.grantee_name = 'authenticated' AND acl.privilege_type NOT IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE'))
     OR (acl.grantee_oid <> acl.relowner AND acl.is_grantable = true AND NOT (acl.grantee_name = 'authenticated' AND acl.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')))
     OR (acl.grantee_name NOT IN ('authenticated', 'service_role') AND acl.grantee_oid <> acl.relowner)
),
-- TIER 3: Informational Entries (Administrative Owner entries and service_role baseline entries)
tier3_informational_checks AS (
  SELECT 
    acl.grantee_name AS grantee_role,
    acl.privilege_type,
    acl.is_grantable,
    acl.owner_name,
    CASE 
      WHEN acl.grantee_oid = acl.relowner 
      THEN 'INFO — OWNER TABLE ACL ENTRY'

      WHEN acl.grantee_name = 'service_role' 
      THEN 'INFO — SERVICE_ROLE BASELINE TABLE PRIVILEGE'

      ELSE 'INFO — OTHER DIRECT TABLE ACL ENTRY'
    END AS table_acl_status,
    3 AS sort_tier
  FROM exploded_table_acl acl
  WHERE acl.owner_name NOT IN ('anon', 'authenticated')
    AND (
      acl.grantee_oid = acl.relowner
      OR
      (acl.grantee_name = 'service_role' AND acl.is_grantable = false)
    )
    AND NOT (acl.grantee_name = 'authenticated' AND acl.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE'))
)
SELECT 
  grantee_role,
  privilege_type,
  is_grantable,
  owner_name,
  table_acl_status
FROM (
  SELECT * FROM tier0_table_owner_diagnostic
  UNION ALL
  SELECT * FROM tier1_expected_checks
  UNION ALL
  SELECT * FROM tier2_forbidden_checks
  UNION ALL
  SELECT * FROM tier3_informational_checks
) combined_table_acl
ORDER BY sort_tier, grantee_role, privilege_type;
```

---

### ខ. ផ្ទៀងផ្ទាត់ Effective Table Privileges តាមរយៈ `has_table_privilege()`

> [!NOTE]
> **ការវាយតម្លៃ EFFECTIVE TABLE PRIVILEGES (Version-Guarded MAINTAIN & Neutral Service Role):**  
> - **Guarded Evaluation (ការពារកំហុស Relation/Role Missing):** ប្រើប្រាស់ `to_regclass('public.guests')` និង `LEFT JOIN pg_roles`។ ប្រសិនបើតារាង ឬ Role មិនមានក្នុង Catalog នោះ Query នឹងបញ្ចេញលទ្ធផល `FAIL — TABLE public.guests MISSING` ឬ `FAIL — REQUIRED DATABASE ROLE MISSING` ដោយសុវត្ថិភាព ដោយមិនគាំងដោយសារ Unhandled Error ឡើយ។  
> - **Version-Aware MAINTAIN Privilege Evaluation:** សិទ្ធិ `MAINTAIN` ត្រូវបានបង្កើតឡើងក្នុង PostgreSQL 17+។ Query 3.B វាយតម្លៃ `can_maintain` ដោយប្រើលក្ខខណ្ឌ `(current_setting('server_version_num')::integer >= 170000)` ក្នុង CTE `effective_privileges_raw`។ នៅលើ PostgreSQL ក្រោម version 17 លក្ខខណ្ឌ `WHEN` គឺមិនពិត ដូច្នេះ Engine នឹងចូលទៅ `ELSE NULL` ដោយផ្ទាល់ ហើយការហៅ `has_table_privilege(..., 'MAINTAIN')` គឺមិនត្រូវបានជ្រើសរើសឱ្យដំណើរការឡើយ។ Outer status logic យោងតែលើតម្លៃ scalar `can_maintain` ដោយមិនមានការហៅ function ឡើងវិញក្នុង Boolean expressions ឡើយ។ (សំគាល់៖ CTE ធម្មតាមិនធានាការ evaluate ជាក់ស្តែងតែម្តងគត់នោះទេ ព្រោះ Optimizer អាច inline វាបាន ប៉ុន្តែសុវត្ថិភាពគឺពឹងផ្អែកលើ version-guarded CASE branch ផ្ទាល់)។  
> - **ការបកស្រាយសិទ្ធិ `service_role` (Informational Baseline Comparison):** `has_table_privilege()` វាយតម្លៃត្រឹម Effective Privileges នៅ runtime ប៉ុណ្ណោះ ដោយមិនបង្ហាញប្រភពនៃសិទ្ធិឡើយ។ ការវាយតម្លៃ `service_role` គឺសម្រាប់ជាព័ត៌មានប្រៀបធៀបធៀបនឹង Baseline (`REFERENCES, TRIGGER, TRUNCATE`) ដោយមិនសន្មត CRUD ឡើយ និងមិនចាត់ទុកជា failure ឡើយ។

```sql
-- ============================================================================
-- VERIFICATION 3.B: EFFECTIVE TABLE PRIVILEGES (ROUND 3.4 PRECISION SPECIFICATION)
-- Evaluates net runtime execution rights via pg_catalog.has_table_privilege().
-- Uses to_regclass and pg_roles joins to guard against missing table or roles.
-- Evaluates canonical 7 table privileges (SELECT, INSERT, UPDATE, DELETE,
-- TRUNCATE, REFERENCES, TRIGGER).
-- Evaluates MAINTAIN conditionally in CTE effective_privileges_raw via CASE:
-- - On PG 17+: Evaluates effective MAINTAIN; anon & authenticated must be false.
-- - On PG < 17: Returns NULL safely; has_table_privilege('MAINTAIN') is not selected.
-- Status logic references the resulting can_maintain column without calling
-- has_table_privilege(..., 'MAINTAIN') directly in outer Boolean expressions.
-- Note: A CTE does not guarantee physical single evaluation (inlining may occur);
-- the safety property relies on the version-guarded CASE branch.
-- ============================================================================
WITH expected_roles AS (
  SELECT 'anon'::text AS rolname, 1 AS role_order UNION ALL
  SELECT 'authenticated'::text, 2 UNION ALL
  SELECT 'service_role'::text, 3
),
catalog_guards AS (
  SELECT to_regclass('public.guests') AS table_oid
),
server_version_guard AS (
  SELECT (current_setting('server_version_num')::integer >= 170000) AS supports_maintain
),
roles_catalog AS (
  SELECT 
    er.rolname,
    er.role_order,
    pr.oid AS role_oid
  FROM expected_roles er
  LEFT JOIN pg_catalog.pg_roles pr ON pr.rolname = er.rolname
),
effective_privileges_raw AS (
  SELECT 
    rc.rolname AS role_name,
    rc.role_order,
    rc.role_oid,
    cg.table_oid,
    -- Canonical 7 table privileges
    CASE 
      WHEN cg.table_oid IS NULL OR rc.role_oid IS NULL THEN NULL 
      ELSE pg_catalog.has_table_privilege(rc.rolname, cg.table_oid, 'SELECT') 
    END AS can_select,
    CASE 
      WHEN cg.table_oid IS NULL OR rc.role_oid IS NULL THEN NULL 
      ELSE pg_catalog.has_table_privilege(rc.rolname, cg.table_oid, 'INSERT') 
    END AS can_insert,
    CASE 
      WHEN cg.table_oid IS NULL OR rc.role_oid IS NULL THEN NULL 
      ELSE pg_catalog.has_table_privilege(rc.rolname, cg.table_oid, 'UPDATE') 
    END AS can_update,
    CASE 
      WHEN cg.table_oid IS NULL OR rc.role_oid IS NULL THEN NULL 
      ELSE pg_catalog.has_table_privilege(rc.rolname, cg.table_oid, 'DELETE') 
    END AS can_delete,
    CASE 
      WHEN cg.table_oid IS NULL OR rc.role_oid IS NULL THEN NULL 
      ELSE pg_catalog.has_table_privilege(rc.rolname, cg.table_oid, 'TRUNCATE') 
    END AS can_truncate,
    CASE 
      WHEN cg.table_oid IS NULL OR rc.role_oid IS NULL THEN NULL 
      ELSE pg_catalog.has_table_privilege(rc.rolname, cg.table_oid, 'REFERENCES') 
    END AS can_references,
    CASE 
      WHEN cg.table_oid IS NULL OR rc.role_oid IS NULL THEN NULL 
      ELSE pg_catalog.has_table_privilege(rc.rolname, cg.table_oid, 'TRIGGER') 
    END AS can_trigger,
    -- Version-guarded MAINTAIN privilege evaluation
    CASE 
      WHEN svg.supports_maintain AND cg.table_oid IS NOT NULL AND rc.role_oid IS NOT NULL 
      THEN pg_catalog.has_table_privilege(rc.rolname, cg.table_oid, 'MAINTAIN')
      ELSE NULL 
    END AS can_maintain
  FROM roles_catalog rc
  CROSS JOIN catalog_guards cg
  CROSS JOIN server_version_guard svg
)
SELECT
  epr.role_name,
  epr.can_select,
  epr.can_insert,
  epr.can_update,
  epr.can_delete,
  epr.can_truncate,
  epr.can_references,
  epr.can_trigger,
  epr.can_maintain,
  CASE 
    -- 1. Catalog Guards
    WHEN epr.table_oid IS NULL 
    THEN 'FAIL — TABLE public.guests MISSING'

    WHEN epr.role_oid IS NULL 
    THEN 'FAIL — REQUIRED DATABASE ROLE MISSING'

    -- 2. anon: Strictly zero effective table privileges allowed
    --    (can_maintain is NULL on PG < 17; on PG 17+ it must not be true)
    WHEN epr.role_name = 'anon' THEN
      CASE 
        WHEN NOT epr.can_select
         AND NOT epr.can_insert
         AND NOT epr.can_update
         AND NOT epr.can_delete
         AND NOT epr.can_truncate
         AND NOT epr.can_references
         AND NOT epr.can_trigger
         AND COALESCE(epr.can_maintain, false) = false
        THEN 'PASS — EXPECTED ZERO EFFECTIVE TABLE PRIVILEGES'
        ELSE 'FAIL — UNEXPECTED EFFECTIVE TABLE PRIVILEGES DETECTED ON ANON'
      END

    -- 3. authenticated: Strictly CRUD only (SELECT, INSERT, UPDATE, DELETE);
    --    TRUNCATE, REFERENCES, TRIGGER must be false;
    --    can_maintain must not be true if supported on PG 17+.
    WHEN epr.role_name = 'authenticated' THEN
      CASE 
        WHEN epr.can_select
         AND epr.can_insert
         AND epr.can_update
         AND epr.can_delete
         AND NOT epr.can_truncate
         AND NOT epr.can_references
         AND NOT epr.can_trigger
         AND COALESCE(epr.can_maintain, false) = false
        THEN 'PASS — EXPECTED EFFECTIVE CRUD PRIVILEGES ONLY'
        ELSE 'FAIL — EFFECTIVE TABLE PRIVILEGES MISMATCH ON AUTHENTICATED'
      END

    -- 4. service_role: Informational baseline comparison (never an automatic failure)
    WHEN epr.role_name = 'service_role' THEN
      'INFO — SERVICE_ROLE EFFECTIVE TABLE PRIVILEGES EVALUATED (SEE COLUMNS)'

    ELSE 'INCONCLUSIVE'
  END AS effective_table_privilege_status
FROM effective_privileges_raw epr
ORDER BY epr.role_order;
```

---

#### តារាងវិនិច្ឆ័យលទ្ធផលរំពឹងទុកលើ Table (Expected Table Privileges Interpretation Matrix)

| ស្ថានភាពសេណារីយ៉ូ (Scenario) | លទ្ធផល Query 3.A (Direct Table ACL) | លទ្ធផល Query 3.B (Effective Status) | ការបកស្រាយបច្ចេកទេស និងសកម្មភាពបន្ទាប់ |
| :--- | :--- | :--- | :--- |
| **`authenticated` មាន CRUD ត្រឹមត្រូវ (is_grantable=false)** | `PASS — EXPECTED TABLE GRANT` (៤ ជួរ) | `PASS — EXPECTED EFFECTIVE CRUD PRIVILEGES ONLY` | **PASS:** Dashboard Admin មានសិទ្ធិ CRUD លើតារាង `guests` ត្រឹមត្រូវតាមស្ថាបត្យកម្ម។ |
| **`authenticated` ខ្វះសិទ្ធិ CRUD ណាមួយ** | `FAIL — EXPECTED TABLE GRANT MISSING` | `FAIL — EFFECTIVE TABLE PRIVILEGES MISMATCH ON AUTHENTICATED` | **FAIL:** Admin Dashboard នឹងមិនអាចអាន ឬកែប្រែភ្ញៀវក្នុង Dashboard បានឡើយ។ |
| **`authenticated` មាន TRUNCATE / REFERENCES / TRIGGER / MAINTAIN** | `FAIL — FORBIDDEN AUTHENTICATED TABLE PRIVILEGE DETECTED` | `FAIL — EFFECTIVE TABLE PRIVILEGES MISMATCH ON AUTHENTICATED` | **CRITICAL SECURITY FAIL:** Migration មិនបានដកហូតសិទ្ធិហួសហេតុចេញពី authenticated ឡើយ។ |
| **`authenticated` មាន `is_grantable = true`** | `FAIL — UNEXPECTED TABLE GRANT OPTION DETECTED` | `PASS` (ប្រសិនបើសិទ្ធិជា CRUD) | **CRITICAL SECURITY FAIL:** Role មិនត្រូវមានសិទ្ធិ Grant បន្តទៅ Role ផ្សេងឡើយ។ |
| **`anon` ឬ `PUBLIC` មានសិទ្ធិ Table ណាមួយ** | `FAIL — FORBIDDEN [ANON/PUBLIC] TABLE PRIVILEGE DETECTED` | `FAIL — UNEXPECTED EFFECTIVE TABLE PRIVILEGES DETECTED ON ANON` | **CRITICAL SECURITY FAIL:** `REVOKE ALL ON TABLE public.guests FROM anon, PUBLIC` បរាជ័យ។ |
| **Table Owner ជា `postgres`** | `PASS — TABLE OWNER IS postgres` | *(មិនស្ថិតក្នុង client grid)* | **PASS:** Table Owner ត្រឹមត្រូវតាមស្តង់ដារ Database Administration។ |
| **Table Owner ជា `anon` ឬ `authenticated`** | `FAIL — SECURITY VIOLATION: TABLE OWNER IS CLIENT ROLE` | *(ឆ្លុះបញ្ចាំងជាសិទ្ធិលើសក្នុង 3.B)* | **FATAL SECURITY DEFECT:** Client Role ក្លាយជា Table Owner (Privilege Escalation)។ |
| **Table Owner ជា Administrative Role ផ្សេង (e.g. `supabase_admin`)** | `INFO — TABLE OWNER IS <owner> (VERIFY ADMINISTRATIVE ROLE)` | *(មិនស្ថិតក្នុង client grid)* | **INFO ONLY:** ផ្ទៀងផ្ទាត់ថាតើ Owner នោះជា Administrative Role ស្របច្បាប់របស់ Cloud Provider។ |
| **`public.guests` មិនមានក្នុង Catalog** | `FAIL — TABLE public.guests MISSING` | `FAIL — TABLE public.guests MISSING` | **CRITICAL FAIL:** តារាងមិនមានក្នុង Database ឡើយ។ |
| **`service_role` Baseline Privileges** | `INFO — SERVICE_ROLE BASELINE TABLE PRIVILEGE` | `INFO — SERVICE_ROLE EFFECTIVE TABLE PRIVILEGES EVALUATED` | **INFO ONLY:** ប្រៀបធៀបធៀបនឹង Baseline ដើម (`REFERENCES, TRIGGER, TRUNCATE`) ដោយមិនសន្មត CRUD ឡើយ។ |

---

### គ. ផ្ទៀងផ្ទាត់ Schema-Level ACL លើ Schema `public` (Direct ACL & Effective Privileges)

> [!IMPORTANT]
> **គោលការណ៍គ្រឹះនៃការផ្ទៀងផ្ទាត់ Schema Privileges (Direct ACL vs. Effective Privileges — Round 3.8):**  
> 1. **Direct Schema ACL (ជួរឈរ `nspacl`, `acldefault`, និង `acl_source`):** Query 3.C.1 បែងចែកដាច់រវាង Explicit ACL និង Synthesized Default ACL តាមរយៈជួរឈរ `acl_source`៖  
>    - **`EXPLICIT`:** នៅពេល `nspacl` មិនមែន NULL (មាន explicit DDL កត់ត្រាក្នុង Catalog) query នឹង explode សិទ្ធិចេញពី `nspacl` ដោយផ្ទាល់។  
>    - **`SYNTHESIZED_DEFAULT`:** នៅពេល `nspacl` ជា NULL (គ្មាន explicit DDL កត់ត្រា) query នឹង explode សិទ្ធិលំនាំដើមរបស់ PostgreSQL ដែលបង្កើតឡើងដោយ `acldefault('n', nspowner)` លុះត្រាតែ `nspowner` មិនមែន NULL។  
>    - ការផ្ទៀងផ្ទាត់ Direct ACL គឺផ្ទៀងផ្ទាត់លើស្ថានភាព catalog ACL ចុងក្រោយ មិនមែនជាការបញ្ជាក់ដោយឯករាជ្យអំពីប្រវត្តិនៃការដំណើរការ DDL statements ជាក់លាក់ឡើយ។ ម្យ៉ាងទៀត មិនត្រូវសន្មតថា Synthesized Default ត្រូវតែផ្តល់ PUBLIC USAGE ក្នុងគ្រប់បរិស្ថាននោះឡើយ ហើយក៏មិនត្រូវសន្មតថា PUBLIC USAGE គឺជា Production Baseline ដែលបានផ្ទៀងផ្ទាត់របស់ Supabase ដោយគ្មានទិន្នន័យជាក់ស្តែងឡើយ។  
> 2. **Effective Schema Privileges (`has_schema_privilege()`):** Query 3.C.2 ផ្ទៀងផ្ទាត់សិទ្ធិប្រតិបត្តិជាក់ស្តែងនៅកម្រិត Database Engine សម្រាប់ Roles សំខាន់ៗ (`anon`, `authenticated`, `service_role`) ដោយប្រើប្រាស់ Catalog Guards (`to_regnamespace('public')` និង `LEFT JOIN pg_roles`) ដើម្បីទប់ស្កាត់ unhandled errors ប្រសិនបើ Schema ឬ Role បាត់បង់ពី Catalog។  
> 3. **តម្រូវការចាំបាច់នៃ Schema USAGE (Schema Qualification មិនអាចរំលង USAGE បានឡើយ):**  
>    - នៅក្នុង PostgreSQL ការប្រើប្រាស់ឈ្មោះ schema-qualified (ឧទាហរណ៍ `public.get_guest_by_slug()`) **មិនអាចរំលង (bypass) សិទ្ធិ Schema USAGE បានឡើយ**។ Role មួយដាច់ខាតត្រូវតែមាន Schema USAGE ទើបអាចចូលដំណើរការ Object (Functions, Views, Tables) នៅក្នុង Schema នោះបាន។  
>    - សម្រាប់គម្រោងនេះ `anon` ដាច់ខាតត្រូវតែមាន Schema USAGE ដើម្បីដំណើរការ Public RPC Functions (`get_guest_by_slug`, `submit_rsvp`) សម្រាប់ភ្ញៀវ។ ប្រសិនបើ `anon` ខ្វះ USAGE នោះមុខងារសាធារណៈរបស់ភ្ញៀវនឹងត្រូវបរាជ័យ (`FAIL`)។  
>    - សម្រាប់ `authenticated` ដាច់ខាតត្រូវតែមាន Schema USAGE ដើម្បីដំណើរការ Admin Dashboard API Operations (`PASS`)។  
> 4. **ការបែងចែកច្បាស់លាស់រវាង Schema USAGE និង Table CRUD / Function EXECUTE:**  
>    - **Schema USAGE:** អនុញ្ញាតត្រឹមតែការ Resolve ឈ្មោះ Object (Tables, Views, Functions) នៅក្នុង Schema `public` ប៉ុណ្ណោះ។  
>    - **Schema USAGE មិនផ្តល់សិទ្ធិ Table CRUD ឡើយ:** ទោះបីជា Role មួយមាន Schema USAGE ក៏ដោយ ក៏ Role នោះមិនអាច `SELECT`, `INSERT`, `UPDATE`, ឬ `DELETE` លើតារាង `guests` បានឡើយ ប្រសិនបើគ្មាន Table-Level Grants និង RLS Policy អនុញ្ញាត។ ដូច្នេះ `anon` មាន Schema USAGE មិនមែនមានន័យថាវាអាចអាន/កែប្រែតារាង `guests` បានឡើយ។  
>    - **Table ACL, Function EXECUTE ACL, និង RLS គឺជាស្រទាប់ការពារ (Authorization Layers) ដាច់ដោយឡែកពីគ្នា។**  
> 5. **Owner Diagnostic Baseline:** វត្តមាន Owner Role ឈ្មោះ `postgres` គឺជា Expected Owner-Name Baseline ប៉ុន្តែសិទ្ធិរដ្ឋបាលជាក់ស្តែង និង Superuser Status តម្រូវឱ្យមានការផ្ទៀងផ្ទាត់ Catalog ដាច់ដោយឡែក។  
> 6. **ដែនកំណត់នៃ Static Review:** ការត្រួតពិនិត្យ Static Review នេះមិនមែនជា PostgreSQL Runtime Validation ឡើយ។ មិនមានការអះអាងដាច់ខាតអំពីសុវត្ថិភាពពេញលេញ ឬការលុបបំបាត់ហានិភ័យទាំងស្រុងដោយគ្មានការផ្ទៀងផ្ទាត់ជាក់ស្តែងលើ Database Engine ឡើយ។

---

#### ១. Direct Schema ACL តាមរយៈ `aclexplode(n.nspacl)` (Matrix & Diagnostics)

> [!NOTE]
> **រចនាសម្ព័ន្ធវិនិច្ឆ័យនៃ Query 3.C.1 (Tiered Architecture & ACL Source Separation — Round 3.9):**  
> - **Tier 0 (Schema Existence & Owner Diagnostic):** ពិនិត្យវត្តមានរបស់ Schema `public` និង Owner Role ដោយផ្ទាល់ពី Catalog។ ប្រសិនបើ Schema បាត់បង់ វានឹងបញ្ចេញ `FAIL — SCHEMA public MISSING` ជាជាងការបញ្ចេញ ០ ជួរដេកដោយស្ងាត់ស្ងៀម។ ផ្លូវ missing schema ត្រូវបានការពារយ៉ាងតឹងរ៉ឹងមិនឱ្យហៅ `acldefault()` ជាមួយ NULL owner ឡើយ។  
> - **Explicit vs. Synthesized Default Separation:** បែងចែកដាច់រវាង CTE `explicit_schema_acl` (សម្រាប់ `nspacl` កត់ត្រាផ្ទាល់) និង `synthesized_default_schema_acl` (សម្រាប់ `acldefault` លំនាំដើម) តាមរយៈជួរឈរ `acl_source` (`EXPLICIT` ឬ `SYNTHESIZED_DEFAULT`)។  
> - **Tier 1 (Client Role Security Rules):** ធានាថា Client Roles (`anon`, `authenticated`) មិនត្រូវមានសិទ្ធិ `CREATE` លើ Schema `public` ជាដាច់ខាត (`FAIL`) និងមិនត្រូវមាន `is_grantable = true` ឡើយ (`FAIL`)។ សិទ្ធិ `USAGE` ត្រូវបានចាត់ថ្នាក់ជា `INFO` (Name Resolution Only; គ្មានសិទ្ធិ Table CRUD ឬ Function EXECUTE)។  
> - **Tier 2 (PUBLIC Pseudo-Role Rules):** PUBLIC ត្រូវបានកំណត់អត្តសញ្ញាណយ៉ាងច្បាស់លាស់តាមរយៈ `grantee_oid = 0`។ ធានាថា PUBLIC មិនត្រូវមានសិទ្ធិ `CREATE` លើ Schema `public` ឡើយ (`FAIL`)។ សិទ្ធិ `USAGE` របស់ PUBLIC (ប្រសិនបើមានពី Default ACL ឬ Explicit ACL) ត្រូវបានចាត់ថ្នាក់ជា `INFO` ព្រោះវាអនុញ្ញាតត្រឹម Name Resolution មិនប៉ះពាល់ដល់ Table CRUD ឬ Function EXECUTE ឡើយ។ Unknown nonzero OID មិនត្រូវបានចាត់ចូលជា PUBLIC ឡើយ។  
> - **Tier 3 (Unknown Nonzero Grantee Diagnostic):** ចាប់យកគ្រប់ Grantee OID មិនមែនសូន្យ ដែលបាត់បង់ពី `pg_roles` (`grantee_oid <> 0` និង `grantee_role.rolname IS NULL`) ហើយចាត់ថ្នាក់ជា `FAIL — ACL GRANTEE OID NOT FOUND IN pg_roles` ជាបន្ទាន់។  
> - **Tier 4 (Administrative Entries):** ចាត់ថ្នាក់ Schema Owner entries និង `service_role` baseline entries ជា `INFO` ដោយបង្ហាញប្រភព `acl_source` ច្បាស់លាស់។

```sql
-- ============================================================================
-- VERIFICATION 3.C.1: DIRECT SCHEMA ACL MATRIX & ANOMALY DETECTION (ROUND 3.9 PRECISION)
-- 1. Tier 0: Schema Existence & Owner Diagnostic (independent of aclexplode).
--    - Emits explicit diagnostic if schema 'public' is missing or owner is invalid.
--    - Missing schema path strictly guards against invoking acldefault() with NULL owner.
--    - Evaluates postgres owner as expected baseline name; clarifies that administrative
--      and superuser capabilities require separate catalog inspection.
-- 2. Explicit vs. Synthesized Default ACL Separation:
--    - explicit_schema_acl CTE: Explodes explicitly stored nspacl entries (acl_source = 'EXPLICIT').
--    - synthesized_default_schema_acl CTE: Explodes pg_catalog.acldefault('n', nspowner)
--      only when nspacl is NULL and nspowner is non-NULL (acl_source = 'SYNTHESIZED_DEFAULT').
--    - Output column acl_source cleanly distinguishes explicit grants from synthesized defaults.
--    - Does NOT classify synthesized defaults as direct explicit grants, and does NOT
--      presume synthesized defaults guarantee PUBLIC USAGE across all environments.
-- 3. Robust Grantee Classification (Round 3.9 Fix):
--    - Identifies PUBLIC strictly when a.grantee = 0.
--    - Classifies nonzero missing roles as 'UNKNOWN ROLE OID: ' || a.grantee::text.
--    - Unknown nonzero grantee OIDs are never classified as PUBLIC or administrative.
-- 4. Tier 1: Client Role Security Rules (anon, authenticated):
--    - CREATE on schema public is strictly FORBIDDEN (FAIL).
--    - WITH GRANT OPTION is strictly FORBIDDEN (FAIL).
--    - USAGE is classified as INFO (name resolution only; no table/function rights).
-- 5. Tier 2: PUBLIC Pseudo-Role Rules (grantee OID 0 strictly):
--    - CREATE on schema public is strictly FORBIDDEN (FAIL).
--    - WITH GRANT OPTION is strictly FORBIDDEN (FAIL).
--    - USAGE is classified as INFO (standard PostgreSQL name resolution; does NOT
--      grant table CRUD or function EXECUTE privileges).
-- 6. Tier 3: Unknown Nonzero Grantee Diagnostic:
--    - Catches nonzero grantee OIDs not found in pg_roles.
--    - Emits FAIL — ACL GRANTEE OID NOT FOUND IN pg_roles.
-- 7. Tier 4: Administrative & Informational Entries:
--    - Schema owner entries (INFO).
--    - service_role baseline entries (INFO).
-- ============================================================================
WITH expected_schema_target AS (
  SELECT 'public'::text AS schemaname
),
target_schema_catalog AS (
  SELECT 
    n.oid AS schema_oid,
    n.nspname AS schemaname,
    n.nspowner,
    owner_role.rolname AS owner_name,
    n.nspacl,
    (n.nspacl IS NULL) AS is_default_schema_acl
  FROM expected_schema_target est
  LEFT JOIN pg_catalog.pg_namespace n ON n.nspname = est.schemaname
  LEFT JOIN pg_catalog.pg_roles owner_role ON owner_role.oid = n.nspowner
),
tier0_schema_owner_diagnostic AS (
  SELECT 
    COALESCE(tsc.owner_name, 'UNKNOWN / ORPHANED OID: ' || COALESCE(tsc.nspowner::text, 'NULL')) AS grantee_role,
    NULL::text AS grantor_role,
    'OWNER DIAGNOSTIC'::text AS privilege_type,
    NULL::boolean AS is_grantable,
    tsc.owner_name,
    'CATALOG_DIAGNOSTIC'::text AS acl_source,
    CASE 
      WHEN tsc.schema_oid IS NULL 
      THEN 'FAIL — SCHEMA public MISSING'

      WHEN tsc.owner_name IS NULL 
      THEN 'FAIL — SCHEMA OWNER ROLE MISSING IN pg_roles (OID: ' || tsc.nspowner || ')'

      WHEN tsc.owner_name IN ('anon', 'authenticated') 
      THEN 'FAIL — SECURITY VIOLATION: SCHEMA OWNER IS CLIENT ROLE (' || tsc.owner_name || ')'

      WHEN tsc.owner_name = 'postgres' 
      THEN 'PASS — SCHEMA OWNER IS postgres (EXPECTED OWNER-NAME BASELINE; ADMIN PRIVILEGES REQUIRE SEPARATE VERIFICATION)'

      ELSE 'INFO — SCHEMA OWNER IS ' || tsc.owner_name || ' (ADMINISTRATIVE STATUS & PRIVILEGES REQUIRE SEPARATE VERIFICATION)'
    END AS schema_acl_status,
    0 AS sort_tier
  FROM target_schema_catalog tsc
),
explicit_schema_acl AS (
  SELECT 
    tsc.schema_oid,
    tsc.schemaname,
    tsc.nspowner,
    tsc.owner_name,
    'EXPLICIT'::text AS acl_source,
    a.grantee AS grantee_oid,
    CASE 
      WHEN a.grantee = 0 THEN 'PUBLIC'
      WHEN grantee_role.rolname IS NULL 
        THEN 'UNKNOWN ROLE OID: ' || a.grantee::text
      ELSE grantee_role.rolname
    END AS grantee_name,
    a.grantor AS grantor_oid,
    grantor_role.rolname AS grantor_name,
    a.privilege_type,
    a.is_grantable
  FROM target_schema_catalog tsc
  CROSS JOIN LATERAL pg_catalog.aclexplode(tsc.nspacl) a
  LEFT JOIN pg_catalog.pg_roles grantee_role ON grantee_role.oid = a.grantee
  LEFT JOIN pg_catalog.pg_roles grantor_role ON grantor_role.oid = a.grantor
  WHERE tsc.schema_oid IS NOT NULL 
    AND tsc.nspacl IS NOT NULL
),
synthesized_default_schema_acl AS (
  SELECT 
    tsc.schema_oid,
    tsc.schemaname,
    tsc.nspowner,
    tsc.owner_name,
    'SYNTHESIZED_DEFAULT'::text AS acl_source,
    a.grantee AS grantee_oid,
    CASE 
      WHEN a.grantee = 0 THEN 'PUBLIC'
      WHEN grantee_role.rolname IS NULL 
        THEN 'UNKNOWN ROLE OID: ' || a.grantee::text
      ELSE grantee_role.rolname
    END AS grantee_name,
    a.grantor AS grantor_oid,
    grantor_role.rolname AS grantor_name,
    a.privilege_type,
    a.is_grantable
  FROM target_schema_catalog tsc
  CROSS JOIN LATERAL pg_catalog.aclexplode(pg_catalog.acldefault('n', tsc.nspowner)) a
  LEFT JOIN pg_catalog.pg_roles grantee_role ON grantee_role.oid = a.grantee
  LEFT JOIN pg_catalog.pg_roles grantor_role ON grantor_role.oid = a.grantor
  WHERE tsc.schema_oid IS NOT NULL 
    AND tsc.nspowner IS NOT NULL 
    AND tsc.nspacl IS NULL
),
exploded_schema_acl AS (
  SELECT * FROM explicit_schema_acl
  UNION ALL
  SELECT * FROM synthesized_default_schema_acl
),
tier1_client_checks AS (
  SELECT 
    acl.grantee_name AS grantee_role,
    acl.grantor_name AS grantor_role,
    acl.privilege_type,
    acl.is_grantable,
    acl.owner_name,
    acl.acl_source,
    CASE 
      WHEN acl.privilege_type = 'CREATE' 
      THEN 'FAIL — FORBIDDEN CLIENT SCHEMA PRIVILEGE (CREATE GRANTED TO ' || acl.grantee_name || ' [' || acl.acl_source || '])'

      WHEN acl.is_grantable = true 
      THEN 'FAIL — UNEXPECTED SCHEMA GRANT OPTION ON CLIENT ROLE (' || acl.grantee_name || ' [' || acl.acl_source || '])'

      WHEN acl.privilege_type = 'USAGE' 
      THEN 
        CASE 
          WHEN acl.acl_source = 'EXPLICIT' 
          THEN 'INFO — CLIENT SCHEMA USAGE (EXPLICIT DIRECT ACL; NO TABLE/FUNCTION RIGHTS)'
          ELSE 'INFO — CLIENT SCHEMA USAGE (SYNTHESIZED DEFAULT ACL; NO TABLE/FUNCTION RIGHTS)'
        END

      ELSE 'FAIL — UNEXPECTED CLIENT SCHEMA PRIVILEGE (' || acl.privilege_type || ' [' || acl.acl_source || '])'
    END AS schema_acl_status,
    1 AS sort_tier
  FROM exploded_schema_acl acl
  WHERE acl.grantee_name IN ('anon', 'authenticated')
),
tier2_public_checks AS (
  SELECT 
    acl.grantee_name AS grantee_role,
    acl.grantor_name AS grantor_role,
    acl.privilege_type,
    acl.is_grantable,
    acl.owner_name,
    acl.acl_source,
    CASE 
      WHEN acl.privilege_type = 'CREATE' 
      THEN 'FAIL — FORBIDDEN PUBLIC SCHEMA PRIVILEGE (CREATE GRANTED TO PUBLIC [' || acl.acl_source || '])'

      WHEN acl.is_grantable = true 
      THEN 'FAIL — UNEXPECTED SCHEMA GRANT OPTION ON PUBLIC [' || acl.acl_source || ']'

      WHEN acl.privilege_type = 'USAGE' 
      THEN 
        CASE 
          WHEN acl.acl_source = 'EXPLICIT' 
          THEN 'INFO — PUBLIC SCHEMA USAGE (EXPLICIT DIRECT ACL; PERMITS NAME RESOLUTION; DOES NOT GRANT TABLE CRUD OR FUNCTION EXECUTE)'
          ELSE 'INFO — PUBLIC SCHEMA USAGE (SYNTHESIZED DEFAULT ACL; PERMITS NAME RESOLUTION; DOES NOT GRANT TABLE CRUD OR FUNCTION EXECUTE)'
        END

      ELSE 'FAIL — UNEXPECTED PUBLIC SCHEMA PRIVILEGE (' || acl.privilege_type || ' [' || acl.acl_source || '])'
    END AS schema_acl_status,
    2 AS sort_tier
  FROM exploded_schema_acl acl
  WHERE acl.grantee_oid = 0
),
-- TIER 3: Unknown Nonzero Grantee Diagnostic (Orphaned OIDs in schema ACL)
tier3_unknown_grantee_checks AS (
  SELECT 
    acl.grantee_name AS grantee_role,
    acl.grantor_name AS grantor_role,
    acl.privilege_type,
    acl.is_grantable,
    acl.owner_name,
    acl.acl_source,
    'FAIL — ACL GRANTEE OID NOT FOUND IN pg_roles'::text AS schema_acl_status,
    3 AS sort_tier
  FROM exploded_schema_acl acl
  WHERE acl.grantee_oid <> 0 
    AND acl.grantee_name LIKE 'UNKNOWN ROLE OID:%'
),
-- TIER 4: Administrative & Informational Entries (Owner and service_role entries)
tier4_admin_checks AS (
  SELECT 
    acl.grantee_name AS grantee_role,
    acl.grantor_name AS grantor_role,
    acl.privilege_type,
    acl.is_grantable,
    acl.owner_name,
    acl.acl_source,
    CASE 
      WHEN acl.grantee_oid = acl.nspowner 
      THEN 'INFO — SCHEMA OWNER ' || acl.acl_source || ' ACL ENTRY'

      WHEN acl.grantee_name = 'service_role' 
      THEN 'INFO — SERVICE_ROLE ' || acl.acl_source || ' SCHEMA ACL ENTRY'

      ELSE 'INFO — OTHER ADMINISTRATIVE SCHEMA ACL ENTRY (' || acl.acl_source || ')'
    END AS schema_acl_status,
    4 AS sort_tier
  FROM exploded_schema_acl acl
  WHERE acl.grantee_name NOT IN ('anon', 'authenticated')
    AND acl.grantee_oid <> 0
    AND NOT (acl.grantee_name LIKE 'UNKNOWN ROLE OID:%')
)
SELECT 
  grantee_role,
  grantor_role,
  privilege_type,
  is_grantable,
  owner_name,
  acl_source,
  schema_acl_status
FROM (
  SELECT * FROM tier0_schema_owner_diagnostic
  UNION ALL
  SELECT * FROM tier1_client_checks
  UNION ALL
  SELECT * FROM tier2_public_checks
  UNION ALL
  SELECT * FROM tier3_unknown_grantee_checks
  UNION ALL
  SELECT * FROM tier4_admin_checks
) combined_schema_acl
ORDER BY sort_tier, grantee_role, privilege_type, acl_source;
```

---

#### ២. Effective Schema Privileges តាមរយៈ `has_schema_privilege()` (Guarded Evaluation)

> [!NOTE]
> **រចនាសម្ព័ន្ធវិនិច្ឆ័យនៃ Query 3.C.2 (Guarded Effective Privileges — Round 3.8 Precision):**  
> - **Catalog Guards:** ប្រើប្រាស់ `to_regnamespace('public')` និង `LEFT JOIN pg_roles`។ ប្រសិនបើ Schema ឬ Role បាត់បង់ពី Database Engine នោះ Query នឹងមិនហៅ `has_schema_privilege()` ឡើយ ដោយបញ្ចេញលទ្ធផល `FAIL — SCHEMA public MISSING` ឬ `FAIL — REQUIRED DATABASE ROLE MISSING` ដោយសុវត្ថិភាព។  
> - **anon Interpretation:** `CREATE` ត្រូវតែជា `false` ជាដាច់ខាត (`FAIL` ប្រសិនបើ true)។ សិទ្ធិ `USAGE` ដាច់ខាតត្រូវតែមាន (`true`) ដើម្បីឱ្យ Anonymous Client អាចហៅ Public RPC Functions បាន (`PASS`)។ ប្រសិនបើ `can_usage = false` នោះភ្ញៀវនឹងមិនអាចដំណើរការ RPC Functions បានឡើយ ព្រោះ Schema Qualification មិនអាច bypass USAGE បានទេ ដូច្នេះត្រូវបានចាត់ថ្នាក់ជា `FAIL`។  
> - **authenticated Interpretation:** `CREATE` ត្រូវតែជា `false` ជាដាច់ខាត (`FAIL` ប្រសិនបើ true)។ សិទ្ធិ `USAGE` ដាច់ខាតត្រូវតែមាន (`true`) ដើម្បីឱ្យ Admin Dashboard API អាច query លើតារាង `guests` បាន (`PASS`)។ ប្រសិនបើ `can_usage = false` នោះ Dashboard មិនអាច query បានឡើយ ដូច្នេះត្រូវបានចាត់ថ្នាក់ជា `FAIL`។  
> - **service_role Interpretation:** ត្រូវបានវាយតម្លៃជា `INFO` សុទ្ធសាធ ដោយមិនសន្មតថាត្រូវតែមាន `CREATE` ឬ `USAGE` ដោយគ្មានភស្តុតាង និងមិនចាត់ទុកជា failure ឡើយ។

```sql
-- ============================================================================
-- VERIFICATION 3.C.2: EFFECTIVE SCHEMA PRIVILEGES (ROUND 3.8 PRECISION SPECIFICATION)
-- Evaluates net runtime execution rights via pg_catalog.has_schema_privilege().
-- Uses to_regnamespace and pg_roles joins to guard against missing schema or roles.
-- Evaluates USAGE and CREATE privileges for anon, authenticated, and service_role.
-- Guards prevent calling has_schema_privilege() if schema or role is missing.
-- Interpretation:
-- - anon: USAGE required for public RPC functions (get_guest_by_slug, submit_rsvp);
--         CREATE must be false. Missing USAGE is a FAIL (blocks public RPC execution).
-- - authenticated: USAGE required for Dashboard API operations; CREATE must be false.
--                  Missing USAGE is a FAIL (blocks dashboard operations).
-- - service_role: Evaluated as INFO (never an automatic failure).
-- Note: Schema-qualification does NOT bypass schema USAGE; USAGE is mandatory for object access.
-- ============================================================================
WITH expected_roles AS (
  SELECT 'anon'::text AS rolname, 1 AS role_order UNION ALL
  SELECT 'authenticated'::text, 2 UNION ALL
  SELECT 'service_role'::text, 3
),
catalog_guards AS (
  SELECT to_regnamespace('public') AS schema_oid
),
roles_catalog AS (
  SELECT 
    er.rolname,
    er.role_order,
    pr.oid AS role_oid
  FROM expected_roles er
  LEFT JOIN pg_catalog.pg_roles pr ON pr.rolname = er.rolname
),
effective_schema_privileges_raw AS (
  SELECT 
    rc.rolname AS role_name,
    rc.role_order,
    rc.role_oid,
    cg.schema_oid,
    CASE 
      WHEN cg.schema_oid IS NULL OR rc.role_oid IS NULL THEN NULL 
      ELSE pg_catalog.has_schema_privilege(rc.rolname, cg.schema_oid, 'USAGE') 
    END AS can_usage,
    CASE 
      WHEN cg.schema_oid IS NULL OR rc.role_oid IS NULL THEN NULL 
      ELSE pg_catalog.has_schema_privilege(rc.rolname, cg.schema_oid, 'CREATE') 
    END AS can_create
  FROM roles_catalog rc
  CROSS JOIN catalog_guards cg
)
SELECT 
  espr.role_name,
  espr.can_usage,
  espr.can_create,
  CASE 
    -- 1. Catalog Guards
    WHEN espr.schema_oid IS NULL 
    THEN 'FAIL — SCHEMA public MISSING'

    WHEN espr.role_oid IS NULL 
    THEN 'FAIL — REQUIRED DATABASE ROLE MISSING'

    -- 2. anon: CREATE must be false; USAGE is required for public RPC functions.
    --    Schema-qualification does NOT bypass schema USAGE.
    WHEN espr.role_name = 'anon' THEN
      CASE 
        WHEN espr.can_create = true 
        THEN 'FAIL — FORBIDDEN EFFECTIVE SCHEMA CREATE ON ANON'

        WHEN espr.can_usage = true AND espr.can_create = false 
        THEN 'PASS — EXPECTED EFFECTIVE SCHEMA USAGE ONLY (PUBLIC RPC ACCESS; NO TABLE CRUD)'

        WHEN espr.can_usage = false 
        THEN 'FAIL — ANON LACKS SCHEMA USAGE (CANNOT ACCESS RPC FUNCTIONS OR OBJECTS IN SCHEMA public)'

        ELSE 'INCONCLUSIVE'
      END

    -- 3. authenticated: CREATE must be false; USAGE is required for Dashboard API queries.
    --    Schema-qualification does NOT bypass schema USAGE.
    WHEN espr.role_name = 'authenticated' THEN
      CASE 
        WHEN espr.can_create = true 
        THEN 'FAIL — FORBIDDEN EFFECTIVE SCHEMA CREATE ON AUTHENTICATED'

        WHEN espr.can_usage = true AND espr.can_create = false 
        THEN 'PASS — EXPECTED EFFECTIVE SCHEMA USAGE ONLY (DASHBOARD API ACCESS; NO TABLE CRUD)'

        WHEN espr.can_usage = false 
        THEN 'FAIL — AUTHENTICATED LACKS SCHEMA USAGE (DASHBOARD API CANNOT ACCESS SCHEMA public)'

        ELSE 'INCONCLUSIVE'
      END

    -- 4. service_role: Informational baseline comparison (never an automatic failure)
    WHEN espr.role_name = 'service_role' THEN
      'INFO — SERVICE_ROLE EFFECTIVE SCHEMA PRIVILEGES EVALUATED (SEE COLUMNS)'

    ELSE 'INCONCLUSIVE'
  END AS effective_schema_privilege_status
FROM effective_schema_privileges_raw espr
ORDER BY espr.role_order;
```

---

#### ៣. តារាងបកស្រាយលទ្ធផលនៃការផ្ទៀងផ្ទាត់ Schema Privileges (Interpretation Matrix — Round 3.9)

| លក្ខខណ្ឌសិទ្ធិជាក់ស្តែង (Runtime Privilege State) | Direct Schema ACL (3.C.1) | Effective Privileges (3.C.2) | ការបកស្រាយបច្ចេកទេស និងផលប៉ះពាល់សុវត្ថិភាព |
| :--- | :--- | :--- | :--- |
| **`authenticated` មាន USAGE (CREATE=false)** | `INFO — CLIENT SCHEMA USAGE [EXPLICIT/SYNTHESIZED_DEFAULT]` | `PASS — EXPECTED EFFECTIVE SCHEMA USAGE ONLY` | **PASS:** Admin Dashboard អាច Resolve ឈ្មោះតារាងបានត្រឹមត្រូវ។ មិនមានសិទ្ធិបង្កើត Schema Objects ឡើយ។ |
| **`authenticated` ខ្វះសិទ្ធិ USAGE** | *(គ្មាន entry ក្នុង catalog)* | `FAIL — AUTHENTICATED LACKS SCHEMA USAGE` | **FAIL:** Admin Dashboard នឹងមិនអាច Query តារាងក្នុង Schema `public` បានឡើយ។ |
| **`authenticated` មានសិទ្ធិ CREATE** | `FAIL — FORBIDDEN CLIENT SCHEMA PRIVILEGE (CREATE)` | `FAIL — FORBIDDEN EFFECTIVE SCHEMA CREATE ON AUTHENTICATED` | **CRITICAL SECURITY FAIL:** Client Role មិនត្រូវមានសិទ្ធិបង្កើត Table/Object ក្នុង Schema ឡើយ។ |
| **`anon` មាន USAGE (CREATE=false)** | `INFO — CLIENT SCHEMA USAGE [EXPLICIT/SYNTHESIZED_DEFAULT]` | `PASS — EXPECTED EFFECTIVE SCHEMA USAGE ONLY` | **PASS:** អនុញ្ញាតឱ្យ Anonymous Client ដំណើរការ Public RPC Functions សម្រាប់ភ្ញៀវ។ **មិនផ្តល់សិទ្ធិ Table CRUD ឬ Function EXECUTE ដទៃទៀតឡើយ។** |
| **`anon` ខ្វះសិទ្ធិ USAGE** | *(គ្មាន entry ក្នុង catalog)* | `FAIL — ANON LACKS SCHEMA USAGE` | **FAIL:** ភ្ញៀវមិនអាចដំណើរការ Public RPC Functions បានឡើយ ព្រោះ Schema-qualification មិនអាច bypass USAGE បានឡើយ។ |
| **`anon` មានសិទ្ធិ CREATE** | `FAIL — FORBIDDEN CLIENT SCHEMA PRIVILEGE (CREATE)` | `FAIL — FORBIDDEN EFFECTIVE SCHEMA CREATE ON ANON` | **CRITICAL SECURITY FAIL:** Anonymous Client អាចបង្កើត Table/Object ក្នុង Schema បាន (DDL Injection Risk)។ |
| **PUBLIC មានសិទ្ធិ USAGE (OID 0)** | `INFO — PUBLIC SCHEMA USAGE [EXPLICIT/SYNTHESIZED_DEFAULT]` | *(ឆ្លុះបញ្ចាំងជា USAGE លើ anon/auth)* | **INFO ONLY:** ជា Standard PostgreSQL/Supabase Catalog Behavior។ អនុញ្ញាតត្រឹម Name Resolution មិនផ្តល់ Table CRUD ឬ Function EXECUTE ឡើយ។ |
| **PUBLIC មានសិទ្ធិ CREATE (OID 0)** | `FAIL — FORBIDDEN PUBLIC SCHEMA PRIVILEGE (CREATE)` | *(ឆ្លុះបញ្ចាំងជា CREATE លើ client)* | **CRITICAL SECURITY FAIL:** Public Role មានសិទ្ធិបង្កើត Object ក្នុង Schema (ត្រូវតែ Revoke)។ |
| **Grantee OID មិនស្គាល់ (បាត់បង់ពី `pg_roles`)** | `FAIL — ACL GRANTEE OID NOT FOUND IN pg_roles` | *(មិនអាច resolve បាន)* | **CRITICAL INTEGRITY DEFECT:** មាន Orphaned Role OID ក្នុង Schema ACL ដែលមិនមានក្នុង `pg_roles` (ត្រូវតែសម្អាត)។ |
| **Schema Owner ជា `postgres`** | `PASS — SCHEMA OWNER IS postgres (...)` | *(មិនស្ថិតក្នុង Client Grid)* | **PASS:** Expected Owner-Name Baseline។ សិទ្ធិរដ្ឋបាលជាក់ស្តែង និង Superuser Status តម្រូវឱ្យមានការផ្ទៀងផ្ទាត់ Catalog ដាច់ដោយឡែក។ |
| **Schema Owner ជា Client Role (`anon`/`auth`)** | `FAIL — SECURITY VIOLATION: SCHEMA OWNER IS CLIENT ROLE` | *(ឆ្លុះបញ្ចាំងជាសិទ្ធិលើស)* | **FATAL SECURITY DEFECT:** Client Role ក្លាយជា Schema Owner (Privilege Escalation)។ |
| **Schema `public` មិនមានក្នុង Catalog** | `FAIL — SCHEMA public MISSING` | `FAIL — SCHEMA public MISSING` | **CRITICAL FAIL:** Schema `public` ត្រូវបានលុប ឬខូច Catalog។ |
| **`service_role` Schema Privileges** | `INFO — SERVICE_ROLE [EXPLICIT/SYNTHESIZED_DEFAULT] SCHEMA ACL ENTRY` | `INFO — SERVICE_ROLE EFFECTIVE SCHEMA PRIVILEGES EVALUATED` | **INFO ONLY:** វាយតម្លៃសម្រាប់ជា Baseline Information ដោយមិនចាត់ទុកជា Failure ឡើយ។ |

---



## ៤. ការផ្ទៀងផ្ទាត់ RLS POLICY INVENTORY ទាំងមូល (ដោះស្រាយករណី ZERO POLICIES)

> [!IMPORTANT]
> **ការកែតម្រូវចំពោះករណី 0 Policies (Subquery + LEFT JOIN Architecture):**  
> ការប្រើប្រាស់ `count(*) OVER ()` កន្លងមកនឹងមិនត្រឡប់ជួរឈរណាមួយឡើយ ប្រសិនបើតារាងគ្មាន Policy សូម្បីតែមួយ (`0 rows`) ដែលធ្វើឱ្យពិបាកបែងចែករវាងកំហុស Query និងអវត្តមាន Policy។ Query ខាងក្រោមប្រើប្រាស់ `WITH policy_counts` និង `LEFT JOIN` ដើម្បី **ធានាការត្រឡប់មកវិញនូវជួរឈរជានិច្ច ទោះបីជាមាន 0 Policies ក៏ដោយ** និងមិនចាត់ថ្នាក់អវត្តមាន Policy ថាជា Pass ឡើយ។

```sql
WITH policy_counts AS (
  SELECT count(*) AS total_policies_on_table
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'public' AND tablename = 'guests'
)
SELECT 
  pc.total_policies_on_table,
  p.policyname AS policy_name,
  p.permissive,
  p.roles,
  p.cmd AS command,
  p.qual AS using_expression,
  p.with_check AS with_check_expression,
  CASE 
    WHEN pc.total_policies_on_table = 0 
    THEN 'NO_POLICIES_FOUND (FAIL - TABLE OPEN/UNPROTECTED)'

    WHEN pc.total_policies_on_table > 1 
    THEN 'MULTIPLE_POLICIES_DETECTED (FAIL - UNEXPECTED ADDITIONAL PERMISSIVE POLICY)'

    WHEN p.policyname = 'Authenticated admins can manage guests'
     AND p.permissive = 'PERMISSIVE'
     AND p.roles = '{authenticated}'
     AND p.cmd = 'ALL'
     AND p.qual = '((lower((auth.jwt() ->> ''email''::text)) = ''admin@invitation.com''::text) OR (((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text) = ''admin''::text))'
     AND p.with_check = '((lower((auth.jwt() ->> ''email''::text)) = ''admin@invitation.com''::text) OR (((auth.jwt() -> ''app_metadata''::text) ->> ''role''::text) = ''admin''::text))'
    THEN 'BASELINE_POLICY_PASS'

    ELSE 'UNEXPECTED_OR_MODIFIED_POLICY_FAIL'
  END AS policy_verification
FROM policy_counts pc
LEFT JOIN pg_catalog.pg_policies p 
  ON p.schemaname = 'public' AND p.tablename = 'guests';
```

### លក្ខខណ្ឌវាយតម្លៃ (Strict Evaluation Criteria)
- **`total_policies_on_table`:** ត្រូវតែស្មើ **១ គត់**។
- **`policy_verification`:** ត្រូវតែជា `BASELINE_POLICY_PASS`។
- **ការទប់ស្កាត់ការបើកចំហរទិន្នន័យ:** ប្រសិនបើ `total_policies_on_table = 0` ឬ `> 1` (មាន Policy បន្ថែមដែលពង្រីកសិទ្ធិ) នោះលទ្ធផលនឹងធ្លាក់ជា `FAIL` ភ្លាមៗ។
- **ការបញ្ជាក់សុវត្ថិភាព:** ដាច់ខាតមិនមាន `admin@hmwedding.com` ឬ Client-side metadata ឡើយ។

---

## ៥. នីតិវិធីការពារភ្ញៀវពិត & ការសម្អាត TEST GUEST (Guest Baseline Protection & Cleanup)

> [!CAUTION]
> **ដែនកំណត់នៃចំនួនជួរសរុប (Row Count is Supplementary Only):**  
> ចំនួនភ្ញៀវសរុបស្មើ ២ គ្រាន់តែជា Indicator បន្ថែមប៉ុណ្ណោះ។ ប្រសិនបើចំនួនខុសពី ២ ប្រតិបត្តិករត្រូវស៊ើបអង្កេតមូលហេតុជាបន្ទាន់។ លើសពីនេះ Before/After Snapshot មិនអាចបញ្ជាក់ថាគ្មានការកែប្រែបណ្តោះអាសន្ន (Intermediate Modification) ក្នុងអំឡុងពេលតេស្តឡើយ។ ដូច្នេះ **ហាមប្រើប្រាស់ទិន្នន័យភ្ញៀវពិតប្រាកដក្នុង Functional Test ជាដាច់ខាត!**

### ក. ដំណើរការ Manual ID-Based Snapshot (មុនពេលតេស្ត)
ប្រតិបត្តិករដំណើរការ Query នេះដើម្បីកត់ត្រាទិន្នន័យភ្ញៀវពិតទាំង ២ នាក់ (ដោយមិន Query ឬបង្ហាញ `invitation_token` ឡើយ)៖
```sql
SELECT 
  id,
  guest_name,
  invitation_slug,
  rsvp_status,
  rsvp_message,
  responded_at
FROM public.guests
ORDER BY id;
```
*(កត់ត្រា UUIDs និងទិន្នន័យជាក់ស្តែងនៃភ្ញៀវទាំង ២ នាក់ ដោយមិន Query ឬបង្ហាញ `invitation_token` ឡើយ)*

---

### ខ. ការត្រួតពិនិត្យ Collision ជាមុនសិន (Pre-Test Collision Check)
> [!IMPORTANT]
> **វិធាន Pre-Test Collision Check:**  
> មុនពេលបង្កើត `QA-Disposable-Test-Guest` ត្រូវតែដំណើរការ Query ខាងក្រោមដើម្បីបញ្ជាក់ថា ឈ្មោះ និង Slug នេះ មិនទាន់មានក្នុង Database ឡើយ។

```sql
SELECT 
  count(*) FILTER (WHERE invitation_slug = 'qa-verify-test-slug') AS slug_collision_count,
  count(*) FILTER (WHERE lower(invitation_slug) = 'qa-verify-test-slug') AS lower_slug_collision_count,
  count(*) FILTER (WHERE guest_name = 'QA-Disposable-Test-Guest') AS name_collision_count,
  count(*) FILTER (WHERE guest_name ILIKE '%disposable%' OR invitation_slug ILIKE '%verify-test%') AS residual_pattern_count,
  CASE 
    WHEN count(*) FILTER (
      WHERE lower(invitation_slug) = 'qa-verify-test-slug' 
         OR guest_name = 'QA-Disposable-Test-Guest'
         OR guest_name ILIKE '%disposable%' 
         OR invitation_slug ILIKE '%verify-test%'
    ) = 0 
    THEN 'DISPOSABLE_IDENTITY_CLEAR_PASS'
    ELSE 'COLLISION_OR_RESIDUAL_DETECTED_STOP_IMMEDIATELY'
  END AS collision_check_status
FROM public.guests;
```
* **វិធានបញ្ឈប់ (Strict Stop):** ប្រសិនបើ `collision_check_status != 'DISPOSABLE_IDENTITY_CLEAR_PASS'`:
  - **STOP ភ្លាមៗ — ហាមបង្កើត Test Guest ថ្មី និងហាមលុប Record ដែលមានស្រាប់ដោយស្វ័យប្រវត្តិ!**
  - ស៊ើបអង្កេតមូលហេតុ និងរង់ចាំការសម្រេចចិត្តដាច់ដោយឡែក។

---

### គ. ការអនុវត្តតេស្តដោយប្រើ Disposable Test Guest តែមួយគត់
1. ចូល Admin Dashboard (`/admin`) បង្កើតភ្ញៀវសាកល្បង៖
   - **Guest Name:** `QA-Disposable-Test-Guest`
   - **Slug:** `qa-verify-test-slug`
   - **RSVP Status:** `pending`
2. **កត់ត្រា `test_guest_id` ជាក់ស្តែង (UUID)** នៃភ្ញៀវសាកល្បងនេះភ្លាមៗចេញពី Admin Dashboard ឬ Response Data។
3. បើក Browser Incognito ចូលទៅកាន់ `/invite/qa-verify-test-slug`។
4. ផ្ទៀងផ្ទាត់ Lookup ជោគជ័យ រួច Submit RSVP ជា **Accepted** (រួមសារជូនពរ)។
5. Submit ម្តងទៀតជា **Declined** (Update)។
6. ត្រឡប់មក Admin Dashboard វិញ រួចចុច **Delete** លុប `QA-Disposable-Test-Guest` នេះចេញ។

---

### ឃ. ផ្ទៀងផ្ទាត់អវត្តមាននៃ Disposable Test Guest ក្រោយពេលលុប
> [!WARNING]
> **ការទប់ស្កាត់ False PASS ពី Placeholder UUID:**  
> ប្រតិបត្តិករត្រូវជំនួស Placeholder `'00000000-0000-0000-0000-000000000000'` ដោយ `test_guest_id` ពិតប្រាកដដែលបានកត់ត្រាក្នុងជំហាន (គ)។ ប្រសិនបើ Placeholder មិនត្រូវបានកែប្រែ Query នឹងទាត់លទ្ធផលជា `PLACEHOLDER_UNCHANGED - TEST_ID_CLEANUP_NOT_VERIFIED (FAIL)` ដោយស្វ័យប្រវត្តិ ហើយមិនអនុញ្ញាតឱ្យចាត់ទុកជា Pass ឡើយ។

```sql
-- Step ១: ផ្ទៀងផ្ទាត់អវត្តមាន Slug និង Guest Name
SELECT
  count(*) FILTER (WHERE invitation_slug = 'qa-verify-test-slug') AS residual_test_slug_count,
  count(*) FILTER (WHERE guest_name = 'QA-Disposable-Test-Guest') AS residual_test_name_count
FROM public.guests;

-- Step ២: ផ្ទៀងផ្ទាត់អវត្តមាន Test Guest ID ដែលបានកត់ត្រាជាក់ស្តែង
SELECT 
  count(*) AS residual_test_id_count,
  CASE 
    WHEN '00000000-0000-0000-0000-000000000000'::uuid = '00000000-0000-0000-0000-000000000000'::uuid 
    THEN 'PLACEHOLDER_UNCHANGED - TEST_ID_CLEANUP_NOT_VERIFIED (FAIL)'
    WHEN count(*) = 0 
    THEN 'RECORDED_TEST_ID_CLEANED_PASS'
    ELSE 'RESIDUAL_TEST_ID_DETECTED_FAIL'
  END AS id_cleanup_status
FROM public.guests
-- [OPERATOR ACTION REQUIRED]: ជំនួស PLACEHOLDER ខាងក្រោមដោយ test_guest_id ពិតប្រាកដដែលបានកត់ត្រា៖
WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;
```
* **លក្ខខណ្ឌ Pass:** `residual_test_slug_count = 0`, `residual_test_name_count = 0`, និង `id_cleanup_status = 'RECORDED_TEST_ID_CLEANED_PASS'`។

---

### ង. Safe Baseline Comparison Query តាមរយៈ `LEFT JOIN` (ក្រោយពេលតេស្ត)
> [!NOTE]
> **ការណែនាំសម្រាប់ប្រតិបត្តិករ:** តម្លៃ UUIDs ខាងក្រោមជា **PLACEHOLDERS**។ ប្រតិបត្តិករត្រូវជំនួសដោយតម្លៃ UUIDs និង Baseline ជាក់ស្តែងដែលបានកត់ត្រាក្នុងជំហាន (ក) មុនពេលដំណើរការ Query នេះ៖

```sql
WITH baseline(id, expected_name, expected_slug, expected_status, expected_message, expected_responded_at) AS (
  VALUES 
    -- [OPERATOR ACTION REQUIRED]: ជំនួស PLACEHOLDERS ខាងក្រោមដោយតម្លៃ Baseline ជាក់ស្តែង៖
    ('00000000-0000-0000-0000-000000000001'::uuid, 'Real Guest 1', 'real-guest-1', 'pending', NULL::text, NULL::timestamptz),
    ('00000000-0000-0000-0000-000000000002'::uuid, 'Real Guest 2', 'real-guest-2', 'pending', NULL::text, NULL::timestamptz)
)
SELECT 
  b.id AS baseline_id,
  (g.id IS NOT NULL) AS guest_exists,
  g.guest_name AS current_name,
  (g.guest_name IS NOT DISTINCT FROM b.expected_name) AS name_match,
  (g.invitation_slug IS NOT DISTINCT FROM b.expected_slug) AS slug_match,
  (g.rsvp_status IS NOT DISTINCT FROM b.expected_status) AS status_match,
  (g.rsvp_message IS NOT DISTINCT FROM b.expected_message) AS message_match,
  (g.responded_at IS NOT DISTINCT FROM b.expected_responded_at) AS responded_at_match,
  CASE 
    WHEN g.id IS NULL THEN 'REAL_GUEST_MISSING_FAIL'
    WHEN (g.guest_name IS NOT DISTINCT FROM b.expected_name)
     AND (g.invitation_slug IS NOT DISTINCT FROM b.expected_slug)
     AND (g.rsvp_status IS NOT DISTINCT FROM b.expected_status)
     AND (g.rsvp_message IS NOT DISTINCT FROM b.expected_message)
     AND (g.responded_at IS NOT DISTINCT FROM b.expected_responded_at)
    THEN 'RECORD_PERFECT_MATCH'
    ELSE 'RECORD_VALUE_MODIFIED_FAIL'
  END AS record_comparison_result
FROM baseline b
LEFT JOIN public.guests g ON g.id = b.id;
```
* **ការផ្ទៀងផ្ទាត់ចំនួនជួរចុងក្រោយ:**
  ```sql
  SELECT count(*) AS final_total_guests FROM public.guests;
  ```
  *លទ្ធផលរំពឹងទុកស្មើ **២ គត់**។ ប្រសិនបើខុសពី ២ ត្រូវស៊ើបអង្កេតភ្លាមៗ*។

---

## ៦. នីតិវិធីនៃការបញ្ចេញ RELEASE, GIT, VERCEL & MAINTENANCE MODE

> [!WARNING]
> **ការកត់ត្រាស្ថានភាពប្រវត្តិសាស្ត្រនៃ Git (Historical Observations):**  
> របាយការណ៍មុនៗបានកត់ត្រាថា Local `main` នាំមុខ `origin/main` ចំនួន ១ Commit (`bd220b7`), មាន ១១ ឯកសារ Modified, និង ៤ ឯកសារ Untracked។ **ទាំងនេះជា Historical Observations ដែលត្រូវតែត្រួតពិនិត្យឡើងវិញ (Recheck) មុនពេល Release ដាច់ខាតមិនត្រូវសន្មតថាវាស្ថិតនៅដដែលនោះឡើយ**។  
> 
> **ការប្រុងប្រយ័ត្នចំពោះ Git Staging:**  
> **ដាច់ខាតមិនត្រូវសន្មតថា Uncommitted ឬ Untracked Files នឹងត្រូវ Deploy ដោយគ្រាន់តែ Push `main` នោះឡើយ!** រាល់ឯកសារដែលមិនទាន់បាន Commit នឹងមិនត្រូវបានបញ្ជូនទៅកាន់ Vercel ឡើយ។

### ក. ការផ្ទៀងផ្ទាត់ឈ្មោះ Environment Variables ជាក់ស្តែងរបស់ Frontend
តាមរយៈការត្រួតពិនិត្យកូដប្រភពជាក់ស្តែងក្នុង [`src/lib/supabase.js`](file:///d:/Invitation%20Digital%20HM/invitation_digital_hm/src/lib/supabase.js) (បន្ទាត់ 3-9)៖
- **ឈ្មោះ Environment Variables ដែល Frontend ទាមទារពិតប្រាកដគឺ៖**
  1. `VITE_SUPABASE_URL`
  2. `VITE_SUPABASE_PUBLISHABLE_KEY`
- *(Frontend មិនប្រើប្រាស់ឈ្មោះ `VITE_SUPABASE_ANON_KEY` ឡើយ)*។  
- **លក្ខខណ្ឌ Vercel:** Vercel Production Settings ត្រូវតែកំណត់ឈ្មោះ Environment Variables ទាំងពីរនេះឱ្យ **ដូចគ្នាបេះបិទ** (Exact Name Match)។ **ដាច់ខាតមិនត្រូវបង្ហាញ Secret Values ក្នុង Log ឬ Runbook ឡើយ**។

---

### ខ. លក្ខខណ្ឌតម្រូវអំពី Maintenance Mode
- **តម្រូវការចាំបាច់ (Prerequisite):** ត្រូវបើកដំណើរការ **Maintenance Mode** មុនពេល Execute Migration ដើម្បីការពារកុំឱ្យភ្ញៀវប្រើប្រាស់ Frontend ចាស់ខណៈពេលដែល Legacy RPCs កំពុងត្រូវបានលុប។ Maintenance Mode ត្រូវរក្សារហូតដល់ Frontend ថ្មីត្រូវបាន Deploy និងផ្ទៀងផ្ទាត់ជោគជ័យ។
- **ស្ថានភាពជាក់ស្តែង:** ប្រសិនបើគម្រោងបច្ចុប្បន្ន **មិនទាន់មានយន្តការ Maintenance Mode ដែលត្រូវបានផ្ទៀងផ្ទាត់នៅឡើយទេ** នោះនេះគឺជា **Release Prerequisite ដែលត្រូវតែរៀបចំ និង Review ដាច់ដោយឡែកជាមុនសិន**។

---

### គ. លំដាប់លំដោយនៃការបញ្ចេញ Release (Release Sequence)

```
[ជំហាន ១] ត្រួតពិនិត្យ Git: git status, git diff, staged/unstaged, និង untracked files
    ↓
[ជំហាន ២] កំណត់បញ្ជីឯកសារជាក់លាក់ដែលត្រូវ Release និងផ្ទៀងផ្ទាត់ថា Frontend ហៅតែ RPCs:
           'get_guest_by_slug' (slug) និង 'submit_rsvp' (slug, status_input, message_input)
    ↓
[ជំហាន ៣] ដំណើរការ Local Tests & Build: node test/slug_unit_tests.js && npm run lint && npm run build
    ↓
[ជំហាន ៤] បន្ទាប់ពីមាន Human Authorization: Commit ឯកសារដែលបាន Review រួចកត់ត្រា Exact Git Commit SHA
    ↓
[ជំហាន ៥] ផ្ទៀងផ្ទាត់ Vercel Production Settings & Environment Variables (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
    ↓
[ជំហាន ៦] ដំណើរការ Mandatory Immediate Preflight Recheck (ផ្នែកទី ៧) លើ Production Database
    ↓
[ជំហាន ៧] បើកដំណើរការ Maintenance Mode
    ↓
[ជំហាន ៨] ប្រតិបត្តិករ Execute Migration ក្នុង Supabase SQL Editor (បន្ទាប់ពីមាន Human Approval)
    ↓
[ជំហាន ៩] ដំណើរការ Read-Only Database Verification Queries (ផ្នែកទី ១ ដល់ ៤ នៃ Runbook)
    ↓
[ជំហាន ១០] Push Git Main ទៅ GitHub ហើយផ្ទៀងផ្ទាត់ថា Vercel Build ដោយប្រើ Exact Commit SHA
    ↓
[ជំហាន ១១] ដំណើរការ Pre-Test Collision Check រួចតេស្តមុខងារផ្ទាល់ដោយប្រើ Disposable Test Guest ផ្តាច់មុខ (ផ្នែកទី ៥)
    ↓
[ជំហាន ១២] ដំណើរការ Safe Baseline Comparison លើភ្ញៀវពិតទាំង ២ នាក់ (ធានាមិនរងផលប៉ះពាល់)
    ↓
[ជំហាន ១៣] បិទ Maintenance Mode និងបើកដំណើរការជាផ្លូវការ (Reopen Normal Access)
```

### ឃ. ភាពមិនត្រឹមត្រូវនៃការ Rollback ទៅកាន់ Frontend ចាស់ (Invalidity of Old Frontend Redeploy)
> [!WARNING]
> ### BACKWARD-COMPATIBILITY RECOVERY SQL: NOT PREPARED — SEPARATE REVIEW REQUIRED
> 1. ប្រសិនបើ SQL Migration ត្រូវបាន COMMIT ប៉ុន្តែ Vercel Deployment បរាជ័យ **ការចុច Redeploy Frontend ចាស់លើ Vercel គឺជាសកម្មភាពមិនត្រឹមត្រូវ (INVALID RECOVERY)** ដាច់ខាត! ពីព្រោះ Frontend ចាស់នោះហៅ Legacy RPCs ដែលត្រូវបាន Database លុបចោលរួចទៅហើយ។
> 2. ប្រសិនបើមានបញ្ហាលើ Vercel ប្រព័ន្ធត្រូវរក្សាទុកក្នុង **Maintenance Mode** រួចដោះស្រាយតាមរយៈ **Fix-Forward**។ ផែនការស្តារឡើងវិញបច្ចុប្បន្ន **មិនទាន់អាចយកទៅ Execute បានឡើយ** រហូតទាល់តែមាន Compatibility SQL ដាច់ដោយឡែកដែលត្រូវបាន Review និងអនុម័តជាមុនសិន។

---

## ៧. ការត្រួតពិនិត្យ PREFLIGHT ឡើងវិញជាបន្ទាន់មុន EXECUTE (Mandatory Immediate Preflight Recheck)

> [!IMPORTANT]
> **ការបែងចែក Preflight ថ្មីពីលទ្ធផលប្រវត្តិសាស្ត្រ:**  
> លទ្ធផល Preflight កន្លងមក គឺជាទិន្នន័យប្រវត្តិសាស្ត្រ។ **ដាច់ខាតមិនត្រូវអះអាងថាលទ្ធផលចាស់នៅតែត្រឹមត្រូវនៅពេលបច្ចុប្បន្នឡើយ**។  
> ប្រតិបត្តិករត្រូវតែដំណើរការ Query ខាងក្រោមនេះ **ភ្លាមៗមុនពេលចុច Execute Migration**៖

```sql
-- RECHECK 1: Total Guests & Invalid RSVP Statuses
SELECT 
  count(*) AS total_guests_count,
  count(*) FILTER (WHERE rsvp_status IS NULL OR rsvp_status NOT IN ('pending', 'accepted', 'declined')) AS invalid_rsvp_status_count
FROM public.guests;

-- RECHECK 2: Oversized RSVP Messages (> 500 Chars)
SELECT 
  count(*) FILTER (WHERE rsvp_message IS NOT NULL AND pg_catalog.length(rsvp_message) > 500) AS oversized_rsvp_message_count
FROM public.guests;

-- RECHECK 3: Invalid Invitation Tokens (Aggregate Only)
SELECT 
  count(*) FILTER (WHERE invitation_token IS NULL OR pg_catalog.length(pg_catalog.btrim(invitation_token)) = 0) AS invalid_invitation_token_count
FROM public.guests;

-- RECHECK 4: Invalid Invitation Slugs (Aggregates Only)
SELECT
  count(*) FILTER (WHERE invitation_slug IS NULL) AS null_slug_count,
  count(*) FILTER (WHERE invitation_slug IS NOT NULL AND pg_catalog.length(invitation_slug) > 60) AS oversized_slug_count,
  count(*) FILTER (WHERE invitation_slug IS NOT NULL AND invitation_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$') AS malformed_slug_count,
  count(*) FILTER (WHERE invitation_slug IS NULL OR (invitation_slug IS NOT NULL AND (pg_catalog.length(invitation_slug) > 60 OR invitation_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'))) AS total_invalid_slug_count
FROM public.guests;

-- RECHECK 5: Case-Insensitive Duplicate Slugs
SELECT 
  count(*) AS duplicate_slug_groups_count
FROM (
  SELECT pg_catalog.lower(invitation_slug) AS clean_slug
  FROM public.guests
  WHERE invitation_slug IS NOT NULL
  GROUP BY pg_catalog.lower(invitation_slug)
  HAVING count(*) > 1
) sub;
```

* **វិធានបញ្ឈប់ជាបន្ទាន់ (Strict Stop Condition):**  
  ប្រសិនបើតួលេខ Invalid Counts ណាមួយ **> 0** ឬមាន Duplicate Slugs **> 0** ឬទិន្នន័យខុសប្លែកពី Baseline មុន៖
  - **STOP ភ្លាមៗ — ហាមដំណើរការ MIGRATION ដាច់ខាត!**
  - ស៊ើបអង្កេតទិន្នន័យដែលបានផ្លាស់ប្តូរ និងរង់ចាំការសម្រេចចិត្តដាច់ដោយឡែក។

---

## ៨. ភាពសុក្រឹតនៃការ LOCK លើ INDEX (Index Locking Accuracy)

ផ្អែកលើកូដជាក់ស្តែងក្នុង `supabase/slug_only_security_migration.sql` (បន្ទាត់ 350-353)៖
```sql
CREATE UNIQUE INDEX guests_invitation_slug_lower_idx 
ON public.guests (pg_catalog.lower(invitation_slug)) 
WHERE invitation_slug IS NOT NULL;
```

### ការបែងចែកបច្ចេកទេសរវាង `CREATE INDEX` និង `CREATE INDEX CONCURRENTLY`៖
1. **Standard `CREATE INDEX` (កូដក្នុង Migration នេះ):**
   - Acquire នូវ **`SHARE` lock** លើតារាង `public.guests`។
   - អនុញ្ញាតឱ្យ Concurrent Reads (`SELECT`) ដំណើរការធម្មតា ប៉ុន្តែ **ផ្អាក (Block) រាល់ Concurrent Writes (`INSERT`, `UPDATE`, `DELETE`)** រហូតទាល់តែ Transaction Block នេះ `COMMIT`។
   - អាចដំណើរការនៅក្នុង Atomic Transaction Block (`BEGIN ... COMMIT`) បានយ៉ាងសុវត្ថិភាព។
2. **`CREATE INDEX CONCURRENTLY`:**
   - Acquire នូវ `SHARE UPDATE EXCLUSIVE` lock (មិន Block Writes ឡើយ)។
   - ប៉ុន្តែ **មិនអាចដំណើរការនៅក្នុង Transaction Block (`BEGIN ... COMMIT`) បានជាដាច់ខាត** នៅក្នុង PostgreSQL (`ERROR: CREATE INDEX CONCURRENTLY cannot run inside a transaction block`)។
3. **ការវាយតម្លៃ Production Impact:**
   - រយៈពេលនៃការ Scan Table ដើម្បី Build Index អាស្រ័យលើចំនួនទិន្នន័យ Hardware និង Active Queries លើ Server។ ប្រសិនបើមាន uncommitted transaction ផ្សេងទៀតកំពុងកាន់ Lock លើតារាង `guests` នោះ Statement នេះនឹងត្រូវរង់ចាំក្នុង Lock Queue។ ដូច្នេះ ការជ្រើសរើស Maintenance Window ស្ងាត់ល្អ គឺជារឿងចាំបាច់ដាច់ខាត។

---

## ៩. ដែនកំណត់បច្ចេកទេសនៅសេសសល់ (Remaining Technical Limitations)

1. **Intermediate Modification Blind Spot:** Before/After Snapshot comparison ផ្ទៀងផ្ទាត់បានតែស្ថានភាពមុន និងក្រោយពេលតេស្តប៉ុណ្ណោះ វាមិនអាចបញ្ជាក់ដាច់ខាតថាគ្មានការកែប្រែបណ្តោះអាសន្នកំឡុងពេលកំពុងតេស្តនោះឡើយ។
2. **PostgREST Schema Cache Edge Invalidation:** ទោះបីជា `NOTIFY pgrst, 'reload schema';` ត្រូវបានបញ្ជូនក៏ដោយ ក៏នៅតែមាន Latency ពីរបីវិនាទីលើ Multi-tenant Supabase API Gateway។
3. **Maintenance Mode Prerequisite:** គម្រោងមិនទាន់មានយន្តការ Maintenance Mode ផ្លូវការដែលត្រូវបានបង្កើត និងតេស្តនៅឡើយទេ ដែលនេះជាចំណុចខ្វះខាតដែលត្រូវរៀបចំដាច់ដោយឡែក។
4. **Recovery Dependency:** `emergency_backward_compatibility_restore.sql: NOT PREPARED — SEPARATE REVIEW REQUIRED`។ ដោយសារ Backward-Compatibility Recovery Script មិនទាន់ត្រូវបានរៀបចំ ប្រព័ន្ធត្រូវពឹងផ្អែកលើការដោះស្រាយតាមរយៈ Fix-Forward លើ Vercel ជាចម្បង។

---

## ១០. ការបែងចែកស្ថានភាព និងសេចក្តីប្រកាសចុងក្រោយ (Final Determination)

| វិសាលភាពនៃការវាយតម្លៃ (Evaluation Scope) | ស្ថានភាពជាក់ស្តែង (Actual Status) | កំណត់ចំណាំ |
| :--- | :---: | :--- |
| **Documentation Review Status** | **PASS** | Runbook ត្រូវបានកែតម្រូវបច្ចេកទេសគ្រប់ជ្រុងជ្រោយ និងរក្សាទុកជាអចិន្ត្រៃយ៍ក្នុង Repository |
| **Static Migration Review Status** | **STATIC REVIEW COMPLETED — NO KNOWN STATIC BLOCKER IDENTIFIED** | Static review មិនមែនជាការធានាលើ Runtime ឡើយ |
| **Local Unit Test & Build Status** | **PASS** | Unit Tests 23/23 Passed; Vite Build 0 errors |
| **Production Database Execution Status** | **NOT EXECUTED / PENDING** | គ្មាន SQL ត្រូវបានដំណើរការលើ Production ឡើយ |
| **Production Database Verification Status** | **NOT VERIFIED ON PRODUCTION** | មិនទាន់អាចផ្ទៀងផ្ទាត់លើ Live DB បានឡើយ |
| **Human Approval Status** | **PENDING EXPLICIT HUMAN APPROVAL** | រង់ចាំការអនុម័តដោយឡែកពីមនុស្ស |

### **ការពន្យល់លម្អិតអំពីដែនកំណត់នៃ Static Review (Static Review Limitations):**
- **Static Review មិនមែនជា PostgreSQL Runtime Verification ឡើយ**។
- ការឆ្លងកាត់ Unit Tests និង Vite Build លើ Frontend **មិនមែនជាភស្តុតាងបញ្ជាក់ថា Database Execution នឹងជោគជ័យដោយគ្មានកំហុសនោះឡើយ**។
- Static Review មិនអាចធានាអវត្តមាននៃ Runtime Errors, Lock Contention, Permission/Privilege Issues, ឬ Production Risks ផ្សេងទៀតបានឡើយ។

---

# របាយការណ៍បូកសរុបការកែតម្រូវចុងក្រោយ (FINAL REPORT)

## ១. បញ្ជីផ្ទៀងផ្ទាត់ការកែតម្រូវទាំង ៤ ចំណុច (Correction Checklist)

| # | ចំណុចកែតម្រូវដែលបានទាមទារ (Required Correction) | ស្ថានភាព | សេចក្តីសង្ខេបនៃការកែតម្រូវបច្ចេកទេស |
| :---: | :--- | :---: | :--- |
| **1** | **Correction 1: Verify Actual Vercel Env Variable Names** (Inspect import.meta.env; document exact names; match Vercel env; no secret exposure) | **PASS** | បានពិនិត្យ `src/lib/supabase.js` ផ្ទាល់ក្នុង read-only mode៖ ឈ្មោះពិតប្រាកដគឺ `VITE_SUPABASE_URL` និង `VITE_SUPABASE_PUBLISHABLE_KEY` (មិនមែន `VITE_SUPABASE_ANON_KEY` ឡើយ)។ |
| **2** | **Correction 2: Prevent False PASS from Test Guest ID Placeholder** (Require test_guest_id recording; unchanged placeholder marked NOT VERIFIED/FAIL; separate slug/name checks) | **PASS** | បានកែប្រែ Query ដោយបន្ថែមលក្ខខណ្ឌពិនិត្យ Placeholder ស្វ័យប្រវត្តិ៖ ប្រសិនបើមិនទាន់ជំនួស Placeholder នឹងធ្លាក់ជា `PLACEHOLDER_UNCHANGED - TEST_ID_CLEANUP_NOT_VERIFIED (FAIL)` ភ្លាមៗ។ |
| **3** | **Correction 3: Pre-Test Collision Check** (Mandatory check before creating test guest; verify slug/name/residual absent; STOP on collision; isolate real guests) | **PASS** | បានបន្ថែម Pre-Test Collision Check Query ក្នុងជំហាន ៥.ខ ពិនិត្យ slug, lower slug, guest name, និង patterns `%disposable%` / `%verify-test%` ដោយបង្គាប់ឱ្យ STOP ភ្លាមៗបើរកឃើញ collision។ |
| **4** | **Correction 4: Accurate Static Review Claims** (Replace PASS with STATIC REVIEW COMPLETED — NO KNOWN STATIC BLOCKER IDENTIFIED; explain static limitations; distinguish all statuses) | **PASS** | បានកែប្រែស្ថានភាពទៅជា `STATIC REVIEW COMPLETED — NO KNOWN STATIC BLOCKER IDENTIFIED` និងពន្យល់លម្អិតពីដែនកំណត់នៃ Static Review ដោយមិនអះអាងហួសហេតុ។ |

---

## ២. ឯកសារដែលបានកែប្រែ (Document Path Modified)
- **ឯកសារដែលបានបង្កើត:** [`docs/FINAL_PRODUCTION_RELEASE_RUNBOOK.md`](file:///d:/Invitation%20Digital%20HM/invitation_digital_hm/docs/FINAL_PRODUCTION_RELEASE_RUNBOOK.md)
- **ឯកសារ Disk ផ្សេងទៀត:** **០ ឯកសារត្រូវបានកែប្រែ** (No other disk files modified).

---

## ៣. ការបញ្ជាក់ច្បាស់លាស់អំពីសុវត្ថិភាព (Formal Safety Confirmations)

1. **គ្មានការ Execute SQL លើ Production:** គ្មានការតភ្ជាប់ ឬដំណើរការ SQL ណាមួយលើ Production Database ឡើយ។
2. **គ្មាន Database ត្រូវបានកែប្រែ:** ទិន្នន័យ និងរចនាសម្ព័ន្ធ Database មិនត្រូវបានប៉ះពាល់ឡើយ។
3. **គ្មានការអនុម័ត Migration:** Migration មិនត្រូវបានអនុម័តឱ្យដំណើរការឡើយ (`NOT APPROVED`).
4. **គ្មាន Git Commit ឬ Push:** គ្មានការ Commit, Push, Merge, ឬ Reset ទៅកាន់ GitHub ឡើយ។
5. **គ្មាន Vercel Deployment:** គ្មានការ Trigger ឬ Deploy ទៅកាន់ Vercel ឡើយ។

> [!CAUTION]
> ### **PRODUCTION EXECUTION: NOT APPROVED — A separate human approval is required.**
> 
> **ការអនុវត្តលើ Production ត្រូវតែរង់ចាំការសម្រេចចិត្ត និងការអនុម័តដាច់ដោយឡែកពីមនុស្ស (Separate Explicit Human Approval) តែមួយគត់!**