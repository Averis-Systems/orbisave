#!/usr/bin/env node
/**
 * INV1 guard: every ledger write must go through append_ledger_entry in
 * backend/apps/ledger/services.py. Direct LedgerEntry construction anywhere
 * else bypasses the stream lock, overdraft check, idempotency dedupe, and
 * hash-chain sequencing — the exact bug class behind the loan-disbursement
 * incident. Fails CI when a violation appears.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const BACKEND_APPS = join(ROOT, 'backend', 'apps');

// The only files allowed to construct LedgerEntry rows.
const ALLOWED = new Set([
  ['backend', 'apps', 'ledger', 'services.py'].join(sep),
  ['backend', 'apps', 'ledger', 'models.py'].join(sep),
]);

const VIOLATION_PATTERNS = [
  /LedgerEntry\s*\.\s*objects[\s\S]{0,80}?\.\s*(create|bulk_create|get_or_create|update_or_create)\s*\(/,
  /\bLedgerEntry\s*\(/,
];

const violations = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === '__pycache__' || name === 'migrations') continue;
      walk(full);
    } else if (name.endsWith('.py')) {
      const rel = relative(ROOT, full);
      if (ALLOWED.has(rel)) continue;
      if (rel.includes(`${sep}tests${sep}`) || name.startsWith('test_')) continue; // tests may build fixtures
      const text = readFileSync(full, 'utf8');
      for (const pattern of VIOLATION_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
          const line = text.slice(0, match.index).split('\n').length;
          violations.push(`${rel}:${line} — ${match[0].split('\n')[0].trim()}`);
          break;
        }
      }
    }
  }
}

walk(BACKEND_APPS);

if (violations.length) {
  console.error('Direct LedgerEntry writes found outside apps/ledger/services.py:\n');
  for (const v of violations) console.error(`  ${v}`);
  console.error('\nUse append_ledger_entry() from apps.ledger.services instead.');
  process.exit(1);
}
console.log('Ledger write guard: OK (all writes go through append_ledger_entry).');
