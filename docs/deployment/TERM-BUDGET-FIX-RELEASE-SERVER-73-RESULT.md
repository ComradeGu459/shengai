# TERM-BUDGET-FIX-RELEASE-SERVER-73

artifact_written: true
outcome: blocked
requires_user: false

## 结果

发布在解包后的候选文件核验门停止，未创建或切换新 release/static。唯一确定首因来自 transient stdout：

`checker=failed|code=root_file_contract`

runner 随后输出：`runner=failed|code=candidate_files|rollback=passed`，systemd 以 exit-code 返回，exit=1。按任务边界未现场修改 checker/runner、未重跑或增加第二路线。

## 本地输入与前门

仅消费冻结候选目录，三件套未修改：

| 文件 | bytes | SHA-256 |
|---|---:|---|
| `term-budget-capability-20260830-r1.tar.gz` | 9471790 | `169b62a48f14dec962fcc9041c518e5b2fb36b0aefef15cefb4ad141b025804e` |
| `term-budget-capability-20260830-r1.manifest.json` | 3509202 | `b7fc5b8d94704ced0c97cb1ff8c120878c183f0c9a252fae9b0c5dbfd8df967d` |
| `term-budget-capability-20260830-r1.sha256.audit` | 1562 | `7d20bfa30303af3e5695d080577aae8c997363840c6f0f3acec971f95b8221ea` |

- Node `v24.19.0`；物理 checker `node --check` exit=0；runner Git Bash `--noprofile --norc -n` exit=0；两文件 CR byte=0。
- 本地 checker/archive 门 exit=0：members=15024、regular=12350、symlinks=476；系统 `tar -tzf` exit=0。
- 本地固定禁用项 `node -e`、`require(`、`jq`、`Invoke-Expression`、`WindowsPowerShell`、PAX/custom tar parser、nested shell 均为 0。

## 远端执行事实

- 普通 SSH 只核身份与 `/var/tmp`：`qimao-deploy`、`/var/tmp=root:root:1777`，write/execute 均 exit=0；固定 transfer 创建为 `qimao-deploy:qimao-deploy 0700`。
- direct SCP：1 次，exit=0；未二次上传。
- root transient：1 次，`qimao-term-budget-fix-release-73.service`，`--collect --wait --pipe`；未二次启动。
- status JSONL 在 `/run/qimao-term-budget-fix-release-73.status.jsonl` root-only 创建并先读取，内容阶段为：
  `inputs_present → current_old_target → static_old_target → health_baseline → unit_baseline → route_baseline → root_baseline → candidate_hashes → candidate_checked → failed → terminal(failed:candidate_files)`。
- 首因发生在解包后 checker 的 `root_file_contract`；未到 release rename、static rename、current/static 切换或 unit restart。

## 发布与调用计数

- release/static 创建：0；current/static 原子切换：0；migration：0；daemon-reload：0。
- 四生产 unit 重启：0。
- DeepSeek、Tencent、COS、其他 Provider、业务 API 写入：均 0。
- provider.env、Secret、CAM、route、DB、权限：均未修改。
- post-verify 的 current_new_target/static_new_target、health、8081 四路径与 route-after 未执行；新 static 的 root/index/fingerprint/Nginx 可读门未执行。

## 回滚后基线

- `rollback=passed`。
- current readlink/realpath 均为 `/opt/qimao-terms-cloud/releases/term-provider-usage-20260830-r1`。
- static readlink/realpath 均为 `/srv/qimao-terms-cloud/system-frontend-term-provider-usage-20260830-r1`。
- health=200；route 唯一且保持：
  `8e76ffde-83f6-4cad-b8ff-0f2bf620f38d|56d6f40f-608e-4c2a-9628-32599779d984|d149bfec-e95f-4a57-8aea-40655a458053|1|preferred|deepseek|terms_api|terms|deepseek-v4-flash|1|active`
- 四 unit 均保持 `active/running/NRestarts=0/ExecMainStatus=0`，PIDs 为 630909、630921、631057、631069。

## 清理与残留

读取 status 后已精确删除 `/run/qimao-term-budget-fix-release-73.status.jsonl`。最终核对：

- transient `LoadState=not-found`。
- transfer、health、import-probe、stage、候选 release、候选 static、current/static next 与 rollback 路径均 absent。
- 本片未删除或覆盖旧 release、旧 static、current、static、env、DB、route 或运行服务。
- 本地临时 checker/runner 目录在报告写入后删除；冻结候选目录保留。

## remaining_gap / next_owner / residual

- remaining_gap：候选已通过本地 manifest/archive 门，但远端解包树核对首个稳定错误为 `root_file_contract`；未继续定位其内部差量，未发布候选。
- next_owner：PLANNER；按首个确定错误重新审阅解包文件合同，另行授权后再决定路径，不把本片视为发布成功。
- residual：仅保留原有生产 current/static 基线和冻结候选输入；SERVER-73 的 transfer/stage/status/transient/候选目标均为 0。
