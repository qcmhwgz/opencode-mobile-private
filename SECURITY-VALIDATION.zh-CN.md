# 实际验证记录

日期：2026-10-27，Asia/Shanghai。项目：OpenCode Mobile Private Edition。

**当前交付的是源码与构建配置，不是已完成的 Release APK。** 本地原生工具链下载失败；GitHub 已完成工具下载，但第三轮构建在依赖锁配置处失败。尚未生成本项目 APK、原生 Gradle 依赖锁及完整校验元数据。正常严格构建会拒绝缺少原生锁的输入；首次可信构建/Actions bootstrap 的具体步骤见构建说明。不能把本记录称为最终安全审计通过证明。

## 已执行

| 项目 | 实际结果 | 证明范围 |
|---|---|---|
| 上游来源 | 固定提交 `ec50c075845517f051e3a3b251150c15723a4489`，版本 1.0.98，保留许可证 | 源码基线 |
| Node/JDK 下载校验 | Node 22.21.1 与 Temurin 17.0.17+10 的下载匹配各自官方 SHA-256 | 本地构建工具输入 |
| npm 固定 | 所有直接依赖均固定为解析版本，并与 package-lock 一致 | npm 输入；不包含未生成的原生 Gradle 锁 |
| 依赖公开通告扫描 | 修复后当次 `npm audit` 报告 0 项已知漏洞 | 已公开通告覆盖；不等于不存在未知问题 |
| 静态检查 | lint、应用 TypeScript、测试 TypeScript 均通过 | 静态约束 |
| 上游及新增单元回归 | 103 个文件、644 项测试通过 | 包括凭据持久化、SSE/协议及会话状态 |
| 私有边界测试 | 26 项通过 | Android 不能用网页测试标记绕过 JS 策略；错误 IP/端口/协议、userinfo、变形 IP、外部 fetch/XHR/WebSocket/外链在模拟传输前被拒绝 |
| 假服务器自测 | V1 1.18.3 与原生 V2 2.0 均通过 | 本机假服务协议；不是真实 2.1.4 |
| 完整浏览器回归 | 162/162 通过 | 项目、旧会话、分页、SSE、Diff、审批/问题、终端 PTY、断线恢复等现有网页契约 |
| Android 工程生成 | 私有 prebuild 通过 | 检查生成配置；不代表 Kotlin/R8 编译成功 |
| Android JS/Hermes 与终端资源打包 | 通过，实际 Android Hermes 及本地 DOM 终端产物已生成 | Metro 原生模块替换、JS 打包；不是 APK |
| 本地签名脚本自测 | 一次性测试 APK：错误证书被拒绝，正确证书 v2/v3 验签、对齐与 SHA-256 复核通过，测试私钥已删除 | 仅测试样本；没有签署用户应用 |
| 工作流配置 | YAML 解析、最小读取权限与官方 action 提交 SHA 固定检查通过；已在私有仓库启动首次 Actions | 远端实际结果见下方单独记录 |
| 真实服务器探测 | 对 `http://10.0.0.2:47119/api/server/health` 的未认证 GET 返回 401 | 可达并要求认证；此路径不是已确认的健康 API，也不能据此断言服务器版本或兼容性 |

证据保存在 `validation/`。浏览器回归明确使用可连接本机假服务的网页 fixture 模式，其中保留上游云功能测试路径；它不证明私有 Android 原生网络策略有效。私有边界有独立测试，但仍需要设备流量验证。

## 已修复的回归问题

完整浏览器回归初次独立运行通过 161/162，单独重跑可复现同一失败。最小单元回归确认：项目会话列表尚未刷新时，原实现把刚从全局目录选中的会话回退到旧会话。修复后显式选择保持到列表追上，后续真实移除仍可回退。

同时新增测试复现并修复了重叠 hydration 和 reset 后旧清理回调提前清除新加载状态的问题。新测试先失败后通过，原始浏览器场景随后通过，最终完整 162 项全部通过。未修改 `tests/e2e/` 或 `tests/fake-opencode/` 的契约来放宽断言。

## 尚未执行或尚未完成

- **原生 Release APK 编译、安装和 R8 后行为验证**：本地 Gradle/NDK 下载失败；GitHub 第三轮已下载工具，但依赖锁配置冲突导致编译停止，该配置已修正，待新构建验证。Android JS 导出成功不能替代 APK 编译。
- **完整原生依赖冻结与供应链校验**：已提供严格锁和校验机制，但原生首次构建未完成，因此未提供已验证的 Gradle 锁/verification metadata。Actions 的 bootstrap 仅用来生成需审查的候选，不能冒充已审计的 Release。
- **合并 APK 权限、DEX、导出组件审计**：检查脚本已提供，未对本项目 APK 执行，因为 APK 尚不存在。
- **用户正式签名与最终 APK SHA-256**：用户选择自己保管密钥并本地签名。未接收、生成或上传用户正式密钥，未产生最终 APK 指纹/摘要。签名自测仅为临时样本。
- **真实 OpenCode Server 2.1.4 认证接口兼容性**：用户选择稍后本地执行 GET-only 探测。固定客户端 SDK 为 2.0.16；假服务器和未认证 401 不能证明该版本组合完全兼容。
- **手机/WireGuard/Android 原生安全测试**：没有连接测试手机。尚未验证活动 VPN 检测与分流路由、SSE/PTY 长连接、后台恢复、真实审批、密码存储、截屏/备份/迁移限制，以及冷启动/外链/附件/OAuth 等场景的按应用流量。
- **远程 Actions APK 构建**：第三轮已通过全部 162 项浏览器门禁，原生依赖锁配置失败；第四轮主动取消，后续构建仍待验证。

