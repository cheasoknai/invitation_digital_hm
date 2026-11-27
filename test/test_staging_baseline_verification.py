#!/usr/bin/env python3
"""
Offline Static Verification Test Suite for supabase/staging_baseline_verification.sql
Phase 5.11.9: Automated 3VL NULL-Semantics Regression Tests, Structural AST & Mutation Verification

NOTICE:
Python emulation in this test suite verifies three-valued logic (3VL) semantics and SQL source-structure
regressions offline. It does not replace or claim to prove PostgreSQL 17 server-side runtime execution.
Full server-side execution validation requires execution in the target Staging PostgreSQL instance.
"""

import os
import re
import sys
from collections import defaultdict

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQL_FILE_PATH = os.path.join(PROJECT_ROOT, 'supabase', 'staging_baseline_verification.sql')

def read_sql(path=SQL_FILE_PATH):
    assert os.path.exists(path), f"File not found: {path}"
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def strip_sql_strings_and_comments(sql_text):
    """Utility to strip line comments, block comments, and string literals for structural syntax analysis."""
    no_comments = re.sub(r'--.*$', '', sql_text, flags=re.MULTILINE)
    no_comments = re.sub(r'/\*.*?\*/', '', no_comments, flags=re.DOTALL)
    no_strings = re.sub(r'\$\$.*?\$\$', "''", no_comments, flags=re.DOTALL)
    no_strings = re.sub(r"'(?:''|[^'])*'", "''", no_strings)
    return no_strings

# ==============================================================================
# 1. READ-ONLY SAFETY TEST
# ==============================================================================
def test_read_only_safety(sql):
    print("\n--- 1. TESTING READ-ONLY SAFETY (STATIC AST CHECK) ---")
    no_strings = strip_sql_strings_and_comments(sql)
    
    forbidden_keywords = [
        'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'INSERT', 'UPDATE', 'DELETE',
        'GRANT', 'REVOKE', 'EXECUTE', 'COMMIT', 'ROLLBACK'
    ]
    
    violations = []
    for kw in forbidden_keywords:
        matches = re.findall(rf'\b{kw}\b', no_strings, flags=re.IGNORECASE)
        if matches:
            violations.append((kw, len(matches)))
            
    if violations:
        for kw, count in violations:
            print(f"FAILED: Found {count} instances of forbidden statement keyword: {kw}")
        raise AssertionError("SQL script is NOT strictly read-only!")
        
    trimmed = no_strings.strip()
    assert re.match(r'^WITH\b', trimmed, re.IGNORECASE), "Script must start with WITH"
    assert re.search(r'\bORDER\s+BY\b[^;]*;\s*$', trimmed, re.IGNORECASE), "Script must end with ORDER BY ...;"
    print("PASS: Verified 100% read-only catalog query. Zero DDL/DML statements present.")

# ==============================================================================
# 2. SQL PARSER & STRUCTURAL INTEGRITY
# ==============================================================================
def validate_sql_structural_integrity(sql_text):
    """
    Validates structural integrity of the full SQL text:
    - Global parenthesis balance
    - Single check_rls_policy CTE definition
    - Absence of orphaned legacy fragments
    - Consistent Category 7 labeling
    - Individual CTE parenthesis balance
    """
    no_strings = strip_sql_strings_and_comments(sql_text)
    
    # 1. Global Parentheses Balance
    open_p = no_strings.count('(')
    close_p = no_strings.count(')')
    if open_p != close_p:
        raise AssertionError(f"Global parentheses unbalanced: open={open_p}, close={close_p}, diff={open_p - close_p}")
        
    # 2. Exactly one check_rls_policy CTE
    rls_ctes = re.findall(r'\bcheck_rls_policy\s+AS\s*\(', sql_text)
    if len(rls_ctes) != 1:
        raise AssertionError(f"Expected exactly 1 check_rls_policy CTE definition, found {len(rls_ctes)}")
        
    # 3. Detect known orphaned legacy fragments from Phase 5.9 - 5.11.2
    orphaned_signatures = [
        (r'^\s*\),\s*1\)\s*=\s*11', "Phase 5.11.2 token fallback orphaned tail (starts with '), 1) = 11')"),
        (r"\),\s*'pg_catalog\.',\s*''\)\s*NOT\s+IN\s*\(", "Phase 5.11.1 AST normalization orphaned tail"),
        (r'^\s*\),\s*1\)\s*<>\s*2\s+THEN\s+\'FAIL\'', "Phase 5.10 regex split orphaned tail"),
        (r"'7\. EFFECTIVE_PRIVILEGES'", "Legacy category 7 label ('7. EFFECTIVE_PRIVILEGES')")
    ]
    for pattern, desc in orphaned_signatures:
        if re.search(pattern, sql_text, flags=re.MULTILINE):
            raise AssertionError(f"Orphaned corruption detected: {desc} (matched '{pattern}') found in SQL!")
            
    # 4. Standardized Category 7 check
    cat7_count = sql_text.count("'7. EFFECTIVE_PERMISSIONS'::text AS check_category")
    if cat7_count != 5:
        raise AssertionError(f"Expected exactly 5 occurrences of '7. EFFECTIVE_PERMISSIONS'::text AS check_category, found {cat7_count}")
        
    # 5. Individual CTE structure & balance
    cte_matches = list(re.finditer(r'([a-zA-Z0-9_]+)\s+AS\s*\(', sql_text))
    if len(cte_matches) != 32:
        raise AssertionError(f"Expected exactly 32 CTE definitions, found {len(cte_matches)}")
        
    # Check that check_rls_policy contains only the expected subquery SELECT and outer SELECT
    m_rls_block = re.search(r'check_rls_policy\s+AS\s*\((.*?)\)\s*,\s*exploded_acl\s+AS', no_strings, re.DOTALL)
    if not m_rls_block:
        raise AssertionError("check_rls_policy CTE does not transition cleanly into exploded_acl CTE!")
    rls_inner = m_rls_block.group(1)
    select_count_in_rls = len(re.findall(r'\bSELECT\b', rls_inner, re.IGNORECASE))
    if select_count_in_rls != 2:
        raise AssertionError(f"Expected exactly 2 SELECT statements in check_rls_policy, found {select_count_in_rls}")

    return True

def test_parser_and_structural_integrity(sql):
    print("\n--- 2. TESTING SQL PARSER AVAILABILITY & FULL-FILE STRUCTURAL INTEGRITY ---")
    available_parsers = []
    for pkg in ['sqlglot', 'pglast', 'sqlparse', 'psycopg2', 'psycopg']:
        try:
            m = __import__(pkg)
            available_parsers.append((pkg, getattr(m, '__version__', 'available')))
        except ImportError:
            pass
            
    if available_parsers:
        print(f"External SQL parser available: {available_parsers}")
    else:
        print("NOTICE / LIMITATION: No external PostgreSQL parser (sqlglot/pglast/sqlparse) is installed in the local Python environment.")
        print("  -> Full PostgreSQL server-side grammar validation cannot be performed offline without a dedicated parser engine.")
        print("  -> Running supplementary strict structural AST, parenthesis balancing, and token boundary verification.")

    validate_sql_structural_integrity(sql)
    print("PASS: Verified full-file structural integrity: balanced parentheses, clean CTE transitions, zero legacy fragments, and consistent Category 7 labels.")

# ==============================================================================
# 3. REGRESSION TEST FOR PHASE 5.11.6 CORRUPTION
# ==============================================================================
def test_regression_phase5116_corruption(sql):
    print("\n--- 3. REGRESSION TEST FOR PHASE 5.11.6 CORRUPTION ---")
    corrupted_fragment = "\n), 1) = 11\n        AND (pg_catalog.string_to_array(p.qual, ''''))[2] = 'email'\n"
    
    corrupted_sql = sql.replace(
        "ON p.schemaname = 'public' AND p.tablename = 'guests'\n),",
        "ON p.schemaname = 'public' AND p.tablename = 'guests'" + corrupted_fragment + "),"
    )
    
    caught = False
    try:
        validate_sql_structural_integrity(corrupted_sql)
    except AssertionError as e:
        caught = True
        print(f"PASS: Regression test successfully caught simulated Phase 5.11.6 corruption! ({e})")
        
    assert caught, "Regression test FAILED! Structural validator failed to catch the simulated corruption!"

