# Private Android startup fix and OpenCode 2.2.0 review

2026-10-29. Fixed source: 1.0.99 / Android versionCode 99. Strict unsigned build #9 and actual APK static checks passed; see `../BUILD-RESULT-1.0.99.zh-CN.md`. Physical-device startup and authenticated server acceptance remain pending.

The user reported the Expo Router error screen: `Something went wrong / undefined is not a function`. The Android root navigator mounts `useNotificationRoute`. Private Edition replaces `expo-notifications` with a local stub, but version 1.0.98 did not export `addNotificationResponseReceivedListener` or `getLastNotificationResponseAsync`. Mounting the actual hook with the actual stub and `Platform.OS = android` fails without any server or network. The fix supplies an inert subscription with cleanup and a last-response read returning null. Notifications remain disabled and no native module, permission or external connection is restored.

The regression failed before the fix and passed afterward. The independent original reproducer passed after the fix too. This is a confirmed client defect and a strong candidate for the reported screen; the precise device crash still requires its stack or a corrected-build phone test. Browser regressions skip this Android-only branch. Earlier successful static APK checks and browser tests never established successful physical-device startup.

The installed V2 SDK stays pinned at `@opencode/client 2.0.16`; no dependency upgrade was required to repair this lifecycle. Official OpenAPI method/path comparison found no removed 2.0.16 operations in 2.2.0. Selected project, session, message, approval and PTY fields remain available. This does not prove all behavior or semantics. In 2.2.0 `FileDiff.Info` gains optional `more`, currently discarded by diff normalization, and `Model.Info` gains optional `type`; large/partial diffs and non-chat model selection need acceptance tests. The old read-only probe compared exactly against 2.1.4 independently of APK behavior. It now reads the declared target (2.2.0) from `private-source.json`, with `OPENCODE_PROBE_EXPECTED_VERSION` as an explicit override.

The only live check during this review was an unauthenticated Mac GET `/api/info`, returning 401. The user's reported server version is 2.2.0; no authenticated version or API acceptance was obtained. No prompts, approvals or PTYs were created on the server, and it was not modified, upgraded or restarted.

Primary sources:

- https://github.com/anomalyco/opencode/blob/v2.0.16/packages/protocol/openapi.json
- https://github.com/anomalyco/opencode/blob/v2.1.4/packages/protocol/openapi.json
- https://github.com/anomalyco/opencode/blob/v2.2.0/packages/protocol/openapi.json
- https://github.com/anomalyco/opencode/releases/tag/v2.2.0
