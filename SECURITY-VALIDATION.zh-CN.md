# 实际验证记录

日期：2026-10-27，Asia/Shanghai。项目：OpenCode Mobile Private Edition。

**第八轮严格构建及实际 APK 检查已通过，未签名 APK 已下载并完成本地复核。** 编译来源 `932034b4ed1a5f8ecaaa2c84d738a301afaec3dc`；APK SHA-256 `e2034d866adbc963a3b1a7f6fdb32d52cd4b9c4678abd92462e35712a977ef17`。用户正式签名、真实服务器认证和手机安全验收尚未完成。最终记录见 `BUILD-RESULT.zh-CN.md`。

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

- 用户自有正式密钥的本地签名、签名证书与签名后 APK SHA-256 核验；未使用或上传用户密钥。
- 真实 OpenCode Server 2.1.4 的认证 API 接受测试；用户选择稍后本地执行 GET-only 探测。
- 手机/WireGuard 的功能与按应用流量验收，包括 SSE/终端/审批、断线恢复、VPN 分流与断开、凭据、截屏、备份/迁移。
- 所有第三方依赖的逐项独立来源审计，以及完整手机渗透测试。R8 后 DEX 命名空间检查有局限，不能证明不存在任何隐藏外部请求。

第八轮已完成严格原生 Release 编译及 CI/本地 APK 检查，解决了前述构建与静态产物问题；不能据此宣布完整真机安全审计或真实服务器兼容性通过。

## 已实施的源码与配置约束

原生 OkHttp factory 在 React 初始化之前安装，限制为 HTTP `10.0.0.2:47119`，要求活动 VPN，禁止自动重定向和系统代理；SocketFactory 绑定活动 VPN，固定 Expo 源码中的 Expo Fetch 也使用同一 factory。JS 启动边界对 fetch、XHR、WebSocket 和外链作额外限制。网络安全 XML 只为目标 IP 开放明文 HTTP。HTTP 的机密性依赖已有 WireGuard，VPN 绑定、断线与分流仍需在手机上验证。

关闭云连接、购买、更新、语音、通知、小组件、后台任务、浏览器及分享集成，排除对应原生模块；删除商店发布与更新模块。部分上游源码/类型依赖保留，运行时入口关闭，不能声称已逐行移除所有相关源码。网络使用统计是应用本地计数，并非遥测发送。

密码与自定义头保留 SecureStore 存储；未嵌入任何用户秘密。消息正文缓存与小组件快照不在私有运行时持久化，元数据仍在应用私有存储。配置禁止备份、迁移、截屏、内容捕获及分享/深链入口。以上是实现约束，原生最终效果还须由 APK 与真机测试确认。

## 下一步顺序

1. 在用户本地用自行保管的密钥签名，核对独立确认的证书指纹、v2/v3 签名和签名后 APK SHA-256。
2. 运行真实服务器的只读认证探测，再完成手机功能和按应用流量验收。全程无需重启、升级或修改服务器部署。

前序严格编译和 APK 产物检查已完成，历史各轮过程记录如下。

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

## 第五轮构建记录与发布调试标记修正

