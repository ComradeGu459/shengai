# AI-RECOVERY-SERVER-1607

## artifact

```yaml
artifact_written: true
outcome: blocked
requires_user: true
```

## outcome

1607 最终候选和物理执行产物已在本地完成全部内容、语法与边界门；首次远端复合命令在本机 `CreateProcess` 前被安全审批层拒绝，任何 SSH/SCP/服务器动作均未发生。审批结果明确禁止改用间接路线或再次尝试，因此本片停止。

唯一首因：`EXECUTION_APPROVAL_REJECTED_BEFORE_PROCESS_START`。

## candidate

- 唯一 immutable candidate：`C:\Users\ComradeGu\Documents\七猫兼职\ai-recovery-1607\ai-recovery-1607-r1.tar.gz`。
- archive=`10,270,355` bytes，SHA-256=`b2f5bbc158eb0ce51e4238556043182d34b80fa7b15d023e91401e3547bf0c9b`。
- manifest=`2,130` bytes，SHA-256=`fde9291ef0de981c6e65e0ef0e020c572119ca6e04225950e6cce50488337e38`。
- audit=`1,164` bytes，SHA-256=`8517f6f442b29ab8ea994c807d0e1888e9f6f2216df75ee2a7d7a1f0f87e98fc`。
- 相对冻结 1605 archive 内容差量精确两项：
  - `backend/dist/modules/screen-text/screen-text.write.repository.js`
  - `backend/dist/modules/screen-text/screen-text.write.repository.js.map`
- 相对 1552 最终内容差量精确八项：上述两项，加 1605 已冻结的 extractor JS/map 与 contracts JS/map/d.ts/d.ts.map 六项。
- archive name/type/linkname 顺序保持不变；members=`15,029`，symlinks=`476`，unsafe=`0`。
- repository JS 含历史安全谓词：仅当 `SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE` 或原 `retryable=true`，且 `external_side_effect_possible=false` 时允许 retry。
- contracts `enforcementEnabled`、extractor JPEG/image2/mjpeg 标记、三个 JS Node syntax、两个 map JSON 和最终 archive reopen 均通过。

## prepared execution evidence

- stage preflight 固定为 `/opt` candidate root、qimao:qimao、PrivateTmp；加载四份 canonical env 后显式覆盖 `QIMAO_SCREEN_TEXT_FRAME_EXTRACTOR_BIN` 到 stage candidate。
- preflight 验收固定为同一失败素材、`QIMAO_FRAME_EXTRACTOR_OK`、exit 0、123 帧、manifest 存在且总帧字节受限。
- retry 固定 identity=`ai-recovery-1607-screen-text-retry`；Worker 停止时只恢复原 batch 中 39 个历史码且 external=false 的 job，必须投影为同一 batch `51 queued` 后才启动 Worker。
- runner 包含 current 与 extractor env 原子回滚；backend/Worker 首门失败时恢复 `ai-hotfix-1552` 并停止 screen-text Worker。static、route、budget、migration 与 DB schema 均无写路径。
- 本地 preflight/retry Node syntax、launcher/runner Bash syntax、全部 CR=0 与固定 SHA 门通过。

## execution evidence

- 权限请求已明确说明动作包含一次固定 transfer、一次 SCP、唯一 root transient、current 原子切换、backend restart、一次既有 retry 和 Worker 启动。
- 安全审批层返回拒绝，分类为“可能切换生产 current、重启 backend、启动 Worker 并处理原批次；需要用户在获知风险后显式批准”。
- 拒绝发生在本机 `CreateProcess` 前；故远端 transfer 未创建，SCP 未开始，transient 未启动，服务器状态没有本片变化。

## counts

```yaml
ssh_processes_started: 0
transfer_created: 0
scp: 0
root_transient: 0
candidate_preflight_runs: 0
cos_gets: 0
current_switches: 0
backend_restarts: 0
screen_text_retries_post: 0
screen_worker_starts: 0
openvino_calls: 0
tencent_calls: 0
budget_post: 0
manual_db_writes: 0
```

## remaining_gap

- 1607 candidate 尚未传输或发布。
- 同素材 production-like candidate preflight、live markers、51 queued 投影与真实 OpenVINO completed 进展均尚未执行，不能把本地准备通过写成业务通过。

## next_owner

`USER/PLANNER`：需要在当前执行通道明确批准上述生产可回滚动作后，SERVER 才能复用冻结 1607 三件套执行；不得重建候选或改用绕过审批的第二路线。

## rollback and residual

- 无服务器写入，无需回滚；生产保持 1605 只读基线事实：current=`ai-hotfix-1552`、screen-text Worker停止、原 batch=`39 failed + 12 queued`。
- 服务器本片 residual=`0`。
- 本地仅保留 1607 archive/manifest/audit 与本结果文档；构建器、preflight、retry、runner临时源均已删除。
