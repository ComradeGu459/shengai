# TENCENT-ASR-SERVER-05L-SINGLE-ENTRY

```yaml
artifact_written: true
outcome: passed
scope: strict-local-only
network_actions: 0
external_writes: 0
current: v4-1328
revision: 05W
role: SERVER
next_owner: PLANNING
requires_user: false
execute_invoked: false
```

## 本轮交付

在既有单入口范围内补齐了唯一 `-Execute` 编排模式，并修正 R2 的资源所有权与失败证据门。本轮没有执行 `-Execute`，没有连接服务器、传输文件、生成媒体、执行 sudo、读取 Secret 值到输出，也没有产生 DB/COS/Tencent 或业务外部事实。

文件范围保持为：

- `deploy/ssh/qimao-test-server.conf`
- `deploy/debian/bin/Invoke-TencentAsrSynthetic.ps1`
- `docs/deployment/TENCENT-ASR-SERVER-05L-SINGLE-ENTRY.md`

SSH config 的 alias 固定为 `qimao-test-server`，包含 HostName、User、IdentityFile、BatchMode、IdentitiesOnly、StrictHostKeyChecking 和 ConnectTimeout。runner 的调用面只接受模式、run-id、可选本地输入覆盖及 plan hash；root、env-dir、database、provider target 均由 runner 内部派生或构造，调用端不能逐项传入。源码中除 config 外不含 SSH key 文件名，也不含 `user@host`。

## 单一 Execute plan

`-Preflight` 与 `-Execute` 共用同一个 `Get-InputDefaults → Get-ValidatedPlanResult` 路径，不产生第二套默认值。Preflight 输出脱敏 canonical plan 及 SHA-256；Execute 必须提供同一轮重新生成且精确匹配的 `-PlanSha256`，否则在任何外部动作前以 `PLAN_HASH_INVALID` 或 `PLAN_HASH_MISMATCH` 阻断。

固定 action 顺序为（COS 与进程清理由正式 business harness 的 finally 承担，runner 不伪造 no-op action）：

```text
media.generate_once
remote.create_root
remote.transfer.scp
remote.sha_verify
remote.release_dir
remote.extract
remote.env_install
remote.provider_install
bootstrap.prepare
business.run
finally.cleanup.database
finally.cleanup.root
local.cleanup.media
```

runner 内部负责构造媒体一次生成、单次参数数组化 scp、远端 archive/media SHA 校验、release 解包、env 安装、Secret 内存到 stdin 的 provider 临时文件、bootstrap prepare 及 qimao business run。只有成功创建的资源才标记为 owned：媒体目录在 `New-Item` 成功后标记，远端 root 在 `mkdir` 成功后标记，隔离数据库在解析 bootstrap stdout JSON 且 `outcome=prepared` 后标记；cleanup 只删除 owned 资源。所有 SSH/scp 均经过同一 config 与 alias；不存在可执行命令字符串拼接，也没有 `shell:true`、inline Node、inline SQL 或第二路径。business 参数固定使用 `sudo -n -u qimao -g qimao`，provider 临时文件采用 `qimao-deploy:qimao`，provider/database.env 最终目标采用 `root:qimao`；provider source 由 bootstrap 派生到 env 下的 canonical target。

business harness 的 COS/Worker/Tencent 链仍由正式 `.mjs` 负责；runner 只保留最多一次 `CreateRecTask` 与 unknown 仅同 TaskId 查询的计划约束。business stdout 必须解析为 `outcome=completed` 才算完成。任何动作失败都会进入 runner 的资源清理序列；数据库按稳定 db-name 精确 drop，远端 root 与本地媒体目录按同一 run identity 清理。失败输出保留 primary stage code，并分别报告 completed events 与 unknown events；cleanup error 不覆盖 primary code。

05P 新增 `Resolve-ChildStageCode` 纯函数：仅逐行反向尝试 child stderr 的单行 JSON，且必须精确包含 `component`、`outcome`、`code` 三个字段；组件只能是 bootstrap/business，outcome 必须为 `blocked`，code 必须匹配 `^[A-Z][A-Z0-9_]{2,80}$`。合法时只透传 code，普通 SSH 文本、非法 JSON、组件/outcome/code 不符或额外字段均回退调用点 stage code；原始 stderr、消息、路径、URL、命令和 Secret 不进入输出或持久化报告。

## 05R 身份修正

05R 仅在本地修正身份漂移：业务用户与主组单向固定为 `qimao:qimao`；bootstrap 的 SSH/发布角色继续固定为 `qimao-deploy`，不引入 `qima` 兼容或双身份 fallback。provider/database.env 组、bootstrap 的 qimao readability、createdb owner、business 的 peer `current_user` 及 runner 的 business sudo 均由 canonical `qimao` 断言覆盖。业务 harness 新增 `id -gn` 组门；runner plan/self-test 明确 provider group、business user/group、env/database.env group。

