# 本地 OCR 反复失败根因审计

日期：2026-08-27

切片：`LOCAL-OCR-AUDIT-04A`

结论：`passed`（只读审计完成；OCR 仍未部署、未启用）

## 1. 可证伪结论

- 反复失败的主因不是 8 GB 服务器、PP-OCRv6 Small 或 CPU 推理不可用，而是把旧应用已经成功的“RapidOCR 直接加载 ONNX”误扩成了“PaddleOCR → PaddleX → Paddle2ONNX → UltraInfer → OpenVINO/ONNX Runtime”五层运行链。
- `LOCAL-OCR-SERVER-03F` 已证明服务器能用 OpenVINO 对同系列 Small 模型完成 synthetic 中文真推理；后续阻塞都发生在安装、转换、HPI 包选择或 sidecar 协议边界。
- `LOCAL-OCR-SERVER-03J` 保持暂停且临时环境、模型、进程、unit 均为 0。当前不存在可供业务使用的本地 OCR，不得宣称“已经部署”或“已经可识别用户素材”。
- 冻结唯一修复路线：保留现有 Node sidecar、`screen_text_local_ocr_v1`、loopback HTTP、任务/日志/预算/COS/Worker 与人工确认，只把 Python runner 内部改为 `RapidOCR 3.9.1 + PP-OCRv6 Small ONNX`，OpenVINO 主力、ONNX Runtime 备用；不再进入 PaddleX/UltraInfer 路线。

## 2. 旧本地应用的实际成功基线

| 项目 | 只读事实与证据 |
| --- | --- |
| 应用源码 | `C:\Users\ComradeGu\Documents\七猫兼职\apps\short-drama-terms-workbench\terms_workbench\screen_text_worker_v2.py` 直接导入 `RapidOCR`，显式选择 `EngineType.OPENVINO` / `EngineType.ONNXRUNTIME`、`OCRVersion.PPOCRV6` 与 Small 模型。没有 PaddleOCR、PaddleX、PaddlePaddle、Paddle2ONNX 或 UltraInfer。 |
| 已部署运行时 | `E:\七猫兼职\01_应用\海外短剧审改工作台\Runtime\OCR\ScreenTextOCR\.venv`；Windows x64，Python `3.14.3`，标准 `venv`，包的 `INSTALLER` 均为 `pip`。 |
| 精确核心版本 | `rapidocr==3.9.1`、`openvino==2026.2.1`、`onnxruntime==1.27.0`、`numpy==2.4.6`、`opencv-python==5.0.0.93`。安装清单中不存在任何 `paddle*`、`paddlex` 或 `ultra*` 包。 |
| CPU/GPU | 本机虽有 RTX 3060 Laptop GPU，但安装的是 CPU `onnxruntime`，代码只选 OpenVINO/ONNX Runtime；成功基线不是 CUDA/GPU 路线。 |
| 模型来源 | RapidOCR wheel 内置模型；其 `default_models.yaml` 指向 RapidAI 在 ModelScope 的 `v3.9.1` 模型。PP-OCRv6 Small det SHA-256=`090F04ABCD9D9A7498BC4EBF677E4CB9BDCE1FE4197DDB7E529F1EF44E1FF94F`，rec SHA-256=`6F327246B50388F3C176AE304BD95767EA6DC0C9AE92153EF8CBE210B3C14884`；RapidOCR 初始化时即使关闭方向分类也会建立分类器，内置 cls SHA-256=`E47ACEDF663230F8863FF1AB0E64DD2D82B838FCEB5957146DAB185A89D6215C`。 |
| 成功证据 | `App\versions\V3.60` 与 `V3.60更新说明.txt` 实际存在；发布说明记录 OpenVINO 同模型较旧 ONNX 约快 `1.94x`，真实 56 秒素材抽帧约 `13s → 3.7s`。这是历史验收证据，本轮没有访问真实素材或重跑基准，因此不把它伪装成本轮新鲜性能测试。 |

