# TERM-CONTROL-RELEASE-04 结果

`artifact_written=true`；`outcome=blocked`。本轮严格消费冻结的 122A-R1 三件套并只启动一次远端 runner；按 Runbook 的 Step 0–3 硬停止条件结束，未重试、未补 runner、未进行第二次 SCP 或第二 staging。

## outcome

```yaml
outcome: blocked
stage: STEP2_TRANSFER_LAYOUT
code: QIMAO_STAGE_READ_FAILED
first_cause: qima_identity_cannot_read_normalized_staging_input
next_owner: PLANNING
requires_user: false
```

唯一首因是远端 runner 在将固定 staging 规范为 `root:qima 0750`、输入文件规范为 `root:qima 0640` 后，以 `sudo -n -u qima` 执行 staging 读取门失败。stdout 明确记录 `phase_fail phase=STEP2_TRANSFER_LAYOUT code=QIMAO_STAGE_READ_FAILED exit=1`；本轮未继续诊断该权限事实，避免越过 Step 0–3 硬停止条件。

## evidence

- 本地冻结门通过：archive `9,417,436` bytes、SHA-256=`c039879c5ba5dc0f51eec5d0635a08601af92f7f3692e8cc72e0940a21d016d5`；manifest `115,768` bytes、SHA-256=`48cc60997ee4d52ae700e2eab879ab31a6c07f421796a2565f8721d95feef961`；审计 SHA 附件 `251` bytes、SHA-256=`e5d778dcf37f4ec73256c1b17267c69176685029bd69c34a6ca9a20575124843`。
- manifest `path` 项=`607`；生成 runner CR byte=`0`；Node probe `--check`=`0`；Bash `-n`=`0`。
- provider raw stdin 本地门通过：UTF-8 无 BOM，payload 末字节=`10`，CR byte=`0`。Secret 只在本机内存派生，未写入本地文件、命令参数、日志或报告。
- 远端 Step 0：Node=`/usr/local/bin/node v24.19.0`；旧 current 指向 `/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`；旧管理员 static 指向 `/srv/qimao-terms-cloud/system-frontend-20260827-system-live-server05-r1`；provider.env baseline=`absent`。
- 远端 Step 1：归档、manifest、SHA 附件 bytes/SHA 与冻结值一致，manifest files=`607`。
- 远端 Step 2：`QIMAO_STAGE_READ_FAILED`；stderr 为空；未执行解包、五入口 import/11-gate、provider、migration、release/static、drop-in、daemon-reload、unit 启停或 health/API/static 门。
- SCP=`1`；远端 runner=`1`；Create/Provider/DeepSeek/COS/Tencent=`0`。

## rollback_and_cleanup

- runner 在失败出口执行既定回滚函数，`rollback_exit=0`；因失败发生在生产写入前，未触及 production current/static/provider/unit/DB。
- 固定远端 staging `/tmp/qimao-term-control-release-final`：`absent`，cleanup exit=`0`。
- 本地临时目录 `C:\Users\ComradeGu\Documents\七猫兼职\term-control-release-04-work`：`absent`；冻结三件套原文件未修改。
- 生产 release、current/static、provider.env、数据库迁移、四目标 unit、DeepSeek/COS/Tencent 均无本轮写入；无 Provider 调用。

## remaining_gap

`qima` 身份对已规范化 `root:qima` staging 的读取门未通过。该事实需要规划重新审阅身份/权限合同后另签下一张任务卡；本轮不作第二次诊断或发布重放。

## files

- 新增结果：`docs/deployment/TERM-CONTROL-RELEASE-04-RESULT.md`。
- 本轮临时 runner 与传输副本已清理；未修改业务源码、候选归档、manifest、SHA 附件、SSH config 或 Runbook。

## residual

```yaml
remote_staging: 0
local_temp: 0
provider_written: 0
migration_runs: 0
release_static_switch: 0
dropins_or_unit_actions: 0
external_provider_calls: 0
production_changed: 0
```

`requires_user=false`；`next_owner=PLANNING`。
