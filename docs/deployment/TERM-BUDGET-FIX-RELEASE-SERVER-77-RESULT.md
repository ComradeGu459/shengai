# TERM-BUDGET-FIX-RELEASE-SERVER-77

artifact_written: true
outcome: passed
requires_user: false

## evidence

- 候选三件套沿用 SERVER-49 冻结值：archive `9471790` / `169b62a48f14dec962fcc9041c518e5b2fb36b0aefef15cefb4ad141b025804e`；manifest `3509202` / `b7fc5b8d94704ced0c97cb1ff8c120878c183f0c9a252fae9b0c5dbfd8df967d`；audit `1562` / `7d20bfa30303af3e5695d080577aae8c997363840c6f0f3acec971f95b8221ea`。
- 本地 Node 24 checker archive contract 通过 `members=15024`、`candidateDiffs=3`；checker `node --check`、runner Git Bash `--noprofile --norc -n`、CR=0 均通过。
- direct SCP=1；root transient `qimao-term-budget-fix-release-77.service`=1；四 unit 重启=1轮；迁移=0；DeepSeek/Tencent/COS/其他 Provider/业务 API 写入=0；provider.env、Secret、CAM、route、DB 未修改。
- root checker 使用三项 `contentDiff.candidate` bytes/SHA、其他 regular 使用 `members.base[].size`，完整树门通过：`members=15024`、`candidateDiffs=3`。
- 五入口在每条 `sudo -n -u qimao -- test -r` 前持久化 path/type/pending，随后均记录 qimao-read exit=0：
  - `backend/dist/modules/storage/s3-compatible-storage.js`，`regular file`，0
  - `backend/dist/modules/asr/tencent-asr-runtime.js`，`regular file`，0
  - `backend/dist/workers/asr.worker.entry.js`，`regular file`，0
  - `backend/dist/app.js`，`regular file`，0
  - `backend/dist/server.js`，`regular file`，0

## publish

- new release：`/opt/qimao-terms-cloud/releases/term-budget-capability-20260830-r1`，`root:qimao 0750 directory`。
- new static：`/srv/qimao-terms-cloud/system-frontend-term-budget-capability-20260830-r1`，`root:root 0755 directory`；直接根 `index.html` 为 `root:root 0644`、469 bytes；指纹资源为 `root:root 0644`、474002 bytes。
- current readlink/realpath 均精确为新 release；规范 static readlink/realpath 均精确为新 static。
- health：HTTP `200`，`application/json; charset=utf-8`。
- 8081 `/`、`/engines`、`/routing`、`/budgets`：均 HTTP `200`、`text/html`。
- 四 unit 均为 `ActiveState=active`、`SubState=running`、`NRestarts=0`、`ExecMainStatus=0`；本轮 PID 分别为 backend `664656`、term-extraction `664658`、secret-validation `664715`、connection-test `664657`。
- active terms route 唯一且未变：`8e76ffde-83f6-4cad-b8ff-0f2bf620f38d|56d6f40f-608e-4c2a-9628-32599779d984|d149bfec-e95f-4a57-8aea-40655a458053|1|preferred|deepseek|terms_api|terms|deepseek-v4-flash|1|active`。

## residual / remaining_gap / next_owner

- transient `LoadState=not-found`；固定 transfer、stage、status 均 absent；旧 release/static 回滚目标保留。
- remaining_gap：无本片发布门缺口；未执行 Provider 或业务验收调用。
- next_owner：PLANNER；候选已发布并通过本片健康门。