官方资料与实物相符：RapidOCR `3.9.1` 支持 Python 3.11，官方安装是 `pip install rapidocr onnxruntime`；Small 模型随 wheel 提供，PP-OCRv6 Small 从 `rapidocr>=3.9.0` 起同时支持 OpenVINO 与 ONNX Runtime。[RapidOCR v3.9.1](https://github.com/RapidAI/RapidOCR/tree/v3.9.1)、[安装说明](https://github.com/RapidAI/RapidOCRDocs/blob/main/docs/install_usage/rapidocr/install.md)、[模型列表](https://github.com/RapidAI/RapidOCRDocs/blob/main/docs/model_list.md)、[推理引擎说明](https://github.com/RapidAI/RapidOCRDocs/blob/main/docs/install_usage/rapidocr/how_to_use_infer_engine.md)

## 3. 当前服务器与旧应用的逐项差异

| 维度 | 旧应用成功基线 | 当前服务器候选 |
| --- | --- | --- |
| 主机 | Windows x64；本地 Intel CPU；GPU 未参与 OCR | Debian/Linux x86_64；Xeon 6252，4 vCPU，7.8 GiB RAM；无 GPU/CUDA |
| Python | 3.14.3 | 3.11.2；RapidOCR/OpenVINO/ORT 官方均支持 |
| OCR 入口 | RapidOCR 直接加载预转换 ONNX | PaddleX `create_pipeline` + PaddleOCR 3.7 配置契约 |
| 转换层 | 无；模型已经是 ONNX | Paddle 模型先经 Paddle2ONNX，再交给 HPI |
| 推理封装 | RapidOCR → OpenVINO/ORT | PaddleX → UltraInfer → OpenVINO/ORT |
| 当前核心版本 | RapidOCR 3.9.1 / OpenVINO 2026.2.1 / ORT 1.27.0 | PaddleOCR 3.7.0 / PaddleX 3.7.2 / PaddlePaddle CPU 3.2.0 / Paddle2ONNX 2.0.2rc3 / UltraInfer 1.2.0 / OpenVINO 2025.4.1 / ORT 1.22.0 |
| 模型来源 | RapidOCR wheel / ModelScope 的预转换 PP-OCRv6 Small ONNX | Paddle 官方模型归档，运行期转换为 ONNX |
| sidecar 协议 | 旧应用内部 Python 调用 | 当前 Node 常驻子进程，严格 NDJSON `screen_text_local_ocr_v1`、READY 门、稳定身份、loopback HTTP、单并发、fail-closed |

差异裁决：Node sidecar 和既有控制面是需要保留的产品边界；PaddleX/Paddle2ONNX/UltraInfer 是旧成功基线没有、且五类故障都集中的附加层，应从 runner 环境移除。

## 4. 已发生错误的直接原因

| 错误 | 直接原因 | 性质 |
| --- | --- | --- |
| PaddleX 配置契约 | 初版 runner 未满足 PaddleX 3.7 的完整 OCR pipeline 配置，缺 `pipeline_name`、`text_type`、预处理开关、`SubPipelines` 与 `SubModules`。 | 真实集成缺陷；03E 已修，但冻结路线不再依赖该层。 |
| Paddle2ONNX 空文件 | 错用 `paddle2onnx==1.3.1` 处理 Paddle 3.x `inference.json`；PaddleX 3.7.2 实际固定 `2.0.2rc3`。旧版还能在解析失败后产生误导性的成功措辞。 | 版本选择错误，属于探索安装过程；正确版本已生成约 9.9/21.2 MB 非零 ONNX。参考[官方 issue #1615](https://github.com/PaddlePaddle/Paddle2ONNX/issues/1615)。 |
| native stdout 污染 | UltraInfer/C++ 直接写 OS fd 1，绕过 Python `redirect_stdout`，READY 前出现 8 行非 JSON，严格 sidecar 正确拒绝。 | 真实协议边界缺陷；03G 的 fd 隔离回归已通过，但 RapidOCR 路线会消除 UltraInfer 来源。 |
| GPU wheel 缺 `libcudart.so.12` | 03I 绕过 CPU 安装器并猜测包 URL，得到 `ultra-infer-gpu-python==1.2.0`；无 CUDA 服务器必然不能加载。 | 纯包选择错误，不是 CPU 不支持。PaddleX 官方 CPU 路径是先装 Paddle2ONNX，再执行 `paddlex --install hpi-cpu`，且同一环境只保留一个 HPI 插件。[PaddleX 3.7 HPI 文档](https://github.com/PaddlePaddle/PaddleX/blob/release/3.7/docs/pipeline_deploy/high_performance_inference.en.md) |
| 下载超时 | 从默认 PyPI 拉取大体积 `paddlepaddle==3.2.0` 时 HTTPS read timeout，尚未进入模型或引擎初始化。 | 瞬时获取/缓存问题；不能作为 OCR 功能失败证据。 |
| 03J 探针噪声 | 请求超时参数超出代码上限、可执行文件与脚本参数错位、CRLF 造成 `sort\r`。 | 测试脚本错误；不是产品或引擎根因。 |

即使继续 PaddleX，官方 CPU 正确路径也已确定，不需要再猜 URL；但 PaddleX 官方同时说明手动任意组合不保证兼容。既然产品只需要 CPU PP-OCRv6 Small，而旧应用已有更短且成功的直载路径，继续修复 HPI 没有产品收益。

## 5. 冻结的唯一最小修复路线

核心精确组合：服务器现有 Python `3.11.2`；`rapidocr==3.9.1`、`openvino==2026.2.1`、`onnxruntime==1.27.0`；模型固定为上节 det/rec/cls 三份 SHA。RapidOCR wheel SHA-256=`600885e4e94e0b427abad394fccb0ec1d3c9118a215ca435bf7680aeae0e292b`。PyPI 提供 OpenVINO 2026.2.1 的 CPython 3.11 manylinux x86-64 wheel（SHA-256=`3a7f4ec8ed2a7ae4069a96ded7f9ff9b7a97230e411141db8b68669ba43c0bde`）和 ONNX Runtime 1.27.0 的 CPython 3.11 manylinux x86-64 wheel（SHA-256=`e4f7b0e90d2d212e2c2deaa6c8291616183ab815d3ec558ea12d3ac8b26d36f4`）。[RapidOCR 3.9.1 PyPI](https://pypi.org/project/rapidocr/3.9.1/)、[OpenVINO 2026.2.1 PyPI](https://pypi.org/project/openvino/2026.2.1/)、[ONNX Runtime 1.27.0 PyPI](https://pypi.org/project/onnxruntime/1.27.0/)

顺序只有一条：

1. BACK 只替换 `paddle_hpi_runner.py` 的内部引擎装配与结果归一化，改为 RapidOCR；保留 Node sidecar、NDJSON/HTTP 合同、稳定身份、资源限制、两个独立 Provider 描述符及外部路由 fallback，不改控制面。
2. BACK 在本地用 fake/fixture 证明 OpenVINO、ONNX Runtime、READY、两次连续请求、ID 回显、框归一化与 stdout 纯净；未通过则停在 BACK，不派 SERVER。
3. 只有 BACK 门通过后，SERVER 才按上述精确版本/哈希一次性缓存完整 wheel 与模型、校验后离线安装到新的版本化目录；环境中不得出现 PaddlePaddle、PaddleOCR、PaddleX、Paddle2ONNX、UltraInfer、GPU/CUDA 包。
4. SERVER 只用 synthetic 中文图顺序验证 OpenVINO，再停止它后验证 ONNX Runtime；通过后才做一个单引擎常驻候选。两套引擎不得同时常驻，仍不使用真实用户素材、不开放公网、不启用业务路由。

停止条件：任一官方 Linux CPython 3.11 wheel 不存在或 SHA 不符；模型 SHA 不符；依赖解析出现 Paddle/UltraInfer/GPU/CUDA；同一干净环境首次初始化仍出现非 JSON stdout、空结果或非法几何；尝试需要改 sidecar 协议、控制面或增加第二条 fallback。命中任一项即 `blocked`，不得猜 URL、换版本或叠补丁。

成功验收：两引擎在同一模型 SHA 下分别完成精确 READY；各自连续两次 synthetic 中文请求均返回非空文本、合法框和原 request/attempt/model/frame 身份；stdout 只含 NDJSON、无敏感 stderr；任一时刻仅一个 OCR 引擎常驻；backend/Worker `NRestarts=0`，记录峰值 RSS 和剩余内存。以上全部通过后，才允许单独申请启用候选和一次业务链验收。

## 6. 当前裁决

- 不恢复 `LOCAL-OCR-SERVER-03J`；它已终止且不再是正确路线。
- 下一 Owner 是 BACK，但本次审计不自动派发；等待规划/用户确认后创建一个短任务卡执行 runner 收敛。
- 当前 `remaining_gap=RapidOCR runner 尚未实现、服务器尚未安装与验收`。
