# OCR-MEDIA-DIAG-SERVER-01-R1

## artifact

```yaml
artifact_written: true
outcome: blocked
requires_user: false
```

## evidence

- 复用同一 batch `c82ea8b2-ff3a-4c3b-be2a-fedcab47ce25`，Worker 保持停止；本轮未重试、重建、改库或调用 OCR。
- 只读读取 canonical screen-text Worker 的完整 EnvironmentFiles：`backend.env`、`object-storage.env`、`screen-text-local-ocr-05d.env`、`local-ocr-frame-extractor-05b.env`。未逐键猜测，也未输出环境值。
- 同一失败素材复用前片已通过的 COS GET 门：HTTP=`200`、长度=`156739874`，与声明值一致；本片未再次发起独立 GET，只生成同一 Asset 的短时 presigned URL 供抽帧器参数使用。
- 本轮 batch 计数只读观测为 `queued:12,failed:39`。计数变化来自停止前已在运行的 canonical Worker 收敛，本片没有写入 batch/job/attempt。
- frame-extractor 启动次数=`0`。qimao 进程已完整继承四份 EnvironmentFile，但在创建默认临时目录阶段返回安全分类 `EACCES`；因此没有进入 ffprobe 或 ffmpeg，安全阶段均为 `not_observable`，无 extractor exit code、无 manifest、无帧产出。
- 临时目录：创建失败前未形成可用目录；本地诊断脚本已精确删除，未留下媒体、帧或 manifest。
- screen-text Worker 仍为此前止损后的 `inactive/dead`（停止命令已在上一片执行并确认）；本片未再次启动或重启。

## root_cause

`DIAG_TEMP_ROOT_EACCES`：四份 canonical EnvironmentFiles 已正确装配，但 qimao 运行身份无法在诊断使用的默认临时根创建 extractor 临时目录；本片未到达 frame-extractor，因此不能归因于 ffprobe、ffmpeg、COS 内容或 OCR。

## next_action

`PLANNER`：下一独立切片先只读确认 canonical qimao 可写且可穿越的专用临时根，并让既有 extractor 使用该固定临时目录；随后以同一失败 job 只启动一次 extractor。Worker 在 extractor 门通过前保持停止，禁止在本片继续改动或 R2 重试。

## residual

- screen-text Worker：保持 `inactive/dead`；未触碰 backend、ASR Worker、OpenVINO sidecar、DB 状态或 batch 数据。
- batch：保留只读观测 `12 queued + 39 failed`；本片无业务/Provider/COS 写入，无 OCR 调用。
- 服务器与本地：无本片临时媒体目录、帧、manifest 或脚本残留。

