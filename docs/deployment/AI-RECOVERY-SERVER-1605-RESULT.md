# AI-RECOVERY-SERVER-1605

## artifact

```yaml
artifact_written: true
outcome: blocked
requires_user: false
```

## outcome

发布前只读门确认原 OCR batch 的 39 个失败 job 均不满足现行 `screen-text retries` 状态机，安全可恢复集合精确为 `0`。本片在首次 SCP、transient、current 切换、unit 重启和业务 POST 前停止；禁止以手改 DB 或扩大候选业务差量绕过。

唯一首因：`SCREEN_TEXT_RETRY_ELIGIBLE_SET_EMPTY`。

## candidate

- 本地唯一 immutable candidate：`C:\Users\ComradeGu\Documents\七猫兼职\ai-recovery-1605\ai-recovery-1605-r1.tar.gz`。
- archive=`10,270,317` bytes，SHA-256=`90fc2703b3d17d9a2203141f35ff7eb5856f4c4108f2a9dde24ed77d34d332cb`。
- manifest=`3,737` bytes，SHA-256=`50a8d49bdfdc4f5e909976d27b65a86c4d7ecb5b7e26383ac154eb2cb252715b`。
- audit=`873` bytes，SHA-256=`81e536edcb63b23af6bf77f1d7d40cdbca68eb197f6f93b5640b8e408c191c2f`。
- 基线为冻结 `ai-hotfix-1552.tar.gz`。归档 name/type/linkname 顺序保持不变；links=`476`、unsafe=`0`。
- 内容 SHA 差量精确为六项：
  - `backend/dist/sidecars/local-ocr/frame-extractor.js`
  - `backend/dist/sidecars/local-ocr/frame-extractor.js.map`
  - `packages/contracts/dist/system-control.d.ts`
  - `packages/contracts/dist/system-control.d.ts.map`
  - `packages/contracts/dist/system-control.js`
  - `packages/contracts/dist/system-control.js.map`
- 第七个允许目标 `backend/dist/sidecars/local-ocr/frame-extractor.d.ts` 与 1552 基线字节全等，不构成内容差量。
- contracts JS 含 `enforcementEnabled`；extractor JS 含 `JPEG_SIGNATURE`、`image2`、`mjpeg` 与 JPEG 输出标记；Node syntax、map JSON 与归档 reopen 门通过。

## evidence

- 生产只读基线：current=`/opt/qimao-terms-cloud/releases/ai-hotfix-1552`；backend、ASR Worker、OpenVINO=`active`；screen-text Worker=`inactive/dead`；health=`200`。
- 原 batch=`c82ea8b2-ff3a-4c3b-be2a-fedcab47ce25`，job 状态=`39 failed + 12 queued`。
- 现行 retries 精确谓词要求 current attempt 同时满足 `status=failed`、`retryable=true`、`external_side_effect_possible=false`。
- 服务器只读分组事实：`SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE | retryable=false | external_side_effect_possible=false | status=failed | count=39`。
- 因此 eligible failed=`0`；稳定 idempotency identity `ai-recovery-1605-screen-text-retry` 的 command count=`0`，未发生未知写入。
- canonical extractor 当前仍是 05B 旧字节 SHA=`b9c09abc4bd08785d269ac7dccdd5e8e9c137a742c6ec79c9bf27c145d8ff498`。计划中的 stage candidate 显式绑定门和 canonical env 原子更新均未执行。
- 新 release、stage、runtime、transfer、status 五个固定目标在停止时均 absent。

## external counts

```yaml
scp: 0
root_transient: 0
candidate_preflight_runs: 0
current_switches: 0
backend_restarts: 0
screen_worker_starts: 0
screen_text_retries_post: 0
screen_text_retry_commands: 0
openvino_calls: 0
cos_gets: 0
budget_post: 0
tencent_calls: 0
route_writes: 0
manual_db_writes: 0
```

## rollback

没有生产写入，故无需执行回滚。current、canonical extractor env、static、route、budget、DB 与全部 unit 均保持原基线；screen-text Worker继续保持停止。

## remaining_gap

- 合并候选尚未发布，同素材候选绑定门尚未在本片运行。
- 39 个已知媒体前处理失败无法通过现行一次 `/retries` POST进入 queued；12 个原 queued 保持原身份且未处理。
- 在不手改 DB 的约束下，必须先由 BACK 修正权威 retry 合同，显式允许 `SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE` 且 `external_side_effect_possible=false` 的确定性本地失败通过同一 API 重试；不能由 SERVER 改写 attempt 标志。

## next_owner

`BACK/PLANNER`：冻结一条最小、可测试的 retries 合同修正后，重新构建包含该业务产物的候选；SERVER 再复用本片已验证的 contracts/extractor 差量、stage candidate 绑定门、原子发布和同一稳定 retry identity。无需用户追加授权。

## residual

- 服务器残留=`0`；无 transfer/stage/runtime/status/transient/candidate release。
- 本地仅保留三件非敏感 immutable candidate（archive/manifest/audit）与本结果文档；生成器、preflight、retry、runner和只读诊断临时文件均已删除。
