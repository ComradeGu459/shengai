# OCR-GEOMETRY-SERVER-PREP-1628 结果

状态：`artifact_written`；远端部署：`not_started`

## 生产只读事实

- `current=/opt/qimao-terms-cloud/releases/ai-recovery-1607-r2`。
- screen Worker=`inactive/dead`、`NRestarts=0`；OpenVINO sidecar=`active/running`、`NRestarts=0`。
- OpenVINO effective identity：`User=qima`、`Group=qima`、`PrivateTmp=yes`。
- effective `WorkingDirectory=/opt/qimao/local-ocr/20260827-local-ocr-04g-r1/node`。
- effective `ExecStart=/usr/local/bin/node /opt/qimao/local-ocr/20260827-local-ocr-04g-r1/node/entry.js`。
- effective `EnvironmentFiles=/etc/qimao-terms-cloud/local-ocr-04g-openvino.env`；unit 无 drop-in。
- 生产实际消费的 Python runner 不是 current/r2 内文件，而是 `/opt/qimao/local-ocr/20260827-local-ocr-04g-r1/node/paddle_hpi_runner.py`。
- effective runner executable 为同一 dedicated runtime 的 `venv/bin/python`；model dir 为同一 runtime 的 `models/work/openvino`。
- effective startup timeout=`300000`，process timeout=`60000`；模型 digest 存在且长度为 64，未输出值。
- env 中共有 4 个值引用 04g-r1：`PATH`、model dir、runner executable、runner script。r3 必须四项一起切换，不能只改三项 QIMAO 路径。

冻结基线：

- unit fragment：818 bytes，SHA256 `2abe32e0b05988ddbb619cedb10e60d044e357e264f961abf81891c514b9de38`，`root:root 0644`。
- OpenVINO env：798 bytes，SHA256 `08c3578a100eac83f38043d14eb86bb84abdef559170c71e2d6d40f72adb9c09`，`root:qimao 0640`。
- 生产 runner：13299 bytes，SHA256 `b2a2c008a30c0c276f7f7f9ba2a533caf097a9d64c08512acab511bc9516e108`，`root:root 0644`。
- 已验证候选 runner：13728 bytes，SHA256 `b97b02ec9c2ff7954f9f3e1761a0111c9537673ad33fd3a5376df7a80d62d071`。

## r3 设计

- release：从 r2 逐文件复制为不可变 `/opt/qimao-terms-cloud/releases/ai-recovery-1607-r3`，全部 bytes/SHA/metadata 不变；extractor 继续为 `qimao:qimao 0750`。
- dedicated runtime：从 04g-r1 复制为 `/opt/qimao/local-ocr/20260831-local-ocr-geometry-r3`，仅以候选 payload 覆盖 `node/paddle_hpi_runner.py`；其他路径、大小和 metadata 闭包不变，模型目录及 digest 不变。
- env：保留原 owner/mode/ACL/xattr，只把 `PATH`、model dir、runner executable、runner script 的 04g-r1 前缀替换为 geometry-r3；timeout 必须仍为 `300000/60000`。
- unit：保留现有 fragment，通过唯一 `root:root 0644` drop-in `geometry-1628-r3.conf` 覆盖 WorkingDirectory、ExecStart，并追加 r3 ReadOnlyPaths。
- 原子准备完成后才切 current/env/drop-in、执行一次 daemon-reload，并只重启 OpenVINO sidecar。screen Worker 全程保持停止，不启动、不重启。

## 上传文件

| 文件 | bytes | SHA256 |
| --- | ---: | --- |
| `runner.sh` | 19525 | `4d9bc2ce2c1d646dc748f87006221ecaf653a7a43764b720a9401dfc384657c9` |
| `paddle_hpi_runner.py` | 13728 | `b97b02ec9c2ff7954f9f3e1761a0111c9537673ad33fd3a5376df7a80d62d071` |
| `geometry_preflight.py` | 2039 | `2a1e66393af9a97272b1a22d26dc919b5a663694b2645ec982ee1f9bfb213fa7` |
| `SHA256SUMS` | 251 | `b552cd297f130e82ac28987e40935d063f0711693735ad6915893c493b02c9fe` |

## 未来 root 动作

1. 固定 `flock` 后把 inbound 目录与四文件收口为 root-only，再验证冻结 SHA。
2. 硬核对 current、unit/env/旧 runner hashes、r1/r2、extractor 0750、sidecar active、screen stopped，以及 r3/stage/temp 均不存在。
3. `cp --archive --reflink=auto` 创建 release r3 与 dedicated runtime r3 stage；仅覆盖 Python runner。
4. 以 production venv 在 `PYTHONDONTWRITEBYTECODE=1` 下执行 Python compile 与末帧三边界 preflight，并证明 runtime manifest 前后不变。
5. 原子切 current、保留 metadata 的 env、唯一 unit drop-in；daemon-reload 后核对 effective paths。
6. 仅重启 OpenVINO sidecar；GET `/ocr` 返回稳定 `405` 作为不触发 OCR 的 readiness，随后核对 active/running、`NRestarts=0` 与 MainPID effective env 四路径。

全流程固定：POST=0、DB write=0、route write=0、Provider call=0、ASR action=0、screen Worker action=0。

## 回滚与停止门

- 任一 baseline hash、effective path、timeout、screen/sidecar 状态不符：在创建 r3 前停止。
- runner bytes/SHA、Python syntax、三项末帧边界、release/runtime manifest、extractor 0750 任一失败：切换前删除精确 r3/stage/runtime，current/env/unit 保持原状。
- 切换后 effective unit 或 sidecar readiness/稳定状态失败：恢复 current=r2、完整 env backup、删除唯一 drop-in、daemon-reload 并重启旧 04g-r1 sidecar；随后删除 r3 与所有临时项。
- 任一时刻禁止启动 screen Worker；r1、r2 与 04g-r1 始终保留为回滚目标。

## 本地验证与范围

- Git Bash `bash -n`：通过。
- 两份 Python compile：通过；末帧三边界：`3/3`。
- payload 与权威候选逐字节、SHA 一致；SHA256 闭包 `3/3`。
- LF/无 BOM/无尾随空白；无 `__pycache__` 残留。
- 静态门：POST/DB/route/Provider/ASR/screen action/远端工具均为 0；sidecar restart 仅存在成功路径与回滚路径各 1 处。
- BACK 空回合仅记录为 `orchestration_gap`；候选可信度沿用规划已核对的 `25/25 + typecheck + build` 证据，本片未伪造新的 BACK 交付。
- 本片只执行了远端只读 SSH；未 SCP、systemd-run、部署、daemon-reload、restart、POST 或数据库写。
