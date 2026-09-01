# OCR-MEDIA-DIAG-SERVER-02

## artifact

```yaml
artifact_written: true
outcome: blocked
requires_user: false
```

## evidence

- 目标 batch：`c82ea8b2-ff3a-4c3b-be2a-fedcab47ce25`；Worker 保持 `inactive/dead`，未重试、重建、改库或调用 OCR。
- transient unit：`qimao-ocr-media-diag-02.service`；一次 `systemd-run --wait --collect --pipe`，User/Group=`qimao:qimao`，WorkingDirectory=current/backend，PrivateTmp/ProtectHome/ProtectSystem/ReadWritePaths 与任务卡一致；结束后只读 `LoadState=not-found`，说明已自动回收。
- canonical EnvironmentFiles 完整复用：`backend.env`、`object-storage.env`、`screen-text-local-ocr-05d.env`、`local-ocr-frame-extractor-05b.env`；未输出环境值。
- `process.tmpdir` 写入探针=`passed`。既有 frame-extractor 实际启动=`1`，且是本片唯一 extractor 启动；返回 `QIMAO_FRAME_EXTRACTOR_OUTPUT_INVALID`、exit=`2`。
- 按既有 extractor 阶段语义，`PROBE_FAILED`/`EXTRACT_FAILED` 均未返回，故 ffprobe=`passed`、ffmpeg=`passed`；失败发生在随后帧输出/manifest 合同校验。合规 manifest=`false`、manifest 持久存在=`false`、合规帧数不可采信，未输出任何帧或其内容。
- 同一失败素材声明长度=`156739874`，checksum 字段为合法 SHA-256（不输出值）；上一片同一对象 GET 已为 HTTP=`200` 且接收长度完全匹配，本片不重复独立 GET，仅为同一 Asset 生成短时 URL 供唯一 extractor 使用。
- batch 只读计数前后均为 `queued:12,failed:39`；本片没有 batch/job/attempt 写入，没有 OCR/Provider 业务调用。
- transient 临时目录由脚本在 finally 精确删除，`tempRemoved=true`；本地诊断脚本已删除。

## root_cause

`SCREEN_TEXT_FRAME_OUTPUT_INVALID`：COS 取流合同已有 HTTP/长度证据，canonical 环境与临时根也通过；frame-extractor 已越过 ffprobe/ffmpeg，最终生成的帧集合未满足现有输出/manifest 合同。具体帧与素材未读取或输出，故本片不继续猜测更细原因。

## next_action

`PLANNER/BACK`：依据已记录的稳定错误码审查既有 extractor 的输出合同与该媒体的编码/帧采样边界；在新的、单独批准的诊断切片前保持 screen-text Worker 停止，不在本片重试 extractor 或恢复批次处理。

## residual

- screen-text Worker：保持 `inactive/dead`；backend、ASR Worker、OpenVINO sidecar 未由本片操作。
- batch：保留只读事实 `12 queued + 39 failed`，本片无 DB、OCR、Provider、COS 写入。
- 服务器：transient unit 已 collect；PrivateTmp 临时目录、manifest、帧文件与诊断脚本均无残留。

