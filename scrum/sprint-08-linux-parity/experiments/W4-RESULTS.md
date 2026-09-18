# W4 切片结果：数据根收敛 + renderPeer 平台分支 + 平台注释（Sprint 08）

- 日期：2026-09-18。执行：Developer。
- 交付物：`bridge/store.mjs`（`dataBaseDir` 唯一位置规则＋`renderPeer`/`shellEnvPrefix` 平台分支）、`bridge/roots.mjs`（`defaultRootOf`/`rootsParent` 全部派生自 `dataBaseDir`，去重三处拷贝）、`bridge/test/platform.test.mjs`（4 测试）。

## D-C 数据根（Linux = `~/.local/share/ClaudeToCodex`，`XDG_DATA_HOME` 覆盖）

- 三处（store.defaultRoot / roots.defaultRootOf / roots.rootsParent）收敛为 `store.dataBaseDir(env)` 单一规则：win32 `%LOCALAPPDATA%\ClaudeToCodex`，POSIX `$XDG_DATA_HOME`（**空串视同未设置**，按 XDG 规范）缺省 `~/.local/share`。
- `CTC_BRIDGE_DIR` 覆盖与测试专用 `CTC_ROOTS_DIR`/`CTC_SESSIONS_DIR` 语义不变。

## D-D 回复指引（Linux 可执行 POSIX 前缀）

- 旧（E2 实证 Linux 不可执行）：`$env:CTC_BRIDGE_DIR='...'; node "..." reply ...`
- 新 POSIX：`CTC_BRIDGE_DIR='<root>' CODEX_HOME='<home>' node "..." reply ...`（env 赋值前缀，单引号＋`'\''` 转义规则，含引号路径仍可执行——platform.test #3 断言）。
- Windows 分支保留 `$env:` 形态并补 `''` 转义（此前未转义）。S08-16-3"可执行回复入口"的 Linux 侧就此闭合（现场证据在 W8/W9 候选轮）。

## 测试与计数位移（呈 SM）

全量 110：90 pass / 15 fail / 5 skip。fail 12→15 的 +3 全部为**硬编码 Windows 规则**的既有断言（`C:\Users\t/...` 路径规则、`$env:CODEX_HOME='C:\...'` 前缀语法），因 D-C/D-D 有意语义在 Linux 生效而失败——D-H③ 移植对象，W5 处理；新增 4/4 通过，既有通过项零破坏。
