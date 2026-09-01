# TERM-CURRENT-BASELINE-RESTORE-SERVER-62

## artifact_written

- artifact_written；本片已按唯一 transient 终态完成失败收口并写入本结果。
- 失败后未重放、未现场修改 runner，未重启 unit，未读取 Secret，未调用 DB 写入或 Provider/COS/Tencent/业务 API。
- requires_user=false

## outcome

- blocked
- slice_outcome=blocked
- 首个确定异常：manifest_contract 阶段调用 jq 时远端 root 环境返回 jq: command not found（runner line 124）；transient 以 exit=1 结束。
- 该异常发生在归档解包、stage 建树、五入口验证和 release rename 之前；按停止条件不补 runner、不重放。
- goal_gap：缺失的同名 immutable release 尚未恢复，current 仍未重新可解析。

## evidence

- 本片只消费 SERVER-38 三件套；本地复核全等：
  - archive=9,471,776 bytes / 020437197f6fef783fa04a1789ba727cf293a152d140b38630122a9677c3b925
  - manifest=3,000,555 bytes / 61372755bb1ac1a6bbe22aaf57ea98bd0a5afba78f44c4ff3b508dc615ec6f07
  - audit=1,190 bytes / 0f03a1de65ed6b93ae11a05c6abe95d60c8d2de4ea9e3830ef0c706663d5bcff
- 本片物理 runner：10,059 bytes / b37e58a44b7012b854615ef1c5ced9cbe91984b1195155de372f1ab7adcc04ec；Git Bash --noprofile --norc -n=0；CR byte=0。
- 同一 alias 下 /var/tmp transfer 创建成功：qimao-deploy:qimao-deploy:700:directory；唯一 direct SCP=1、exit=0。
- 唯一 transient qimao-term-current-baseline-restore-62.service 启动=1；runner 输出到 phase=identity、phase=inputs 后在 manifest_contract 停止；transient_runner_exit=1；收尾 transient_loadstate=not-found。
- 执行前只读基线：
  - current link=/opt/qimao-terms-cloud/releases/term-provider-usage-20260830-r1
  - 该 release target 存在性 exit=1
  - 规范 static link target=/srv/qimao-terms-cloud/system-frontend-term-provider-usage-20260830-r1
  - qimao-backend.service：MainPID=570844、NRestarts=0、active/running、ExecMainStatus=0
  - qimao-worker@term-extraction.worker.entry.js.service：MainPID=570845、NRestarts=0、active/running、ExecMainStatus=0
  - qimao-worker@system-control.secret-validation.worker.entry.js.service：MainPID=570929、NRestarts=0、active/running、ExecMainStatus=0
  - qimao-worker@system-control.connection-test.worker.entry.js.service：MainPID=570846、NRestarts=0、active/running、ExecMainStatus=0
  - loopback health HTTP=200
  - active terms_api route 唯一投影保持为 routing version 8e76ffde-83f6-4cad-b8ff-0f2bf620f38d、target 56d6f40f-608e-4c2a-9628-32599779d984、deployment version d149bfec-e95f-4a57-8aea-40655a458053、priority 1、preferred、provider=deepseek、adapter=terms_api、capability=terms、model=deepseek-v4-flash、version=1、status=active。
- 失败后只读基线：
  - current link 与 static target 与执行前完全一致；release target 存在性仍为 exit=1
  - transfer absent exit=0；stage absent exit=0；status absent exit=0；health 临时文件 absent exit=0
  - transient LoadState=not-found
  - 四 unit PID、NRestarts、active/running、ExecMainStatus 与执行前完全一致
  - loopback health HTTP=200；active terms_api route 投影与执行前完全一致
- 本片实际计数：transfer 创建=1、SCP=1、transient launch=1、release rename=0、current/static=0、四 unit restart=0、migration=0、生产 DB/route/env/Secret=0、DeepSeek=0、Tencent=0、COS=0、业务 API=0。

## remaining_gap

- 远端 runner 未能完成 manifest 合同门；由于本片规定失败后不得现场补丁或重放，未进入解包、qimao 可读性、release rename 或 current 解析验收。
- /opt/qimao-terms-cloud/releases/term-provider-usage-20260830-r1 仍缺失；生产 current 仍是 dangling symlink。不得把本片写成恢复成功。

## next_owner

- PLANNER：基于唯一首因 jq: command not found 另签后续恢复切片；必须保持 SERVER-38 三件套、/var/tmp 固定 transfer、无 unit 重启和无外部调用边界。本片不提供现场修正版。

## residual

- 远端固定 transfer、临时 stage、root-only status、health 临时文件均已精确清理；transient unit 已 collect，LoadState=not-found。
- 新 release 未创建；current/static、四 unit、health、active route 与配置均未修改。
- 本地临时 runner 目录 C:\Users\ComradeGu\Documents\七猫兼职\term-current-baseline-restore-62-runner 已精确删除；SERVER-38 三件套与既有脏工作树保留。

## requires_user

- false
