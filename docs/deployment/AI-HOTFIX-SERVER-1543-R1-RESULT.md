# AI-HOTFIX-SERVER-1543-R1

## artifact

```yaml
artifact_written: true
outcome: blocked
requires_user: false
```

## evidence

- 本片独立复核并复用 1541 四文件：archive=`10267996` / `80bee3c1fd49515ea8cc10c34140ab39412c8cda311e9f28f6fb5f4cbfdccb8f`；manifest=`5783` / `c84c26ac2fdd8cf770621acc72e7d805a08070b6566fcf40c48b821d70743a1b`；audit=`3393` / `d7a400fd1e323bd9890561530b4c574a8555f0d7c503869391c6cb3a9c9fcd1d`；修正版 runner=`9887` / `a9011257eb2f642b72a99216f1f7ad2e6513f2cbfea07ac61b9647d59ffe2ac4`。manifest/audit/runner CR=`0`；Git Bash `--noprofile --norc -n` exit=`0`。
- 新 transfer 创建 exit=`0`；唯一新 SCP exit=`0`；唯一 root runner exit=`1`，稳定首因=`BASE_INPUT_MISSING`。runner 在输入门停止，未解包、未切换 current/static、未重启 unit、未执行 Provider/COS/业务 API 或 DB/config/route/budget 写入。
- 本片按 R1 明确只上传 1541 archive/manifest/audit 与修正版 runner；runner 本身仍要求旧基线三件套，故输入合同不匹配。按任务停止条件不现场修改 runner、不二次 SCP、不第二次启动。
- runner 输出 `rollback=completed`，但只读发现固定 transfer 仍存在 4 个已传文件；随后已对该精确路径执行一次授权清理并验证 absent。未发现 stage 或新 release。
- 最终只读基线：current link/realpath=`/opt/qimao-terms-cloud/releases/term-budget-capability-20260830-r1`；该旧 release=`directory|root:qimao|750`；员工 static realpath=`/srv/qimao-terms-cloud/frontend-employee-upload-background-20260830-r1`；health=`200 application/json; charset=utf-8`。
- 最终三 unit 均 `active/running/NRestarts=0`：backend、canonical ASR、screen-text。新 release、stage、transfer 均 absent。
- 原 batch 未进入本片 runner 的观察阶段；因此本片未新增 claim/provider identity 事实，未重试 episode2，未重复 Create。

## external_counts

```yaml
transfer_dir_create: 1
scp: 1
root_runner: 1
runner_exit: 1
current_static_switch: 0
backend_restart: 0
asr_worker_restart: 0
screen_text_restart: 0
provider_calls: 0
cos_calls: 0
database_writes: 0
route_writes: 0
budget_writes: 0
business_api_writes: 0
exact_transfer_cleanup: 1
```

## rollback

未触发链接或服务回滚；runner 在输入门停止。旧 current/static 与三 unit 保持基线，health=`200`。

## remaining_gap

1543-R1 未发布。唯一首因是上传文件集合与修正版 runner 输入合同不一致：R1 仅要求传 1541 三件套，而 runner 仍要求旧基线三件套；本片已按停止条件结束，不能再现场修正或重放。

## next_owner

`PLANNER`：审核输入合同与 runner 的唯一传输形态后，再安排后续发布切片。

## residual

- 服务器：旧 release/current、员工 static 保留；new release、stage、transfer 均为 `0`；未重启服务。
- 本地：1541 archive/manifest/audit 与修正版 runner 保留；未重建候选或业务代码。