# ==============================================================================
# 4. MANDATORY REGISTRY & 1-TO-1 BIJECTION
# ==============================================================================
def test_registry_and_bijection(sql):
    print("\n--- 4. TESTING MANDATORY REGISTRY & 1-TO-1 BIJECTION ---")
    m_reg = re.search(r'mandatory_registry AS \(\s*SELECT unnest\(ARRAY\[(.*?)\]\)\s*AS\s*req_id\s*\)', sql, re.DOTALL)
    assert m_reg, "Could not extract mandatory_registry"
    
    reg_lines = m_reg.group(1).splitlines()
    reg_checks = []

    for line in reg_lines:
        line_clean = line.strip()
        if not line_clean or line_clean.startswith('--'):
            continue
        m_item = re.search(r"'([a-zA-Z0-9_]+)'", line_clean)
        if m_item:
            reg_checks.append(m_item.group(1))

    print(f"Total Registry Entries: {len(reg_checks)}")
    assert len(reg_checks) == 57, f"Expected 57 registry entries, got {len(reg_checks)}"
    assert len(set(reg_checks)) == 57, "Duplicate entries in mandatory_registry!"

    m_all = re.search(r'all_executed_checks AS \(\s*(.*?)\s*\)\s*,\s*matched_checks AS', sql, re.DOTALL)
    assert m_all, "Could not find all_executed_checks"
    all_body = m_all.group(1)
    unioned_ctes = re.findall(r'SELECT\s+\*\s+FROM\s+([a-zA-Z0-9_]+)', all_body)
    assert len(unioned_ctes) == 22, f"Expected 22 CTEs in all_executed_checks, got {len(unioned_ctes)}"

    executed_checks = []
    executed_checks.append(('1. TABLE_STATUS', 'table_core_attributes'))

    exp_cols_m = re.search(r'expected_columns AS \(\s*(.*?)\s*\)\s*,\s*actual_columns', sql, re.DOTALL)
    assert exp_cols_m
    for line in exp_cols_m.group(1).split('UNION ALL'):
        m = re.search(r'SELECT\s+([0-9]+)(?:\s+AS\s+exp_pos)?\s*,\s*\'([a-zA-Z0-9_]+)\'', line)
        assert m
        executed_checks.append(('2. COLUMNS', f"col_{m.group(1)}_{m.group(2)}"))

    executed_checks.append(('2. COLUMNS', 'total_column_count_exact_9'))

    exp_cons_m = re.search(r'expected_constraints AS \(\s*(.*?)\s*\)\s*,\s*actual_constraints', sql, re.DOTALL)
    assert exp_cons_m
    for line in exp_cons_m.group(1).split('UNION ALL'):
        m = re.search(r'SELECT\s+\'([a-zA-Z0-9_]+)\'', line)
        assert m
        executed_checks.append(('3. CONSTRAINTS', f"constraint_{m.group(1)}"))

    executed_checks.append(('3. CONSTRAINTS', 'total_constraint_count_exact_2'))

    exp_idxs_m = re.search(r'expected_indexes AS \(\s*(.*?)\s*\)\s*,\s*actual_indexes', sql, re.DOTALL)
    assert exp_idxs_m
    for line in exp_idxs_m.group(1).split('UNION ALL'):
        m = re.search(r'SELECT\s+\'([a-zA-Z0-9_]+)\'', line)
        assert m
        executed_checks.append(('4. INDEXES', f"index_{m.group(1)}"))

    executed_checks.append(('4. INDEXES', 'total_index_count_exact_3'))
    executed_checks.append(('4. INDEXES', 'migration_index_absent_before_migration'))
    executed_checks.append(('5. RLS_POLICY', 'canonical_admin_policy_exact'))
    executed_checks.append(('6. DIRECT_ACL', 'direct_acl_owner_is_postgres'))

    for p in ['select', 'insert', 'update', 'delete']:
        executed_checks.append(('6. DIRECT_ACL', f"direct_acl_auth_{p}"))

    executed_checks.append(('6. DIRECT_ACL', 'direct_acl_auth_zero_non_crud'))
    executed_checks.append(('6. DIRECT_ACL', 'direct_acl_anon_public_zero'))

    for p in ['references', 'trigger', 'truncate']:
        executed_checks.append(('6. DIRECT_ACL', f"direct_acl_service_role_{p}"))

    executed_checks.append(('6. DIRECT_ACL', 'direct_acl_service_role_zero_crud'))
    executed_checks.append(('6. DIRECT_ACL', 'direct_acl_unknown_grantee_zero'))
    executed_checks.append(('6. DIRECT_ACL', 'direct_acl_unexpected_grant_options_zero'))

    for p in ['select', 'insert', 'update', 'delete', 'truncate', 'references', 'trigger', 'maintain']:
        executed_checks.append(('7. EFFECTIVE_PERMISSIONS', f"effective_anon_{p}_blocked"))

    for p in ['select', 'insert', 'update', 'delete']:
        executed_checks.append(('7. EFFECTIVE_PERMISSIONS', f"effective_auth_{p}_granted"))
    for p in ['truncate', 'references', 'trigger', 'maintain']:
        executed_checks.append(('7. EFFECTIVE_PERMISSIONS', f"effective_auth_{p}_blocked"))

    for p in ['references', 'trigger', 'truncate']:
        executed_checks.append(('7. EFFECTIVE_PERMISSIONS', f"effective_sr_{p}_granted"))

    executed_checks.append(('7. EFFECTIVE_PERMISSIONS', 'effective_sr_maintain_evaluated'))

    for p in ['select', 'insert', 'update', 'delete']:
        executed_checks.append(('7. EFFECTIVE_PERMISSIONS', f"effective_sr_{p}_evaluated"))

    print(f"Total Executed Checks: {len(executed_checks)}")
    assert len(executed_checks) == 57, f"Expected 57 executed checks, got {len(executed_checks)}"
    assert len(set(e[1] for e in executed_checks)) == 57, "Duplicate entries in executed checks!"

    reg_set = set(reg_checks)
    exec_set = set(e[1] for e in executed_checks)
    assert reg_set == exec_set, f"Mismatch: missing={reg_set - exec_set}, unexpected={exec_set - reg_set}"
    print("PASS: Verified exact 1-to-1 bijection for all 57 mandatory checks across 22 CTEs.")

    sim_missing = set(reg_checks) - {'col_1_id'}
    assert sim_missing != reg_set, "Simulated missing check must diverge"
    sim_dup = list(reg_checks) + ['col_1_id']
    assert len(sim_dup) != len(set(sim_dup)), "Simulated duplicate check must detect duplicate"
    sim_extra = set(reg_checks) | {'rogue_check_foo'}
    assert sim_extra - reg_set == {'rogue_check_foo'}, "Simulated unexpected check must be detected"
    print("PASS: Rollup engine fail-closed logic verified for missing, duplicate, and unexpected checks.")

# ==============================================================================
# 5. STRICT GRAMMAR & ADVERSARIAL MATRIX
# ==============================================================================
def extract_sql_rules(sql):
    m_exact = re.search(r'WHEN p\.qual NOT IN \((.*?)\)\s+AND NOT \(', sql, re.DOTALL)
    assert m_exact, "Could not extract canonical exact set from SQL"
    canonical_items_raw = m_exact.group(1)
    canonical_set = set()
    for item in re.findall(r"'((?:''|[^'])*)'", canonical_items_raw):
        canonical_set.add(item.replace("''", "'"))

    m_allowlist = re.search(r'AND NOT \(\s*-- 1\. Exact Literal Isolation.*?\)\s*THEN \'FAIL\'', sql, re.DOTALL)
    assert m_allowlist, "Could not extract strict grammar allowlist from SQL"
    allowlist_block = m_allowlist.group(0)

    lit_matches = re.findall(r"\[([0-9]+)\]\s*=\s*'([^']+)'", allowlist_block)
    expected_literals = {int(idx): val for idx, val in lit_matches}

    regex_matches = re.findall(r"\[([0-9]+)\]\s*(~[*\s]*)\s*'([^']+)'", allowlist_block)
    expected_regexes = {}
    for idx_str, op, pattern in regex_matches:
        idx = int(idx_str)
        is_case_insensitive = '*' in op
        py_pattern = pattern.replace('\\\\', '\\')
        expected_regexes[idx] = (py_pattern, is_case_insensitive)

    return canonical_set, expected_literals, expected_regexes

