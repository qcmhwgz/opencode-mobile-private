# OpenCode Mobile Private Edition

Android private fork for the existing OpenCode server at `http://10.0.0.2:47119` over WireGuard.

请先阅读 [私有版构建与本地签名说明](README.private.zh-CN.md) 和 [实际验证记录](SECURITY-VALIDATION.zh-CN.md)。

This fork never signs in CI. It does not require restarting, upgrading or modifying the server. Upstream source is pinned in `private-source.json`; npm dependencies and build tools are pinned in their respective lock files. Actual native build and device acceptance status must be checked in the validation report.

Original documentation: [README.upstream.md](README.upstream.md). License: [Apache-2.0](LICENSE).
