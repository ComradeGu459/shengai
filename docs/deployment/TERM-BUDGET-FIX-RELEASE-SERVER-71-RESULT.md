# TERM-BUDGET-FIX-RELEASE-SERVER-71

artifact_written: true
outcome: blocked
requires_user: false

## 结论

发布未开始。唯一首因是 `old_current_baseline`：远端 `/opt/qimao-terms-cloud/current` 仍是符号链接，但其目标 `/opt/qimao-terms-cloud/releases/term-provider-usage-20260830-r1` 不存在。

- `readlink /opt/qimao-terms-cloud/current`：目标名精确为旧 release。
- `realpath /opt/qimao-terms-cloud/current`：exit=1，未解析出目标。
- `stat` 旧 release target：exit=1。
- `test -e` 旧 release target：exit=1。
- 因此未执行候选上传、transient runner、release/static 创建、链接切换或 unit 重启。

## 输入与本地证据

冻结候选三件套未修改，且本地门通过：

| 文件 | bytes | SHA-256 |
|---|---:|---|
| `term-budget-capability-20260830-r1.tar.gz` | 9471790 | `169b62a48f14dec962fcc9041c518e5b2fb36b0aefef15cefb4ad141b025804e` |
| `term-budget-capability-20260830-r1.manifest.json` | 3509202 | `b7fc5b8d94704ced0c97cb1ff8c120878c183f0c9a252fae9b0c5dbfd8df967d` |
| `term-budget-capability-20260830-r1.sha256.audit` | 1562 | `7d20bfa30303af3e5695d080577aae8c997363840c6f0f3acec971f95b8221ea` |

- Node `v24.19.0`；Git Bash `bash -n` exit=0；checker `node --check` exit=0；checker/runner CR byte=0。
- manifest/archive checker exit=0：members=15024、regular=12350、symlinks=476。
- `tar -tzf` exit=0；固定禁用字符串门均为 0。
- 本轮仅生成临时物理 checker/runner；未修改候选、业务源码或 46 冻结准备包。

## 远端前门与生产基线

- SSH 身份：`qimao-deploy`，uid=1000；Nginx 有效身份：`www-data`，uid=33。
- 旧 static 链接仍为 `/srv/qimao-terms-cloud/system-frontend-term-provider-usage-20260830-r1`，旧 static target 存在。
- health：HTTP 200。
- 四 unit 前门快照均为 `ActiveState=active|SubState=running|NRestarts=0|ExecMainStatus=0`：
  - `qimao-backend.service`，MainPID=630909
  - `qimao-worker@term-extraction.worker.entry.js.service`，MainPID=630921
  - `qimao-worker@system-control.secret-validation.worker.entry.js.service`，MainPID=631057
  - `qimao-worker@system-control.connection-test.worker.entry.js.service`，MainPID=631069
- PostgreSQL socket 只读 route 投影保持唯一且未变：
  `8e76ffde-83f6-4cad-b8ff-0f2bf620f38d|56d6f40f-608e-4c2a-9628-32599779d984|d149bfec-e95f-4a57-8aea-40655a458053|1|preferred|deepseek|terms_api|terms|deepseek-v4-flash|1|active`

## 调用与变更计数

- direct SCP：0。
- transient runner：0；`qimao-term-budget-fix-release-71.service` 为 `LoadState=not-found`。
- backend/term/secret-validation/connection-test 重启：0。
- current/static 原子切换：0；migration：0；daemon-reload：0。
- DeepSeek、Tencent、COS、其他 Provider、业务写 API：均 0。
- provider.env、Secret、CAM、route、DB、权限：均未改动。
- 因 runner 未启动，没有 root-only status JSONL；也没有 `terminal` checkpoint。

## 清理与残留

前门创建的固定 transfer 目录为空，随后已精确删除。最终只读核对以下 SERVER-71 路径均 absent，transient 为 `not-found`：

- `/var/tmp/qimao-term-budget-fix-release-71-transfer`
- `/run/qimao-term-budget-fix-release-71.status.jsonl`
- `/run/qimao-term-budget-fix-release-71.health`
- `/run/qimao-term-budget-fix-release-71.import-probe`
- `/opt/qimao-terms-cloud/releases/term-budget-capability-20260830-r1`
- `/srv/qimao-terms-cloud/system-frontend-term-budget-capability-20260830-r1`
- 两个 stage、两个 next link、两个 rollback link（均为 `-71` 固定路径）

持久状态残留：远端 current 仍保持原有 dangling link，旧 current target 缺失；本轮未修复、未覆盖。

## remaining_gap / next_owner / residual

- remaining_gap：需由规划确认并恢复 `/opt/qimao-terms-cloud/releases/term-provider-usage-20260830-r1` 后，才能再次满足旧 current baseline；本片未验证新候选 release/static 的部署门。
- next_owner：PLANNER，先处理旧 current target 缺失这一基线事实；不要把本片作为候选发布成功。
- residual：仅保留远端原有 dangling current link；SERVER-71 transfer/stage/status/transient/candidate 临时物均为 0。候选三件套仍保留在本地原目录。
