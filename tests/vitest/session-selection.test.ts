import { it, expect, vi } from 'vitest';
import { hookRuntime, loadTs } from '../helpers/runtime.mjs';

it('keeps an explicitly opened catalog session while its project list is stale', async () => {
  const runtime = hookRuntime();
  const { useOpencodeProviderEffects } = await loadTs('providers/use-opencode-provider-effects.ts', {
    react: runtime.react,
    '@/providers/opencode-provider-utils': { pruneByKeepIds: (value: unknown) => value },
  });
  const setCurrentSessionId = vi.fn();
  const sessionsRef = { current: [{ id: 'old' }] };
  const currentSessionIdRef = { current: 'target' };
  const explicitSessionSelectionRef = { current: 'target' as string | undefined };
  runtime.mount(useOpencodeProviderEffects, {
    active: false, isHydrated: false, connection: { status: 'idle' },
    connectionScope: 'scope', activeProjectPath: '/repo', currentSessionId: 'target',
    sessions: sessionsRef.current, sessionsRef, currentSessionIdRef, explicitSessionSelectionRef,
    lastSessionByConnection: {}, setCurrentSessionId, isBootstrappingChat: true,
    sessionRefreshTimeoutsRef: { current: {} }, sessionRefreshOptionsRef: { current: {} },
  });
  expect(currentSessionIdRef.current).toBe('target');
  expect(setCurrentSessionId).not.toHaveBeenCalled();
  sessionsRef.current = [{ id: 'old' }, { id: 'target' }];
  runtime.update({ sessions: sessionsRef.current });
  expect(explicitSessionSelectionRef.current).toBeUndefined();
  // Once observed in the authoritative list, later removal still selects a fallback.
  sessionsRef.current = [{ id: 'old' }];
  runtime.update({ sessions: sessionsRef.current });
  expect(setCurrentSessionId).toHaveBeenCalledWith('old');
  runtime.unmount();
});
