import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));

function probe(serverVersion: string, expectedVersion?: string) {
  const directory = mkdtempSync(path.join(tmpdir(), 'opencode-probe-version-'));
  const loader = path.join(directory, 'fixture.mjs');
  const report = path.join(directory, 'report.json');
  writeFileSync(loader, `
globalThis.fetch = async (input, init) => {
  const url = new URL(input);
  if (url.origin !== 'http://10.0.0.2:47119' || (init?.method && init.method !== 'GET')) {
    throw new Error('Unexpected probe request');
  }
  if (url.pathname === '/api/event') {
    return new Response('data: {"type":"server.connected"}\\n\\n', { headers: { 'content-type': 'text/event-stream' } });
  }
  const body = url.pathname === '/api/info' ? { version: ${JSON.stringify(serverVersion)}, pid: 1, urls: [], paths: { tmp: '/tmp' } } : [];
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
};
`);
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith('OPENCODE_PROBE_')) delete env[key];
  env.OPENCODE_PROBE_REPORT = report;
  if (expectedVersion) env.OPENCODE_PROBE_EXPECTED_VERSION = expectedVersion;
  try {
    const result = spawnSync(process.execPath, ['--import', loader, 'scripts/private/probe.mjs'], { cwd: root, env, encoding: 'utf8', timeout: 15_000 });
    if (!result.stdout || result.error) throw result.error ?? new Error(result.stderr);
    return { status: result.status, report: JSON.parse(readFileSync(report, 'utf8')) };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe('GET-only probe version expectations', () => {
  it('uses the declared 2.2.0 target and does not mistake an otherwise successful probe for incompatibility', () => {
    const result = probe('2.2.0');
    expect(result.status).toBe(0);
    expect(result.report.expectedServerVersion).toBe('2.2.0');
    expect(result.report.results.find((item: { path: string }) => item.path === '/api/info').expectedVersion).toBe(true);
    expect(result.report.authenticated).toBe(false);
  });

  it('reports an actual version mismatch while allowing an explicit local expected-version override', () => {
    expect(probe('2.1.4').status).toBe(1);
    const result = probe('2.1.4', '2.1.4');
    expect(result.status).toBe(0);
    expect(result.report.expectedServerVersion).toBe('2.1.4');
  });
});
