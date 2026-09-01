# TERM-BUDGET-FIX-CONTRACT-SERVER-74

artifact_written: true
outcome: passed
requires_user: false

## evidence

SERVER-73 的 `root_file_contract` 首个判断式为：

`fileStat.isFile() && !fileStat.isSymbolicLink() && fileStat.size === entry.size`

本片以冻结 SERVER-49 三件套复核通过的输入，执行一次 root-only transient；只用系统 `tar -xzf` 解包到固定诊断 stage，并在该判断式上按 `members.base` 顺序停止于首个差量。首个可证伪差量如下：

| 项 | expected | actual |
|---|---|---|
| path | `backend/dist/modules/system-control/system-control.budget.service.js` | `/var/tmp/qimao-term-budget-fix-contract-74-stage/backend/dist/modules/system-control/system-control.budget.service.js` |
| type | `file` | `file` |
| owner/group | manifest 未规定 | uid/gid `0/0` |
| mode | `0644`（manifest mode=420） | `0644` |
| bytes | `64385`（`members.base[].size`） | `64469` |
| SHA-256 | `members.base` 未提供该字段 | `58d9c307b027c772b024e4873aafba2b6ce732e91c78b1658fb8ff311ab48c8a` |
| symlink | 不适用 | 非 symlink，linkname=null |

同一冻结 manifest 的 `contentDiff` 与 `budgetTarget.compiled` 对该候选文件明确给出 `64469` bytes / `58d9c307b027c772b024e4873aafba2b6ce732e91c78b1658fb8ff311ab48c8a`。因此实际解包文件与候选合同完全一致；差量只发生在 checker 取值：它从 `members.base[].size=64385` 做 candidate 文件的 size 比较。系统 tar 解包、owner/group、mode 与类型均未构成首因。

本片执行计数：SCP=1（仅冻结三件套加诊断物），root transient=1；发布/rename/current/static切换/unit重启/migration=0；DeepSeek/Tencent/COS/业务 API 写入=0。transient 返回首差量后精确清理固定 transfer 与 stage，unit `LoadState=not-found`，两路径均 absent。

## root_cause

`root_file_contract` 将 base archive 的 member size 误用作 candidate archive 的 regular-file size。候选包并非首因：candidate SHA/bytes 与 manifest 的 `contentDiff.candidate`、`budgetTarget.compiled` 一致；也没有证据表明系统 tar 改变了文件内容。

## minimal_fix

只修 checker 的期望值来源：对允许的三项 `contentDiff` 文件使用 manifest 中的 candidate bytes/SHA（或 candidate member 表），不要用 `members.base[].size` 判断 candidate 文件；保留现有类型与 symlink 边界门。

## residual

生产 current/static、四 unit、DB、route、env、Secret 均未触碰；没有 release/static 创建或切换。SERVER-74 的远端 transfer、stage、transient 均清零；本地冻结候选未修改。其余成员未因首个差量继续检查。

## remaining_gap / next_owner

remaining_gap：73 发布门未重跑，尚未验证修正后的 checker 能通过完整候选文件树。

next_owner：PLANNER；按上述单一 checker 取值修正另行安排后续发布门。

