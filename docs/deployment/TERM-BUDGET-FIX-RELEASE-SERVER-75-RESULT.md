# TERM-BUDGET-FIX-RELEASE-SERVER-75

artifact_written: true
outcome: blocked
requires_user: false

## evidence

- 本地复核：候选三件套 bytes/SHA 与 SERVER-49 冻结值全等；Node 24 checker `--archive` 通过 `members=15024`、`candidateDiffs=3`；checker `node --check`、runner Git Bash `--noprofile --norc -n` 均 exit=0；两文件 CR byte=0；固定 `node -e`、`require(`、`jq` 均为 0。
- 唯一 direct SCP：1 次；root transient：1 次，`qimao-term-budget-fix-release-75.service`。
- transient 内系统 tar 解包后，修正后的 root checker 通过：`members=15024`、`candidateDiffs=3`。随后 runner 在五入口 qimao 可读性阶段返回唯一稳定码 `entry_read`，输出 `runner=failed|code=entry_read|rollback=passed`。
- 持久化 status 在清理前已读取，顺序为：`root_baseline=passed` → `inputs_present=passed` → `baseline=passed` → `candidate_files=passed` → `failed=entry_read` → `terminal=failed:entry_read`。runner 未持久化具体入口名，因此本片不臆测是哪一个入口。
- 停止点早于 static 创建、release rename、current/static 切换和四 unit 重启；迁移=0，current/static 写入=0，四 unit 重启=0，DeepSeek/Tencent/COS/其他 Provider/业务 API 写入=0，provider.env/Secret/CAM/route/DB 未改。

## baseline_after_failure

- current readlink/realpath：`/opt/qimao-terms-cloud/releases/term-provider-usage-20260830-r1`
- static readlink/realpath：`/srv/qimao-terms-cloud/system-frontend-term-provider-usage-20260830-r1`
- health：HTTP `200`，`application/json; charset=utf-8`
- 四 unit 均为 `ActiveState=active`、`SubState=running`、`NRestarts=0`、`ExecMainStatus=0`：backend、term-extraction、secret-validation、connection-test。
- active terms route 仍为唯一原值：`8e76ffde-83f6-4cad-b8ff-0f2bf620f38d|56d6f40f-608e-4c2a-9628-32599779d984|d149bfec-e95f-4a57-8aea-40655a458053|1|preferred|deepseek|terms_api|terms|deepseek-v4-flash|1|active`

## remaining_gap / next_owner

- remaining_gap：候选合同修正已在本片实际通过；发布未进入 static/release 原子切换门。`entry_read` 的 runner 记录缺少具体入口名，不能仅凭该码区分某个入口的 qimao 读取事实与 runner 可读性判断问题。
- next_owner：PLANNER；按唯一失败码审阅五入口可读性门的逐入口证据后另行决定是否授权下一片，不在本片重发。

## residual

- root transient 已结束且 `LoadState=not-found`；固定 transfer、stage、static stage、status、候选 release、候选 static 均 absent。
- `rollback=passed`；生产 current/static、四 unit、health、route 保持 SERVER-67 基线。候选本地三件套保留，未修改。

