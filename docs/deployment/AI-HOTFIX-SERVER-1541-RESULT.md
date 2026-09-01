# AI-HOTFIX-SERVER-1541

## artifact

```yaml
artifact_written: true
outcome: blocked
requires_user: false
```

## evidence

- 本地冻结旧基线三件套核对通过：archive=`9471790` bytes / `169b62a48f14dec962fcc9041c518e5b2fb36b0aefef15cefb4ad141b025804e`；manifest=`3509202` / `b7fc5b8d94704ced0c97cb1ff8c120878c183f0c9a252fae9b0c5dbfd8df967d`；audit=`1562` / `7d20bfa30303af3e5695d080577aae8c997363840c6f0f3acec971f95b8221ea`。
- 当前源码 fresh build：backend exit=`0`；employee frontend exit=`0`，Vite=`198 modules`。候选唯一 `ai-hotfix-1541` 已本地生成：archive=`10267996` / `80bee3c1fd49515ea8cc10c34140ab39412c8cda311e9f28f6fb5f4cbfdccb8f`；manifest=`5783` / `c84c26ac2fdd8cf770621acc72e7d805a08070b6566fcf40c48b821d70743a1b`；audit=`3393` / `d7a400fd1e323bd9890561530b4c574a8555f0d7c503869391c6cb3a9c9fcd1d`。
- 本地候选门：archive member=`15031`；五个 backend 入口存在且 Node `--check` 全部 exit=`0`；`toBudgetDecimal`、上传句柄与重新授权标记存在；`SCREEN_TEXT_FAKE_DISABLED` 和三项禁用文案均为 0 命中；runner Git Bash `--noprofile --norc -n` exit=`0`、CR=`0`。
- 发布前 qimao-deploy 身份读取到 current link 为 `/opt/qimao-terms-cloud/releases/term-budget-capability-20260830-r1`，但因父目录权限不可穿越将 old target/current realpath 误报为空。root runner 首门实际看到该 old target 已存在，故返回 `OLD_TARGET_PRESENT` 并在恢复/重启前停止。
- root 只读复核确认：`/opt/qimao-terms-cloud/releases/term-budget-capability-20260830-r1` 为 `directory|root:qimao|750`，realpath 可解析为自身，current 也可解析为该目标；一级内容计数=`7`。因此本片没有执行基线恢复，也没有覆盖该 immutable release。
- 既有员工 static 只读保持 `/srv/qimao-terms-cloud/frontend-employee-upload-background-20260830-r1`；发布前 health=`200 application/json; charset=utf-8`；backend、ASR、screen-text 均 `active/running`、`NRestarts=0`。
- root runner 在 `OLD_TARGET_PRESENT` 前门退出，未执行 current/static 切换、四 unit 重启、Provider/COS/业务 API、DB/config/route/budget 写入；trap 已清理 transfer 与 stage。新 release/static 未创建。

## external_counts

```yaml
frontend_build: 1
backend_build: 1
readonly_ssh: 2
transfer_dir_create: 1
scp: 1
root_runner: 1
current_static_switch: 0
backend_restart: 0
asr_worker_restart: 0
screen_text_restart: 0
database_writes: 0
route_writes: 0
budget_writes: 0
provider_calls: 0
cos_calls: 0
business_api_writes: 0
```

## rollback

未触发；runner 在任何服务重启或链接切换前停止。现有 current、员工 static、三 unit 与 health 未被本片改变。

## remaining_gap

1541 candidate 尚未发布。首因是 qimao-deploy 低权限前门对 `/opt` 的不可穿越被误读为 old target absent，而 root runner 随后发现 old target 已存在并按保护门停止。唯一 SCP 已执行且 runner 已清理 transfer，不能同片现场改 runner 或重传。

## next_owner

`PLANNER`：基于 root 已确认的可解析旧 release 与权限假阴性，另行审核下一次唯一发布切片；不得把本片写成已发布或已重启。

## residual

- 服务器：旧 current release 与员工 static 保留；1541 new release/static、transfer、stage 均 absent；服务未重启。
- 本地：`C:\Users\ComradeGu\Documents\七猫兼职\ai-hotfix-1541` 候选三件套与 runner 保留供规划审核；临时生成 helper 已删除。

