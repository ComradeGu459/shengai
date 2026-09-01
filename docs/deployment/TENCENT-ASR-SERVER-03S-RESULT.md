# TENCENT-ASR-SERVER-03S 结果

## outcome

`blocked`

Linux archive、独立 extract、五入口和 candidate 安装均通过；canonical override 写入门失败，已按任务卡立即回滚，未启动 ASR，未进入 WAV、COS、Tencent 或 synthetic 阶段。

## evidence

- 指定 handoff archive 本地核验通过：`8828407` bytes，SHA-256 为 `e2960c81aa769c5e6425f8836faeff895586b26cd9275fc20d77f542f486f19c`。
- 服务器 archive SHA 一致；结构门为 symlink `476`、hardlink `905`、坏名称 `0`、坏 symlink `0`、坏 hardlink `0`。
- 独立 tar extract：exit `0`，stdout/stderr 为空。
- storage、asr、worker、app、server 五个独立 Node 进程均 exit `0`，stdout=`loaded`、stderr 为空，最终 `entries=5/5`。
- candidate `20260828-tencent-asr-03s-r1` 安装并原子切换成功。
- ASR canonical override 写入失败：实例 drop-in 目录不存在，`tee` 返回 `No such file or directory`；因此未写入 override，未执行该阶段 daemon-reload、prestart assertion 或 ASR start。
- 未下载固定 WAV；未调用 COS、Tencent ASR、生产 API、DB/control-plane 写入；未创建 synthetic。
- 回滚后 current 为 `/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`；ASR inactive/disabled；backend、screen-text、upload-completion、OpenVINO active，backend health 为 `status=ok`、`database=connected`。

## remaining_gap

本轮未能验证 preserve-symlinks-main 的真实 ASR Worker 运行门；失败发生在目标 drop-in 目录缺失，不延伸推断 Worker、env 或 provider 原因。

## next_owner

规划负责决定是否发放新的单次部署 lease，并在写 override 前显式创建/核验 canonical 实例 drop-in 目录；SERVER 不重放 03S。

## files

- `docs/deployment/TENCENT-ASR-SERVER-03S-RESULT.md`

## residual

- current 已恢复 06K。
- 03S candidate release、远端 archive/payload/runner/temp、ASR env、override 均已删除。
- 本机 `.asr03s\candidate.tar.gz` handoff archive 已按失败终态删除。
- 未留下 WAV、COS 对象、Tencent Task、synthetic 数据或新的 control-plane 配置。

## requires_user

无需补充凭据；如需继续，需规划明确一次新的 canonical drop-in 目录创建/核验与 preserve-symlinks-main 运行门任务。当前结论为 blocked-clean。

