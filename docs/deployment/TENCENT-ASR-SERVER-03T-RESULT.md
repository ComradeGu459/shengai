# TENCENT-ASR-SERVER-03T 结果

## outcome

`blocked`

archive、独立 extract、五入口、candidate 安装及 preserve-symlinks prestart 门均通过；ASR 稳定运行门因 storage 配置缺失失败，已按任务卡回滚，未进入 WAV、COS、Tencent 或 synthetic 阶段。

## evidence

- 指定 handoff archive 本地核验通过：`8828044` bytes，SHA-256 为 `31119288f5de20ba80eac54ee3eebc4543fa1f653235c8d3f6c3881d5ed2ccf8`。
- 服务器 archive SHA 一致；结构门为 symlink `476`、hardlink `905`、坏名称 `0`、坏 symlink `0`、坏 hardlink `0`。
- 独立 tar extract：exit `0`，stdout/stderr 为空。
- storage、asr、worker、app、server 五个独立 Node 进程均 exit `0`，stdout=`loaded`、stderr 为空，最终 `entries=5/5`。
- candidate `20260828-tencent-asr-03t-r1` 安装成功；实例目录先创建并断言为 root:root:0755；canonical override 的 effective ExecStart 为 `/usr/local/bin/node --preserve-symlinks-main ...`，DropInPaths 与 prestart assertion 通过。
- 启动后立即保存 systemd 快照：start 时 `Result=success`、ExecMainCode/Status=`0`、active、NRestarts=`0`；稳定窗时 `Result=exit-code`、ExecMainCode/Status=`1`、Inactive 时间已记录、NRestarts=`1`。
- 两份日志启动后快照已保存并安全解析：worker stdout 为 `0` bytes；error tail 为 `30` 行、`2184` bytes；无稳定 error class/code，但明确出现缺失环境键 `QIMAO_S3_REGION`，首个项目帧为 `modules/storage/s3-compatible-storage.js:266`，退出语义为 nonzero process exit。
- backend、screen-text、upload-completion、OpenVINO active，backend health 为 `status=ok`、`database=connected`。
- 未下载固定 WAV；未调用 COS、Tencent ASR、生产 API、DB/control-plane 写入；未创建 synthetic。

## remaining_gap

ASR Worker 的生产 S3/COS 配置缺少 `QIMAO_S3_REGION`，导致 storage 配置分支退出；未继续猜测其它配置，也未重试 provider。

## next_owner

规划/BACK 负责在既有对象存储配置边界内补齐并审计 `QIMAO_S3_REGION`，再决定是否授权一次 ASR-only 复验；SERVER 不重放 03T。

## files

- `docs/deployment/TENCENT-ASR-SERVER-03T-RESULT.md`

## residual

- current 已恢复 `/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`。
- 03T candidate release、远端 archive/payload/runner/snapshot/temp、ASR env、override 均已删除。
- 本机 `.asr03t\candidate.tar.gz` handoff archive 已按失败终态删除。
- ASR inactive/disabled；backend、screen-text、upload-completion、OpenVINO 与 health 恢复正常。
- 未留下 WAV、COS 对象、Tencent Task、synthetic 数据或新的 control-plane 配置。

## requires_user

无需补充凭据；如需继续，需规划明确一次补齐 `QIMAO_S3_REGION` 后的 ASR-only 复验 lease。当前结论为 blocked-clean。

