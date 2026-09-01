# LOCAL-OCR-SERVER-05D-R3 结果

- outcome: `deployed`
- slice_outcome: `passed`
- formal_lease: `1`
- release: `/opt/qimao-terms-cloud/releases/20260827-local-ocr-05d-backend-r1`
- rollback: `ready`，精确目标为旧 release `/opt/qimao-terms-cloud/releases/20260827-system-live-server05-r1`

## 固定归档与装配

- archive: `C:\tmp\local-ocr-05d-r1.tar.gz`
- archive SHA-256: `6bac3c0028a0fd6bc7c7017226f95f107b414393cef929b7cd2c0be88ed4fd62`
- manifest SHA-256: `4ef975904350d700897dd3a5e3d6334b66d28e77c47f8bd4ea62ffc084fc90ba`
- root 统一 sudo 脚本完成 archive/manifest 逐项校验、candidate clone/overlay、OpenVINO-only env、05B extractor env 引用、backend/Worker drop-in、generic Worker unit、daemon-reload 与 current 原子切换。
- env 权限: `root:qimao 0640`；ONNX 仅 `enabled=false`，未配置 endpoint/timeout。
- 归档/stage 远端临时件已删除；本地固定归档保留；candidate 作为 current 保留。

## API 修正验收器证据

- 采用 root-owned `0600` 临时正文文件，`curl -w` 单独取得 status，content-type 单独采集；Python 直接 `json.load` 文件，未使用 shell 变量承载 JSON；正文文件无论结果均删除。
- API 只输出脱敏字段：`status=401`、`content-type=application/json; charset=utf-8`、`bytes=181`、`isObject=true`、`error.code=EMPLOYEE_AUTH_REQUIRED`；`requestId` 非空断言通过，值未输出。
- health=`200`。

## 服务与边界

- backend: `active`，`NRestarts=0`，current 指向 candidate。
- upload-completion Worker: `active`，`NRestarts=0`。
- screen-text Worker: `qimao-worker@screen-text.worker.entry.js.service`，`active`，`NRestarts=0`。
- OpenVINO 04G: `active/enabled`，`NRestarts=0`，`127.0.0.1:3100`。
- ONNX: `inactive/disabled`，`3101` 无监听。
- 连续 3 次、间隔 2 秒只读观察：backend/screen-text/OpenVINO/upload-completion 均保持 `active/0`，ONNX 保持 `inactive/disabled`。
- 员工/管理员静态指针未改变；端口集合无新增公网监听。

## 范围、残留与交接

- 未执行迁移、COS 请求、数据库/业务路由写入、真实素材、静态/Nginx/04G/05B 修改；screen-text Worker 仅空闲启动。
- candidate、env、drop-in、generic unit 与唯一新 Worker 保持在线；临时响应/归档/stage 清理完成。
- residual=`0`（仅保留 candidate、固定本地归档及既有 04G/05B 历史资产）。
- remaining_gap=`none`；本轮终态后停止发布尝试，交规划裁决下一步。
- next_owner=`PLANNING`
- files: `docs/deployment/LOCAL-OCR-SERVER-05D-R3-RESULT.md`（本轮唯一仓库写入）
- requires_user=`false`
