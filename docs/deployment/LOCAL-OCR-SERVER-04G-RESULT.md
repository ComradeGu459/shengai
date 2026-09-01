# LOCAL-OCR-SERVER-04G 终态

- outcome: `passed`
- slice_outcome: `passed`
- evidence: OpenVINO 与 ONNX Runtime 正式 Node HTTP 各完成 READY 后连续两次 200 响应，均返回非空合法框且同 PID。
- root_cause: 04E 的 venv Python 符号链接 canonicalization 问题已由 04F 修复；04G 正式 Node sidecar 保留 `/venv/bin/python` launcher，未再复现 `ENGINE_UNKNOWN`。
- final_state: OpenVINO active/enabled loopback 常驻；ONNX stopped/disabled；候选 release 与回滚信息保留。
- remaining_gap: `none`（业务 route、AI Worker、COS、数据库和控制面仍按范围未激活/未触碰）。
- next_owner: `规划`
- requires_user: `false`

## 候选与装配

- release：`/opt/qimao/local-ocr/20260827-local-ocr-04g-r1`，成功态保留。
- release manifest SHA-256：`bac723a29550b7b25b49d97cbdc8caf5acf024ff2ef17d56754a170221dd5fb1`。
- manifest.meta SHA-256：`9ade05e85e1005f147b376bc78757d845f8c3f574623de02be2f21753537d074`。
- entry SHA-256：`28853cc19392fa7fef149f48c8002089f33c9772f0bb91e5b8090d60bc13e200`。
- sidecar SHA-256：`99ee3eb60a220b5c41ed7f1a50a2020c50d9511ce37f5e2198ee475c5967c3ed`。
- runner SHA-256：`b2a2c008a30c0c276f7f7f9ba2a533caf097a9d64c08512acab511bc9516e108`。
- wheels manifest（临时 staging，已清除）SHA-256：`21507eb0facfc0e4a5103380e19992b75229174dd7ef84c795f7720b59e0d1c3`。
- 版本：RapidOCR 3.9.1、OpenVINO 2026.2.1、ONNX Runtime 1.27.0、NumPy 2.4.6；离线 `pip check` 通过；未见 Paddle/PaddleX/Paddle2ONNX/UltraInfer/GPU/CUDA。
- 模型 SHA-256：det `090f04abcd9d9a7498bc4ebf677e4cb9bdce1fe4197ddb7e529f1ef44e1ff94f`；rec `6f327246b50388f3c176ae304bd95767ea6dc0c9ae92153ef8cbe210b3c14884`；cls `e47acedf663230f8863ff1ab0e64dd2d82b838fceb5957146dab185a89d6215c`。
- 两份 root-only env 与 unit 已安装；`systemd-analyze verify` 通过，`Restart=no`，runner 使用 release `/venv/bin/python` launcher。

## 正式 Node HTTP 门

测试输入为一次性 synthetic 中文 PNG，未使用真实素材。

### OpenVINO

- readiness：3 次、每次间隔 2 秒后 ready；首轮 Node PID `317795`，runner PID `317810`。
- 请求 1：HTTP `200`，耗时 `0.864586s`，响应 `430` bytes，协议正确，1 个非空合法框。
- 请求 2：HTTP `200`，耗时 `0.633967s`，响应 `430` bytes，协议正确，1 个非空合法框。
- 两次请求 Node/runner PID 不变，NRestarts=`0`。

### ONNX Runtime

- OpenVINO 已停止且进程/3100 清零后才启动；readiness：2 次、每次间隔 2 秒后 ready；Node PID `318034`，runner PID `318048`。
- 请求 1：HTTP `200`，耗时 `1.297150s`，响应 `426` bytes，协议正确，1 个非空合法框。
- 请求 2：HTTP `200`，耗时 `1.070504s`，响应 `426` bytes，协议正确，1 个非空合法框。
- 两次请求 Node/runner PID 不变，NRestarts=`0`。

## 最终常驻状态

- OpenVINO：`active`、`enabled`、仅监听 `127.0.0.1:3100`；恢复常驻 readiness 3 次，最终 PID `318206`，NRestarts=`0`。
- ONNX Runtime：`inactive`、`disabled`，3101 无监听。
- 两引擎未同时常驻；最终 OCR runner 进程数为 1。
- 既有 `qimao-backend.service`、`qimao-upload-completion-worker.service`：均 `active`，NRestarts=`0`；既有 backend 3001 仍为 loopback。

## 清理与边界

- 已删除本轮远端 `/tmp/local-ocr-04g-r1`（wheels、临时 venv、HTTP request/response、synthetic 图、staging）；本地 `C:\tmp\local-ocr-04g-synthetic-cn.png` 已删除。
- 正式 release、模型工作副本、env、unit、manifest 按成功标准保留；未删除历史 `/opt/qimao/local-ocr` 父目录。
- residual（临时件/并行引擎/公网监听）=`0`。
- 未访问 COS、未写数据库、未激活业务 route/AI Worker、未使用真实素材、未开放公网端口、未修改业务代码或控制面。