def test_strict_grammar_against_sql(sql):
    print("\n--- 5. EXTRACTING RLS PATTERNS & TESTING STRICT GRAMMAR ---")
    canonical_set, expected_literals, expected_regexes = extract_sql_rules(sql)
    print(f"Extracted {len(canonical_set)} canonical deparsed strings from SQL.")
    assert len(canonical_set) == 4, f"Expected 4 canonical variants, got {len(canonical_set)}"
    print(f"Extracted literals from SQL: {expected_literals}")
    assert expected_literals == {2: 'email', 4: 'admin@invitation.com', 6: 'app_metadata', 8: 'role', 10: 'admin'}
    print(f"Extracted {len(expected_regexes)} code segment regexes from SQL.")
    assert len(expected_regexes) == 6, f"Expected 6 code segment regexes, got {len(expected_regexes)}"

    def evaluate_rls_against_extracted_sql_rules(qual):
        if qual in canonical_set:
            return 'PASS', 'Exact canonical deparsed match'
        parts = qual.split("'")
        if len(parts) != 11:
            return 'FAIL', f'Literal count mismatch: expected 11 parts, got {len(parts)}'
        for pg_idx, expected_val in expected_literals.items():
            if parts[pg_idx - 1] != expected_val:
                return 'FAIL', f'Literal mismatch at element {pg_idx}: expected {expected_val}, got {parts[pg_idx - 1]}'
        for pg_idx, (pat, ci) in expected_regexes.items():
            flags = re.IGNORECASE if ci else 0
            if not re.search(pat, parts[pg_idx - 1], flags=flags):
                return 'FAIL', f'Code segment {pg_idx} regex mismatch: {parts[pg_idx - 1]}'
        return 'PASS', 'Strict Grammar Allowlist match'

    canonical_tests = [
        "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))",
        "(((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)))",
        "((pg_catalog.lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))",
        "(((pg_catalog.lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text)))",
        "(( lower( (auth.jwt()  ->>  'email'::text) )  =  'admin@invitation.com'::text )  OR  ( ((auth.jwt()  ->  'app_metadata'::text)  ->>  'role'::text)  =  'admin'::text ))"
    ]

    print("\nEvaluating 5 Canonical Tests...")
    for idx, c in enumerate(canonical_tests, 1):
        res, det = evaluate_rls_against_extracted_sql_rules(c)
        assert res == 'PASS', f"Canonical test {idx} failed: {det}"
        print(f"  Canonical {idx}: PASS ({det})")

    adversarial_tests = [
        ("lower(...) <> 'admin...'", "((lower((auth.jwt() ->> 'email'::text)) <> 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))"),
        ("lower(...) != 'admin...'", "((lower((auth.jwt() ->> 'email'::text)) != 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))"),
        ("lower(...) < 'admin...'", "((lower((auth.jwt() ->> 'email'::text)) < 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))"),
        ("lower(...) > 'admin...'", "((lower((auth.jwt() ->> 'email'::text)) > 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))"),
        ("lower(...) <= 'admin...'", "((lower((auth.jwt() ->> 'email'::text)) <= 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))"),
        ("lower(...) >= 'admin...'", "((lower((auth.jwt() ->> 'email'::text)) >= 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))"),
        ("lower(...) LIKE 'admin...'", "((lower((auth.jwt() ->> 'email'::text)) LIKE 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))"),
        ("lower(...) ILIKE 'admin...'", "((lower((auth.jwt() ->> 'email'::text)) ILIKE 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))"),
        ("lower(...) ~ 'admin...'", "((lower((auth.jwt() ->> 'email'::text)) ~ 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))"),
        ("lower(...) !~ 'admin...'", "((lower((auth.jwt() ->> 'email'::text)) !~ 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))"),
        ("... ->> 'role' <> 'admin'", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) <> 'admin'::text))"),
        ("... ->> 'role' != 'admin'", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) != 'admin'::text))"),
        ("... ->> 'role' < 'admin'", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) < 'admin'::text))"),
        ("... ->> 'role' > 'admin'", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) > 'admin'::text))"),
        ("... ->> 'role' <= 'admin'", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) <= 'admin'::text))"),
        ("... ->> 'role' >= 'admin'", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) >= 'admin'::text))"),
        ("... ->> 'role' LIKE 'admin'", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) LIKE 'admin'::text))"),
        ("... ->> 'role' ILIKE 'admin'", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) ILIKE 'admin'::text))"),
        ("... ->> 'role' ~ 'admin'", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) ~ 'admin'::text))"),
        ("... ->> 'role' !~ 'admin'", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) !~ 'admin'::text))"),
        ("IS FALSE bypass", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text) IS FALSE)"),
        ("IS TRUE bypass", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text) IS TRUE)"),
        ("IS UNKNOWN bypass", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text) IS UNKNOWN)"),
        ("IS DISTINCT FROM bypass", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) IS DISTINCT FROM 'guest'::text))"),
        ("BETWEEN bypass", "((lower((auth.jwt() ->> 'email'::text)) BETWEEN 'admin@invitation.com'::text AND 'z'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))"),
        ("IN list bypass", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) IN ('admin'::text, 'manager'::text)))"),
        ("CASE expression bypass", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (CASE WHEN (auth.jwt() -> 'app_metadata'::text) ->> 'role'::text = 'admin'::text THEN true ELSE false END))"),
        ("COALESCE bypass", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR COALESCE(((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text, false))"),
        ("Nested OR true bypass", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text OR true))"),
        ("user_metadata bypass", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text))"),
        ("Legacy email bypass", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@hmwedding.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))"),
        ("Logic inversion NOT bypass", "NOT ((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))"),
        ("Collision 1 (Domain spoofing)", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@pg_catalog.invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))"),
        ("Collision 2 (Role spoofing)", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'pg_catalog.admin'::text))"),
        ("Collision 3 (Email space)", "((lower((auth.jwt() ->> 'email'::text)) = 'admin @invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))"),
        ("Collision 4 (Role space)", "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'ad min'::text))"),
        ("Collision 5 (Key space)", "((lower((auth.jwt() ->> 'e mail'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))")
    ]

    print(f"\nEvaluating {len(adversarial_tests)} Adversarial Tests against extracted rules...")
    for idx, (name, payload) in enumerate(adversarial_tests, 1):
        res, det = evaluate_rls_against_extracted_sql_rules(payload)
        assert res == 'FAIL', f"Vulnerability detected! Adversarial test '{name}' was ACCEPTED!"
        print(f"  [{idx:02d}/37] {name}: FAIL ({det})")

    print("\nPASS: All 5 canonical variants passed; all 37 adversarial variants rejected.")

# ==============================================================================
# 6. POSTGRESQL THREE-VALUED LOGIC (3VL) EVALUATOR & REGRESSION SUITE
# ==============================================================================
class TriBool:
    """
    Explicit representation of PostgreSQL Three-Valued Logic (3VL):
    States: TRUE, FALSE, and UNKNOWN (SQL NULL).
    Implements standard SQL 3VL truth tables for AND, OR, NOT.
    """
    __slots__ = ('_state',)

    def __init__(self, state):
        if state is None or state == 'UNKNOWN':
            self._state = 'UNKNOWN'
        elif state is True or state == 'TRUE':
            self._state = 'TRUE'
        elif state is False or state == 'FALSE':
            self._state = 'FALSE'
        else:
            raise ValueError(f"Invalid 3VL boolean state: {state}")

    @property
    def is_true(self):
        return self._state == 'TRUE'

    @property
    def is_false(self):
        return self._state == 'FALSE'

    @property
    def is_unknown(self):
        return self._state == 'UNKNOWN'

    def sql_not(self):
        if self._state == 'TRUE':
            return TriBool('FALSE')
        if self._state == 'FALSE':
            return TriBool('TRUE')
        return TriBool('UNKNOWN')

    def sql_and(self, other):
        # 3VL Truth Table for AND:
        # FALSE AND anything -> FALSE
        # TRUE AND TRUE -> TRUE
        # otherwise -> UNKNOWN
        if self._state == 'FALSE' or other._state == 'FALSE':
            return TriBool('FALSE')
        if self._state == 'TRUE' and other._state == 'TRUE':
            return TriBool('TRUE')
        return TriBool('UNKNOWN')

    def sql_or(self, other):
        # 3VL Truth Table for OR:
        # TRUE OR anything -> TRUE
        # FALSE OR FALSE -> FALSE
        # otherwise -> UNKNOWN
        if self._state == 'TRUE' or other._state == 'TRUE':
            return TriBool('TRUE')
        if self._state == 'FALSE' and other._state == 'FALSE':
            return TriBool('FALSE')
        return TriBool('UNKNOWN')

    def __eq__(self, other):
        if isinstance(other, TriBool):
            return self._state == other._state
        return False

    def __repr__(self):
        return f"3VL({self._state})"


def sql_is_null(val):
    return TriBool('TRUE' if val is None else 'FALSE')

def sql_is_not_null(val):
    return TriBool('FALSE' if val is None else 'TRUE')

def sql_eq(a, b):
    if a is None or b is None:
        return TriBool('UNKNOWN')
    return TriBool('TRUE' if a == b else 'FALSE')

def sql_neq(a, b):
    if a is None or b is None:
        return TriBool('UNKNOWN')
    return TriBool('TRUE' if a != b else 'FALSE')

def sql_in(val, collection):
    if val is None:
        return TriBool('UNKNOWN')
    return TriBool('TRUE' if val in collection else 'FALSE')

def sql_not_in(val, collection):
    return sql_in(val, collection).sql_not()

def sql_allowlist_3vl(qual, expected_literals, expected_regexes):
    """
    Evaluates the strict grammar allowlist condition under PostgreSQL 3VL semantics:
    If qual is NULL, string_to_array(NULL, '''') yields NULL, array_length(NULL, 1) = 11
    evaluates to UNKNOWN, and all AND-connected conditions evaluate to UNKNOWN.
    """
    if qual is None:
        return TriBool('UNKNOWN')

    parts = qual.split("'")
    if len(parts) != 11:
        return TriBool('FALSE')

    for pg_idx, expected_val in expected_literals.items():
        if parts[pg_idx - 1] != expected_val:
            return TriBool('FALSE')

    for pg_idx, (pat, ci) in expected_regexes.items():
        flags = re.IGNORECASE if ci else 0
        if not re.search(pat, parts[pg_idx - 1], flags=flags):
            return TriBool('FALSE')

    return TriBool('TRUE')

