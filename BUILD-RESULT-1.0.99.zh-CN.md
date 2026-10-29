# 1.0.99 Android 启动修复构建结果

2026-10-29，Asia/Shanghai。

**严格构建与实际 APK 静态核验通过；产物未签名。手机启动与真实 OpenCode 2.2.0 认证功能验收尚未完成。**

本版修复通知精简模块遗漏两个 Android 启动 API 的缺陷。用真实通知路由 hook 和真实替代模块在 Android 分支中，不连接任何服务器即可复现缺失函数；修复前回归失败，修复后通过。用户报告的“打开 APK 后很快出现 undefined is not a function”与该路径吻合，但未取得该手机的堆栈，仍需用新包确认。此前 162 项浏览器回归跳过这个原生分支，静态 APK 检查也不能证明真机启动正常。

- 应用 ID：`app.opencode.mobile.privateedition`；版本 `1.0.99` / versionCode `99`；仅 arm64-v8a。
- APK 编译提交：`c608799bbcdca3afac96193cb6bd18b34d8b506a`。
- 编译文件树：`8bbe94b019420529672143c328dcc3668f3d1ee6`。
- [GitHub Actions 第 9 轮](https://github.com/qcmhwgz/opencode-mobile-private/actions/runs/40880121745)：验证及原生构建全部成功，首次冻结关闭，使用已提交的锁和 SHA-256 元数据严格构建。
- APK：`OpenCode-Mobile-Private-1.0.99-unsigned.apk`，43,776,207 字节。
- APK SHA-256：`93e6ff321113d06f4eef40a507d663752242e1420bf880a4c87f4b73921dae7b`。
- GitHub artifact ZIP SHA-256：`648fc27bfe3cd2f7f2ff1cc6ffc55e2080d5dc68bd00ef0b9aebcb048c7fa1a5`。此值与 APK 摘要不同。

本地及 CI：648 项单元、27 项私有边界（含 Android 启动回归）、9 项 Python 策略、模拟服务自测和 162/162 浏览器回归通过。CI 原生编译 `BUILD SUCCESSFUL in 17m 34s`。下载后复核 ZIP 完整性、源码提交和 26 份冻结输入；实际 APK 在 CI 与本地的检查失败列表均为空。权限仍仅 INTERNET、ACCESS_NETWORK_STATE 和应用内部签名级动态接收权限；唯一导出组件是 MainActivity，调试、备份关闭，网络和备份 XML 通过实际内容核验。APK ZIP 和 26 个 ELF 库的 16 KB 对齐通过。无 JAR 签名与 APK Signing Block；对未签名文件验签失败是预期结果，不代表正式签名完成。

通知保持禁用，未恢复原生通知模块、权限或外部通信。SDK/依赖版本未升级，只调整应用安装版本号和本地探测目标。只读探测已从写死 2.1.4 改为读取声明目标 2.2.0，支持 `OPENCODE_PROBE_EXPECTED_VERSION` 覆盖。

对照官方 2.0.16 和 2.2.0 OpenAPI，原有 136 个方法/路径均保留；这不能代替真实兼容验收。2.2.0 新增的 Diff.more 和模型 type 字段需要大 Diff/非聊天模型场景验证。Mac 不带凭据 GET `/api/info` 返回 401，未认证确认运行版本或执行真实 SSE、PTY、审批验收。未修改、升级或重启 OpenCode 服务。详见 `validation/compatibility-2.2.0.json`。

本地覆盖升级须沿用原密钥。已对交付目录内上一版已签名 APK（versionCode 98）重新完成 v2/v3 验签，证书 SHA-256 为 `6ea1674e2e2a4195ce78af51d7094b234d2a64632a89bfa4d7d1e2b41f5f2458`。本次聊天的 `签名修复版.command` 固定校验该证书及本页列出的未签名 APK 摘要，生成独立的 1.0.99 signed 文件；仅在用户本地输入密码后才会签名。本次未读取用户私钥或密码，也未签署 1.0.99。

后续仅文档/验证记录提交不改变本页列出的 APK 编译来源。
