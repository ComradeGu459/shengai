# OCR-SIDECAR-POST-AUDIT-1708 结果

- `artifact_written`: `true`
- `outcome`: `passed`
- `target`: `103.36.63.67`
- `next_owner`: `规划 / SERVER`
- `requires_user`: `false`

本卡仅执行一次只读 SSH/sudo 验收；未重启服务、未启动 Worker、未访问队列/数据库/COS/route/budget/provider。

## New runtime 与 unit 投影

- `current` 仍解析到 `/opt/qimao-terms-cloud/releases/ocr-media-error-20260831-r1`。
- `/opt/qimao/local-ocr/20260901-local-ocr-contract-r1/node/entry.js` 为普通文件，`root:root:0644`，1,139 bytes，SHA-256=`28853cc19392fa7fef149f48c8002089f33c9772f0bb91e5b8090d60bc13e200`。
- `/opt/qimao/local-ocr/20260901-local-ocr-contract-r1/node/sidecar.js` 为普通文件，`root:root:0644`，29,118 bytes，SHA-256=`a45a73beb385a4bdc0bd271b4a82c4c07b544319739a5e34b46beb25f5623e99`。
- `WorkingDirectory`=`/opt/qimao/local-ocr/20260901-local-ocr-contract-r1/node`。
- 有效 `ExecStart` 为 `/usr/local/bin/node /opt/qimao/local-ocr/20260901-local-ocr-contract-r1/node/entry.js`。
- 有效 `ReadOnlyPaths` 的最后一项为 new runtime；实际合并集合包含旧 04G、geometry-r3 与 contract-r1 路径。
- `DropInPaths` 顺序为 `geometry-1628-r3.conf` → `zz-contract-1694-r1.conf`，候选覆盖顺序正确。
- contract drop-in 为普通文件，`root:root:0644`，257 bytes。

## env 与进程环境

- `/etc/qimao-terms-cloud/local-ocr-04g-openvino.env` 为普通文件，`root:qimao:0640`，818 bytes。
- env 中模型目录、runner executable、runner script 三个 path-bearing 项及 PATH 均指向 new runtime；old geometry-r3 命中数为 `0`。
- OpenVINO MainPID=`842128` 的 `/proc/842128/environ` 中上述三条路径与 PATH 均匹配 new（`4/4`）；old runtime 命中数为 `0`。未输出其他环境值。

## 服务与健康

- `qimao-local-ocr-openvino.service`：`active/running/0/0`，MainPID=`842128`。
- `qimao-backend.service`：`active/running/0/0`，MainPID=`831090`，与部署前基线一致。
- `qimao-worker@asr.worker.entry.js.service`：`active/running/0/0`，MainPID=`694703`，与部署前基线一致。
- `qimao-worker@screen-text.worker.entry.js.service`：`inactive/dead/0/0`，MainPID=`0`。
- 只读 `GET http://127.0.0.1:3100/ocr` 返回 `405 application/json; charset=utf-8`。

## 残留

固定 inbound、run runtime、runtime stage、env 临时/restore 文件与 contract drop-in 临时文件均不存在，精确残留计数=`0`。

`remaining_gap`：无本卡验收缺口；本卡未执行额外业务调用。
