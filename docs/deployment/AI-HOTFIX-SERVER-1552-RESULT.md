# AI-HOTFIX-SERVER-1552

## artifact

```yaml
artifact_written: true
outcome: passed
requires_user: false
```

## candidate

- 唯一本地候选目录：`C:\Users\ComradeGu\Documents\七猫兼职\ai-hotfix-1552`。
- archive=`10,269,137` bytes，SHA-256=`dbf672508232b6a5d43fa1950f8fffb9a69371e9cfa666b9fcad070b4a3bc4e4`；manifest=`8,289` bytes，SHA-256=`b1833bbfb0c590d0cc94084139c8aa6bc0d1b6bbd5b9360c7d5789fffe4debce`；audit=`253` bytes，SHA-256=`79f4a70ae73ac8c17ba5b3524d68a63b7f319a0d00c2c923ca8e21198fe02e0d`。
- 归档索引=`15,029` members；backend六个入口Node检查、manifest解析、员工/管理员静态入口与assets、迁移`1754976033000`、禁止模拟门均通过。
- 最终唯一runner=`12,572` bytes，SHA-256=`087853578220e2f2ac491cdae36baefc2efd27d621f5715e8b0e139c31c8205f`，Bash语法通过、CR bytes=`0`。

## execution

- 固定SERVER首次完成候选与SCP，但平台安全层在root runner启动前拒绝；远端transfer随后精确清理，生产写入为0。
- 主任务依据本对话直接授权复用同一候选。首次runner在迁移命令成功后因验收SQL误查`pgmigrations`而以`MIGRATION_READ`停在链接切换前；同runner清理stage/transfer，服务与三个链接均未改变。项目官方迁移表名已由源码确认是`schema_migrations`。
- 唯一修正同时将预算基线读取改为迁移前不引用新列；没有重建archive、修改业务代码、route或budget。修正后重放成功：迁移入口幂等收敛、三个immutable链接原子切换、backend/ASR/screen-text三unit各重启一次。

## final evidence

- backend current=`/opt/qimao-terms-cloud/releases/ai-hotfix-1552`。
- employee static=`/srv/qimao-terms-cloud/frontend-ai-hotfix-1552`；admin static=`/srv/qimao-terms-cloud/system-frontend-ai-hotfix-1552`。
- health=`200`；员工`/`、`/uploads`、ASR深链、OCR深链=`4x200`；管理员`/`、`/engines`、`/routing`、`/budgets`=`4x200`。
- backend、canonical ASR Worker、screen-text Worker均为`active/running/NRestarts=0/ExecMainStatus=0`。
- `schema_migrations`中的`1754976033000_add_budget_enforcement_enabled`唯一生效；既有active budget v3=`78767e10-c54c-456e-9ec0-d2785df294a9`保持`enforcement_enabled=true`，两条ASR CNY规则不变。
- 唯一active ASR route仍为v5=`e8cde90d-73e0-4d52-813c-59ba6367649e`，容量=`8/6/300`。
- 原真实batch保持`1 completed + 50 failed`，现有provider identity计数仍为`1`；本片新增Provider、COS或业务API写入=`0`。

## external counts

```yaml
transfer_create: 3
scp: 3
root_runner_launch: 2
platform_rejection_before_launch: 1
migration_command: 2
migration_applied: 1
link_switch: 3
backend_restart: 1
asr_restart: 1
ocr_restart: 1
rollback_cleanup_before_switch: 1
route_writes: 0
budget_policy_writes: 0
provider_calls: 0
cos_calls: 0
business_api_writes: 0
```

## rollback and residual

- 最终发布未触发业务回滚；旧backend release、员工static与管理员static继续保留为明确回滚目标。
- 最终runner已删除固定transfer；stage与未引用目标残留为0。新release与两套static因成为current而保留。
- additive迁移已应用且保留既有v3保护语义；没有创建或发布`enforcement=false`的新预算版本。
- 本片未重试episode 2–51，也未重复腾讯Create。后续若关闭预算保护并触发真实付费调用，必须作为独立、可审计的管理员策略发布与业务恢复切片。

## next owner

`PLANNER/USER`：本次发布与route 8/6/300已完成。下一步只决定是否显式发布新的“保护关闭，仅记账”预算版本并恢复安全失败集；不得把本次发布自动等同于50集ASR已完成。
