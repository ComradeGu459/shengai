# TENCENT-ASR-SERVER-05A-HARNESS

## outcome

```yaml
artifact_written: true
outcome: passed
scope: local-only
next_owner: SERVER
requires_user: false
```

05A 已将 04H-K/M 冻结的隔离 synthetic 编排固化为两个正式 `.mjs` 部署资产。该轮没有连接服务器，没有读取 Secret 或媒体，没有执行 COS、Tencent、Postgres、systemd 或业务写入。

## contract

- `bootstrap` 身份固定为 `qimao-deploy`；只负责固定临时根校验、candidate/media 字节与 SHA 校验、root:qimao `0750/0640` 安装统计、`qimao` 可读性门、隔离库创建/删除和精确临时根清理。
- `business` 身份固定为 `qimao`；只由该身份读取 `backend.env`、`object-storage.env`、`provider.env` 和派生媒体，装配显式 `DATABASE_URL`、loopback `createApp`、`UploadCompletionWorker`、connection-test Worker 和 `AsrWorker`。
- provider 内容不经过 bootstrap 解析、回显或日志；bootstrap 只用 `sudo install/stat/sha256sum` 处理文件元数据，business 才读取 provider 配置。
- 媒体必须由 `--media-bytes` 与 `--media-sha` 固定身份校验；脚本不生成、改名或复制媒体，不把语音正文写入输出。
- `run-id` 派生所有项目、manifest、engine、routing、budget、batch、dispatch 和外部边界幂等 ID。`AsrWorker.runOnce()` 是唯一外部 ASR 创建入口，预算为一次；未知结果只 GET 同一 batch、Head 同一 COS 对象，不重建或重试 CreateRecTask。
- 清理顺序固定且由 CLI 资源参数驱动：取消未完成命令 → 删除已知 COS 对象并 Head=404 → 停 loopback/Workers → bootstrap terminate/drop 隔离库 → 删除 release/env/harness/media/temp。
- 远端传输时两个正式 harness 文件必须保持 `.mjs` 文件名；`.mjs.stage` 等暂存后缀不得交给 Node 执行或语法检查。

## execution

远端下一轮的文件顺序固定为：先上传并检查两个 `.mjs` 文件与已有 release，再以 `qimao-deploy` 执行 bootstrap 的 `--prepare`，随后以 `sudo -n -u qimao` 执行 business 的 `--run`，最后由 bootstrap 执行 `--drop-db` 与 `--cleanup`。business 不调用 sudo，不创建或删除数据库；bootstrap 不读取 provider 值。

两份脚本均只使用文件路径、位置化 CLI 参数和 Node 核心模块；不生成动态临时源码，不使用 shell 解释器，也不内嵌 SQL/脚本片段。release import 使用 `pathToFileURL`，入口加载发生在解包并完成文件门之后。

## evidence

本轮新运行证据：

- Node：`v24.19.0`。
- `node --check deploy/debian/bin/asr-isolated-synthetic-bootstrap.mjs`：exit 0。
- `node --check deploy/debian/bin/asr-isolated-synthetic-business.mjs`：exit 0。
- bootstrap `--self-test`：`outcome=passed`，cases=`happy,command_dispatch,wrong_extension,wrong_identity,media_sha_mismatch,cleanup_order`，`createRecTaskMaximum=1`，`providerReadRole=qimao`。
- bootstrap 命令分派回归：`--prepare`、`--drop-db`、`--cleanup` 均分别进入自身分支，不设置 `self-test`；各自缺少必需参数时均返回 `ARGUMENT_MISSING`，未打印 self-test 通过结果。
- business `--self-test`：同五类 cases 全部 `outcome=passed`，`createRecTaskMaximum=1`，`providerReadRole=qimao`。
- 限定静态门未发现 shell 解释、内联 Node、未知 `.mjs.stage` 执行路径。
- 限定 `git status` 只看到本轮两个新 deploy 资产；05A 临时脚本残留为 0。

## remaining_gap

无本地固化缺口。远端真实执行仍必须由后续切片按既有用户授权进行，并提供当次 candidate/media SHA、隔离数据库、COS 对象和同一 Tencent TaskId 的运行证据；本轮没有预先宣称这些外部事实。

## files

- `deploy/debian/bin/asr-isolated-synthetic-bootstrap.mjs`
- `deploy/debian/bin/asr-isolated-synthetic-business.mjs`
- `docs/deployment/TENCENT-ASR-SERVER-05A-HARNESS.md`

## residual

```yaml
repository_temp_residual: 0
server_actions: 0
secret_reads: 0
media_reads: 0
cos_writes: 0
tencent_creates: 0
database_actions: 0
business_code_changes: 0
business_code_changes_this_turn: 0
preexisting_dirty_tree_preserved: true
```
