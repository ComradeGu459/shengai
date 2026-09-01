# TERM-BUDGET-FIX-RELEASE-SERVER-55

## artifact_written

- `artifact_written`
- 本文是本轮唯一写入仓库的文件；候选三件套未重建、未修改。
- `requires_user=false`

## outcome

- `blocked`
- 结论：`release_preflight_failed`。
- 唯一 transient `qimao-term-budget-fix-release-55.service` 已执行一次并以 `failed` 终态退出；按 Step 0–3 硬停止规则未继续发布。

## evidence

- 本地冻结输入逐项复核通过：
  - archive=`9,471,790` bytes / `169b62a48f14dec962fcc9041c518e5b2fb36b0aefef15cefb4ad141b025804e`
  - manifest=`3,509,202` bytes / `b7fc5b8d94704ced0c97cb1ff8c120878c183f0c9a252fae9b0c5dbfd8df967d`
  - audit=`1,562` bytes / `7d20bfa30303af3e5695d080577aae8c997363840c6f0f3acec971f95b8221ea`
  - manifest：`15,024` members、`12,350` regular、`476` symlink、absolute/escaped/missing=`0`、sequence unchanged、content diff=`3` 且仅为 budget service TS/JS/map；external actions 全为 `0`。
- Step0 root 只读门通过：current=`/opt/qimao-terms-cloud/releases/term-provider-usage-20260830-r1` 且目标存在；规范 static=`/srv/qimao-terms-cloud/system-frontend`，旧 static target 存在；旧 rollback release 存在；candidate release/static、固定 staging 均 absent；Node=`v24.19.0`。provider/backend 环境文件只核对 metadata，未读取内容。
- 文件化传输：首次 Windows PowerShell 5 调用在本地 UTF-8 路径解析处停止，实际 SCP=`0`；随后以 PowerShell 7 原样执行同一助手，唯一实际 SCP=`1`，成功写入 deploy-owned transfer dir。
- transient/checkpoint：launch=`1`；status 阶段依次为 `start=accepted`、`transfer=normalized`、`inputs=verified`。首个确定异常为 `budget_map_check_failed`，发生于 Step3 候选 artifact gate 的 JS map JSON 检查；因此未到 `artifact gates passed`、static/release 建树、migration、current/static 切换或 unit restart。
- 根因事实：runner 使用 `node --input-type=module -e` 检查 map，却在 ESM 表达式中调用 `require(...)`，该检查进程失败。候选 archive/manifest/audit 的冻结身份并未失败；本片不修 runner、不重放。
- 生产/外部写入计数：DeepSeek=`0`、Tencent=`0`、COS=`0`、业务 API=`0`、数据库 migration=`0`、current/static 切换=`0`、四 unit restart=`0`。
- 清理后只读核对：transfer/staging/status/transient 均 absent；candidate release/static 均 absent；current/static 恢复原目标；四 unit 分别为 `ActiveState=active`、`SubState=running`、`NRestarts=0`、`ExecMainStatus=0`；health=`200` 且 `status=ok`；既有 active `terms_api` route 数=`1`。provider.env/backend.env 仅 metadata 仍为原值（`600 root:root` / `640 root:996`），未读取内容。
- 本地本轮临时 release runner 与 SCP helper 已精确删除；冻结候选目录保留。

## remaining_gap

- 本候选未发布；Step3 map JSON gate 需要由规划单独审阅后签发下一片唯一修正。管理员 root/engines 与静态 HTTP 发布后门因前置硬停止未执行，不能宣称通过。

## next_owner

- `PLANNER`：审阅 `budget_map_check_failed` 的 runner 前门原因后另签下一片；本片不提供现场补丁或 Rn 重试。

## residual

- 服务器发布残留=`0`：无新 release/static、transfer、staging、status 或 transient unit；生产 current/static、route、四 unit、health 未变。
- 本片本地仅保留用户指定的冻结候选三件套目录；除本文外未改其他仓库文件，既有脏工作树保持不变。

## requires_user

- `false`
