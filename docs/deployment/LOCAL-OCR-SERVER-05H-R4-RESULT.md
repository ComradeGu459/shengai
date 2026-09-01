# LOCAL-OCR-SERVER-05H-R4 结果

outcome: passed
lease: 1

## 发布身份与状态

- routeId: `7bd41c8c-18b0-46f3-83ec-17fdb0729b6f`
- publish releaseCommandId: `c457602a-f9f2-4ad8-aef7-8c2518323847`
- publish Idempotency-Key: `14269e4b-2c7e-4703-883f-405125fc7c5d`
- publish POST: `1`（2026-08-28 02:54:06+08）；无重试/补偿写。
- route status: `active`；active pointer（development/screen_text）: `1`，唯一指向上述 route。
- target: `1a9eb5ee-3402-4c9b-a81b-1dd8ad7c88bc`，pool=`ocr_self_hosted_worker`，deploymentVersion=`e0ac8bc6-feea-4d12-836d-17e7e82dfcda`，role=`preferred`，capacity=`1/1/20`。

## Runtime 与服务验收

- runtime resolve: `true`；provider=`openvino`，adapter=`screen_text_openvino_ppocrv6_small`，execution=`self_hosted_worker`，capability=`screen_text`。
- backend: `active`，NRestarts=`0`，loopback health=`200`，未认证 `/api/projects`=`401`。
- upload-completion Worker: `active`，NRestarts=`0`。
- local OCR OpenVINO: `active`，NRestarts=`0`。
- screen-text Worker: `active`，NRestarts=`0`。
- connection-test Worker: `active`，NRestarts=`0`。
- project-cleanup Worker: `active`，NRestarts=`0`。
- loopback listeners: `127.0.0.1:3001`、`127.0.0.1:3100`；未新增公网端口。
- screen_text/asr 非终态业务 job: `0/0`；影响检查时活动任务、失败连接检查、待对账均为 `0`。

## 控制面审计与操作边界

- 发布前 route 已为 approved、active pointer=0；发布后服务端审计 total=`5`，新增唯一“发布路由变更=成功”。
- 同一 Edge 仅新建 tab `952843849`，完成只读前置、选择既有 route、单次发布与只读核验；已按要求关闭该标签。
- 未创建新 route、deployment、version、业务任务；未访问 COS、真实素材；未修改 backend/Worker/static/Nginx/Secret。

## 残留与回滚

- residual: 控制面保留唯一 active route/target/version/publish command（供下一片使用）；业务 job 与新增临时对象残留为 `0`。
- rollback_ready: 保留既有 routeId、targetId、versionId 与 releaseCommandId，可按该身份执行后续精确回滚。
- files: `docs/deployment/LOCAL-OCR-SERVER-05H-R4-RESULT.md`
- next_owner: `TEST`
- requires_user: `false`

