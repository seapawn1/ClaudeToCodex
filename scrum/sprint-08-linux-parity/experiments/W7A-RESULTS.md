# W7a 切片结果：Node Build/Verify 重写与新旧包对照（Sprint 08）

- 日期：2026-09-18。执行：Developer。
- 交付物：`bridge/release/zip.mjs`（最小 deflate zip writer＋中央目录 parser，UTF-8 flag/时间戳/CRC）、`bridge/release/build-release.mjs`（git archive(tar) 内容→stage→manifest.json→zip＋.sha256 sidecar，输出行与旧脚本同名同义）、`bridge/release/verify-release.mjs`（zip＝**只读**解析中央目录逐项 inflate＋CRC＋SHA256 比对；根目录＝遍历比对）、`bridge/test/release.test.mjs`（4 测试）。双树删除 `Build-Release.ps1`/`Verify-Release.ps1`；`Test-Acceptance.ps1` 保留（W7b 后置）。

## 真实构建与校验（退出判据，Linux 侧）

- 从 HEAD 真实构建 plugin 模式候选（版本号 0.0.0-w7a 测试号）：build exit 0 → verify（zip 只读路径）`VERIFY=OK` exit 0 → `.sha256` sidecar 与重算一致 → **python3 zipfile 独立外部校验**（testzip/CRC/内容/时间戳/UTF-8 文件名）通过。
- 篡改路径：解压根内改一字节 → `MISMATCH`＋exit 1；zip 载荷翻转字节 → parser 拒绝（CRC/inflate/结构错误，不误过）。
- 字节稳定性：同输入同字节（deflate level 9 固定）。

## 新旧 manifest 结构对照（PBI-18-4 素材）

- **manifest.json 字段集与 1.3.0 完全一致**（release.test #2 断言锁定）：顶层 `product/version/sourceRef/sourceCommit/commitDate/fileCount/files`；`files[]` 项 `path/sha256/bytes`；`fileCount=files.length+1`（含 manifest.json 自身）。
- **包内容 vs v1.3.0**（`git diff --name-status v1.3.0..HEAD -- plugins/claudetocodex` ＋ 本切片未提交项）：
  - 删除：`bridge/delivery/{Send-ClaudePipe,BridgeQueue,Register-ClaudeEndpoint}.ps1`、`bridge/release/{Build-Release,Verify-Release}.ps1`
  - 新增：`bridge/delivery/transport.mjs`、`bridge/release/{zip,build-release,verify-release}.mjs`、测试 `transport/token/register/platform/release.test.mjs`
  - 修改：cli/sessions/store/roots、六件文档（SKILL/plugin.json/USAGE/SMOKE 等）、既有测试平台化
  - 保留：`bridge/release/Test-Acceptance.ps1`（W7b 后置，README/测试如实标注）
- 安装入口与 zip 根布局不变（zip 根＝插件树＋RELEASE-NOTES.md）。

## 过程记录（诚实呈报）

- zip writer 初版 EOCD 字段偏移写错（entries/size/offset 各偏 4 字节）——被自身测试当场击落并修正；此类错误正是 D-E 要求 zip writer 单测＋外部校验双保险的原因。
- zip 时间戳为无时区本地时间字段（与其他 zip 工具一致）；测试用本地构造时间对齐写读两侧。

## 验证

- release.test.mjs 4/4；全套件见下。pause-and-decide 未触发（无失败需呈报）。