因此尚不能宣布“安全精简 Release APK 已完成”或“完整安全审计已通过”。

## 已实施的源码与配置约束

原生 OkHttp factory 在 React 初始化之前安装，限制为 HTTP `10.0.0.2:47119`，要求活动 VPN，禁止自动重定向和系统代理；SocketFactory 绑定活动 VPN，固定 Expo 源码中的 Expo Fetch 也使用同一 factory。JS 启动边界对 fetch、XHR、WebSocket 和外链作额外限制。网络安全 XML 只为目标 IP 开放明文 HTTP。HTTP 的机密性依赖已有 WireGuard，VPN 绑定、断线与分流仍需在手机上验证。

关闭云连接、购买、更新、语音、通知、小组件、后台任务、浏览器及分享集成，排除对应原生模块；删除商店发布与更新模块。部分上游源码/类型依赖保留，运行时入口关闭，不能声称已逐行移除所有相关源码。网络使用统计是应用本地计数，并非遥测发送。

密码与自定义头保留 SecureStore 存储；未嵌入任何用户秘密。消息正文缓存与小组件快照不在私有运行时持久化，元数据仍在应用私有存储。配置禁止备份、迁移、截屏、内容捕获及分享/深链入口。以上是实现约束，原生最终效果还须由 APK 与真机测试确认。

## 下一步顺序

1. 在已创建的私有 GitHub 仓库完成全部验证门禁，手动选中首次冻结选项运行 Actions，或在网络正常的可信本机完成首次冻结。
2. 审查并提交原生锁/校验元数据，执行不带首次冻结选项的严格构建，并通过 APK 审计。
3. 在用户本地用自己保管的密钥签名，核对独立信任的证书指纹和 APK SHA-256。
4. 运行真实服务器的只读认证探测，再完成手机功能和按应用流量验收。全程无需重启、升级或修改服务器部署。

## GitHub 首次运行记录

私有仓库：`qcmhwgz/opencode-mobile-private`，仓库 ID `1435622237`。用户明确授权提交源码、文档和验证记录，以及启动未签名构建。未上传用户签名密钥或服务器凭据。

