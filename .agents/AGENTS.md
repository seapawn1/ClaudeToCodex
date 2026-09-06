# Project Memory

The following files hold the shared project context and memory. Read them in full before starting work. All paths are relative to the project root:

- `.claude/CLAUDE.md`
- `.claude/memory/MEMORY.md`

If output is truncated, read the remaining sections. Report missing files.
Follow relevant project conventions and read referenced memory files as needed. You can only maintain CLAUDE.md.

# Workstation

## Workstation SSH Access

Local network SSH connection to workstation (server):

- **Alias**: `workstation`
- **IP**: `10.20.135.33`
- **User**: `xinanquyuzhongx\seapawn`
- **Auth**: Key-based (`~/.ssh/id_ed25519`)
- **Connect**: `ssh workstation`

Firewall restricted to `10.20.0.0/16` subnet only.

> **Note**: If SSH fails, confirm current network environment with the user before
> diagnosing — IP, subnet, and firewall rules are all network-dependent.

## Workstation WSL2 Access

- **Distribution**: `Ubuntu-24.04`
- **Linux user**: `seapawn`
- **Connect**: `ssh workstation` → temporary interactive Scheduled Task →
  `wsl.exe -d Ubuntu-24.04`

Directly calling `wsl.exe` from SSH is currently blocked. The `SeaPawn` Windows
account must be logged in. Remove the temporary task and output file after use.

# Misc Conventions

- **Mermaid diagrams render top-down**: always `flowchart TD` (vertical), never `LR`
  (horizontal) — inline in conversation and in files alike.
- **Plan mode is discussion-first**: never write the plan until the user explicitly
  says to write it. Before that, keep discussing the questions and uncertainties
  until they are clear.