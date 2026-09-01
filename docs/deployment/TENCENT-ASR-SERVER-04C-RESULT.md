# TENCENT-ASR-SERVER-04C

outcome: blocked
slice_outcome: rolled_back
artifact_written: true

## evidence

- CURRENT 为 `v4-1286`，active slice=`TENCENT-ASR-SERVER-04C`，formal lease=`1`；沿用唯一冻结 candidate archive SHA-256=`e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30`，未重建本地 candidate、数据库或编译产物。
- 使用既有专用 SSH key 连接 `qimao-deploy@103.36.63.67`；安装前主机身份门通过：`qimao:qimao`、`/usr/local/bin/node v24.19.0`，精确临时目录/release/provider/drop-in 均无碰撞。
- 同一 candidate archive 上传执行 `1` 次；远端 archive SHA 精确匹配，`14,894` entries、绝对路径=`0`。解包到本轮 0700 staging 后，相对 symlink 解析均保持在 staging 根内，五个声明入口均为 regular file。
- 五入口 import 门未执行成功：修正后的调用仍在 Windows→远端 shell 引号层被改写，Node 实际收到无引号的 `node:url`，在首个入口处返回 `SyntaxError`；因此未把 import 或 systemd 门误报为通过。
- 失败后立即删除本轮唯一远端 `/tmp/qimao-asr-04c-r1`（candidate archive 与 staging）；终态只读复核为 current=`/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`、ASR=`inactive`、`NRestarts=0`、精确残留路径=`0`。

## external_counts

- candidate 上传=`1`；immutable release/provider.env/canonical drop-in/daemon-reload/ASR 启动=`0`。
- 固定 WAV 下载=`0`；COS Put/Head/signed GET/独立 GET=`0`。
- Tencent `CreateRecTask`=`0`；`DescribeTaskStatus`=`0`；TaskId=`0`。
- 生产业务 API、业务数据库/control-plane 写入、budget reservation/actual=`0`。

## remaining_gap

五入口 Linux import 门因命令引号层失败，未完成 systemd effective ExecStart/Worker active 健康窗、root-only provider.env、immutable release 及固定 WAV→COS→一次 CreateRecTask→同 TaskId Describe 至终态的业务闭环；cue/quality、Worker 日志、预算 estimate/non-zero actual 证据均缺失。按失败即回滚规则，本轮不再重放、不重建 candidate、不重复 Create。

## next_owner

规划审核本轮前置命令失败事实；如继续，向同一 SERVER 固定任务签发新的精确切片，复用本地冻结 archive 身份但需改用不会被 shell 改写的单一远端脚本输入方式。业务代码、candidate、锁文件和控制面不在 SERVER 范围内。

## files

- `docs/deployment/TENCENT-ASR-SERVER-04C-RESULT.md`

## rollback_point

- 远端保持 `/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`；ASR inactive/disabled、`NRestarts=0`。

## residual

- 远端 release/current/provider.env/drop-in/service、WAV、COS 对象、Tencent Task、DB/control-plane/budget synthetic 残留：`0`。
- 本地冻结 candidate 目录与 archive 仍保留在 `C:\tmp\qimao-terms-cloud-asr-04b-candidate-20260828` 及其 `.tar.gz`，archive SHA 未变；未传输 SecretKey.csv，未生成 provider.env。
- 既有脏工作树保留；未修改业务代码，未 reset、checkout、clean、stash、提交或推送。

## goal_gap

未完成 ASR 真实业务闭环。

## requires_user

false：本轮未新增权限需求；下一步由规划审核决定。
