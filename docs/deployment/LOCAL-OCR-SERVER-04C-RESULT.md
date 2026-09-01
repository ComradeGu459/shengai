# LOCAL-OCR-SERVER-04C 只读终态对账

## outcome

`blocked`；随后已完成精确 rollback。

最后成功门是 RapidOCR 两个 direct runner 的顺序引擎门。直接阻塞是正式 Node sidecar 启动：稳定错误为 `LOCAL_OCR_SIDECAR_START_FAILED`，退出码 2，曾自动重启 41 次，未进入 3100 监听。因此没有继续另一 backend 的正式服务门。

## 远端实际状态

以下路径均已只读核对为不存在：

- release：`/opt/qimao/local-ocr/20260827-local-ocr-04c-r1`
- 临时目录：`/tmp/local-ocr-04c-r1`
- OpenVINO/ONNX Runtime cache：`/var/cache/qimao-local-ocr/openvino`、`/var/cache/qimao-local-ocr/onnxruntime`
- env：`/etc/qimao-terms-cloud/local-ocr-04c-openvino.env`、`/etc/qimao-terms-cloud/local-ocr-04c-onnxruntime.env`
- unit：`/etc/systemd/system/qimao-local-ocr-openvino.service`、`/etc/systemd/system/qimao-local-ocr-onnx.service`

回滚后两个 OCR unit 均 `inactive`，OCR 进程计数为 0；`127.0.0.1:3100`、`127.0.0.1:3101` 均无监听。既有服务仍为 `qimao-backend.service=active`、`qimao-upload-completion-worker.service=active`，两者 `NRestarts=0`。

## 包与模型事实

候选安装并回滚前实际验证的版本为：RapidOCR 3.9.1、OpenVINO 2026.2.1、ONNX Runtime 1.27.0、NumPy 2.4.6；依赖合并后只保留该一个 NumPy。`paddle`、`paddleocr`、`paddlex`、`paddle2onnx`、`ultra_infer` 均未安装。回滚后 venv 已不存在，故当前远端不再可复读这些版本。

模型 SHA-256：

- det：`090F04ABCD9D9A7498BC4EBF677E4CB9BDCE1FE4197DDB7E529F1EF44E1FF94F`
- rec：`6F327246B50388F3C176AE304BD95767EA6DC0C9AE92153EF8CBE210B3C14884`
- cls：`E47ACEDF663230F8863FF1AB0E64DD2D82B838FCEB5957146DAB185A89D6215C`

候选 manifest 在回滚前已生成并校验，SHA-256 为 `2b65b582181aa7ef0f6e297b49f7ef05eced3a5989bb45253c5e78719d16ebca`；manifest 与候选一并删除。

## synthetic 与性能证据

已执行的是远端一次性 direct runner synthetic 中文图顺序验证，不是正式 Node sidecar 服务请求：

- OpenVINO：READY；连续 2 请求各 1 box，文本非空、置信度约 0.99986；严格 NDJSON、stderr=0、同 PID、单次加载；启动约 2312.7 ms，请求约 1243.5/877.9 ms，峰值 RSS 897724 KiB（约 877 MiB），剩余内存约 6.87 GiB。
- ONNX Runtime：在 OpenVINO 停止并确认无模型进程后执行；READY；连续 2 请求各 1 box，文本非空、置信度约 0.99986；严格 NDJSON、stderr=0、同 PID、单次加载；启动约 1170.1 ms，请求约 1595.4/1382.5 ms，峰值 RSS 441564 KiB（约 431 MiB），剩余内存约 6.89 GiB。
- 正式 Node sidecar synthetic 请求：`not_run`，因为 sidecar 启动门已失败。

## 业务边界与回滚

未执行业务 route、AI Worker route、COS 请求、数据库写入、真实素材、控制面发布或其他服务重启；仅启停并清理本轮 OCR unit/候选资产。候选 release、模型副本、缓存、env、unit、临时 helper、依赖 cache 与 synthetic 图片均已按精确路径清除。

`rollback=completed`；`residual=0`（本轮候选/临时项）。既有 backend/Worker 保持运行。

## 交接

- `remaining_gap`：BACK 需修复 Node sidecar 与 runner 的启动握手/集成，再重新执行服务门。
- `next_owner=BACK`
- `requires_user=false`
- `files=docs/deployment/LOCAL-OCR-SERVER-04C-RESULT.md`
