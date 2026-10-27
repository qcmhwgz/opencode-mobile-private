import { afterEach, expect, it } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const project = process.cwd();
const relative = 'node_modules/@expo/dom-webview/android/src/main/java/expo/modules/webview/DomWebView.kt';
const script = resolve(project, 'scripts/private/prepare-native.mjs');
const anchor = 'settings.javaScriptEnabled = true';
const inserted = `${anchor}\n      // Private Edition: terminal rendering is local; networking uses the native provider.\n      settings.blockNetworkLoads = true\n      settings.allowUniversalAccessFromFileURLs = false`;
const original = readFileSync(resolve(project, relative), 'utf8').replace(inserted, anchor);
const folders: string[] = [];

function fixture(fromSource: string[]) {
  const root = mkdtempSync(join(tmpdir(), 'private-native-input-'));
  folders.push(root);
  const file = join(root, relative);
  mkdirSync(resolve(file, '..'), { recursive: true });
  writeFileSync(file, original);
  writeFileSync(join(root, 'private-native-inputs.json'), readFileSync(resolve(project, 'private-native-inputs.json')));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ expo: { autolinking: { android: { buildFromSource: fromSource } } } }));
  return { root, file, run: () => spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' }) };
}

afterEach(() => { for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true }); });

it('rejects a patched module that can still use a prebuilt Android publication', () => {
  const f = fixture(['expo-sharing', '@expo/dom-webview']);
  expect(f.run().status).not.toBe(0);
  expect(readFileSync(f.file, 'utf8')).toBe(original);
});

it('patches the pinned source idempotently when the native project is forced to source', () => {
  const f = fixture(['expo-dom-webview']);
  expect(f.run().status).toBe(0);
  const patched = readFileSync(f.file, 'utf8');
  expect(patched).toContain('settings.blockNetworkLoads = true');
  expect(f.run().status).toBe(0);
  expect(readFileSync(f.file, 'utf8')).toBe(patched);
});

it('rejects changes to an already-patched native input', () => {
  const f = fixture(['expo-dom-webview']);
  expect(f.run().status).toBe(0);
  writeFileSync(f.file, readFileSync(f.file, 'utf8') + '\n// changed native input\n');
  expect(f.run().status).not.toBe(0);
});


it.each(['lock', 'verification'])('rejects incomplete strict native inputs before running prebuild: %s', (missing) => {
  const root = mkdtempSync(join(tmpdir(), 'private-build-input-'));
  folders.push(root);
  mkdirSync(join(root, 'config/private/gradle-locks'), { recursive: true });
  mkdirSync(join(root, 'scripts/private'), { recursive: true });
  if (missing !== 'lock') writeFileSync(join(root, 'config/private/gradle-locks/_app.lockfile'), '# fixture');
  if (missing !== 'verification') writeFileSync(join(root, 'config/private/verification-metadata.xml'), '<fixture/>');
  writeFileSync(join(root, 'scripts/private/prebuild.mjs'), "import { writeFileSync } from 'node:fs'; writeFileSync('prebuild-started', 'unexpected');");
  const result = spawnSync(process.execPath, [resolve(project, 'scripts/private/build.mjs')], { cwd: root, encoding: 'utf8' });
  expect(result.status).not.toBe(0);
  expect(existsSync(join(root, 'prebuild-started'))).toBe(false);
});
