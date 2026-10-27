import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const PRIVATE_ORIGIN = 'http://10.0.0.2:47119';

// Only the explicit web fixture build can bypass this policy. Android cannot.
export function privatePolicyEnabled() {
  return !(Platform.OS === 'web' && Constants.expoConfig?.extra?.e2eMode === true);
}

export function isAllowedNetworkUrl(value: string) {
  try {
    // Reject userinfo and alternative representations of the IP before URL normalization.
    if (!/^(http|ws):\/\/10\.0\.0\.2:47119(?:[/?#]|$)/.test(value)) return false;
    const url = new URL(value);
    return ['http:', 'ws:'].includes(url.protocol) && url.hostname === '10.0.0.2'
      && url.port === '47119' && !url.username && !url.password && !url.hash;
  } catch { return false; }
}

export function assertAllowedNetworkUrl(input: RequestInfo | URL) {
  if (!privatePolicyEnabled()) return;
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (!isAllowedNetworkUrl(url)) throw new Error('Private Edition only connects to the configured WireGuard server.');
}

export function privateMarkdown(text: string) {
  if (!privatePolicyEnabled()) return text;
  // Disable all native image loads, including reference syntax and HTML images.
  // Keep textual image descriptions; do not try to parse untrusted URLs with regex.
  return text.replace(/!\[/g, '[').replace(/<img\b[^>]*>/gi, '[image omitted]');
}
