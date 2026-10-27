import { Linking } from 'react-native';
import { assertAllowedNetworkUrl, privatePolicyEnabled } from './policy';

if (privatePolicyEnabled()) {
  Object.defineProperty(globalThis, '__PRIVATE_NETWORK_ENFORCED__', { value: true, configurable: false, writable: false });
  Object.defineProperty(globalThis, '__PRIVATE_ASSERT_DESTINATION__', { value: assertAllowedNetworkUrl, configurable: false, writable: false });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    assertAllowedNetworkUrl(input);
    // RN XHR cannot guarantee redirect rejection; API traffic uses Expo fetch.
    return originalFetch(input, { ...init, redirect: 'error' });
  };
  const OriginalSocket = globalThis.WebSocket;
  globalThis.WebSocket = new Proxy(OriginalSocket, {
    construct(Target, args) {
      assertAllowedNetworkUrl(String(args[0]));
      return Reflect.construct(Target, args);
    },
  });
  const open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    assertAllowedNetworkUrl(String(url));
    return Reflect.apply(open, this, [method, url, ...rest]);
  } as typeof open;
  // No browser/auth/custom-scheme handoff can send project data to another app.
  Linking.openURL = async () => { throw new Error('External links are disabled in Private Edition.'); };
}
