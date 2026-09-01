# LOCAL-OCR-SERVER-05B 终态

- outcome: `passed`
- slice_outcome: `passed`
- remaining_gap: `none`（本切片只验证 COS→抽帧→OpenVINO HTTP；业务 route、DB、真实素材与公网均未触碰）
- next_owner: `规划`
- requires_user: `false`

## 04G 基线与最终运行态

- OpenVINO unit：`qimao-local-ocr-openvino.service`=`active`、`enabled`，`NRestarts=0`；`127.0.0.1:3100` 仅 1 个监听。
- ONNX unit：`qimao-local-ocr-onnx.service`=`inactive`、`disabled`，`NRestarts=0`；`127.0.0.1:3101` 无监听。
- 既有 backend：`active`、`NRestarts=0`，loopback `/health`=`200`。
- 既有 upload-completion Worker：`active`、`NRestarts=0`。
- 本轮未切换、重启或修改 04G unit；OpenVINO 保持单常驻，业务 route/AI Worker 未激活。

## 05B immutable extractor

- 源 extractor：`backend/sidecars/local-ocr/frame-extractor.ts`，SHA-256=`4c92d359f451bf571aaad0f05029d46b550e15bbe13667df80b33f46ffe1e5b3`。
- 本轮 fresh build `frame-extractor.js` SHA-256=`b9c09abc4bd08785d269ac7dccdd5e8e9c137a742c6ec79c9bf27c145d8ff498`。
- 同候选未改动的 04G runtime 指纹：entry=`28853cc19392fa7fef149f48c8002089f33c9772f0bb91e5b8090d60bc13e200`；sidecar=`99ee3eb60a220b5c41ed7f1a50a2020c50d9511ce37f5e2198ee475c5967c3ed`。
- 远端正式 release：`/opt/qimao/local-ocr/20260827-local-ocr-05b-r1`；release `frame-extractor.js` SHA 与 fresh build 一致。
- release manifest SHA-256=`e058a120542e651c294063cb15eccaeb7147d06173ef52d5e8b2867057b82d60`；`manifest.meta` SHA-256=`b74d42a88c2e2d5b83b20151329cc735e94da3f65a394439fc5ca334b4a19e69`。
- 一次性归档（部署后已解包）SHA-256=`b522ceebf47af4d0627b773f1c85aba9aa39463130da8af495f5b762497cfa77`。
- root-only env：`/etc/qimao-terms-cloud/local-ocr-frame-extractor-05b.env`，owner/mode=`root:qimao 0640`；仅含 release extractor 与 `/usr/bin/ffprobe`、`/usr/bin/ffmpeg` 路径，未接入 backend/Worker。

## 合成视频与 COS→抽帧→OCR

- 使用一次性合成中文小视频，`sizeBytes=6587`，视频 SHA-256=`9c92605a646116c3d49677f53ccf36982195edbd10359e4cd0e259b8abd68a60`；未使用真实素材。
- ffmpeg/ffprobe：`5.1.9-0+deb12u1`；本地 ffprobe 视频流校验通过，`videoStreams=1`、时长约 `2000ms`。
- 使用现有 root-only COS 配置、virtual-hosted S3 client；仅创建一个临时私有对象（对象身份不在此输出），生成 `expiresIn=600s` 的私有 GET URL，未输出 URL/query/Secret。
- COS Put HTTP=`200`；同身份 Head HTTP=`200`，`Content-Length=6587` 与本地视频一致；预签名 GET 被 extractor 的 ffprobe/ffmpeg 实际使用。
- extractor exit=`0`、无 extractor error code；manifest `frames=2`、`maxPixels=2000000`，至少一帧门通过。
- 3100 OpenVINO HTTP：`200`；响应 `590` bytes；`frameCount=2`、`boxes=2`、`validNonEmptyBoxes=2`（文本/置信度/框均满足协议边界，正文不留存）。
- COS 清理：同一对象 Delete HTTP=`204`；随后同身份 Head=`404`；对象残留=`0`。

## 清理、边界与回滚

- 已删除远端 `/tmp/local-ocr-05b-r1`（合成图、视频、frames、manifest、临时归档与 helper/staging）。
- 已删除本地 `C:\tmp\local-ocr-05b-synthetic-cn.png`；本轮临时视频、帧、URL/query、日志均无残留。
- 05B 正式 release、env 与 04G 模型/运行资产按成功标准保留；未执行回滚，04G/backend/Worker 状态未改变。
- 未写业务数据库、未创建项目/会话、未激活业务 screen-text route/Worker、未访问真实素材、未开放公网端口、未修改 COS 属性/DNS/TLS/防火墙。
- residual=`0`（临时文件与 COS 对象）；保留的正式 release/env 属有意回滚资产。
