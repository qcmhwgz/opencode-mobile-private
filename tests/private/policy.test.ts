import { describe, it, expect, vi } from 'vitest';
import { isAllowedNetworkUrl, assertAllowedNetworkUrl, privatePolicyEnabled, privateMarkdown } from '../../lib/private/policy';
const runtime = vi.hoisted(() => ({ os: 'android', extra: { e2eMode: false } }));
vi.mock('expo-constants', () => ({ default: { expoConfig: { get extra() { return runtime.extra; } } } }));
vi.mock('react-native', () => ({ Platform: { get OS() { return runtime.os; } } }));

describe('private destination boundary', () => {
  it.each([
    'https://10.0.0.2:47119/api/info', 'http://10.0.0.2:80/', 'http://10.0.0.3:47119/',
    'http://10.0.0.2:47119.evil.test/', 'http://10.0.0.2:47119@evil.test/',
    'http://user:password@10.0.0.2:47119/', 'http://10.0.0.2:47119/#secret',
    'http://0x0a000002:47119/', 'http://167772162:47119/', 'http://10.0.0.02:47119/',
    'http://10.0.0.2:47119\\@evil.test/', '//evil.test/', 'file:///etc/passwd',
    'http://localhost:47119/', 'http://10.0.0.2:471190/', 'wss://10.0.0.2:47119/',
    'https://api.opencodecloud.link/', 'https://www.google.com/generate_204',
    'http://10.0.0.2:47119\n@evil.test/', 'http://10.0.0.2:47119?x=1#fragment',
  ])('rejects %s before transport', (url) => {
    expect(isAllowedNetworkUrl(url)).toBe(false);
    expect(() => assertAllowedNetworkUrl(url)).toThrow();
  });
  it.each(['http://10.0.0.2:47119/api/info', 'http://10.0.0.2:47119/api/event?cursor=1', 'ws://10.0.0.2:47119/api/pty/id/connect?ticket=x'])('allows %s', (url) => {
    expect(isAllowedNetworkUrl(url)).toBe(true);
  });
  it('cannot disable Android policy using fixture config', () => {
    runtime.extra.e2eMode = true;
    expect(privatePolicyEnabled()).toBe(true);
    runtime.extra.e2eMode = false;
  });
  it('removes native markdown image loading including reference images', () => {
    expect(privateMarkdown('![x](https://evil/image) ![x][r] <img src="https://evil/x">')).not.toMatch(/!\[|<img/);
  });
});
