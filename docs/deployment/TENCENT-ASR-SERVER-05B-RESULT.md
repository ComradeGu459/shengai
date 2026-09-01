# TENCENT-ASR-SERVER-05B-SYNTHETIC

```yaml
artifact_written: true
outcome: blocked
task: TENCENT-ASR-SERVER-05B-SYNTHETIC
current: v4-1304
lease: 1
role: SERVER
server: 103.36.63.67
next_owner: PLANNING
requires_user: true
```

## 结论

本轮在正式 bootstrap 的 prepare 阶段阻断，未进入业务 harness、隔离业务写入、COS 上传或 Tencent 创建。停止首因是：在已完成 sudo 文件装配校正、并改用 declaration 接受的数据库名后，正式命令返回脱敏的 `COMMAND_FAILED`。工具没有暴露失败的具体子命令；按停止条件不再重试或现场修补。

此前的两项前置问题均未形成外部事实：

- 首次非 sudo 文件复制因 qimao-deploy 无权读取 `root:qimao` 文件或改变目标 owner；随后用既有 `sudo -n install` 边界校正，源/目标 SHA 一致。
- 首次数据库名因不符合既有 05A declaration 的 `qimao_asr_05a_...` 约束返回 `DATABASE_NAME_INVALID`；改用 `qimao_asr_05a_20260828_05b_01` 后才得到上述 `COMMAND_FAILED`。

## 本轮证据

### 本地载荷与候选

- 只读源文件：`E:\七猫兼职\02_项目\05_妈妈是神在人间的分神\原始素材\视频\24.mp4`，原始大小 `56,060,105` bytes；未修改、移动或读取其他素材。
- 有效派生媒体仅生成一次，按固定 `5s–20s` 配方得到 `derived-episode-001.mp4`：`1,012,623` bytes，SHA-256 `22c95c0c7b3674183c67cdf268baef901a91a1d387e01acd6d8bab7e2bec38eb`。
- ffprobe 通过：合法 MP4，时长 `15.000000` 秒，视频 `H.264`、`540x960`，音频 `AAC`、`16000 Hz`、单声道；未输出语音正文。
- 候选 archive：`8,898,107` bytes，SHA-256 `e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30`。未重建、未重传替代候选。
- provider 派生文件：`282` bytes，SHA-256 `8f61cfce69981f879bac1b49a749af9b0aecd76666f1268120abfce6c841893f`；Secret 值未写入本记录。

### 远端发布/身份门

- archive、媒体、两个正式 `.mjs` 均上传到本轮临时根；远端 archive 与媒体 SHA 分别等于上述固定值和本次本地值。
- 两个正式 `.mjs` 均 `node --check` 通过；两个 05A `--self-test` 均通过，覆盖身份、媒体 SHA、命令分派和 cleanup 顺序，且声明的 `createRecTaskMaximum` 为 `1`。
- archive 已解包到临时 release，`backend/package.json` 存在。
- backend.env、object-storage.env、media 均经 `sudo -n install` 装配为 `root:qimao`、`0640`，qimao 可读性边界按既有流程检查；源/目标如下：
  - backend.env：`776` bytes，SHA `05d21ec3dc196c1ce96243fca447fbb65e5a6047eb5ae3844065c52186ceac6f`。
  - object-storage.env：`421` bytes，SHA `773b8362b39af2e3d71c5f88571210b0689397c5b825f820ea88f21f863b6259`。
  - media：`1,012,623` bytes，SHA `22c95c0c7b3674183c67cdf268baef901a91a1d387e01acd6d8bab7e2bec38eb`。
- provider 在 prepare 返回后未留下目标文件；生产 `/etc/qimao-terms-cloud/provider.env` 仍 absent。没有绕过 bootstrap 直接读取或安装 provider 内容。

### bootstrap 与外部动作

```text
正式 prepare 结果：
{"component":"bootstrap","outcome":"blocked","code":"COMMAND_FAILED"}
```

| 项目 | 结果 |
|---|---|
| 隔离数据库创建 | 未证明成功；未进入业务迁移链 |
| 隔离数据库清理 | 已对精确名称 `qimao_asr_05a_20260828_05b_01` 执行 `--drop-db`，返回 `database_dropped` |
| loopback / Workers | 未启动 |
| COS 上传 | `0` 次；无已知对象可删、无 Head=404 事实 |
| Tencent CreateRecTask | `0` 次；无 TaskId、无 Describe |
| project/manifest/upload verify/terms/route/budget/batch/dispatch | 均未执行 |
| ASR job/cue/usage/log/budget 业务事实 | 均未产生 |

因此 TaskId 同一性为 `N/A`，外部创建次数为 `0`，不存在 unknown 结果，也未进行第二身份或第二候选尝试。

## 生产基线与清理

- 生产 backend.env 与 object-storage.env 的 owner、mode、bytes、SHA 均保持不变。
- 生产 provider.env 保持 absent；生产 current、生产 DB、控制面和公网路由未写入。
- ASR service 保持既有 inactive 基线；本轮没有启动或重启生产服务。
- 远端临时根 `/tmp/qimao-asr-05b-r1` 已由正式 cleanup 删除，返回 `temp_root_removed`。
- 精确数据库 drop 已完成；无 loopback/Worker 需要停止。
- 无 COS 对象、TaskId 或未完成外部命令需要清理。
- 本地临时媒体/provider 目录 `.codex-05b-media-20260828` 已删除；`C:\tmp\qimao-asr-05b-20260828` 不存在。
- 源文件仍为原路径，大小仍为 `56,060,105` bytes；未修改或移动。
- residual：`0`（本轮远端临时根、本地载荷临时目录、provider 临时文件均已清零；生产基线保留）。

## Remaining gap / next owner

唯一剩余缺口是正式 05A bootstrap 对 `COMMAND_FAILED` 只返回统一脱敏码，无法在本轮确定失败的内部子命令；provider 目标未落地，故不能证明 prepare 完成。该缺口需由 `PLANNING` 在新一轮授权/明确诊断方案中处理；本轮不再重试 prepare、不修改两个 `.mjs`、不重建或重传候选、不重复外部创建。

