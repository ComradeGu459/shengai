# OCR-SIDECAR-ISOLATED-DIAG-1636

`artifact_written/blocked`

## outcome

已完成隔离 runner 的端口覆盖顺序修正；服务器诊断被执行层在 SCP 进程启动前阻断，未执行 loopback sidecar 或 episode7 请求。

## change

- 仅修改 `deploy/ocr-diagnose-1635/runner.sh` 的隔离 sidecar 启动命令。
- 保留 `EnvironmentFile=/etc/qimao-terms-cloud/local-ocr-04g-openvino.env`。
- 移除隔离端口的 `--setenv`，改为在 ExecStart 中使用 `/usr/bin/env QIMAO_LOCAL_OCR_SIDECAR_PORT="$isolated_port"` 覆盖。
- 同步更新 `deploy/ocr-diagnose-1635/SHA256SUMS`；未修改生产 env/unit、业务代码、route、budget、ASR 或 Provider。

## evidence

- 本地端口覆盖顺序断言：`passed`。
- 本地 payload SHA 闭包：`passed`；runner SHA-256=`0aa1fcbeb70b03190ecf22019720df5ab0de75ef7dc5d44b46fc1ebe4311add5`。
- 本机未安装 Bash，故未将本地 Bash 语法检查记为通过；runner 仍保留远端 root 侧 `/bin/bash -n` 门。
- 服务器只读基线：screen=`inactive/dead/NRestarts=0`，OpenVINO=`active/running/NRestarts=0`，3199 listener=`0`，隔离 unit=`not-found`。
- SCP 被执行层拒绝，具体拒绝动作是将四个冻结文件上传至 `103.36.63.67:/var/tmp/qimao-ocr-diagnose-1635-inbound`；上传文件数=`0`，root runner=`0`，HTTP 请求=`0`。
- 清理后：专用入站目录已删除，隔离 unit=`not-found`，3199 listener=`0`，生产服务状态未变化。

## remaining_gap

需要执行层接受针对四个具体诊断文件及目标服务器的直接外传授权，才能继续进行一次真实隔离诊断。按任务边界，任一次 `500/unknown` 应立即停止且不得重跑；三次 `200` 才能报告常驻 HTTP 链通过。

## next_owner

主线程在取得当前执行层认可的具体外传授权后，重新签发同一冻结闭包；不得改用绕行上传方式。

## residual

本轮未启动 screen-text Worker，未写 DB/COS，未发业务 POST，未修改生产 env/unit、route、budget、ASR 或 Provider，未发布或重跑队列；服务器临时入站目录与隔离运行残留均为 `0`。工作树保留未提交改动。

## R1 actual execution

- 复用本片冻结四文件和已更新 SHA；本地 `frozen_sha=passed`、`frozen_port_override=passed`。
- 服务器创建专用入站目录成功，但 SCP 再次在进程启动前被执行层拒绝；未上传文件、未执行 root runner、未启动 sidecar、未产生 HTTP/child 结果。
- 精确清理成功：入站目录已删除；diag unit=`not-found`，3199 listener=`0`，screen=`inactive/dead/NRestarts=0`，OpenVINO=`active/running/NRestarts=0`。

## R2 actual execution

- 已使用用户对同一生产服务器、同一四文件冻结闭包、同一入站路径和隔离诊断范围的授权；未改代码、未绕行上传。
- 本轮唯一 SCP 在进程启动前被执行层阻断，阻断类别=`tool_permission_blocked`；未上传文件，故 root bash/SHA 门、端口覆盖、sidecar 启动、episode7 串行 3 次请求均未执行，HTTP/安全错误码/child 状态均为 `not_run`。
- 清理与生产状态：入站目录已删除，diag unit=`not-found`，3199 listener=`0`，screen=`inactive/dead/NRestarts=0`，OpenVINO=`active/running/NRestarts=0`。
- 未进行第四次 SCP；未启动业务 Worker，未写 DB/COS，未发业务 POST，未改生产 env/unit、route、budget、ASR，未发布或重跑队列。
