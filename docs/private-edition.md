# Private Edition changes

See `../README.private.zh-CN.md` for the operational guide and `../SECURITY-VALIDATION.zh-CN.md` for current evidence. Upstream historical verification records do not certify this fork.

The provider architecture, V2 SDK surface, session and permission contracts, SSE/polling, diff adapters, and PTY service are retained. The private shell installs JS outbound guards before routing and a native OkHttp factory before React initialization. Expo Fetch uses that factory in the pinned Expo source. HTTP and WebSocket requests are confined to the configured VPN server, redirects are disabled, optional native cloud/store/update/voice/notification/widget/background/share/browser integrations are excluded, and the DOM terminal cannot load network resources.

Credentials remain in SecureStore. Transcript-body and widget caches are disabled in the private runtime; project/session metadata remains in app-private storage. Backup, device migration, screen capture and inbound sharing/deep links are disabled. This policy needs a native APK/device audit; prebuild and mocked JS checks alone do not establish native enforcement.

Cross-workspace selection uncovered two upstream state bugs: a stale project session list could replace a deliberate catalog selection, and the newest transcript read could release an overlapping outer hydration. Explicit selection now survives until observed by the project list. Hydration tracks unique outstanding owners across resets. Regression tests exercise both failures before/after the fix; existing E2E and fake-server contracts are unchanged.

The explicit web E2E build retains generic upstream fixtures, including multiple servers and disabled production features, for protocol regression coverage. Native Android cannot disable the JS destination policy through the E2E flag, and private prebuild resets fixture flags. Web fixture tests do not prove native private policy; `tests/private` separately exercises that boundary.

CI produces only unsigned candidates, requires passing gates, and records dependency provenance. Initial native lock generation is a separately selected bootstrap; subsequent builds require committed locks and strict dependency verification. Signing uses an interactive local script and an independently trusted certificate fingerprint. No user signing key is created or transmitted by this project.