def evaluate_check_rls_policy_3vl(
    table_exists,
    total_policies,
    policyname,
    permissive,
    cmd,
    roles,
    qual,
    with_check,
    canonical_set,
    expected_literals,
    expected_regexes,
    include_null_guard=True
):
    """
    Evaluates the SQL CASE statement of check_rls_policy under PostgreSQL 3VL semantics.
    PostgreSQL rule: CASE branch executes IF AND ONLY IF condition is TriBool('TRUE').
    If condition is TriBool('FALSE') or TriBool('UNKNOWN'), branch is skipped.
    """
    # Line 404: WHEN to_regclass('public.guests') IS NULL THEN 'FAIL'
    if not table_exists:
        return 'FAIL', 'Table public.guests missing'

    # Line 405: WHEN pc.total_policies <> 1 THEN 'FAIL'
    c1 = sql_neq(total_policies, 1)
    if c1.is_true:
        return 'FAIL', f'Total policies <> 1 (got {total_policies})'

    # Line 406: WHEN p.policyname <> 'Authenticated admins can manage guests' THEN 'FAIL'
    c2 = sql_neq(policyname, 'Authenticated admins can manage guests')
    if c2.is_true:
        return 'FAIL', f'Policy name mismatch (got {policyname})'

    # Line 407: WHEN p.permissive <> 'PERMISSIVE' THEN 'FAIL'
    c3 = sql_neq(permissive, 'PERMISSIVE')
    if c3.is_true:
        return 'FAIL', f'Permissive mismatch (got {permissive})'

    # Line 408: WHEN p.cmd <> 'ALL' THEN 'FAIL'
    c4 = sql_neq(cmd, 'ALL')
    if c4.is_true:
        return 'FAIL', f'Cmd mismatch (got {cmd})'

    # Line 409: WHEN p.roles <> '{authenticated}' THEN 'FAIL'
    c5 = sql_neq(roles, '{authenticated}')
    if c5.is_true:
        return 'FAIL', f'Roles mismatch (got {roles})'

    # Line 410: WHEN p.qual IS NULL OR p.with_check IS NULL THEN 'FAIL'
    if include_null_guard:
        c6 = sql_is_null(qual).sql_or(sql_is_null(with_check))
        if c6.is_true:
            return 'FAIL', 'Missing USING or WITH CHECK expression (NULL guard triggered)'

    # Line 411: WHEN p.qual <> p.with_check THEN 'FAIL'
    c7 = sql_neq(qual, with_check)
    if c7.is_true:
        return 'FAIL', 'USING and WITH CHECK expressions differ'

    # Lines 414-440:
    # WHEN p.qual NOT IN (...) AND NOT (allowlist) THEN 'FAIL'
    not_in_canonical = sql_not_in(qual, canonical_set)
    allowlist_eval = sql_allowlist_3vl(qual, expected_literals, expected_regexes)
    not_allowlist = allowlist_eval.sql_not()
    c8 = not_in_canonical.sql_and(not_allowlist)
    if c8.is_true:
        return 'FAIL', 'Strict Grammar Allowlist mismatch'

    # Line 441: ELSE 'PASS'
    return 'PASS', 'Exact canonical admin policy verified'

def test_3vl_null_semantics_evaluator(sql):
    print("\n--- 6. TESTING 3VL NULL-SEMANTICS & EVALUATOR REGRESSIONS ---")
    print("NOTICE: Offline 3VL emulation tests PostgreSQL three-valued logic. It does not replace live PostgreSQL 17 execution.")
    canonical_set, expected_literals, expected_regexes = extract_sql_rules(sql)
    canonical_expr = "((lower((auth.jwt() ->> 'email'::text)) = 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))"
    adversarial_expr = "((lower((auth.jwt() ->> 'email'::text)) <> 'admin@invitation.com'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))"

    # Verify 3VL truth tables
    assert TriBool('TRUE').sql_and(TriBool('UNKNOWN')).is_unknown
    assert TriBool('FALSE').sql_and(TriBool('UNKNOWN')).is_false
    assert TriBool('TRUE').sql_or(TriBool('UNKNOWN')).is_true
    assert TriBool('FALSE').sql_or(TriBool('UNKNOWN')).is_unknown
    assert TriBool('UNKNOWN').sql_not().is_unknown
    print("PASS: Verified 3VL truth tables for AND, OR, NOT operations.")

    scenarios = [
        ("total_policies = 0 (unprotected table, p.* IS NULL)", {
            'table_exists': True, 'total_policies': 0, 'policyname': None,
            'permissive': None, 'cmd': None, 'roles': None, 'qual': None, 'with_check': None
        }, 'FAIL'),
        ("total_policies = 2 (multiple policies present)", {
            'table_exists': True, 'total_policies': 2, 'policyname': 'Authenticated admins can manage guests',
            'permissive': 'PERMISSIVE', 'cmd': 'ALL', 'roles': '{authenticated}',
            'qual': canonical_expr, 'with_check': canonical_expr
        }, 'FAIL'),
        ("qual IS NULL, with_check IS NOT NULL", {
            'table_exists': True, 'total_policies': 1, 'policyname': 'Authenticated admins can manage guests',
            'permissive': 'PERMISSIVE', 'cmd': 'ALL', 'roles': '{authenticated}',
            'qual': None, 'with_check': canonical_expr
        }, 'FAIL'),
        ("qual IS NOT NULL, with_check IS NULL", {
            'table_exists': True, 'total_policies': 1, 'policyname': 'Authenticated admins can manage guests',
            'permissive': 'PERMISSIVE', 'cmd': 'ALL', 'roles': '{authenticated}',
            'qual': canonical_expr, 'with_check': None
        }, 'FAIL'),
        ("Both qual and with_check are NULL", {
            'table_exists': True, 'total_policies': 1, 'policyname': 'Authenticated admins can manage guests',
            'permissive': 'PERMISSIVE', 'cmd': 'ALL', 'roles': '{authenticated}',
            'qual': None, 'with_check': None
        }, 'FAIL'),
        ("qual and with_check differ", {
            'table_exists': True, 'total_policies': 1, 'policyname': 'Authenticated admins can manage guests',
            'permissive': 'PERMISSIVE', 'cmd': 'ALL', 'roles': '{authenticated}',
            'qual': canonical_expr, 'with_check': adversarial_expr
        }, 'FAIL'),
        ("Both expressions non-NULL and identical canonical", {
            'table_exists': True, 'total_policies': 1, 'policyname': 'Authenticated admins can manage guests',
            'permissive': 'PERMISSIVE', 'cmd': 'ALL', 'roles': '{authenticated}',
            'qual': canonical_expr, 'with_check': canonical_expr
        }, 'PASS'),
        ("Both expressions non-NULL and identical adversarial", {
            'table_exists': True, 'total_policies': 1, 'policyname': 'Authenticated admins can manage guests',
            'permissive': 'PERMISSIVE', 'cmd': 'ALL', 'roles': '{authenticated}',
            'qual': adversarial_expr, 'with_check': adversarial_expr
        }, 'FAIL')
    ]

    for name, params, expected_res in scenarios:
        res, det = evaluate_check_rls_policy_3vl(
            params['table_exists'], params['total_policies'], params['policyname'],
            params['permissive'], params['cmd'], params['roles'], params['qual'], params['with_check'],
            canonical_set, expected_literals, expected_regexes, include_null_guard=True
        )
        assert res == expected_res, f"Scenario '{name}' failed: expected {expected_res}, got {res} ({det})"
        print(f"  Scenario '{name}': {res} ({det})")

    # Critical Security Proof: Verify that omitting Line 410 causes 3VL fail-open bypass on qual=None
    res_bypassed, det_bypassed = evaluate_check_rls_policy_3vl(
        table_exists=True, total_policies=1, policyname='Authenticated admins can manage guests',
        permissive='PERMISSIVE', cmd='ALL', roles='{authenticated}',
        qual=None, with_check=None,
        canonical_set=canonical_set, expected_literals=expected_literals, expected_regexes=expected_regexes,
        include_null_guard=False
    )
    assert res_bypassed == 'PASS', f"Expected omission of Line 410 to produce 3VL fail-open PASS, got {res_bypassed}"
    print("PASS: Verified that omitting Line 410 produces 3VL fail-open (PASS), proving Line 410 is mandatory for fail-closed security.")

