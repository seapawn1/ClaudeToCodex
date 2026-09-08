# 插件候选 2：SM 复验

结论：**F01/F02/F03 已修复并通过本轮针对性复验；总体技术验收仍受阻于真实 hook 执行证据，尚未进入 PO DoD 验收。** 不把必要授权、宿主加载、实际执行或 PO 体验混为同一项。

## 验收对象

- 插件 commit：`b6286c0b6756ac418a295521fbde1072fc89671f`；GitHub 草稿 `v1.0.0-plugin-candidate.2`，Release ID `384994893`。
- ZIP SHA256：`185da0bfc6e5c656a38e4c60567485a626566bf741925e69101362e5d6cb5e6b`。文档后续提交 `c977fa7` 不改插件包；更新后的 HOST-EVIDENCE-STEPS 草稿资产与仓库内容逐字节一致。
- 环境：Windows 10.0.19045、Codex CLI 0.153.4、Node.js v24.14.0；执行记录为 2026-09-08 UTC / 2026-09-09 Asia/Shanghai。独立运行目录位于 `%LOCALAPPDATA%/ClaudeToCodex/test/sm-plugin-candidate2-20260909`。

## 已核实结果

| 检查 | 结果与证据 |
|---|---|
| GitHub 下载及 manifest | 哈希一致；包内 Verify-Release 输出 checked=20、extra=0、VERIFY=OK。见 github-release.json、verify-release.txt |
| 实际隔离安装 | marketplace/add/list 成功；19 个安装副本文件与 ZIP manifest 一致。见 isolated-github-install.json、installed-package-and-skill-locator.json |
| F01 真实注册格式 | 从下载包读取当前真实 Claude 注册表，在独立数据目录 connect 成功；进程内比较 matchesPeerToken=true、matchesEntireKeyFile=false。未向会话发送消息，未更改 Planning 桥，未记录凭据。见 real-registry-token-check.json |
| F02 skill 路径定位 | 执行本次安装副本 SKILL.md 中的定位片段，得到与实际 installedPath 完全相同的目录，cliExists=true。见 installed-package-and-skill-locator.json |
| F02/F03 用户说明 | INSTALL 与 c977fa7 的 README 均采用安装、必要授权、自然语言指定会话、交流；已移除主流程中读取不存在字段及要求用户执行桥命令的步骤 |
| 交接说明 | c977fa7 区分安装位置、宿主加载、实际执行，纠正回复命令路径的证据强度；按仓库或包内运行说明不同结果。更新资产回读一致，见 updated-instructions-check.json |
| 回归 | 包内 connect 12、store 11、pipe 3、install 2，共 28 个测试通过；原始逐项报告仍为 7 PASS / 0 FAIL / 3 BLOCKED、退出 1。见 package-acceptance.json、package-acceptance.txt |
| 新宿主及新线程发现 skill | 实际 Codex app-server 成功创建临时新线程，技能目录列出 enabled 的 claudetocodex:claudetocodex，路径在本次安装缓存，无加载错误。见 real-host-loader.json |
| hooks 加载与路径展开 | 实际宿主发现 PostToolUse、UserPromptSubmit、Stop 三条 hooks，PLUGIN_ROOT 展开为候选 2 的安装缓存路径，无加载错误。见 real-host-loader.json |

## 剩余受阻项

三条 hooks 均为 enabled=true、isManaged=false、trustStatus=untrusted。尚无通过宿主信任后实际执行、注入当前会话上下文的证据。**AC-08-01c 继续 BLOCKED，总体技术验收不通过。**

包内报告的 01b/01d 受阻已有独立安装和宿主发现证据补充；这不改变原始报告，也不把未经执行的 hook 计为通过。新插件的完整原始会话请求、回复、追问链路尚未据此证明；离线回归、令牌比较及宿主加载只覆盖各自检查范围。

后续需先对本次安装副本的三条 hook 完成宿主正常的审阅与信任，再取得实际执行和消息注入证据。没有修改信任配置，没有使用绕过信任的启动参数。当前独立配置未登录模型账户；现有宿主检查未发起模型推理，不能当作端到端体验。若实际运行验证需要交互式登录或授权，应明确列出所需步骤。

待审阅的完整命令、来源文件、事件和 currentHash 已由真实宿主列出，保存在本目录 real-host-loader.json；它们都调用候选 2 安装缓存中的 bridge/cli.mjs hook。

## 交接与发布状态

Developer 已交付功能修复与文档修正，并暂停相关文件改动以待 SM 验收。候选 1 失败证据保留。下一步为取得必要宿主授权并补齐运行证据，通过后才交 PO 亲身验收；Review、Retro 后发布已验收的同一份资产。
