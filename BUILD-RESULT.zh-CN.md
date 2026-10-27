# 第 8 轮严格构建结果与本地签名

2026-10-28，Asia/Shanghai。

**已生成并核验 Android arm64 未签名 Release APK。尚未使用用户正式密钥签名，需本地签名后安装。**

- 文件：`OpenCode-Mobile-Private-unsigned.apk`，43,776,059 字节。
- APK SHA-256：`e2034d866adbc963a3b1a7f6fdb32d52cd4b9c4678abd92462e35712a977ef17`。
- APK 编译来源：`932034b4ed1a5f8ecaaa2c84d738a301afaec3dc`，源文件树 `9d81d77cc23737491ef4bc359a7a12a887901ef7`。
- [GitHub Actions 第 8 轮](https://github.com/qcmhwgz/opencode-mobile-private/actions/runs/40550542419) 全部成功；首次冻结关闭，使用已提交的依赖锁与 SHA-256 元数据严格构建。
- 应用 ID：`app.opencode.mobile.privateedition`；版本 1.0.98 / versionCode 98；仅 arm64-v8a。

646 项单元、26 项私有边界、9 项资源策略、模拟服务自测、162/162 浏览器回归通过。实际 APK 在 CI 和本地均通过权限、导出组件、DEX、ABI、Manifest 引用及实际网络/备份 XML 检查。仅保留 INTERNET、ACCESS_NETWORK_STATE 和应用内部签名级动态接收权限；唯一导出组件为 MainActivity，无 package queries。调试和备份关闭。

本地复核 artifact ZIP 摘要与 APK 摘要、来源提交及 26 份冻结输入均一致。ZIP 完整、无重复条目、无 JAR 签名或 APK Signing Block，确认未签名；APK ZIP 对齐及 26 个 ELF 原生库均满足 16 KB 对齐检查。`apksigner verify` 对未签名文件返回失败是预期结果，不构成用户正式签名已验证的证明。

记录见 `OpenCode-Mobile-Private-provenance.json`、`OpenCode-Mobile-Private-audit.json`、`OpenCode-Mobile-Private-binary-verification.json`。本目录的 SHA256SUMS 用于交付文件摘要复核。

## 本地签名

本次聊天的本地交付目录另提供 `本地签名.command`，Mac 上可双击使用；从 GitHub 获取源码时可按 README 的标准 Python 签名命令操作。它先核对这份未签名 APK 的摘要，再在本机询问已有密钥文件路径、别名及独立确认的证书 SHA-256；密码由签名程序在本机隐藏输入。密钥和密码不会上传到聊天或 GitHub。需要源项目文件夹 `OpenCode-Mobile-Private-Edition` 与 APK、脚本放在同一目录。

若还没有密钥，先按源项目 `README.private.zh-CN.md` 的“本地签名”章节在自己的安全目录生成并备份。用 `keytool -list -v -keystore /你的密钥路径 -alias 你的别名` 独立确认并保存证书 SHA-256。不要把密钥、密码或服务器凭据放入项目目录或仓库。

辅助脚本调用已有 `scripts/private/sign.py`，执行 v2/v3 签名、证书匹配、验签和对齐复查，生成 `OpenCode-Mobile-Private-release-signed.apk`、签名记录和最终 `.apk.sha256`。本次未执行用户正式签名，因此未提供正式签名证书或已签名 APK 的摘要。Windows 可按 README 使用同一个 Python 签名工具；本次未在 Windows 上执行。

## 仍需本地验收

真实服务器认证探测按用户选择稍后本地运行：`python3 scripts/private/probe-local.py`。手机上用已有 WireGuard 测试项目与跨端旧会话、SSE、Diff、终端、允许/拒绝审批、断线恢复，并完成按应用流量、VPN 断开、凭据、截屏和备份/迁移验证。当前未连接手机，不能宣布完整真机安全审计或真实 2.1.4 兼容性已经通过。全程未重启、升级或修改现有服务器。

后续只补充构建文档和验证记录的提交不改变这份 APK 的编译来源；以此处列出的 APK Source Commit 与 provenance 为准。
