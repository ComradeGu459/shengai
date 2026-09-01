# TENCENT-ASR-SERVER-03P 结果

## outcome

`blocked`

archive、独立 extract、五入口与 canonical systemd prestart 门均通过；ASR 启动稳定门失败，已按任务卡回滚并精确清理，未进入 WAV、COS、Tencent 或 synthetic 阶段。

## evidence

- 指定 handoff archive 本地核验通过：`8827871` bytes，SHA-256 为 `d7d0eed67c936dfc1287cc89a614b7bb6fcadbf88443e8f624c069c917eb1085`。
- 服务器 archive SHA 一致；结构门为 symlink `476`、hardlink `905`、坏名称 `0`、坏 symlink `0`、坏 hardlink `0`。
- 独立 tar extract：exit `0`，stdout 为空，stderr 为空。
- 五个独立 Node 进程均 exit `0`；storage、asr、worker、app、server 各 stdout 为 `loaded`、stderr 为空，组合结果 `entries=5/5`。
- 安装 candidate `20260828-tencent-asr-03p-r1` 后，canonical ASR 实例 `override.conf` 被 DropInPaths 识别，effective ExecStart 精确为 `/usr/local/bin/node /opt/qimao-terms-cloud/current/backend/dist/workers/asr.worker.entry.js`；prestart assertion 通过。
- root-only ASR env 为 600，临时 CSV 已删除；加入同一实例 override 后再次 daemon-reload 与 prestart assertion 通过。
- ASR `systemctl start` 返回 exit `0`，但稳定窗两次均为 `inactive`，两次 `NRestarts=0`；因此未满足 active 稳定门。现有记录不足以裁决其 inactive 的内部原因，不猜测。
- 两次观测中 backend、screen-text、upload-completion、OpenVINO 均 active，backend health 为 `status=ok`、`database=connected`。
- 未下载固定 WAV；未调用 COS、Tencent ASR、生产业务 API、DB/control-plane 写入；未创建 synthetic。

## remaining_gap

ASR unit 启动命令虽返回成功，但未保持 active；本轮没有在失败后继续读取日志或重试，无法给出更深层原因。

## next_owner

规划负责决定是否发放新的单次 ASR unit 运行审计/部署 lease；SERVER 不重试 03P。

## files

- `docs/deployment/TENCENT-ASR-SERVER-03P-RESULT.md`

## residual

- current 已恢复 `/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`。
- 03P candidate release、远端 archive/payload/runner/temp、ASR env、ASR 实例 override 均已删除。
- 本机 `.asr03p\candidate.tar.gz` handoff archive 已按终态要求删除。
- ASR inactive/disabled；backend、screen-text、upload-completion、OpenVINO 与 health 均恢复正常。
- 未留下 WAV、COS 对象、Tencent Task、synthetic 数据或新的 control-plane 配置。

## requires_user

无需补充凭据；如需继续，需规划明确一次新的 ASR unit 运行原因审计或修复任务。当前结论为 blocked-clean。

