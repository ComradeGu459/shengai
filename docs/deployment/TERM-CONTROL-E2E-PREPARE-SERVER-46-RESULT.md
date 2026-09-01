# TERM-CONTROL-E2E-PREPARE-SERVER-46

artifact_written

## outcome

`prepare_only_passed`。本片仅完成本地准备、静态门和既有 self-test；未执行 SSH、SCP、服务器、Secret 读取、Provider、COS 或业务 API。

## prepared artifact

唯一准备目录：`C:\Users\ComradeGu\Documents\七猫兼职\term-control-e2e-final-prepared`

| 文件 | bytes | SHA-256 |
|---|---:|---|
| `term-provider-usage-20260830-r1.tar.gz` | 9471776 | `020437197f6fef783fa04a1789ba727cf293a152d140b38630122a9677c3b925` |
| `bootstrap.mjs` | 27910 | `c75696ae484c23beb9fc955021e8de78126cd23fef6e3ca5da9ef90aedff51fb` |
| `business.mjs` | 73143 | `213a61f2493ff3a63026f73e7c5190e8a7960ad451fe8cba31567fac9845910e` |
| `runner.sh` | 18118 | `985d5cd0a0e55ec3762a4cfb883d7badbb3b9fa9ac6a9f738cffde5e155aea5b` |
| `media/episode-001.mp4` | 736325 | `bceac576c7502dd93badf8e5f00a4fc1979013773c28c0d283e44476694d542d` |
| `bytes-sha.json` | 756 | `3e209d3552319f4bbb67f98d9641c6919771be9a9f1548eb5aa1ee40873e5dc2` |

`bytes-sha.json` 由实际文件读取和 `Get-FileHash` 生成；其清单主体列出 archive、bootstrap、business、runner 和 media，未手抄值。准备目录按本片要求保留，未生成第二目录或旧归档。

## evidence

- archive 前门：只接受 usage archive `020437…b925`，实测 bytes/SHA 一致；未使用旧 `d8e1…` 归档。
- media 前门：本轮仅保留一次已冻结媒体，实测 736325 bytes / `bceac576…d542d`；此前已完成 ffprobe，时长 15 秒，视频 H.264、音频 AAC。
- bootstrap 时序：runtime env-dir 副本 → prepare/create DB → qimao 明确 peer URL migrate → qimao 读取生产 `DATABASE_URL` 作为 pg_dump 只读源 → 十表管道写入 isolated；目标 `psql` 含 `-v ON_ERROR_STOP=1`。
- route-copy 后门：保留 pointer/terms_api target 唯一性和生产身份投影匹配检查；未执行。
- business 时序：固定合成 SRT 含虚构人物“玄霜”和虚构地名“云岚城”；POST extraction 取 `{run:{id}}`，同一 attempt 检查非 fake adapter 与 `deepseek-v4-flash`，随后只调用一次 `TermExtractionWorker.runOnce()`；候选请求绑定 `completedWorkspace.activeDraft.id` 且 `status=pending`，批量 approve 后刷新 draft revision，release 只读取 `response.version.id`。
- ASR 取证时序：只从 `finalBatch.jobs[].attempts[].result.cues` 取 cue；`result.termVersionId` 与 `result.hotwordDigest` 分别绑定 TermVersion 和 `finalBatch.hotwords.digest`。未再请求缺 draftId 的 `/terms/cues`。
- 状态合同：数据库 attempt 成功态保留 `succeeded`；Worker 与 workspace run 成功态使用 `completed`。Worker 失败会优先读取同一 run 的稳定 `error_code`，不输出 error detail 正文。
- 外部事实投影：prepared business 将 DeepSeek POST 的真实计数/HTTP status、Tencent Create 的公开 transport 调用计数，以及 ASR 创建状态写入固定白名单 business facts；DeepSeek 计数在注入 fetch 调用前递增，响应返回后记录 status。prepared runner 先持久化该事实，再进入清理；unknown/accepted 未终态不删除隔离上下文。冻结包的公开 Tencent transport 成功返回不携带 HTTP status，因此不再读取私有 client、伪造腾讯 HTTP status 或设置腾讯 HTTP 2xx 门；本片未运行，因此没有外部调用事实可宣称。
- 错误投影：bootstrap/business 失败保留其 JSON 安全 `code` 和原阶段；未统一改写成 `*_FAILED`，stderr 不进入交付证据。
- 本地验证：`D:\Git\bin\bash.exe --noprofile --norc -n runner.sh` 通过；runner 内 4 个 heredoc Node 片段均通过 `node --check --input-type=module`；`node --check business.mjs`、`node --check bootstrap.mjs`、business `--self-test`、bootstrap `--self-test` 均通过。必要断言确认无旧 cues endpoint、无外部计数硬编码、候选 draft/status 门存在、release version.id 门存在、ASR digest 来源正确、DeepSeek 计数先于 fetch、HEAD 异常不被吞掉、reconciliation fact 会保留。

## external_call_count

DeepSeek POST=0（本片未执行）；Tencent CreateRecTask=0（本片未执行）；COS/API 写入=0。

## remaining_gap

尚未在测试服务器运行 transient unit，因此尚未产生真实 run/attempt、confirmed TermVersion、Tencent TaskId、HotwordList 或四 unit 运行态证据。这是本片 prepare-only 边界，不是业务失败。

## next_owner

规划审核后，由下一 SERVER 切片以当前唯一准备目录和冻结 `bytes-sha.json` 直接执行；不得重建媒体、archive、business 或 runner。

## residual

准备目录按要求保留；无第二准备树、无服务器 transfer/staging/unit/status 残留。本地仓库本片只新增本结果文档；既有脏工作树未触碰。

## requires_user

false
