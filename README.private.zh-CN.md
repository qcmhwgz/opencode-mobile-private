# OpenCode Mobile Private Edition

**当前修复源码：1.0.99 / versionCode 99，新 APK 构建与手机验收另行记录。第 8 轮产物 1.0.98 虽通过静态 APK 检查，但现已复现 Android 启动崩溃，不应继续作为可用安装版交付。** 历史构建记录见 [BUILD-RESULT.zh-CN.md](BUILD-RESULT.zh-CN.md)，缺陷与修复见 [启动修复记录](docs/private-android-startup-2.2.0.md)。

基于 `alvarolorentedev/opencode-mobile` 的 Android 私有版本。上游提交、客户端依赖和构建工具见 `private-source.json`、`package-lock.json`、`private-toolchain.json`。服务端预期版本按用户 2026-10-29 更新为 **2.2.0**，真实认证兼容性需以本地探测和手机验收为准。

**现有服务器不需要安装、升级、重启或调整任何组件。** 开发验证仅对真实服务器发出了未认证 GET 请求，返回 401；用户选择稍后自行完成认证探测。测试中的创建会话、审批、命令和终端操作只针对本机假服务。

## 保留与限制

保留项目、已有会话与历史分页、SSE 与轮询恢复、Diff、PTY 终端、工具权限审批及问题回答。SDK 固定为 `@opencode/client 2.0.16`；假服务测试不能代替对真实 2.2.0 的验证。

原生 HTTP/XHR/Expo Fetch/终端 WebSocket 限制为 `10.0.0.2:47119`，拒绝自动重定向和系统代理，检查存在活动 VPN，并使用绑定该 VPN 的 SocketFactory。手机需要开启已有 WireGuard，并让该应用和目标地址经过 VPN。无需在本应用内保存 WireGuard 私钥。VPN 绑定、断线和分流行为仍需在你的手机上验收。

关闭 Cloud Link、购买、商店更新与 OTA、语音、推送通知、桌面小组件、外链跳转及对外分享。移除更新原生模块；购买、ML Kit、Firebase 通知、安装来源、语音、开发客户端及小组件原生库被排除出 Android 自动链接，相关 JavaScript 使用不可用实现。原上游相关源码和构建期类型包部分保留以减少协议功能改动，不能把“源码仍有外部 URL 字符串”和“运行时已发出请求”混为一谈。

禁止备份、设备迁移、截屏和系统内容捕获，移除分享/深链入口。网络安全配置只为目标 IP 开放 HTTP；原生拦截器进一步约束协议、端口和凭据，防止向其他 HTTPS 目标发出请求。终端 WebView 禁止网络加载，使用本地打包资源和原生 PTY 通道。Markdown 禁用图片加载，远程附件缩略图不自动下载。

连接密码和自定义请求头继续使用 SecureStore；它们不进入 AsyncStorage、源码、APK、工作流或日志。私有版不把消息正文写入持久化 transcript/widget 缓存；项目路径、会话标题、收藏、偏好等元数据仍在应用私有存储中。源码中默认用户名/密码为空，在手机上手工输入已有凭据。

## 本机构建

需要 Node 22.21.1、JDK 17.0.17+10 和 Android SDK（Command-line Tools 19.0）。固定工具版本见 `private-toolchain.json`。先在终端切换到本项目目录：

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run test:ci:static
npm run private:test
python3 -m unittest discover -s tests/private -p '*_test.py'
npm run test:fake-server:self
npx --no-install playwright install chromium
npm run test:e2e:web:isolated
```

`EXPO_NO_TELEMETRY=1` 与 `EXPO_NO_DOTENV=1` 应在整个构建环境中设置；私有构建脚本和 Actions 已设置。禁止将生产凭据写入 `.env` 或 `EXPO_PUBLIC_*`。

```sh
npm run private:build
```

生成目标为 `android/app/build/outputs/apk/release/app-release-unsigned.apk`。流程显式移除了 Expo 模板给 Release 使用调试密钥签名的配置，不读取任何签名 Secrets。

项目已包含从第六轮真实构建取得并审查的主工程依赖锁与校验元数据；第 8 轮严格重建与实际 APK 审计已通过，细节见最终构建记录。缺少 app 锁或校验元数据时正常构建会停止。仅在重新审查原生依赖输入时使用首次冻结：

```sh
npm run private:build -- --freeze-dependencies
```

首次冻结从官方 Maven/Google 仓库建立信任，生成 `config/private/gradle-locks/` 与 `config/private/verification-metadata.xml`。审查并提交这些文件，再运行正常严格校验构建。首次生成摘要本身不能证明依赖可信，不能把冻结步骤当成已经完成的审计。后续构建遇到摘要变化应调查原因，禁止盲目重新生成以绕过失败。

## GitHub Actions

已根据用户授权导入私有仓库 [qcmhwgz/opencode-mobile-private](https://github.com/qcmhwgz/opencode-mobile-private)，默认分支为 `main`。首次导入的 Git 文件树与本地源码完全一致。后续开发请以该仓库的最新 `main` 为准；原本地 `private-edition` 分支保留上游历史，与连接器创建的远端提交历史不同，不要直接强制推送覆盖远端。保留许可证，不上传 `node_modules/`、`android/`、密钥、密码、`.env` 或缓存。

在 Actions 选择 **Private Android candidate (unsigned)**，点击 **Run workflow**，不勾选首次冻结即可执行严格构建。第八次运行已通过全部 162 项浏览器测试、严格原生编译和 APK 检查，详见 `BUILD-RESULT.zh-CN.md`。CI 浏览器并发为 2，先独立打包测试页面；失败诊断保留 3 天，没有修改测试断言或过期时间，也没有启用自动重试。

Actions 权限只有 `contents: read`，官方 actions 固定到提交 SHA，手动运行才构建未签名 arm64 APK。流程先执行静态检查、出站限制测试、假服务测试和浏览器回归，再执行构建、未签名状态检查、合并 Manifest/DEX 检查和 SHA-256 计算。任何门禁失败都不会上传候选 APK。下载的 artifact 是未签名候选，不能直接安装。

不配置 Android 签名 Secrets。若原生锁尚未生成，可先在可信本机完成冻结，或手动运行 Actions 并选中 `freeze_native_dependencies`。首次运行只生成需审查的候选及 `native-dependencies/`；将其中的锁和校验元数据审查后提交到 `config/private/`，再不勾选该项运行严格构建。正常 Actions 会拒绝缺少锁的构建。

## Android 启动修复与 2.2.0 核对

1.0.98 的通知替代模块遗漏了 Android 启动路由调用的两个 API，会在不连接服务器时复现函数不存在的错误。1.0.99 补齐无副作用的监听生命周期和空通知读取；不恢复通知模块、权限或外部通信。实际 Android hook 与替代模块的回归先失败后通过。此前浏览器回归跳过这条原生分支，不能据其通过推断真机启动已通过。

## 本地签名

使用你自己保管的 JKS/PKCS12 密钥。已有安装若要覆盖升级，必须保持相同应用 ID 和证书；本应用 ID 为 `app.opencode.mobile.privateedition`，不覆盖上游官方应用。密钥不交给聊天或 GitHub，丢失后不能用新密钥直接覆盖旧安装。

如果尚无正式密钥，请在你自己选择并保管的安全目录创建（命令会交互询问密码；不要把密码写入命令）：

```sh
keytool -genkeypair -keystore /你的安全目录/opencode-private.p12 \
  -storetype PKCS12 -alias opencode-private -keyalg RSA -keysize 4096 \
  -validity 10000 -dname "CN=OpenCode Mobile Private Edition"
