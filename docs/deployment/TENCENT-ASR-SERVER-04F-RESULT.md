# TENCENT-ASR-SERVER-04F

## artifact

- `artifact_written: true`
- `outcome: blocked`
- `next_owner: 规划`
- `requires_user: true`
- CURRENT：`v4-1290`；formal execution lease：`1`。

## evidence

### 首门与安装

- `qimao` 用户、`qimao` 组存在；本轮未使用 `qima:qima`。
- `/etc/qimao-terms-cloud/backend.env`：`root:qimao 0640`，`776` bytes；`qimao` 可读。
- `/etc/qimao-terms-cloud/object-storage.env`：`root:qimao 0640`，`421` bytes；`qimao` 可读。
- 安装前 `provider.env` absent 是 04E 回滚后的预期状态，不作为首门失败。
- 仅复用既定 archive：本地及远端 SHA-256 均为
  `e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30`；本轮为安装重传一次，未重建候选。
- 安装 release：`/opt/qimao-terms-cloud/releases/20260828-tencent-asr-04f-r1`；未重跑 import/DB 门。
- 从 `D:\ChromeCoreDownloads\SecretKey.csv` 派生 provider 配置，未回显 SecretId/SecretKey；临时文件使用 `umask 077`，随后立即删除。
- `/etc/qimao-terms-cloud/provider.env` 安装后为 `root:qimao 0640`，`282` bytes，SHA-256
  `8f61cfce69981f879bac1b49a749af9b0aecd76666f1268120abfce6c841893f`。

### systemd 与健康窗

- canonical drop-in 按冻结内容安装：`root:root 0644`，`349` bytes，SHA-256
  `57aabccc081c85b2691e9c18603aa19ae0f701aee3a294e1a4d271fcdfe6405d`。
- `systemd-analyze verify qimao-worker@asr.worker.entry.js.service`：pass。
- effective identity：`User=qimao`、`Group=qimao`；effective ExecStart 指向
  `/opt/qimao-terms-cloud/current/backend/dist/workers/asr.worker.entry.js`。
- current 切换至 04F release 后，正确实例健康窗 `5/5` 稳定：`active/running`，`NRestarts=0`，`ExecMainPID=405135`。

### synthetic 前置门

- 生产 DB 只读检查：`active_asr_pointer=none`、`active_budget_pointer=none`；原始 counts 为
  `17|5|0|157|0|0|0`，其中 `term_versions=0`，无可用于本次业务链的活动 term version。
- 历史 ASR routing 版本均为 `retired`，历史 budget 版本均为 `retired`，对应 deployment 为 `disabled`；本轮未写控制面。
- 后端配置为 `QIMA...ACCESS_REQUIRED=true`；未携带合法 Cloudflare Access 身份调用只读 system-control API 返回 `403`。未绕过认证、未直接写 DB、未重建控制面。
- 因生产 Worker→COS→Tencent 的合法业务前置不成立，未下载固定 WAV，未写 COS，未执行 `CreateRecTask`，未执行 `Describe`，未产生业务/预算/日志证据，也没有重复创建风险。

### 回滚与清理

- 按停止条件停止 04F Worker，恢复 current 至
  `/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`，并执行 `daemon-reload`。
- 回滚复核：`current` 指向旧 release；`ActiveState=inactive`、`SubState=dead`、`NRestarts=0`。
- 本轮 release、`provider.env`、canonical drop-in、`/tmp/qimao-asr-04f-r1` staging 及 provider/drop-in 临时文件均 absent。

## remaining_gap

synthetic 被生产控制面前置阻断：当前没有 active ASR routing、active budget policy，也没有 term version；同时缺少可用于受保护 system-control API 的合法 Access 身份。本轮不能通过第二身份、直接 DB 写入、重建控制面或重复外部创建来补齐该缺口。

## files

- 已最终写入/覆盖：`docs/deployment/TENCENT-ASR-SERVER-04F-RESULT.md`。
- 回滚脚本仅作为本轮临时文件本地生成、检查、上传并执行，执行后已从本地及远端临时目录删除。
- 未修改业务源码、candidate、archive、`worker-release.declaration.json` 或现有本地部署工具；未重建 archive。

## residual

- 服务器恢复为回滚基线：旧 current 保留，backend.env/object-storage.env 保留且未改动；本轮 provider、drop-in、release、staging 无残留。
- 历史控制面 retired/disabled 状态未改动；没有新增 routing、budget、project、term version、asset、batch、job、attempt 或外部任务。
- 未执行 `reset`、`checkout`、`clean`、`stash`、提交或推送。

## requires_user

需要由规划确认合法的受保护 system-control 身份及现有 routing/budget/term-version 恢复方案，再安排后续执行；本轮不绕过认证、不重建候选、不重复 `CreateRecTask`。

## next_owner

`规划`
