# TENCENT-ASR-SERVER-04B

outcome: blocked
slice_outcome: rolled_back
artifact_written: true

## evidence

- CURRENT 为 `v4-1285`，active slice=`TENCENT-ASR-SERVER-04B`，formal lease=`1`；本地唯一 candidate archive SHA-256 与冻结身份一致：`e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30`。
- 使用此前复核的专用 SSH key 连接 `qimao-deploy@103.36.63.67`；远端只读基线为 `/usr/local/bin/node v24.19.0`、current=`20260828-local-ocr-06k-r1`、ASR=`inactive`、`NRestarts=0`。
- 唯一 candidate archive 上传执行 `1` 次；远端 SHA-256 精确匹配冻结 SHA，archive=`14,894` entries、绝对路径=`0`。解包至本轮 0700 staging 后，相对 symlink 解析均保持在 staging 根内，五个声明入口均为 regular file。
- Linux 五入口导入门未通过：storage 与 ASR runtime 导入后，ASR Worker 入口导入命令错误地把入口路径放入 `process.argv[1]`，触发 worker standalone 分支并返回 `Error`；因此未把该门误报为通过，也未继续安装或启动。
- 失败后立即删除本轮唯一远端 `/tmp/qimao-asr-04b-r1`（candidate archive 与 staging）；终态只读复核为 current=`/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`、ASR=`inactive`、`NRestarts=0`、精确残留路径=`0`。

## external_counts

- candidate 上传=`1`；immutable release/provider.env/canonical drop-in/daemon-reload/ASR 启动=`0`。
- 固定 WAV 下载=`0`；COS Put/Head/signed GET/独立 GET=`0`。
- Tencent `CreateRecTask`=`0`；`DescribeTaskStatus`=`0`；TaskId=`0`。
- 生产业务 API、业务数据库/control-plane 写入、budget reservation/actual=`0`。

## remaining_gap

Linux 五入口门因本轮导入命令触发 standalone 而失败，未完成 immutable release、root-only provider.env、canonical drop-in、systemd active 健康窗和固定 WAV→COS→一次 CreateRecTask→同 TaskId Describe 至终态的业务闭环；cue/quality、Worker 日志、预算 estimate/non-zero actual 证据均缺失。按“任一真实门失败即回滚并停止”规则，本轮不重跑该门、不重建 candidate、不重复外部创建。

## next_owner

规划审核本轮失败事实；如继续，向同一 SERVER 固定任务签发新的精确切片，复用本地冻结 archive 身份但不得在本轮继续重放。业务代码、candidate、锁文件和控制面不在 SERVER 范围内。

## files

- `docs/deployment/TENCENT-ASR-SERVER-04B-RESULT.md`

## rollback_point

- 远端保持 `/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`；ASR inactive/disabled、`NRestarts=0`。

## residual

- 远端 release/current/provider.env/drop-in/service、WAV、COS 对象、Tencent Task、DB/control-plane/budget synthetic 残留：`0`；current 与原 ASR 服务状态恢复不变。
- 本地冻结 candidate 目录与 archive 仍保留在 `C:\tmp\qimao-terms-cloud-asr-04b-candidate-20260828` 及其 `.tar.gz`，archive SHA 未变；未生成 Secret、WAV 或其他仓库文件。
- `D:\ChromeCoreDownloads\SecretKey.csv` 仅做本地受控结构校验（未回显值），未传远端，未生成 provider.env。既有脏工作树保留；未 reset、checkout、clean、stash、提交或推送。

## goal_gap

未完成 ASR 真实业务闭环。

## requires_user

false：本轮未新增权限需求；下一步是否重发执行切片由规划审核决定。
