# TENCENT-ASR-SERVER-04I 结果

```yaml
artifact_written: true
outcome: blocked
task: TENCENT-ASR-SERVER-04I
current: v4-1295
lease: 1
role: SERVER
server: 103.36.63.67
candidate_archive_sha256: e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30
candidate_archive_bytes: 8898107
requires_user: true
next_owner: PLANNING
```

## 结果

本轮 blocked。服务器没有可复用的既有语音生成器：文件化 harness 在创建 MP4 载荷前检查 `espeak-ng`/`espeak`，返回唯一首因 `NO_EXISTING_SPEECH_GENERATOR`。按夹具约束未安装软件、未改路线、未伪造 WAV/MP4，因此没有进入真实 MP4 synthetic。

## 执行证据

- 本地 `.codex-04i-harness.mjs` 已通过 `node --check` 和静态路径/禁止 inline Node 检查；远端文件化 harness 也通过 `/usr/local/bin/node --check`。
- 复用既有 archive，SHA 与大小分别为 `e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30`、`8898107` bytes；顺序修正后没有重传 archive、重建 candidate 或重跑 import/DB 门。
- 04I 首次尝试在解包前因 harness 顺序错误返回 `MODULE_NOT_FOUND`；当时未创建隔离 DB、COS 对象、Tencent TaskId 或业务事实。
- 允许的一次顺序修正第二次执行返回：`{"outcome":"blocked","firstFailure":"NO_EXISTING_SPEECH_GENERATOR"}`。该失败发生在 archive 解包、隔离 DB、COS 上传、Tencent `CreateRecTask` 和业务写入之前。
- 临时 provider env 曾按授权从 SecretKey.csv 派生并安装到固定临时根，统计为 `root:qimao`、mode `0640`、`282` bytes、SHA256 `8f61cfce69981f879bac1b49a749af9b0aecd76666f1268120abfce6c841893f`；未回显值，失败后已删除。生产 `/etc/qimao-terms-cloud/provider.env` 只读确认仍不存在。

## 未执行项目

以下项目均为 0 / 未到达：

- 合法匿名可识别语音 MP4 生成、MP4 上传/verify、terms 链、engine/route/budget 装配。
- 隔离数据库创建/migrate、project/manifest、`UploadCompletionWorker`、`AsrWorker`。
- COS 对象创建、Tencent `CreateRecTask`、TaskId Describe、ASR job/cues/usage/log/budget 事实。
- 生产 DB/current/控制面/公网路由改动。

## 清理与残留

- 文件化清理已删除固定远端临时根内的 candidate、provider env、release、media、state 和 harness。
- 清理脚本首次删除空目录时返回 `TEMP_ROOT_NOT_EMPTY_ERR_FS_EISDIR`；只读确认目录已为空后，对同一固定目录执行精确 `rmdir`，最终确认 `/tmp/qimao-asr-04f-r1` 与 bootstrap harness 均不存在。
- 没有 COS 对象或隔离 DB 可清理；没有 Tencent TaskId，因此不需要同身份查询。
- 本地临时 harness 已删除；本轮仅写入本结果文档，没有修改业务源码、candidate、declaration、probe 或 lock。

## remaining_gap / requires_user

`remaining_gap`: 服务器缺少既有、可复用且能生成可识别语音轨道的语音生成器。`Owner=PLANNING`。在提供可靠既有生成器或由规划方给出新的明确验收决策前，不得安装新软件、重建 candidate、伪造载荷或继续外部调用。

`requires_user: true` 仅表示需要后续决策/环境能力；本轮没有遗留外部资源，也没有重复外部创建。
