# TENCENT-ASR-SERVER-03O 结果

## outcome

`blocked`

Linux 五入口加载门未能证明，按任务卡立即停止；未安装 candidate、未写 canonical override、未启动 ASR、未下载 WAV，未进入 COS、Tencent ASR 或 synthetic 业务阶段。

## evidence

- 指定 candidate archive 本地核验通过：`8827979` bytes，SHA-256 为 `1636ba709b15db5b8c258d2d76692a4e2bc8250630ea99c68117ffd57634ec60`。
- 服务器 archive SHA 一致：`1636ba709b15db5b8c258d2d76692a4e2bc8250630ea99c68117ffd57634ec60`。
- archive 结构核验通过：symlink `476`、hardlink `905`、坏名称 `0`、坏 symlink 目标 `0`、坏 hardlink 目标 `0`。
- 解包后的五入口加载命令退出码为 `1`，stdout/stderr 无安全诊断输出；因此未能证明 `5/5`，也未猜测失败发生在解包还是某个入口 import。
- 失败前 current 一直为 06K，未安装 03O release；未写 override、未启动或重启任何服务。
- 未下载固定 WAV；未调用 COS、Tencent ASR、生产业务 API、DB/control-plane 写入；未创建 synthetic。
- 清理后 current 为 `/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`；ASR inactive/disabled；backend、screen-text、upload-completion、OpenVINO 均 active，backend health 为 `status=ok`、`database=connected`。

## remaining_gap

Linux 五入口门的安全诊断不可用：组合命令仅返回退出码 `1` 且无输出，无法在不换路线、不重跑的前提下区分解包失败与入口加载失败。

## next_owner

规划负责决定是否发放新的单次加载审计任务；SERVER 不重跑 03O，也不进入服务或 provider 阶段。

## files

- `docs/deployment/TENCENT-ASR-SERVER-03O-RESULT.md`

## residual

- 03O candidate release 未创建；远端 `/tmp` archive/payload/incoming 已清理。
- 本机 `.asr03o\candidate.tar.gz` handoff archive 已按失败终态要求删除。
- 未留下 override、WAV、COS 对象、Tencent Task、synthetic 数据或新的 control-plane 配置。

## requires_user

不需要补充凭据；如需继续，需规划明确一次新的、可区分解包与入口 import 的加载门。当前结论为 blocked-clean。

