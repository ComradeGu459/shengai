# TERM-CONTROL-E2E-SERVER-18

- artifact_written: `docs/deployment/TERM-CONTROL-E2E-SERVER-18-RESULT.md`
- outcome: `blocked`

## evidence

- 复用固定执行约束：数值 `UID=999`、`GID=996`；runtime tree 为 `/opt/qimao-terms-cloud/runtime-tests/term-control-e2e-18-r1`。
- root 在内存解析 object-storage 配置，仅在 `QIMAO_UPLOAD_STORAGE_KIND=s3`、`QIMAO_S3_PROVIDER=tencent-cos` 且两项 S3 key 完整时生成 overlay；Secret 值、Base64 和对象键均未输出。
- overlay 写入的六个键为 ASR enabled、region、Secret ID/Key、object URL TTL、小时价格；写入前后元数据符合：目录 `uid=0,gid=996,mode=750`，已知文件 `uid=0,gid=996,mode=640`。数值 `999:996` 可读且不可写，Node 语法检查通过。
- overlay 装配成功，current release 的真实 Tencent ASR registry 已 enabled，descriptor provider 为 `tencent_cloud`。
- 唯一一次真实 E2E 创建了 synthetic project、material manifest 和两次真实 COS 上传；在第一次 DeepSeek provider 写请求前，terms extraction POST 返回 `422 TERM_ROUTING_NOT_ACTIVE`。
- DeepSeek POST 数量为 `0`，Tencent Create 数量为 `0`；未发生未知 provider 写入，后续仅执行同一 synthetic project 的 GET/清理核验。
- 未达到 DeepSeek run succeeded、候选确认、TermVersion、ASR 同 TaskId completed、`termVersionId`/`hotwordDigest`/合规 `HotwordList` 验收项。
- 清理已收敛：项目 `purged`、assets `0`、uploads `0`、cleanup `completed`；purge tombstone 为 `object_deleted=0`、`object_missing=2`。固定 runtime tree 已精确移除并确认不存在。
- 当前 release 未变更；四个目标 unit 均保持 `active/running`、`NRestarts=0`、`ExecMainStatus=0`。

## remaining_gap

当前正式 terms_api route 未处于 active，无法启动真实 DeepSeek 术语提取；本次不改路由、不改源码或配置、不重试。

## next_owner

`system-control`：核对并恢复唯一正式 terms_api active route 后，再申请新的 SERVER E2E 执行切片。

## residual

- 远端 runtime tree 及临时 Secret overlay：已清理。
- synthetic project、数据库资产、上传会话：已 purge，计数为零。
- COS 清理事实：provider 返回两项对象 missing，无可保留对象；无待处理 cleanup job。
- 本地临时 harness：已清理。
- 未修改 `/etc`、systemd unit、current release、static、provider 配置或业务代码。

## requires_user

`否`
