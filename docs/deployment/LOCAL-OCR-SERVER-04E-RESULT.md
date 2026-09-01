# LOCAL-OCR-SERVER-04E 终态对账

- outcome: `blocked`
- 最后成功门：RapidOCR/OpenVINO/ONNX Runtime 离线依赖安装、单一 NumPy 闭包、模型 SHA 校验、Node/sidecar/release 装配和 manifest 生成。
- 直接阻塞：OpenVINO 正式 Node sidecar 在 READY 前退出（退出码 2，稳定错误类别 `ENGINE_UNKNOWN`）；未进入 HTTP 请求门。
- root_cause: sidecar 将 venv Python 符号链接解析到未安装 RapidOCR 的系统解释器。

## Node HTTP 门

- OpenVINO：`not_run`；sidecar 启动阶段失败，HTTP 请求数 `0`，未产生 READY/框结果。
- ONNX Runtime：`not_run`；按首个 backend 失败停止，未启动、未发 HTTP 请求。
- 04E 未重复 direct runner 推理；此前 04C 的 direct 证据不冒充本轮结果。RSS、延迟、连续请求、文本/置信度/框、NDJSON 均为 `not_run`。

## 根因

env 的 runner 路径为 `/opt/qimao/local-ocr/20260827-local-ocr-04e-r1/venv/bin/python`，该路径是符号链接；sidecar 的 `realFile()` 将其解析为 `/usr/bin/python3.11`。实际子进程因此未加载 release venv 中的 RapidOCR 闭包，在 READY 前以退出码 2 结束。unit 已设置 `Restart=no`，没有重启风暴。

## 版本、模型与指纹

- Python 3.11.2；RapidOCR 3.9.1；OpenVINO 2026.2.1；ONNX Runtime 1.27.0；NumPy 2.4.6；离线 `pip check` 通过。
- 禁止包核对：依赖清单未见 Paddle/PaddleX/Paddle2ONNX/UltraInfer/GPU/CUDA。
- det SHA-256：`090F04ABCD9D9A7498BC4EBF677E4CB9BDCE1FE4197DDB7E529F1EF44E1FF94F`
- rec SHA-256：`6F327246B50388F3C176AE304BD95767EA6DC0C9AE92153EF8CBE210B3C14884`
- cls SHA-256：`E47ACEDF663230F8863FF1AB0E64DD2D82B838FCEB5957146DAB185A89D6215C`
- fresh build：entry `28853CC19392FA7FEF149F48C8002089F33C9772F0BB91E5B8090D60BC13E200`；sidecar `9B0B2E7A396791FB1288BE497F700EE44F38B73C5085DDCADA38D70B261C0855`；runner `B2A2C008A30C0C276F7F7F9BA2A533CAF097A9D64C08512ACAB511BC9516E108`。
- release manifest：6165 项，SHA-256 `bf95d4fd612a59f98a73d5354d0792641f614f453dfd0f93059cbc0185e6ea85`。

## 最终路径与服务状态

- 远端 release `/opt/qimao/local-ocr/20260827-local-ocr-04e-r1`：`absent`。
- 远端临时 `/tmp/local-ocr-04e-r1`、OpenVINO/ONNX cache、两份 OCR env、两份 OCR unit：均 `absent`；systemd `LoadState=not-found`、`ActiveState=inactive`、`NRestarts=0`。
- OCR 进程：`0`；3100/3101：无监听。
- 既有 `qimao-backend.service`：`active`，`NRestarts=0`；既有 `qimao-upload-completion-worker.service`：`active`，`NRestarts=0`。
- 本地 `C:\tmp\local-ocr-04e-source`、`C:\tmp\local-ocr-04e-synthetic-cn.png`、`C:\tmp\local-ocr-04e-r1`：均 `absent`。

## 动作边界与回滚

- 未访问 COS，未写数据库，未调用业务 route/AI Worker，未使用真实素材，未开放公网端口。
- 已按本轮身份停止/禁用候选并精确删除 release、venv、模型工作副本、cache、env、unit、临时件和本地合成图；未触碰既有 backend/Worker。
- residual: `0`。
- rollback: 已恢复原外部运行状态；无可运行 OCR 候选保留。

## 后续

- remaining_gap：BACK 需在 sidecar/装配边界修复 venv Python 符号链接解析问题，并补正式 Node sidecar 回归；本轮未修改业务代码。
- next_owner: `BACK`
- requires_user: `false`