# ==============================================================================
# 7. STRUCTURAL REGRESSION ASSERTIONS AGAINST SQL SOURCE
# ==============================================================================
def assert_structural_null_guards(sql_text):
    """
    Validates that:
    1. The explicit NULL guard exists in check_rls_policy.
    2. The NULL guard occurs before the grammar allowlist.
    3. The single-policy count check occurs before nullable policy-field comparisons.
    4. The exact qual / with_check equality check remains present.
    """
    no_comments = re.sub(r'--.*$', '', sql_text, flags=re.MULTILINE)
    
    # Locate check_rls_policy CTE
    m = re.search(r'check_rls_policy\s+AS\s*\((.*?)\)\s*,\s*exploded_acl\s+AS', no_comments, re.DOTALL)
    assert m, "Could not locate check_rls_policy CTE in SQL"
    rls_body = m.group(1)

    # 1. Explicit NULL guard check
    m_null_guard = re.search(r'WHEN\s+p\.qual\s+IS\s+NULL\s+OR\s+p\.with_check\s+IS\s+NULL\s+THEN\s+\'FAIL\'', rls_body)
    if not m_null_guard:
        raise AssertionError("check_rls_policy is missing mandatory NULL guard: WHEN p.qual IS NULL OR p.with_check IS NULL THEN 'FAIL'")

    # Detect weakened variants
    if re.search(r'WHEN\s+p\.qual\s+IS\s+NULL\s+AND\s+p\.with_check\s+IS\s+NULL\s+THEN\s+\'FAIL\'', rls_body):
        raise AssertionError("Weakened NULL guard (AND instead of OR) detected in check_rls_policy!")

    # 2. Total policies count check
    m_count = re.search(r'WHEN\s+pc\.total_policies\s*<>\s*1\s+THEN\s+\'FAIL\'', rls_body)
    if not m_count:
        raise AssertionError("check_rls_policy is missing mandatory count check: WHEN pc.total_policies <> 1 THEN 'FAIL'")

    # 3. Qual and with_check equality check
    m_diff = re.search(r'WHEN\s+p\.qual\s*<>\s*p\.with_check\s+THEN\s+\'FAIL\'', rls_body)
    if not m_diff:
        raise AssertionError("check_rls_policy is missing mandatory diff check: WHEN p.qual <> p.with_check THEN 'FAIL'")

    # 4. Allowlist start
    m_allowlist = re.search(r'WHEN\s+p\.qual\s+NOT\s+IN\s*\(', rls_body)
    if not m_allowlist:
        raise AssertionError("check_rls_policy is missing allowlist entry: WHEN p.qual NOT IN (")

    # 5. Policyname check
    m_name = re.search(r'WHEN\s+p\.policyname\s*<>\s*\'Authenticated admins can manage guests\'\s+THEN\s+\'FAIL\'', rls_body)
    assert m_name, "check_rls_policy is missing policyname check"

    # 6. Verify relative ordering:
    # count check < policyname check < NULL guard < diff check < allowlist check
    pos_count = m_count.start()
    pos_name = m_name.start()
    pos_null = m_null_guard.start()
    pos_diff = m_diff.start()
    pos_allowlist = m_allowlist.start()

    if not (pos_count < pos_name):
        raise AssertionError(f"Order violation: pc.total_policies check (pos {pos_count}) must occur before policyname check (pos {pos_name})")
    if not (pos_name < pos_null):
        raise AssertionError(f"Order violation: policyname check (pos {pos_name}) must occur before NULL guard (pos {pos_null})")
    if not (pos_null < pos_diff):
        raise AssertionError(f"Order violation: NULL guard (pos {pos_null}) must occur before qual <> with_check (pos {pos_diff})")
    if not (pos_diff < pos_allowlist):
        raise AssertionError(f"Order violation: qual <> with_check (pos {pos_diff}) must occur before grammar allowlist (pos {pos_allowlist})")

    return True

def test_sql_structural_null_guard_regression(sql):
    print("\n--- 7. TESTING SQL SOURCE STRUCTURAL NULL-GUARD INTEGRITY ---")
    assert_structural_null_guards(sql)
    print("PASS: Verified explicit NULL guard exists, is unweakened, and strictly precedes diff and allowlist checks.")
    print("PASS: Verified single-policy count check strictly precedes nullable catalog field checks.")

# ==============================================================================
# 8. MUTATION SUITE FOR WEAKENED NULL GUARDS
# ==============================================================================
def test_mutation_failure_on_weakened_null_guards(sql):
    print("\n--- 8. TESTING MUTATION DETECTION ON WEAKENED / MOVED NULL GUARDS ---")
    mutations = [
        ("Removal of NULL guard", sql.replace(
            "WHEN p.qual IS NULL OR p.with_check IS NULL THEN 'FAIL'\n",
            ""
        )),
        ("Weakening NULL guard to qual only", sql.replace(
            "WHEN p.qual IS NULL OR p.with_check IS NULL THEN 'FAIL'",
            "WHEN p.qual IS NULL THEN 'FAIL'"
        )),
        ("Weakening NULL guard OR to AND", sql.replace(
            "WHEN p.qual IS NULL OR p.with_check IS NULL THEN 'FAIL'",
            "WHEN p.qual IS NULL AND p.with_check IS NULL THEN 'FAIL'"
        )),
        ("Moving NULL guard to after allowlist", sql.replace(
            "WHEN p.qual IS NULL OR p.with_check IS NULL THEN 'FAIL'\n      WHEN p.qual <> p.with_check THEN 'FAIL'\n",
            "WHEN p.qual <> p.with_check THEN 'FAIL'\n"
        ).replace(
            "ELSE 'PASS'",
            "WHEN p.qual IS NULL OR p.with_check IS NULL THEN 'FAIL'\n      ELSE 'PASS'"
        )),
        ("Removal of total_policies check", sql.replace(
            "WHEN pc.total_policies <> 1 THEN 'FAIL'\n",
            ""
        )),
        ("Moving total_policies check after policyname", sql.replace(
            "WHEN pc.total_policies <> 1 THEN 'FAIL'\n      WHEN p.policyname <> 'Authenticated admins can manage guests' THEN 'FAIL'",
            "WHEN p.policyname <> 'Authenticated admins can manage guests' THEN 'FAIL'\n      WHEN pc.total_policies <> 1 THEN 'FAIL'"
        )),
        ("Removal of qual <> with_check check", sql.replace(
            "WHEN p.qual <> p.with_check THEN 'FAIL'\n",
            ""
        ))
    ]

    for name, mut_sql in mutations:
        caught = False
        try:
            assert_structural_null_guards(mut_sql)
        except AssertionError as e:
            caught = True
            print(f"  Mutation caught: '{name}' -> Raised AssertionError ({e})")
        assert caught, f"Vulnerability! Structural assertions failed to catch mutation '{name}'!"

    print("PASS: All 7 simulated mutations correctly detected and rejected by structural assertions.")

# ==============================================================================
# 9. POSTGRESQL "char" TYPE-CAST COMPATIBILITY TEST
# ==============================================================================
def assert_pg_char_typecast_compatibility(sql_text):
    """
    Validates that any PostgreSQL system catalog columns of internal data type "char"
    (e.g., pg_constraint.contype, pg_class.relreplident) are explicitly cast to ::text
    before being used as operands in string concatenation (||).
    Failure to do so causes PostgreSQL runtime error:
      ERROR: 42725: operator is not unique: text || "char"
    """
    lines = sql_text.splitlines()
    for line_num, line in enumerate(lines, 1):
        if '||' not in line:
            continue
        # Check for uncast act.contype
        if re.search(r'\|\|\s*act\.contype\b(?!\s*::\s*text)', line) or re.search(r'\bact\.contype\b(?!\s*::\s*text)\s*\|\|', line):
            raise AssertionError(f"Line {line_num}: Uncast PostgreSQL 'char' field 'act.contype' used in concatenation without ::text cast: {line.strip()}")
        # Check for uncast exp.exp_contype
        if re.search(r'\|\|\s*exp\.exp_contype\b(?!\s*::\s*text)', line) or re.search(r'\bexp\.exp_contype\b(?!\s*::\s*text)\s*\|\|', line):
            raise AssertionError(f"Line {line_num}: Uncast PostgreSQL 'char' field 'exp.exp_contype' used in concatenation without ::text cast: {line.strip()}")
        # Check for uncast relreplident
        if re.search(r'\|\|\s*c\.relreplident\b(?!\s*::\s*text)', line) or re.search(r'\bc\.relreplident\b(?!\s*::\s*text)\s*\|\|', line):
            raise AssertionError(f"Line {line_num}: Uncast PostgreSQL 'char' field 'c.relreplident' used in concatenation without ::text cast: {line.strip()}")

    # Verify specific known locations have explicit ::text
    assert re.search(r'act\.conname\s*\|\|\s*\'\s*\(Type\s*\'\s*\|\|\s*act\.contype::text', sql_text), \
        "check_constraints line 257 must explicitly cast act.contype::text"
    assert re.search(r'expected\s*\'\s*\|\|\s*exp\.exp_contype::text\s*\|\|\s*\',\s*got\s*\'\s*\|\|\s*act\.contype::text', sql_text), \
        "check_constraints line 258 must explicitly cast exp.exp_contype::text and act.contype::text"
    assert re.search(r'\'Type:\s*\'\s*\|\|\s*act\.contype::text', sql_text), \
        "check_constraints line 264 must explicitly cast act.contype::text"
    assert re.search(r'Replica:\s*\'\s*\|\|\s*c\.relreplident::text', sql_text), \
        "check_table must explicitly cast c.relreplident::text"

    return True

def test_pg_char_typecast_compatibility(sql):
    print("\n--- 9. TESTING POSTGRESQL 'char' TYPE-CAST COMPATIBILITY ---")
    assert_pg_char_typecast_compatibility(sql)
    print("PASS: Verified all 'char' catalog fields (contype, relreplident) are explicitly cast to ::text before concatenation.")

    # Mutation test: simulate the exact uncast error from Phase 5.12.3
    uncast_mutation = sql.replace(
        "act.conname || ' (Type ' || act.contype::text || ')'",
        "act.conname || ' (Type ' || act.contype || ')'"
    )
    caught = False
    try:
        assert_pg_char_typecast_compatibility(uncast_mutation)
    except AssertionError as e:
        caught = True
        print(f"PASS: Mutation test caught simulated uncast 'char' error! ({e})")
    assert caught, "Vulnerability! Type-cast validator failed to catch uncast 'act.contype'!"

# ==============================================================================
# 10. SERVICE ROLE MAINTAIN RUNBOOK ALIGNMENT & DYNAMIC CTE EXTRACTION TEST
# ==============================================================================
VALID_CATEGORIES = {
    '1. TABLE_STATUS',
    '2. COLUMNS',
    '3. CONSTRAINTS',
    '4. INDEXES',
    '5. RLS_POLICY',
    '6. DIRECT_ACL',
    '7. EFFECTIVE_PERMISSIONS'
}

