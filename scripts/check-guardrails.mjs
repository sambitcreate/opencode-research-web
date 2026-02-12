#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const summary = {
  passed: 0,
  failed: 0,
  notes: []
};

function pass(message) {
  summary.passed += 1;
  summary.notes.push(`PASS: ${message}`);
}

function fail(message) {
  summary.failed += 1;
  summary.notes.push(`FAIL: ${message}`);
}

async function listRouteFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listRouteFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name === 'route.ts') {
      files.push(fullPath);
    }
  }
  return files;
}

async function checkNodeRuntimeGuardrail() {
  const routesRoot = path.join(repoRoot, 'src', 'app', 'api');
  const routeFiles = await listRouteFiles(routesRoot);

  if (routeFiles.length === 0) {
    fail('No API route files were found under src/app/api.');
    return;
  }

  const runtimeRegex = /export\s+const\s+runtime\s*=\s*['"]nodejs['"]/;
  const violations = [];

  for (const filePath of routeFiles) {
    const content = await readFile(filePath, 'utf8');
    if (!runtimeRegex.test(content)) {
      violations.push(path.relative(repoRoot, filePath));
    }
  }

  if (violations.length > 0) {
    fail(`Routes missing "runtime = 'nodejs'": ${violations.join(', ')}`);
    return;
  }

  pass(`All ${routeFiles.length} API route handlers declare runtime='nodejs'.`);
}

async function checkOpenCodeIntegrationGuardrails() {
  const filePath = path.join(repoRoot, 'src', 'lib', 'opencode.ts');
  const content = await readFile(filePath, 'utf8');

  if (!content.includes("process.env.OPENCODE_API_URL?.trim()")) {
    fail('Missing OPENCODE_API_URL override handling in src/lib/opencode.ts.');
  } else {
    pass('OPENCODE_API_URL override handling is present.');
  }

  if (!content.includes("process.env.OPENCODE_COMMAND?.trim()")) {
    fail('Missing OPENCODE_COMMAND override handling in src/lib/opencode.ts.');
  } else {
    pass('OPENCODE_COMMAND override handling is present.');
  }

  const hasLocalhostFallback = content.includes("return process.env.OPENCODE_HOST?.trim() || '127.0.0.1';");
  if (!hasLocalhostFallback) {
    fail('Local-first host fallback (127.0.0.1) is missing from src/lib/opencode.ts.');
  } else {
    pass('Local-first host fallback (127.0.0.1) is present.');
  }

  const runResearchQueryStart = content.indexOf('export async function runResearchQuery');
  const runResearchQueryEnd = content.indexOf('export async function getOpenCodeStatus', runResearchQueryStart);
  if (runResearchQueryStart === -1 || runResearchQueryEnd === -1) {
    fail('Unable to locate runResearchQuery() boundaries in src/lib/opencode.ts.');
    return;
  }

  const runResearchQueryBody = content.slice(runResearchQueryStart, runResearchQueryEnd);
  if (!runResearchQueryBody.includes('const opencode = await ensureOpenCodeServer();')) {
    fail('runResearchQuery() no longer autostarts OpenCode via ensureOpenCodeServer().');
    return;
  }

  pass('runResearchQuery() autostart call is present.');
}

async function main() {
  await checkNodeRuntimeGuardrail();
  await checkOpenCodeIntegrationGuardrails();

  for (const note of summary.notes) {
    console.log(note);
  }

  console.log('');
  console.log(`Summary: ${summary.passed} passed, ${summary.failed} failed`);

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : 'Unknown guardrail check error');
  for (const note of summary.notes) {
    console.log(note);
  }
  console.log('');
  console.log(`Summary: ${summary.passed} passed, ${summary.failed} failed`);
  process.exitCode = 1;
});
