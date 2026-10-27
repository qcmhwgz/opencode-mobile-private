# Private Edition changes

See `../README.private.zh-CN.md` for the operational guide and `../SECURITY-VALIDATION.zh-CN.md` for current evidence. Upstream historical verification records do not certify this fork.

The provider architecture, V2 SDK surface, session and permission contracts, SSE/polling, diff adapters, and PTY service are retained. The private shell installs JS outbound guards before routing and a native OkHttp factory before React initialization. Expo Fetch uses that factory in the pinned Expo source. HTTP and WebSocket requests are confined to the configured VPN server; redirects and system proxies are disabled, and sockets are created through the active VPN network's factory. Optional native cloud/store/update/voice/notification/widget/background/share/browser integrations are excluded, and the DOM terminal cannot load network resources.

Credentials remain in SecureStore. Transcript-body and widget caches are disabled in the private runtime; project/session metadata remains in app-private storage. Cloud backup and Android device transfer explicitly exclude all nine storage domains; no cross-platform transfer is registered. Screen capture and inbound sharing/deep links are disabled. The APK checker verifies compiled network/backup XML, its resource table and Manifest references, permissions, exported components, DEX namespaces and ABI. Obfuscation limits namespace scans; they do not prove the absence of all third-party behavior. This policy still needs native compilation and device traffic/transfer acceptance; generated XML, resource fixtures and mocked JS checks alone do not establish runtime enforcement.

Cross-workspace selection uncovered two upstream state bugs: a stale project session list could replace a deliberate catalog selection, and the newest transcript read could release an overlapping outer hydration. Explicit selection now survives until observed by the project list. Hydration tracks unique outstanding owners across resets. Regression tests exercise both failures before/after the fix; existing E2E and fake-server contracts are unchanged.

The explicit web E2E build retains generic upstream fixtures, including multiple servers and disabled production features, for protocol regression coverage. Native Android cannot disable the JS destination policy through the E2E flag, and private prebuild resets fixture flags. Web fixture tests do not prove native private policy; `tests/private` separately exercises that boundary.

CI produces only unsigned candidates, requires passing gates, and records dependency provenance. Initial native lock generation is a separately selected bootstrap; subsequent builds require committed locks and strict dependency verification. Signing uses an interactive local script and an independently trusted certificate fingerprint. No user signing key is created or transmitted by this project.


DOM WebView 的 Kotlin 补丁必须配合 Expo autolinking 的 Android `buildFromSource: ["expo-sharing", "expo-dom-webview"]`。匹配对象为原生项目名；准备脚本拒绝缺失配置或源文件 SHA-256 改动，包括已打补丁后的非预期改动。最终构建日志须确认 WebView 从源码编译，不能仅凭 node_modules 文件已修改断言补丁进入 APK。

Release 调试状态由 Gradle 的 `debuggable false` 设置，源 Manifest 不硬编码此标记，以保留 Android 发布 lint。最终 APK 审计额外运行 `apkanalyzer manifest debuggable`，只有结果明确为 false 且 Manifest 未启用调试时才通过。

Manifest 合并规则显式移除 Wi-Fi 详情、生物识别权限、库加入的 package queries 和 ProfileInstallReceiver。APK 资源路径按资源 ID 与资源表解析，支持 R8 路径缩短，仍要求唯一默认 XML 配置和完整内容策略检查。
