# OCR-MEDIA-ERROR-SERVER-AUDIT-1686 结果

- outcome: passed
- target: `103.36.63.67`
- scope: 只读核对 1685 发布后的 current、四个 systemd unit、健康检查、项目路由、screen inactive 状态及专用残留。
- mutation: 未上传 archive/runner/SHA，未执行 runner，未启动 Worker，未写入数据库、COS、路由或预算状态。

## current 与发布残留

- `current` → `/opt/qimao-terms-cloud/releases/ocr-media-error-20260831-r1`
- `/opt/qimao-terms-cloud/releases/ocr-worker-once-20260831-r1`：present
- `/opt/qimao-terms-cloud/releases/ocr-media-error-20260831-r1`：present
- `/opt/qimao-terms-cloud/releases/.ocr-media-error-20260831-r1-stage-1684`：absent

## 四个 unit

| unit | MainPID | NRestarts | ExecMainStatus | Active/SubState |
|---|---:|---:|---:|---|
| `qimao-backend.service` | 831090 | 0 | 0 | active/running |
| `qimao-worker@asr.worker.entry.js.service` | 694703 | 0 | 0 | active/running |
| `qimao-worker@screen-text.worker.entry.js.service` | 0 | 0 | 0 | inactive/dead |
| `qimao-local-ocr-openvino.service` | 802334 | 0 | 0 | active/running |

screen-text 的 `ExecMainCode=1` 是历史退出码；当前验收字段 `inactive/dead`, `MainPID=0`, `NRestarts=0`, `ExecMainStatus=0` 均符合 runner 口径。

## health 与 projects

- `GET http://127.0.0.1:3001/health`：HTTP 200，JSON `status=ok`，`database=connected`。
- `GET http://127.0.0.1:8080/projects/1`：HTTP 200，`text/html`。
- `GET http://127.0.0.1:8080/projects/1/asr`：HTTP 200，`text/html`。
- `GET http://127.0.0.1:3100/ocr`：HTTP 405，JSON `LOCAL_OCR_REQUEST_INVALID`（无请求体时的预期响应）。

## 专用残留与环境指纹

以下路径均 absent，无需清理：

- `/var/tmp/qimao-ocr-media-error-1684-inbound`
- `/run/qimao-ocr-media-error-1684`
- `/opt/qimao-terms-cloud/releases/.ocr-media-error-20260831-r1-stage-1684`
- `/opt/qimao-terms-cloud/current.ocr-media-error-1684.next`

环境文件指纹未变：

- `/etc/qimao-terms-cloud/screen-text-local-ocr-05d.env`：`0:996:640:284:1788161438:1788161438`
- `/etc/qimao-terms-cloud/local-ocr-04g-openvino.env`：`0:996:640:818:1788164203:1788164203`

## 结论

1685 发布后的服务与清理验收通过；本审计没有业务队列/数据库处理动作，也没有发现需要回滚或补充清理的差异。后续若需上传或执行 root runner，须由发布方另行授权并按其 runner 清单执行。

