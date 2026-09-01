artifact_written: true

# SCREEN-TEXT-PARTIAL-RELEASE-SERVER-EXEC-1715

## outcome

`passed`。显式部分 Release 的合同、6034000 schema、backend runtime 与员工 static 已发布到测试服务器；没有启动或重启 screen-text Worker，没有调用 Provider/COS/route/budget/业务写接口。

## evidence

- 固定 SERVER 回合先以 `completed/items=[]` 空交接结束，且没有结果文件；规划只读对账确认生产仍为旧指针、schema=`0/0/0/0`、1715远端路径全 absent，因此判定为 `invalid-empty-handoff / external_actions=0`，未误报发布成功。
- 用户授权仍有效，规划复用同一冻结身份代行：入站目录创建一次；首次“创建+stat”命令因本地 PowerShell 提前解释远端`$(stat)`而验证段退出，目录实际已正确建立为`qimao-deploy:qimao-deploy:700`。随后只读stat通过，没有重复创建、重冻或修改候选。
- 唯一 SCP 上传四输入；唯一 root runner exit=`0`。payload SHA、Bash、禁用env解析、helper自测、旧基线、五入口、Linux真实import、static markers均通过。
- DB before gate确认`1754976033000_add_budget_enforcement_enabled`已存在、唯一pending为`1754976034000_add_partial_screen_text_release`；单事务migration成功，after gate确认schema_migrations、`partial`、`excluded_episodes`和`screen_text_releases_partial_snapshot_valid`全部存在。
- current=`/opt/qimao-terms-cloud/releases/screen-text-partial-release-20260901-r1`；员工static=`/srv/qimao-terms-cloud/frontend-screen-text-partial-release-20260901-r1`。
- backend=`active/running/0/0`，新PID=`866078`；ASR PID=`694703`、OpenVINO PID=`842128`保持原值且`active/running/0/0`；screen-text Worker保持`inactive/dead/0/0`。
- backend health=`200 application/json`；未认证screen-text releases GET=`401 application/json`且body非HTML；员工根页/深链=`200/200`。
- inbound、runtime、release/static stage、current/static next均absent。终验误用POST/80得到403/000后，按runner精确GET/8080复核通过；终验临时文件已精确清零，不将检查参数错误归因生产。

## external action count

```yaml
inbound_create: 1
scp: 1
root_runner: 1
migration: 1
backend_restart: 1
asr_restart: 0
screen_worker_start_or_restart: 0
openvino_restart: 0
provider_calls: 0
cos_writes: 0
route_writes: 0
budget_writes: 0
business_api_writes: 0
```

## remaining gap

当前真实批次仍有45集`review_pending`、5集`failed`和1集`reconciliation_required`，数据库总计1541条`pending`候选；1710记录的1386是当时42个新completed attempts的新增量，并非批次总量。部分Release功能只解决“异常集不阻断成功集发布”，不会替代候选的人工保留/编辑/忽略决定；在人审结束前按钮仍应保持禁用。

## next owner

`USER -> TEST`：用户在员工画面字页面完成候选审核；随后TEST只验证一次“部分Release→字幕验收”真实闭环，不重跑异常OCR、不创建synthetic。

## residual

旧release/static保留为回滚目标；本地冻结archive/runner/helper/SHA与Runbook保留。未提交、推送、reset、checkout、clean或stash。