- [运行 #5](https://github.com/qcmhwgz/opencode-mobile-private/actions/runs/40509935099)，源码 `961f7ef1b1e145c0be9b49cc4a189d07d2b60b12`：644 项单元、26 项私有边界、7 项 Python 资源测试及模拟服务自测通过，完整浏览器 **162/162 通过**。
- 原生日志实际执行 `:expo-dom-webview:compileReleaseKotlin`，证明已切换到源码编译；应用 Kotlin 编译步骤也已执行。构建最终在 `:app:lintVitalRelease` 失败，错误为 `HardcodedDebugMode`：私有插件把 `android:debuggable="false"` 写入源 Manifest。未生成本项目 APK，APK 审计未执行，也未生成可提交的完整原生锁。
- 已删除 Manifest 中的硬编码调试标记，由 AGP 管理构建类型；Release Gradle 明确设置 `debuggable false`，保留全部发布 lint 检查。最终 APK 检查同时要求 Manifest 标记为缺省或 false，并由 `apkanalyzer manifest debuggable` 确认实际解析为 false；true、资源引用、未知或空解析值均拒绝。
- 依据 [Android 调试标记说明](https://developer.android.com/privacy-and-security/risks/android-debuggable)，缺省为 false；分析工具命令见 [官方说明](https://developer.android.com/tools/apkanalyzer)。本地两个实际编译的仅资源二进制样本分别得到 false/true，检查器正确接受/拒绝；这些不是应用 APK。
- 新增调试状态拒绝用例后，Python 资源策略测试为 8 项并通过；静态 644 项、私有 26 项和工程生成通过。新的完整原生编译与 APK 核验仍待执行。
- 失败诊断 artifact `12738892729` 已下载，ZIP SHA-256 `ca7776a5ff52f4369dc503d89b131777011b279a9d91364dea64a79fe676fc98` 匹配 GitHub。部分 verification metadata 含 1309 个组件，无 SNAPSHOT、trusted-artifacts 或 ignored-keys 条目，但没有原生锁，也不能称为完整依赖审计。日志位于 `validation/github-run-5-*`。

本次修正后的本地完整浏览器回归 162/162 通过（3.4 分钟），V1/V2 模拟服务自测通过；源码改动未涉及 e2e/fake 契约。

## 第六轮与严格重建准备（2026-10-28 更新）

- [运行 #6](https://github.com/qcmhwgz/opencode-mobile-private/actions/runs/40518328699)，源码 `9e6fbc5a2859405283665b06b18c431fa923ade4`：644 单元、26 私有边界、8 Python 资源测试通过，浏览器 **162/162 通过**。原生构建 `BUILD SUCCESSFUL in 34m 35s`，841 个任务执行；此前的发布调试标记 lint 问题已消除。
- 后续核验因 `apkanalyzer: command not found` 退出 127，未验证未签名状态、实际权限/XML/DEX/ABI，也未上传候选 APK。不能把构建成功等同于产物通过审计。诊断 ZIP `12744776224` 摘要 `52078568e418b828f7537cfbd65f14e2a52f9ed8078f004c7e36fbc629d787d0` 已在本地复核。
- 修正 CI：原生编译前安装固定 `cmdline-tools;19.0`、build-tools 36.0.0 和平台 36，测试分析工具可执行及 help，再以显式绝对路径执行分析。后续失败诊断会保留未通过的未签名 APK（私有仓库、3 天、诊断用途），正式候选 artifact 仍须所有检查通过才能上传。
- 导入 21 份主工程依赖锁、614 个精确坐标；1309 个 metadata 组件、2313 个 artifact SHA-256 条目。锁内坐标全部有对应元数据，无动态/SNAPSHOT 版本、trusted-artifacts 或 ignored-keys 例外。Included build 的源码由 npm lock 固定，依赖 artifact 由 metadata 约束；主工程之外生成的辅助 Gradle 锁未收集，不能宣称所有构建文件都已锁定。
- 3 个多摘要条目均已从 Google Maven、Maven Central、Gradle 插件仓库下载核对；JAR 解包内容相同，POM 坐标和依赖相同，记录见 `validation/native-alternative-checksums.json`。这是针对性来源核验，不是每个依赖的独立来源审计。
- 缺少 `_app.lockfile` 或 verification metadata 时，正常构建在 prebuild 前停止。两个实际构建入口测试先失败后通过。当前静态门禁为 646 项；其他本地验证结果见 `validation/locked-tools-*`。新的严格构建尚未启动；提交到 main 后将自动启动严格构建，首次冻结仅保留手动选项。

本轮本地最终门禁：646 项单元、26 项私有边界、8 项 Python 策略、V1/V2 模拟服务自测及 162/162 浏览器回归全部通过；工程生成确认依赖锁和 metadata 正确复制到 Android 工程。

## 第七轮严格构建与实际 APK 检查

- [运行 #7](https://github.com/qcmhwgz/opencode-mobile-private/actions/runs/40541281833)，源码 `d59e01f770f3fe51d8bc14b553fb86d504c87276`：646 项单元、26 项私有边界、8 项 Python 策略和 **162/162 浏览器回归通过**。分析工具准备成功；未启用首次冻结，严格依赖锁和 SHA-256 校验下原生编译成功，耗时 33m18s。
- 实际 APK 审计拒绝 ACCESS_WIFI_STATE、USE_BIOMETRIC、USE_FINGERPRINT 三项依赖加入的权限，以及额外导出的 `androidx.profileinstaller.ProfileInstallReceiver`（该组件原本受 DUMP 权限保护，但不属于私有版必需入口）。另有两个资源检查因 R8 缩短路径而无法找到文件，不能把这两项当作 XML 策略本身失败。
- 已下载未通过的诊断 artifact `12753409740`，ZIP 摘要 `0a7a613d003681768fa4cb5b440ada53be920409eb4f279339747c5cb994372b`；APK 摘要 `f54842c1ae1b3474b9c18028afec727f0be988311bfbd8cfa6f6b3002d4f834b` 均复核一致。APK 只保存在 work 诊断目录，不作为合格交付。
- 修正资源检查器：按 Manifest 中的资源 ID 校验资源表中的 `xml/private_*` 身份，只接受一个默认配置和真实 XML 文件，拒绝别名、错误引用和额外限定版本，再解析表内实际路径。对本 APK 的 `res/Xs.xml` 和 `res/RZ.xml` 真实解析，网络、备份/D2D 规则均通过。新增用例先失败后通过，Python 策略测试现在为 9 项；未放宽 XML 内容要求。
- 本地对原 APK 再检查，仍明确拒绝三项多余权限、文件浏览 queries 和额外接收器。ZIP 完整性通过，未发现 JAR 签名文件或 APK Signing Block，确认其未签名；它仍不是通过审计的候选。
- 已加入三项权限的移除标记、ProfileInstallReceiver 的合并移除规则，以及 queries 的 `tools:node="removeAll"`。仅删除应用源 queries 无法阻止依赖库再次加入，规则依据 [Android Manifest 合并说明](https://developer.android.com/build/manage-manifests)。NetInfo 对 Wi-Fi 信息访问有权限检查；私有凭据未启用可选生物识别，因此移除相关权限不改变要求保留的功能，但最终仍需手机验证。
- 当前配置的工程生成、静态 646 项、私有 26 项、Python 9 项测试通过；本地完整浏览器 162/162 通过。修正后的最终 Manifest 和 APK 仍需下一次严格构建验证。

## 第八轮最终结果

[第 8 轮](https://github.com/qcmhwgz/opencode-mobile-private/actions/runs/40550542419) 在提交 `932034b4ed1a5f8ecaaa2c84d738a301afaec3dc` 上全部成功。646 单元、26 私有边界、9 Python 策略、162/162 浏览器回归及严格原生编译通过；APK 检查失败列表为空。最终 APK 无三项多余权限、package queries 或 ProfileInstallReceiver，备份和网络 XML 实际内容通过检查。本地下载复核及未签名/16KB 检查通过；详见 BUILD-RESULT 和 validation/OpenCode-Mobile-Private-*。历史各轮失败记录保留为过程证据。