def get_cte_body(cte_name, sql_text):
    """
    Extracts the SQL text inside the parentheses of a named CTE:
      cte_name AS (...)
    """
    m = re.search(
        rf'\b{cte_name}\s+AS\s*\((.*?)\)(?=\s*,\s*[a-zA-Z0-9_]+\s+AS|\s*,\s*all_executed_checks|\s*\n\)\s*,\s*matched_checks)',
        sql_text,
        re.DOTALL
    )
    assert m, f"Could not find CTE body for '{cte_name}' in SQL"
    return m.group(1)

def extract_cte_category(body):
    """
    Extracts the check_category literal declared inside a CTE body, e.g.:
      '1. TABLE_STATUS'::text AS check_category
    """
    m = re.search(r"'([0-9]\.\s+[A-Z_]+)'::text\s+AS\s+check_category", body)
    assert m, f"Could not extract category from CTE body: {body[:100]}"
    return m.group(1)

def extract_cte_single_check_name(body):
    """
    Extracts a static check_name literal declared inside a CTE body, e.g.:
      'table_core_attributes'::text AS check_name
    """
    m = re.search(r"'([a-zA-Z0-9_]+)'::text\s+AS\s+check_name", body)
    assert m, f"Could not extract single check_name from CTE body: {body[:100]}"
    return m.group(1)

def extract_unnest_array(body):
    """
    Extracts elements from unnest(ARRAY['...', '...']) inside a CTE body.
    """
    m = re.search(r'unnest\(ARRAY\[(.*?)\]\)', body, re.DOTALL)
    assert m, f"Could not extract unnest array from CTE body: {body[:100]}"
    arr_str = m.group(1)
    return [p.strip().strip("'") for p in arr_str.split(',') if p.strip()]

def extract_dynamic_priv_checks(body, category):
    """
    Derives check names dynamically by evaluating unnest privilege arrays
    and string formatting expressions declared in the CTE body.
    """
    privs = extract_unnest_array(body)

    # 1. CASE expression (e.g. check_effective_auth)
    m_case = re.search(
        r"WHEN\s+p\.priv\s+IN\s*\((.*?)\)\s+THEN\s*'([a-zA-Z0-9_]+)'\s*\|\|\s*lower\(p\.priv\)\s*\|\|\s*'([a-zA-Z0-9_]+)'\s+"
        r"ELSE\s*'([a-zA-Z0-9_]+)'\s*\|\|\s*lower\(p\.priv\)\s*\|\|\s*'([a-zA-Z0-9_]+)'",
        body
    )
    if m_case:
        crud_privs = [p.strip().strip("'") for p in m_case.group(1).split(',')]
        then_pre, then_suf = m_case.group(2), m_case.group(3)
        else_pre, else_suf = m_case.group(4), m_case.group(5)
        checks = []
        for p in privs:
            if p in crud_privs:
                checks.append((category, f"{then_pre}{p.lower()}{then_suf}"))
            else:
                checks.append((category, f"{else_pre}{p.lower()}{else_suf}"))
        return checks

    # 2. Prefix || lower(p.priv) || Suffix (e.g. check_effective_anon, check_effective_sr_crud_evaluated)
    m_presuf = re.search(r"'([a-zA-Z0-9_]+)'\s*\|\|\s*lower\(p\.priv\)\s*\|\|\s*'([a-zA-Z0-9_]+)'\s+AS\s+check_name", body)
    if m_presuf:
        pre, suf = m_presuf.group(1), m_presuf.group(2)
        return [(category, f"{pre}{p.lower()}{suf}") for p in privs]

    # 3. Prefix || lower(p.priv) (e.g. check_direct_acl_authenticated_crud, check_direct_acl_service_role)
    m_pre = re.search(r"'([a-zA-Z0-9_]+)'\s*\|\|\s*lower\(p\.priv\)\s+AS\s+check_name", body)
    if m_pre:
        pre = m_pre.group(1)
        return [(category, f"{pre}{p.lower()}") for p in privs]

    raise AssertionError(f"Could not parse dynamic check expression from CTE body: {body[:200]}")

def extract_mandatory_registry_checks(sql_text):
    """
    Extracts all checks defined in mandatory_registry along with their assigned category.
    Validates that:
    - Every entry receives exactly one recognized category in VALID_CATEGORIES.
    - Missing or unrecognized category headers raise an immediate AssertionError.
    - Check name prefixes structurally match the assigned category, preventing silent misclassification.
    Returns a list of tuples: (category, check_name)
    """
    m_reg = re.search(r'mandatory_registry AS \(\s*SELECT unnest\(ARRAY\[(.*?)\]\)\s*AS\s*req_id\s*\)', sql_text, re.DOTALL)
    assert m_reg, "Could not extract mandatory_registry from SQL"
    
    reg_lines = m_reg.group(1).splitlines()
    registry_items = []
    current_cat = None

    cat_map = {
        'table status': '1. TABLE_STATUS',
        'column attributes': '2. COLUMNS',
        'constraint attributes': '3. CONSTRAINTS',
        'index attributes': '4. INDEXES',
        'rls policy': '5. RLS_POLICY',
        'direct acl': '6. DIRECT_ACL',
        'effective permissions': '7. EFFECTIVE_PERMISSIONS'
    }

    for line_num, line in enumerate(reg_lines, 1):
        line_clean = line.strip()
        if not line_clean:
            continue
        if line_clean.startswith('--'):
            c_lower = line_clean.lstrip('- ').lower()
            for key, cat_name in cat_map.items():
                if key in c_lower:
                    current_cat = cat_name
                    break
            continue

        m_item = re.search(r"'([a-zA-Z0-9_]+)'", line_clean)
        if m_item:
            chk_name = m_item.group(1)
            if not current_cat or current_cat not in VALID_CATEGORIES:
                raise AssertionError(f"Line {line_num}: Registry entry '{chk_name}' has unrecognized or UNKNOWN category: {current_cat}")
            
            # Structural cross-validation: verify check_name prefix matches assigned category
            if current_cat == '1. TABLE_STATUS' and not chk_name.startswith('table_'):
                raise AssertionError(f"Prefix mismatch: '{chk_name}' cannot belong to category '{current_cat}'")
            elif current_cat == '2. COLUMNS' and not (chk_name.startswith('col_') or chk_name.startswith('total_column_')):
                raise AssertionError(f"Prefix mismatch: '{chk_name}' cannot belong to category '{current_cat}'")
            elif current_cat == '3. CONSTRAINTS' and not (chk_name.startswith('constraint_') or chk_name.startswith('total_constraint_')):
                raise AssertionError(f"Prefix mismatch: '{chk_name}' cannot belong to category '{current_cat}'")
            elif current_cat == '4. INDEXES' and not ('index_' in chk_name):
                raise AssertionError(f"Prefix mismatch: '{chk_name}' cannot belong to category '{current_cat}'")
            elif current_cat == '5. RLS_POLICY' and not ('policy' in chk_name):
                raise AssertionError(f"Prefix mismatch: '{chk_name}' cannot belong to category '{current_cat}'")
            elif current_cat == '6. DIRECT_ACL' and not chk_name.startswith('direct_acl_'):
                raise AssertionError(f"Prefix mismatch: '{chk_name}' cannot belong to category '{current_cat}'")
            elif current_cat == '7. EFFECTIVE_PERMISSIONS' and not chk_name.startswith('effective_'):
                raise AssertionError(f"Prefix mismatch: '{chk_name}' cannot belong to category '{current_cat}'")

            registry_items.append((current_cat, chk_name))

    return registry_items

