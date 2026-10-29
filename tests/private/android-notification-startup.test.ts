import { describe, expect, it } from 'vitest';
import { hookRuntime, loadTs } from '../helpers/runtime.mjs';

describe('private Android startup', () => {
  it('mounts and cleans up the real notification route with disabled notification transport', async () => {
    const notifications = await loadTs('lib/private/notifications-stub.ts');
    const runtime = hookRuntime();
    let navigations = 0;
    const { useNotificationRoute } = await loadTs('hooks/use-notification-route.ts', {
      'expo-notifications': notifications,
      'expo-router': { router: { push: () => { navigations++; } } },
      react: runtime.react,
      'react-native': { Platform: { OS: 'android' } },
      '@/lib/notification-route': { parseNotificationRoute: () => undefined },
    });

    runtime.mount(useNotificationRoute, {});
    await runtime.settle();
    runtime.unmount();

    expect(navigations).toBe(0);
    expect(await notifications.getLastNotificationResponseAsync()).toBeNull();
    expect(await notifications.getPermissionsAsync()).toMatchObject({ granted: false, canAskAgain: false });
  });
});
