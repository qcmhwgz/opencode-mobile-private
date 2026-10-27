import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const file = 'node_modules/@expo/dom-webview/android/src/main/java/expo/modules/webview/DomWebView.kt';
const marker = '// Private Edition: terminal rendering is local; networking uses the native provider.';
const source = readFileSync(file, 'utf8');
if (!source.includes(marker)) {
  const hash = createHash('sha256').update(source).digest('hex');
  const expected = JSON.parse(readFileSync('private-native-inputs.json', 'utf8')).domWebViewSha256;
  if (hash !== expected) throw new Error('Locked WebView source changed; review required');
  const anchor = 'settings.javaScriptEnabled = true';
  if (!source.includes(anchor)) throw new Error('WebView anchor missing');
  writeFileSync(file, source.replace(anchor, `${anchor}\n      ${marker}\n      settings.blockNetworkLoads = true\n      settings.allowUniversalAccessFromFileURLs = false`));
}
