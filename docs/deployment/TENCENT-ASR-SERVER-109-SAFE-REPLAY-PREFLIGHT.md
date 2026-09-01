# ASR-SERVER-109-SAFE-REPLAY-PREFLIGHT

## outcome

blocked。安全重放 Preflight 通过，但唯一一次 Execute 返回 `ASR_TASK_ACCEPTED`，结果不可观测；未重试。

## evidence

- RunId：`asr-109-20260829-r1`
- archive SHA：`d2cacb4f7f26152a63347de08b12c1f020e17113d3379be2f613a0575a6fa6a9`，与期望值一致。
- plan SHA：`6cb6c2af4a7e976fc91417f1bb026acf175ca05bd2f9751050ab561b8444ae96`
- Preflight：`outcome=passed`；`network_actions=0`、`external_writes=0`。
- runner SelfTest：`outcome=passed`，包含 `reconciliation_preserves_remote_facts`；Secret 仅校验 schema，未输出值。
- 计划保留 accepted/unknown 语义：CreateRecTask 上限 1；unknown 仅允许同一 TaskId 对账，不重发。

## execute_result

- Execute：`outcome=blocked`、`code=ASR_TASK_ACCEPTED`、`stage_code=ASR_TASK_ACCEPTED`。
- `business.run` 为 failed/unknown；`reconciliation_preserved=true`，绑定同一 RunId `asr-109-20260829-r1`。
- 计数：`network_actions=9`、`external_writes=8`；CreateRecTask 实际结果与 TaskId 不可观测，未执行第二次 Create 或额外查询。
- runner 报告其既有 owned-only cleanup 事件完成，`cleanup_errors=[]`；本轮未另行发出 cancel/delete/drop 命令。
- 未取得 batch、cue、usage 或 operation 的完成事实，也未输出 TaskId、转写文本、Secret、对象键或媒体内容。

## next_execute

本轮已执行唯一 Execute；不得再次执行。原计划参数如下，仅作审计留存：

```powershell
pwsh -NoProfile -File .\deploy\debian\bin\Invoke-TencentAsrSynthetic.ps1 -Execute -RunId asr-109-20260829-r1 -ArchivePath C:\tmp\qimao-terms-cloud-asr-100-candidate-20260829.tar.gz -ExpectedArchiveSha256 d2cacb4f7f26152a63347de08b12c1f020e17113d3379be2f613a0575a6fa6a9 -PlanSha256 6cb6c2af4a7e976fc91417f1bb026acf175ca05bd2f9751050ab561b8444ae96
```

## remaining_gap

ASR 已返回 accepted 类稳定码但结果不可观测，无法确认同一外部任务、batch、cue、usage 或 operation 终态；按规则停止，不重发 CreateRecTask。

## next_owner

PLANNING
