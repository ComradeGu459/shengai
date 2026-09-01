# TERM-CONTROL-FINAL-E2E-SERVER-31

## 交付状态

- `artifact_written`: `yes`
- `blocked`: `yes`
- `outcome`: `blocked_at_deepseek_protocol_validation`
- `requires_user`: `false`

## 结果

CLI 参数门通过后，业务 invocation 使用了显式 `--run-id term-control-final-e2e-31-r1`，并以 `sudo -n -u qimao --` 运行；调用前数值身份为 UID `999`、GID `996`。

本次真实链路已进入 DeepSeek 阶段。DeepSeek POST 计数为 `1`，HTTP status 为 `200`，但 current release 的响应协议校验失败：稳定 `error_code=TERM_PROVIDER_PROTOCOL_INVALID`，稳定 `error_detail=术语 Provider 返回的 usage 数值无效。`。按停止规则未重发，也未进入候选确认、TermVersion 或 Tencent ASR 阶段。

## Evidence

- 稳定 projectId：`11d6799b-f467-4449-9150-cc19b48331f8`。
- 稳定 term runId：`9aea6ddc-7a42-46c7-8549-e97cd36c6a2d`。
- 稳定 attemptId：`d9dc5061-6a92-42fe-bd53-ec15da3d5cd6`。
- checkpoint 顺序：`terms_extraction_post_pending` → `terms_provider_post_pending` → `terms_provider_post_observed`；observed checkpoint 记录 HTTP `200` 与上述稳定错误码/详情。
- Provider 计数：DeepSeek POST `1`；Tencent CreateRecTask `0`；unknown 查询 `0`。
- 没有 confirmed TermVersion、HotwordList、hotwordDigest 或 Tencent TaskId 验收证据。
- 失败后的现有 ProjectCleanupWorker 执行结果为 `completed`；project 状态为 `purged`，purge tombstone 为 `1`，assets/term_versions/asr_batches 均为 `0`。
- 收尾健康核验：四个 unit 均为 `ActiveState=active`、`SubState=running`、`NRestarts=0`、`ExecMainStatus=0`；health HTTP `200`。
- current 未改变，仍为 `term-provider-json-20260830-r1`。

## remaining_gap

DeepSeek 响应中的 usage 数值不符合 current release 协议校验，导致术语 run 未 succeeded；因此真实术语热词闭环尚未完成。不能在本回合修改源码、配置、route 或重发 Provider 请求。

## next_owner

BACK/provider release owner：基于 `TERM_PROVIDER_PROTOCOL_INVALID` 的已落盘证据诊断 usage 响应合同，并形成新的经审查发布后再安排独立 E2E 回合。

## residual

synthetic project/COS/runtime tree/隔离数据库/staging 均已清零；生产 DB、`/etc`、unit、canonical route 与 current release 未改动。仓库保留用户原有脏工作树，本任务只新增本结果文档。

