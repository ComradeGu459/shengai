# LOCAL-OCR-SERVER-06M 结果

- outcome: artifact_written
- task: LOCAL-OCR-SERVER-06M
- current_sync: CURRENT v4-1214
- formal_lease: 0
- mode: screen_text_page_projection_audit
- observed_window: 2026-08-28 05:45:00–05:52:00 Asia/Shanghai（含起点，不含终点）
- conclusion: request_reached_interface_failed_db_current_not_stale

## evidence

### 唯一分层结论

1. 请求未到：否。Nginx 与 backend 均记录到指定 project/batch 的 batches list 与 batch detail GET。
2. 接口失败：是。batches list 两次 HTTP 200；batch detail 两次 HTTP 500。窗口内没有 candidates list GET，也没有 evidence GET。
3. DB 应有但前端未投影：当前不能归类为此层。DB 中 candidate/evidence 均存在，但 batch detail 先失败，前端没有进入后续 candidates/evidence 查询，因此尚无“请求成功但前端未投影”的证据。
4. fixture stale：否。batch 当前 status=review_pending；绑定 manifest 与 latest manifest 相同，绑定 term version 与 latest term version 相同，DB 判断为 current。

### 日志元数据

- 读取来源：Nginx access.log 及轮转 access 日志、backend.log；只投影 path type、HTTP status、耗时和响应字节，未读取或输出正文、Cookie、object key、Secret。
- Nginx 业务 access 格式不含 request_time，因此耗时为 unavailable；窗口内：
  - batches_list：2 次，HTTP 200，响应字节均为 712。
  - batch_detail：2 次，HTTP 500，响应字节均为 184。
  - candidates_list：0 次。
  - evidence_get：0 次。
- backend 完成事件通过 request ID 与 incoming 事件关联；窗口内：
  - batches_list：2 次 HTTP 200，耗时 13.827755 ms、12.010662 ms；backend 日志未记录响应字节字段。
  - batch_detail：2 次 HTTP 500，耗时 11.746980 ms、6.876806 ms；backend 日志未记录响应字节字段。
  - candidates_list：0 次。
  - evidence_get：0 次。
- 窗口换算为 UTC 为 2026-08-27 21:45:00–21:52:00；Nginx 与 backend 的时间解析均按此窗口执行。

### DB 只读事实

- projectId=ffbf5034-8fb5-4749-8c6d-d43c8b9caee8。
- batchId=62e1018f-1e01-4763-9aef-3cb26ad990e6，当前 status=review_pending。
- batch 引用 manifestId=7b139466-f211-4e34-b20e-376f1a856e2e、manifestVersion=1；termVersionId=6db02a8b-2366-4cd5-95ab-7cc947f55e9b、termVersion=1。
- latest manifestId/version=7b139466-f211-4e34-b20e-376f1a856e2e/1；latest termVersionId/version=6db02a8b-2366-4cd5-95ab-7cc947f55e9b/1；identity=current，非 stale。
- jobId=d91a0117-b32f-4102-9718-411b6c956a45，episode=1，status=review_pending。
- attemptId=4d81949c-7818-4ed5-a605-929fccc655b0，attemptNumber=1，status=completed。
- candidate count=4；evidence 非空 count=4；PNG evidence count=4。
- 按生产 listBatches 的同一 where 条件（projectId 相同、status/search 为空、limit=20、offset=0）只读计算：总数=1，应返回条数=1。未调用生产 listBatches 方法，因为该方法会先执行 refreshProjectStale 更新状态。

## remaining_gap

- batch detail GET 的 HTTP 500 根因未在本轮读取；按任务授权未读取响应正文或 backend 错误正文，因此不能进一步归因。
- detail 失败使员工页未发出 candidates list 与 evidence GET；不能据此判定 candidate/evidence 数据缺失或前端投影实现缺陷。
- 下一次应在修复或解释 batch detail 500 后，重新观察同一页面的 detail、candidates、evidence GET 元数据；本轮不重跑业务动作。

## next_owner

- BACK：检查 batch detail GET 的 500 服务端错误与响应生成链路。
- BACK 修复并验证 detail 200 后，再由 FRONT/TEST 复核同一员工页是否发出 candidates/evidence GET 并正确投影。

## files

- docs/deployment/LOCAL-OCR-SERVER-06M-RESULT.md
- Nginx source: /var/log/nginx/access.log 及其轮转 access 日志
- backend source: /var/log/qimao-terms-cloud/backend.log

## residual

- 未调用业务 API、OCR、COS；未重启服务；未修改或清理 fixture；未修改代码、route、budget。
- fixture 保持原状：project/batch/job/attempt 与 4 candidate/4 evidence 均保留。
- 本轮仅新增结果文档；日志解析临时脚本与远端临时解析文件将在文档写入后精确删除。

## requires_user

- false