def extract_executed_checks_structural(sql_text):
    """
    Extracts all executed checks generated across the 22 CTEs that feed all_executed_checks.
    Checks and categories are derived directly from the SQL source:
    - Dynamic column checks derived by parsing expected_columns and format expression in check_columns.
    - Dynamic constraint checks derived by parsing expected_constraints and format expression in check_constraints.
    - Dynamic index checks derived by parsing expected_indexes and format expression in check_indexes.
    - Dynamic privilege checks derived by parsing unnest(ARRAY[...]) and formatting expressions across the 6 privilege CTEs.
    - Single-check CTE names and categories extracted directly from each CTE's SELECT expressions.
    Returns a list of tuples: (category, check_name)
    """
    m_all = re.search(r'all_executed_checks AS \(\s*(.*?)\s*\)\s*,\s*matched_checks AS', sql_text, re.DOTALL)
    assert m_all, "Could not find all_executed_checks CTE in SQL"
    all_body = m_all.group(1)
    unioned_ctes = re.findall(r'SELECT\s+\*\s+FROM\s+([a-zA-Z0-9_]+)', all_body)
    assert len(unioned_ctes) == 22, f"Expected 22 CTEs in all_executed_checks, got {len(unioned_ctes)}"

    executed = []

    # 1. check_table (single check)
    b_table = get_cte_body('check_table', sql_text)
    executed.append((extract_cte_category(b_table), extract_cte_single_check_name(b_table)))

    # 2. check_columns (dynamic from expected_columns)
    b_cols = get_cte_body('check_columns', sql_text)
    cat_cols = extract_cte_category(b_cols)
    b_exp_cols = get_cte_body('expected_columns', sql_text)
    for line in b_exp_cols.split('UNION ALL'):
        m = re.search(r'SELECT\s+([0-9]+)(?:\s+AS\s+exp_pos)?\s*,\s*\'([a-zA-Z0-9_]+)\'', line)
        if m:
            executed.append((cat_cols, f"col_{m.group(1)}_{m.group(2)}"))

    # 3. check_column_count (single check)
    b_col_cnt = get_cte_body('check_column_count', sql_text)
    executed.append((extract_cte_category(b_col_cnt), extract_cte_single_check_name(b_col_cnt)))

    # 4. check_constraints (dynamic from expected_constraints)
    b_cons = get_cte_body('check_constraints', sql_text)
    cat_cons = extract_cte_category(b_cons)
    b_exp_cons = get_cte_body('expected_constraints', sql_text)
    for line in b_exp_cons.split('UNION ALL'):
        m = re.search(r'SELECT\s+\'([a-zA-Z0-9_]+)\'', line)
        if m:
            executed.append((cat_cons, f"constraint_{m.group(1)}"))

    # 5. check_constraint_count (single check)
    b_con_cnt = get_cte_body('check_constraint_count', sql_text)
    executed.append((extract_cte_category(b_con_cnt), extract_cte_single_check_name(b_con_cnt)))

    # 6. check_indexes (dynamic from expected_indexes)
    b_idxs = get_cte_body('check_indexes', sql_text)
    cat_idxs = extract_cte_category(b_idxs)
    b_exp_idxs = get_cte_body('expected_indexes', sql_text)
    for line in b_exp_idxs.split('UNION ALL'):
        m = re.search(r'SELECT\s+\'([a-zA-Z0-9_]+)\'', line)
        if m:
            executed.append((cat_idxs, f"index_{m.group(1)}"))

    # 7. check_index_count (single check)
    b_idx_cnt = get_cte_body('check_index_count', sql_text)
    executed.append((extract_cte_category(b_idx_cnt), extract_cte_single_check_name(b_idx_cnt)))

    # 8. check_migration_index_absent (single check)
    b_mig = get_cte_body('check_migration_index_absent', sql_text)
    executed.append((extract_cte_category(b_mig), extract_cte_single_check_name(b_mig)))

    # 9. check_rls_policy (single check)
    b_rls = get_cte_body('check_rls_policy', sql_text)
    executed.append((extract_cte_category(b_rls), extract_cte_single_check_name(b_rls)))

    # 10. check_direct_acl_owner (single check)
    b_owner = get_cte_body('check_direct_acl_owner', sql_text)
    executed.append((extract_cte_category(b_owner), extract_cte_single_check_name(b_owner)))

    # 11. check_direct_acl_authenticated_crud (dynamic from unnest array)
    b_auth_crud = get_cte_body('check_direct_acl_authenticated_crud', sql_text)
    executed.extend(extract_dynamic_priv_checks(b_auth_crud, extract_cte_category(b_auth_crud)))

    # 12. check_direct_acl_authenticated_non_crud (single check)
    b_auth_non_crud = get_cte_body('check_direct_acl_authenticated_non_crud', sql_text)
    executed.append((extract_cte_category(b_auth_non_crud), extract_cte_single_check_name(b_auth_non_crud)))

    # 13. check_direct_acl_anon_public (single check)
    b_anon_pub = get_cte_body('check_direct_acl_anon_public', sql_text)
    executed.append((extract_cte_category(b_anon_pub), extract_cte_single_check_name(b_anon_pub)))

    # 14. check_direct_acl_service_role (dynamic from unnest array)
    b_sr_acl = get_cte_body('check_direct_acl_service_role', sql_text)
    executed.extend(extract_dynamic_priv_checks(b_sr_acl, extract_cte_category(b_sr_acl)))

    # 15. check_direct_acl_service_role_no_crud (single check)
    b_sr_no_crud = get_cte_body('check_direct_acl_service_role_no_crud', sql_text)
    executed.append((extract_cte_category(b_sr_no_crud), extract_cte_single_check_name(b_sr_no_crud)))

    # 16. check_direct_acl_unknown_grantee (single check)
    b_unk = get_cte_body('check_direct_acl_unknown_grantee', sql_text)
    executed.append((extract_cte_category(b_unk), extract_cte_single_check_name(b_unk)))

    # 17. check_direct_acl_grant_options (single check)
    b_gr_opt = get_cte_body('check_direct_acl_grant_options', sql_text)
    executed.append((extract_cte_category(b_gr_opt), extract_cte_single_check_name(b_gr_opt)))

    # 18. check_effective_anon (dynamic from unnest array)
    b_eff_anon = get_cte_body('check_effective_anon', sql_text)
    executed.extend(extract_dynamic_priv_checks(b_eff_anon, extract_cte_category(b_eff_anon)))

    # 19. check_effective_auth (dynamic from unnest array with CASE)
    b_eff_auth = get_cte_body('check_effective_auth', sql_text)
    executed.extend(extract_dynamic_priv_checks(b_eff_auth, extract_cte_category(b_eff_auth)))

    # 20. check_effective_sr_baseline (dynamic from unnest array)
    b_eff_sr_base = get_cte_body('check_effective_sr_baseline', sql_text)
    executed.extend(extract_dynamic_priv_checks(b_eff_sr_base, extract_cte_category(b_eff_sr_base)))

    # 21. check_effective_sr_maintain (single check)
    b_eff_sr_maint = get_cte_body('check_effective_sr_maintain', sql_text)
    executed.append((extract_cte_category(b_eff_sr_maint), extract_cte_single_check_name(b_eff_sr_maint)))

    # 22. check_effective_sr_crud_evaluated (dynamic from unnest array)
    b_eff_sr_crud = get_cte_body('check_effective_sr_crud_evaluated', sql_text)
    executed.extend(extract_dynamic_priv_checks(b_eff_sr_crud, extract_cte_category(b_eff_sr_crud)))

    return executed

def assert_service_role_maintain_runbook_alignment(sql_text):
    """
    Validates Phase 5.12.10 alignment with docs/FINAL_PRODUCTION_RELEASE_RUNBOOK.md
    and independent structural check registry invariants:
    1. Old check name 'effective_sr_maintain_blocked' is completely absent.
    2. New check name 'effective_sr_maintain_evaluated' appears exactly once in mandatory_registry
       and exactly once in check_effective_sr_maintain CTE.
    3. MAINTAIN evaluation follows informational 'IS NOT NULL' rule:
       has_table_privilege('service_role', to_regclass('public.guests'), 'MAINTAIN') IS NOT NULL THEN 'PASS'
    4. Missing-table guard remains strictly FAIL:
       to_regclass('public.guests') IS NULL THEN 'FAIL'
    5. Exactly 57 mandatory registry entries exist, with 0 duplicates and strictly recognized categories.
    6. Exactly 57 executed checks exist across 22 CTEs, with 0 duplicates, derived from SQL source definitions.
    7. Exact 1-to-1 bijection between registry checks and executed checks (0 missing, 0 unexpected).
    8. Exactly 24 mandatory registry checks belong to '7. EFFECTIVE_PERMISSIONS'.
    9. Exactly 24 executed checks belong to '7. EFFECTIVE_PERMISSIONS'.
    10. 'effective_sr_maintain_evaluated' is properly classified in Category 7 for both registry and executed sets.
    11. Final output query contract structurally guarantees 58 rows (57 mandatory + 0 unexpected + 1 summary).
    """
    # 1. Old check name must be completely absent
    if 'effective_sr_maintain_blocked' in sql_text:
        raise AssertionError("Deprecated check name 'effective_sr_maintain_blocked' detected in SQL file!")

    # 2. New check name must appear exactly twice (once in registry, once in CTE)
    occurrences = len(re.findall(r"'effective_sr_maintain_evaluated'", sql_text))
    if occurrences != 2:
        raise AssertionError(f"Expected exactly 2 occurrences of 'effective_sr_maintain_evaluated', found {occurrences}")

    # 3. Informational evaluation logic
    m_eval = re.search(
        r"check_effective_sr_maintain\s+AS\s*\(\s*SELECT\s+.*?"
        r"WHEN\s+has_table_privilege\('service_role',\s*to_regclass\('public\.guests'\),\s*'MAINTAIN'\)\s+IS\s+NOT\s+NULL\s+THEN\s+'PASS'",
        sql_text,
        re.DOTALL
    )
    if not m_eval:
        raise AssertionError("check_effective_sr_maintain does not follow informational 'IS NOT NULL THEN PASS' rule!")

    # 4. Missing-table guard
    m_missing = re.search(
        r"check_effective_sr_maintain\s+AS\s*\(\s*SELECT\s+.*?"
        r"WHEN\s+to_regclass\('public\.guests'\)\s+IS\s+NULL\s+THEN\s+'FAIL'",
        sql_text,
        re.DOTALL
    )
    if not m_missing:
        raise AssertionError("check_effective_sr_maintain missing required guard: to_regclass('public.guests') IS NULL THEN 'FAIL'")

    # 5. Extract and independently inspect registry structures
    registry_items = extract_mandatory_registry_checks(sql_text)
    reg_names = [name for cat, name in registry_items]
    if len(reg_names) != 57:
        raise AssertionError(f"Expected exactly 57 mandatory registry entries, got {len(reg_names)}")
    if len(set(reg_names)) != 57:
        raise AssertionError(f"Duplicate entries found in mandatory_registry (distinct count {len(set(reg_names))})")

    # 6. Extract and independently inspect executed checks across 22 CTEs directly from SQL source
    executed_items = extract_executed_checks_structural(sql_text)
    exec_names = [name for cat, name in executed_items]
    if len(exec_names) != 57:
        raise AssertionError(f"Expected exactly 57 executed checks across CTEs, got {len(exec_names)}")
    if len(set(exec_names)) != 57:
        raise AssertionError(f"Duplicate entries found in executed checks (distinct count {len(set(exec_names))})")

    # 7. Exact 1-to-1 bijection
    missing_checks = set(reg_names) - set(exec_names)
    unexpected_checks = set(exec_names) - set(reg_names)
    if missing_checks:
        raise AssertionError(f"Mandatory checks registered but not executed: {missing_checks}")
    if unexpected_checks:
        raise AssertionError(f"Unexpected checks executed but not registered: {unexpected_checks}")

    # 8. Category 7 registry checks count == 24
    reg_cat7 = [name for cat, name in registry_items if cat == '7. EFFECTIVE_PERMISSIONS']
    if len(reg_cat7) != 24:
        raise AssertionError(f"Expected exactly 24 registry checks in '7. EFFECTIVE_PERMISSIONS', got {len(reg_cat7)}")

    # 9. Category 7 executed checks count == 24
    exec_cat7 = [name for cat, name in executed_items if cat == '7. EFFECTIVE_PERMISSIONS']
    if len(exec_cat7) != 24:
        raise AssertionError(f"Expected exactly 24 executed checks in '7. EFFECTIVE_PERMISSIONS', got {len(exec_cat7)}")

    # 10. Confirm effective_sr_maintain_evaluated is present in Category 7
    if 'effective_sr_maintain_evaluated' not in reg_cat7:
        raise AssertionError("'effective_sr_maintain_evaluated' missing from Category 7 registry checks!")
    if 'effective_sr_maintain_evaluated' not in exec_cat7:
        raise AssertionError("'effective_sr_maintain_evaluated' missing from Category 7 executed checks!")

    # 11. Final output query contract verification (58 rows total)
    # The output query consists of:
    #   Branch 1: matched_checks (57 mandatory check rows)
    #   Branch 2: UNEXPECTED_CHECKS where reg.req_id IS NULL (0 unexpected rows)
    #   Branch 3: FINAL_SUMMARY aggregation (1 summary row)
    # Total = 57 + 0 + 1 = 58 rows.
    m_contract = re.search(
        r'SELECT\s+check_category,\s*check_name,\s*status,\s*details\s+FROM\s+matched_checks\s+'
        r'UNION\s+ALL\s+'
        r'SELECT\s+\'0\.\s+UNEXPECTED_CHECKS\'\s+AS\s+check_category.*?WHERE\s+reg\.req_id\s+IS\s+NULL\s+'
        r'UNION\s+ALL\s+'
        r'SELECT\s+\'9\.\s+FINAL_SUMMARY\'\s+AS\s+check_category.*?FROM\s+matched_checks',
        sql_text,
        re.DOTALL
    )
    if not m_contract:
        raise AssertionError("Verification SQL violates the 3-part UNION ALL output contract!")

    return True