- 源码提交：`11b7a4adf90577f5e1e0214b7ef3dbfb0800fdff`；文件树 `0f7f5d74043fa812d7ccf3932572e6ab500d2cde` 与原本地提交 `78a7711a45a448fc43bd20956502185b0925f9e1` 完全一致。
- [运行 #1](https://github.com/qcmhwgz/opencode-mobile-private/actions/runs/40495891002)：静态检查、641 项单元测试、26 项私有边界测试、V1/V2 模拟服务自测通过；浏览器测试 **161 通过、1 失败**。APK 作业因此跳过，没有生成 APK 或原生依赖锁。
- 失败用例：`connect.spec.mjs:529`，`expiry stops data-plane traffic while preserving owned machine and profile`。用例在设置模拟凭据 8 秒有效期后才初始化页面和配对；本次等待项目页超时，整个失败用例约 42 秒，其中 URL 等待超时为 30 秒。短有效期在初始化期间耗尽是当前主要假设，尚不能仅凭本地结果确认 CI 问题已解决。
- 未修改源码的本地针对性复跑：同一用例 4 并发、重复 4 次，**4/4 通过**，没有复现本次 CI 失败。
- CI 调整：只把浏览器并发设为 2，并在失败时保留模拟测试诊断文件 3 天；保留全部 162 项、原有断言和 8 秒有效期，不添加自动重试。后续完整 CI 仍须通过，不能把此配置调整记为已修复或已通过。

## GitHub 第二次运行记录

- [运行 #2](https://github.com/qcmhwgz/opencode-mobile-private/actions/runs/40499024449)，源码 `291489b0ce6410ef831ce2473944251ca96571af`：静态检查、641 项单元测试、26 项私有边界测试和模拟服务自测通过。
- 浏览器用例尚未开始。测试配置把冷页面打包和 Web 服务启动放在同一个 180 秒窗口，日志在 181 秒后报告 `Timed out waiting 180000ms from config.webServer`。因此未能验证首次的凭据过期用例是否已恢复，也没有生成 APK。
- 已保留失败诊断 artifact `12731823643`，SHA-256 `24049de255a10cb7e829d6fb9f31d107805a14d84829d9a615bd91644636351e`。这是诊断 ZIP 的摘要，不是 APK 摘要。
- 后续 CI 把 `build:web:ci` 拆成独立的、最多 10 分钟的步骤，使用与原配置相同的 E2E/development 环境；测试使用项目已有的 `E2E_SKIP_BUILD=1` 仅启动预构建页面。仍保留 180 秒服务启动检查、全部用例和原始断言。没有修改 `tests/e2e/`、`tests/fake-opencode/` 或应用源码。

## GitHub 第三次运行与后续加固

- [运行 #3](https://github.com/qcmhwgz/opencode-mobile-private/actions/runs/40500456591)，源码 `9ff36da9b7378ea4691ca677465b9247a155e99e`：641 项单元测试、26 项私有边界测试、模拟服务自测，以及 **162/162 浏览器测试全部通过**。原凭据过期用例通过；独立页面打包实际耗时 184 秒，超过原先与服务启动共享的 180 秒预算。
- 原生构建已下载并校验 Gradle 9.3.1、安装 NDK 27.1.12297006，完成构建插件编译，但在解析 `releaseRuntimeClasspath` 时失败：`Both dependency locking and fail on changing versions are enabled. You must choose between the two modes.` 未生成 APK 或完整原生锁。
- 修正私有 Gradle 配置，移除不兼容的 `failOnChangingVersions()`，保留全配置依赖锁、后续严格锁模式和 SHA-256 依赖验证。首次冻结仍需要审查，不能将生成摘要本身视为供应链审计；不得接受未审查的 SNAPSHOT 或 changing 输入。参见 [Gradle 锁定文档](https://docs.gradle.org/current/userguide/dependency_locking.html)。
- 备份/设备迁移规则显式排除云备份与设备迁移各自的 9 个存储域，不注册跨平台迁移。原生客户端禁止系统代理，并通过活动 VPN 的 SocketFactory 创建连接。后者依据 [Android Network 文档](https://developer.android.com/reference/android/net/Network#getSocketFactory()) 的网络绑定语义实施；尚未完成本版原生编译和手机断网验收。
- 新增 7 项 Python 资源策略测试，覆盖遗漏存储域、迁移包含规则、额外连接目标、错误资源引用和资源别名等拒绝路径；本地通过。工程生成后，实际 XML 规则检查通过。云备份/D2D 域定义参见 [Android 官方说明](https://developer.android.com/identity/data/autobackup)。
- 编译了一个**仅包含资源的测试样本**，用于测试真实 `aapt2`/`apkanalyzer` 解码与检查器。发现当前 apkanalyzer 会省略网络 XML 的域名正文，因此以 aapt2 校验同一 domain 节点中的正文；资源检查通过，但样本因没有 native ABI 被完整 APK 检查器正确拒绝。它不是可安装应用，也不构成本项目 APK 已通过审计的证据。
- 后续 APK 核验会解析实际编译的备份/网络 XML、资源表及 Manifest 引用，同时保留既有权限、导出组件、DEX 和 ABI 检查。所有加固仍须进入新的实际构建并通过检查后才能宣布产物验证通过。

## 第四轮取消与 WebView 源码构建修正

- [运行 #4](https://github.com/qcmhwgz/opencode-mobile-private/actions/runs/40504983951)，源码 `2f5dc2ddb9c56e574ba541320d1a5d23ec235991`：静态、26 项私有测试、7 项 Python 资源测试与模拟服务自测通过。随后主动取消，未进入 APK 编译。
- 第三轮原生日志标记 DOM WebView 使用预编译 AAR；只修改安装目录里的 Kotlin 文件不足以让补丁进入应用。现将 Expo autolinking 的 `buildFromSource` 加入原生项目名 `expo-dom-webview`。固定版本的 SettingsManager 以完整正则匹配原生项目名，npm 包名 `@expo/dom-webview` 不能匹配。
- 补丁准备脚本要求该强制源码配置；每次运行都还原并校验上游文件 SHA-256，已打补丁也不能跳过完整性校验。三个回归场景覆盖错误项目名、重复执行、已打补丁文件被改动；其中两个拒绝场景在修正前失败，修正后通过。
- 实际 autolinking 解析返回 `@expo/dom-webview` 对应项目 `expo-dom-webview`，强制源码规则匹配。此解析与工程生成只能证明输入配置，仍需新 CI 中的 Kotlin 编译及最终 APK 核查才能确认生效。

本轮本地静态门禁已通过：103 个文件、644 项测试（包括 3 项原生输入测试）；另有 26 项私有边界与 7 项 Python 资源测试通过。Android 工程生成通过，未进行本地 Kotlin/R8 编译。
本轮完整浏览器回归 162/162 通过（3.6 分钟），V1/V2 模拟服务自测通过；未修改 e2e/fake 契约。证据为 `validation/webview-*`。