```

保管好密钥与密码的离线备份，不要放入本项目或上传到仓库。

先用本地 `keytool -list -v -keystore /你的路径/release.jks -alias 你的别名` 独立核对并保存证书 SHA-256。密码由 keytool 提示输入。然后运行：

```sh
python3 scripts/private/sign.py \
  --apk android/app/build/outputs/apk/release/app-release-unsigned.apk \
  --keystore /你的路径/release.jks \
  --alias 你的别名 \
  --build-tools /你的AndroidSDK/build-tools/36.0.0 \
  --expected-cert-sha256 你独立确认的64位十六进制证书摘要 \
  --output output/OpenCode-Mobile-Private-release.apk
```

脚本交互读取密码，执行 16 KB 对齐、v2/v3 签名、最终签名校验、证书指纹匹配、对齐复查，最后才写出 APK、`.signature.txt` 和 `.apk.sha256`。拒绝调试密钥别名、证书不匹配和覆盖现有输出。不得把成功运行该脚本之前的文件称为“已验证签名的 Release”。

```sh
python3 scripts/private/audit-apk.py output/OpenCode-Mobile-Private-release.apk \
  --aapt2 /你的AndroidSDK/build-tools/36.0.0/aapt2
```

此检查需要 SDK 的 `apkanalyzer`，它核查合并后的权限、导出组件、ABI 和若干禁止的原生命名空间。它不能替代真机渗透测试或流量捕获。

## 真实 2.2.0 的只读探测

在能连接该地址的电脑上运行：

```sh
python3 scripts/private/probe-local.py
```

预期版本来自 `private-source.json`，默认 2.2.0；可通过 `OPENCODE_PROBE_EXPECTED_VERSION` 显式覆盖。版本不符只表示与声明目标不一致，不能单独证明 API 不兼容。输入已有服务器密码；可选输入已有会话 ID。脚本只发 GET，拒绝重定向，不创建会话、不发提示词、不批准工具、不创建终端、不修改设置。报告只保存接口状态、字段名、SSE 收到字节数和版本，不保存响应内容、凭据或聊天正文。此脚本只是读取和响应形状检查，不能证明所有 SDK 调用均兼容。

## 手机上尚需验收

使用自己的签名 APK，在已有 WireGuard 下核对项目及旧会话、历史分页、SSE 实时输出、断网/重连、Diff，以及终端输入输出和重连。对审批分别测试一次允许、拒绝和未回答，确认没有意外启用自动审批。

通过手机侧按应用捕获流量，覆盖冷启动、设置、聊天中的外链/远程图片、附件、OAuth、后台/前台和 VPN 断开；只允许目标 `10.0.0.2:47119`。确认无 Cloud Link、商店、推送、更新或遥测请求。检查 APK 的实际权限和导出组件、备份/迁移、截屏限制与凭据存储。当前没有连接手机，未完成这些真机检查。

完整的已执行/未执行结果以 `SECURITY-VALIDATION.zh-CN.md` 为准，不能引用上游历史验证记录作为本分支的验证结果。

## 许可证

本派生版本保留上游 Apache-2.0 许可证与原始来源。修改说明见 `NOTICE`、本文件和各修改文件头。上游使用说明保存在 `README.upstream.md`，其中的云服务和商店发布流程不适用于本私有版。

主分支 main 的新提交会自动执行完整验证与未签名严格构建；手动运行也默认为严格模式。只有显式勾选首次冻结选项才重新生成依赖基线。