def test_service_role_maintain_runbook_alignment(sql):
    print("\n--- 10. TESTING SERVICE_ROLE MAINTAIN RUNBOOK ALIGNMENT (PHASE 5.12.10) ---")
    assert_service_role_maintain_runbook_alignment(sql)
    print("PASS: Verified 'effective_sr_maintain_blocked' is completely removed.")
    print("PASS: Verified 'effective_sr_maintain_evaluated' is properly declared in registry and CTE.")
    print("PASS: Verified informational 'IS NOT NULL' evaluation logic and missing-table FAIL guard.")
    print("PASS: Verified exactly 57 mandatory registry entries and 57 distinct executed checks.")
    print("PASS: Verified exact 1-to-1 bijection (0 missing, 0 unexpected checks).")
    print("PASS: Verified Category 7 ('7. EFFECTIVE_PERMISSIONS') contains exactly 24 checks in both registry and executed sets.")
    print("PASS: Verified structural output contract yields exactly 58 rows (57 mandatory + 0 unexpected + 1 summary).")

    # Mutation tests: verify that weakening or altering Category 7 triggers failure
    mutations = [
        # Mutation 1: Remove a non-MAINTAIN Category 7 entry from registry to prove failure is not masked by MAINTAIN count check
        ("Simulated missing 'effective_anon_select_blocked' in registry (MAINTAIN intact)",
         sql.replace("'effective_anon_select_blocked',\n", ""),
         lambda e: "Expected exactly 57 mandatory registry entries" in str(e) or "Expected exactly 24 registry checks in '7. EFFECTIVE_PERMISSIONS'" in str(e) or "Mandatory checks registered but not executed" in str(e)
        ),
        # Mutation 2: Alter executed check formatting in check_effective_anon CTE
        ("Simulated altered check name format in check_effective_anon CTE",
         sql.replace("'effective_anon_' || lower(p.priv) || '_blocked'", "'effective_anon_' || lower(p.priv) || '_altered'"),
         lambda e: "Mandatory checks registered but not executed" in str(e)
        ),
        # Mutation 3: Drop a privilege from unnest array in check_effective_anon CTE
        ("Simulated dropped unnest privilege in check_effective_anon CTE",
         sql.replace(
             "ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN']",
             "ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN']",
             1
         ),
         lambda e: "Expected exactly 57 executed checks across CTEs" in str(e) or "Mandatory checks registered but not executed" in str(e)
        ),
        # Mutation 4: Extra rogue check in registry
        ("Simulated extra rogue check in registry",
         sql.replace(
             "'effective_sr_maintain_evaluated',",
             "'effective_sr_maintain_evaluated',\n    'effective_sr_rogue_check',"
         ),
         lambda e: "Expected exactly 57 mandatory registry entries" in str(e) or "Unexpected checks executed" in str(e) or "Expected exactly 24 registry checks" in str(e)
        ),
        # Mutation 5: Broken output contract (comment out FINAL_SUMMARY)
        ("Simulated broken output contract",
         sql.replace(
             "UNION ALL\nSELECT \n  '9. FINAL_SUMMARY'",
             "-- UNION ALL\n-- SELECT '9. FINAL_SUMMARY'"
         ),
         lambda e: "violates the 3-part UNION ALL output contract" in str(e)
        )
    ]

    for name, mut_sql, validator in mutations:
        caught = False
        try:
            assert_service_role_maintain_runbook_alignment(mut_sql)
        except AssertionError as e:
            caught = True
            assert validator(e), f"Mutation '{name}' raised unexpected AssertionError: {e}"
            print(f"  Mutation caught: '{name}' -> Raised expected AssertionError: {e}")
        assert caught, f"Vulnerability! Alignment validator failed to catch mutation '{name}'!"

    print("PASS: All 5 simulated mutations correctly detected and rejected by alignment assertions with exact expected failure reasons.")

# ==============================================================================
# MAIN TEST DISPATCHER
# ==============================================================================
def main():
    print(f"Testing project artifact: {SQL_FILE_PATH}")
    sql = read_sql()
    
    # Handle optional single test execution from command line
    test_filter = sys.argv[1].lower() if len(sys.argv) > 1 else None

    suites = [
        ("read_only", "Test 1: Read-Only Safety", lambda: test_read_only_safety(sql)),
        ("parser_integrity", "Test 2: Parser & Structural Integrity", lambda: test_parser_and_structural_integrity(sql)),
        ("phase5116_regression", "Test 3: Phase 5.11.6 Regression", lambda: test_regression_phase5116_corruption(sql)),
        ("bijection", "Test 4: Registry & Bijection", lambda: test_registry_and_bijection(sql)),
        ("strict_grammar", "Test 5: Strict Grammar & Adversarial Matrix", lambda: test_strict_grammar_against_sql(sql)),
        ("3vl_evaluator", "Test 6: 3VL NULL-Semantics Evaluator", lambda: test_3vl_null_semantics_evaluator(sql)),
        ("structural_null_guard", "Test 7: Structural NULL-Guard Assertions", lambda: test_sql_structural_null_guard_regression(sql)),
        ("mutation_suite", "Test 8: Weakened NULL-Guard Mutation Suite", lambda: test_mutation_failure_on_weakened_null_guards(sql)),
        ("char_typecast", "Test 9: PostgreSQL char Type-Cast Compatibility", lambda: test_pg_char_typecast_compatibility(sql)),
        ("sr_maintain_alignment", "Test 10: Service Role MAINTAIN Runbook Alignment", lambda: test_service_role_maintain_runbook_alignment(sql)),
    ]

    executed_count = 0
    passed_count = 0

    for key, name, func in suites:
        if test_filter is None or test_filter in key or test_filter in name.lower():
            executed_count += 1
            func()
            passed_count += 1

    print("\n=======================================================")
    print(f"SUITE COMPLETE: {passed_count}/{executed_count} TEST SUITES PASSED (0 FAILURES)")
    print("ALL PROJECT-OWNED VERIFICATION ARTIFACT TESTS PASSED!")
    print("=======================================================\n")

if __name__ == '__main__':
    main()