## 05U readability code

bootstrap 的 readability 输入现在固定携带 label 与 code，检查顺序保持 backend.env、object-storage.env、provider.env、database.env、media、business、release entry 不变。七个 label 只映射到对应的 `*_READABILITY_FAILED` code：`BACKEND_ENV_READABILITY_FAILED`、`OBJECT_STORAGE_ENV_READABILITY_FAILED`、`PROVIDER_ENV_READABILITY_FAILED`、`DATABASE_ENV_READABILITY_FAILED`、`MEDIA_READABILITY_FAILED`、`BUSINESS_READABILITY_FAILED`、`RELEASE_ENTRY_READABILITY_FAILED`。权限命令、用户/组、owner/mode 与 target 均未改变；失败输出只含稳定 code，不含路径、值或 Secret。未知 label 在本地纯函数门拒绝。现有 runner child-code parser 已接受同一大写 code 语法，未改 runner。

## 05W provider target 数据流

bootstrap 的 `installProvider` 返回完整 `{target, stat, sha256}`；`target` 必须是同一 `envDir/provider.env` 派生结果。readability 的 `PROVIDER_ENV` entry 与 prepared result 均消费这个返回 target，纯函数自测覆盖精确值、同一性和漏字段/错误 target 回归。deriveProviderTarget、权限、身份和检查顺序均未改变。

## 本次实际 Preflight 输出

调用形式：

```text
pwsh -NoProfile -File deploy/debian/bin/Invoke-TencentAsrSynthetic.ps1 -Preflight -RunId asr-05l-20260829-r1
```

结果摘要：

```text
outcome=passed
network_actions=0
external_writes=0
run_id=asr-05l-20260829-r1
remote_root=/tmp/qimao-asr-05l-20260829-r1
env_dir=/tmp/qimao-asr-05l-20260829-r1/env
database=qimao_asr_05a_05l_20260829_r1
archive_bytes=8898107
archive_sha256=e9c53df2f28e0fc072a97c21906b71cc48582b61db868fd1832261365a4f4f30
source_name=24.mp4
source_bytes=56060105
secret_schema=SecretId,SecretKey; rows=1; values_emitted=false
plan_sha256=ec0f500ce81602c6ed3e8c3b4c4342c2992f18b42e5f92bb5dde127967070e84
```

## 验证证据

```text
PowerShell AST parse: exit 0
Preflight: passed
embedded self-test: passed
full action sequence: passed
same run identity across actions: passed
single media generation: passed
CreateRecTask maximum=1: passed
unknown same TaskId only: passed
child bootstrap error passthrough: passed
child business error passthrough: passed
child error fallback and extra-field rejection: passed
business identity/group qimao:qimao: passed
provider/database.env group qimao: passed
database peer current_user qimao: passed
runner sudo qimao:qimao: passed
bare qima semantic scan: 0
authoritative qimao assertions: passed
seven readability code mappings: passed
unknown readability label rejection: passed
runner readability child-code grammar: passed
provider target return/data-flow: passed
provider target missing-field regression: passed
no fake COS/process cleanup actions: passed
mock happy executor: passed; real external calls=0
pre-existing media/root: passed; no unowned deletion
transfer failure: passed; non-zero external action evidence
prepare failure: passed; database not dropped before prepared
prepared database: passed; database dropped only after prepared
business blocked: passed; not completed
cleanup error: passed; primary stage preserved
```

限定静态门：

- SSH key 文件名扫描：仅 config 命中，runner/docs 为 0；
- `user@host` 扫描：runner/docs 为 0；
- runner 参数声明未暴露 root、env-dir、db-name、provider-target；
- SSH/scp 构造均集中于参数数组 helper，统一使用 `-F` 与 `qimao-test-server`；
- `-Execute` 未调用，故本轮真实 ssh/scp/ffmpeg/sudo/network 计数为 0；
- 顶层失败报告保留原始 stage code，并按 events 输出 completed/unknown 计数，不固定伪报 0；
- 临时媒体目录不存在，仓库外无本轮 runner 产生的临时残留；
- 目标文件 `git diff --check` 与尾随空白扫描通过。

## remaining_gap / residual

本轮只完成单一入口的 Execute 编排固化、owned-only cleanup、阶段 JSON 门、失败证据和离线 mock 验证，未执行远端 synthetic。下一次拥有 lease 的 SERVER 轮次必须先运行同一 runner 的 Preflight，随后将该轮 plan hash 传给唯一 Execute；远端传输、prepare、business、COS、Tencent 和清理的真实证据仍待该轮产生。

`residual=0`（本轮无远端、本机媒体或外部残留）。

`next_owner=PLANNING`，`requires_user=false`。
