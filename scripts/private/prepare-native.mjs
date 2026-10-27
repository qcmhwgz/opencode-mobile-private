import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const file = 'node_modules/@expo/dom-webview/android/src/main/java/expo/modules/webview/DomWebView.kt';
const marker = '// Private Edition: terminal rendering is local; networking uses the native provider.';
const packages = JSON.parse(readFileSync('package.json', 'utf8'));
if (!packages.expo?.autolinking?.android?.buildFromSource?.includes('expo-dom-webview')) {
  throw new Error('Patched DOM WebView must build from the expo-dom-webview native project source');
}
const source = readFileSync(file, 'utf8');
const anchor = 'settings.javaScriptEnabled = true';
const patched = `${anchor}\n      ${marker}\n      settings.blockNetworkLoads = true\n      settings.allowUniversalAccessFromFileURLs = false`;
const original = source.includes(marker) ? source.replace(patched, anchor) : source;
const hash = createHash('sha256').update(original).digest('hex');
const expected = JSON.parse(readFileSync('private-native-inputs.json', 'utf8')).domWebViewSha256;
if (hash !== expected) throw new Error('Locked WebView source changed; review required');
if (!original.includes(anchor)) throw new Error('WebView anchor missing');
if (source === original) {
  writeFileSync(file, original.replace(anchor, patched));
}
