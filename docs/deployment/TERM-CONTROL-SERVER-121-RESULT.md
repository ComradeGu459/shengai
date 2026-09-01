# TERM-CONTROL-SERVER-121 结果

## outcome

`blocked`。R4 唯一隔离 preflight 在既有 11-gate import probe 的 `app` 门返回 exit code 1；按首失败条件未进入 provider 安装、数据库迁移、systemd drop-in、静态发布或健康门。

## 唯一首因

历史首因依次为：R0 的 CRLF 上传问题、R1 的 archive basename 不一致、R2 的 storage import probe 失败、R3 的旧依赖 baseline 门未通过。R4 已证明本机与远端脚本 CR byte=0、远端 `bash -n` 与 Node24 `--check` 通过，archive 目标名、bytes、SHA 均正确；旧 current 的 root 与 backend 两级 `node_modules` 均为目录，storage 非 main import loaded，SDK 解析层级为 `root-node_modules`。随后唯一隔离 preflight 的 app 入口 import 失败，安全错误类为 `Error`、exit=1；未改写错误、未猜测正文，也未进入部署。

## candidate / release 证据

- immutable candidate archive bytes: `1352730`
- archive SHA-256: `6d0e9221cfb07757cf9ea0b92a1b7e0aa1d0dfb777c47e5d164827faa027ed01`
- local manifest SHA-256: `8bf829567c1674de724a288117dab74f263055a17b154e3e80090f18e378369e`
- local archive import probe: 11 gates passed；backend JS node check 152/152 passed；system-frontend static sensitive scan 0
- R1 remote script gate: deploy/provider `CR byte=0`，两者 `bash -n=passed`
- R2 remote script gate: preflight/deploy/provider `CR byte=0`，三者 `bash -n=passed`
- R2 remote archive gate: regular-file，bytes `1352730`，SHA 精确匹配
- R3 remote archive gate: regular-file，bytes `1352730`，SHA 精确匹配
- R3 old dependency baseline: `current/node_modules` 目录门通过；`@aws-sdk/client-s3/package.json` regular-file 门未通过，baseline exit=1
- local candidate remains at `C:\Users\ComradeGu\Documents\七猫兼职\term-control-server-121-candidate-20260829.tar.gz`，未重建、未覆盖

## R4 diagnosis phases

- local script encoding: passed；6 个 R4 临时脚本 CR byte=0
- old current dependency baseline: passed；root 与 backend `node_modules` 均为目录；Node24 storage 非 main import `loaded`；SDK resolution layer=`root-node_modules`
- remote script check: passed；shell scripts `bash -n=passed`，Node24 storage probe `node_check=passed`，所有已上传脚本 CR byte=0
- archive identity: passed；regular-file，bytes `1352730`，SHA 精确匹配
- tar extract: passed
- manifest verifier: passed
- manifest count: passed；`607`
- dependency overlay: passed；按既有 composite 方式复制 root 与 backend 两级依赖闭包
- permissions: passed；root:qima 权限门通过
- 11-gate import probe: blocked at `app`；前置 storage、asr-runtime、asr-worker 三组 portable/import 门均通过，`app` import exit=1，安全错误类为 `Error`
- 预检 finally cleanup: passed；R4 staging residual=`0`
- provider、migration、systemd、static、health、protected API、admin deep-link：not reached

## R3 diagnosis phases

- script check: passed；4 个脚本均 CR byte=0，远端 `bash -n=passed`
- archive identity: passed；regular-file，bytes `1352730`，SHA 精确匹配
- old dependency baseline: failed，exit=1；`@aws-sdk/client-s3/package.json` regular-file 门未通过
- `tar_extract`、permissions、Node24 manifest verifier、manifest 607 count、11-gate import probe：未执行
- 后续部署阶段：未执行
- R3 staging cleanup: passed，residual=0

## diagnosis

- diagnostic root: `/tmp/term-control-server-121-diag-1408-r1`
- remote precheck: diagnostic/check 脚本均 `CR byte=0`，`bash -n=passed`
- `phase_start=archive_sha` → `phase_fail=archive_sha exit=1`
- 脱敏首错：`sha256sum: /tmp/term-control-server-121-diag-1408-r1/candidate.tar.gz: No such file or directory`
- `tar_extract`、permissions、Node24 manifest verifier、manifest 607 count、11-gate import probe：未执行
- finally cleanup: `passed`；diagnostic residual: `0`
- diagnostic 未读取 Secret、未写 provider/current/static、未安装 release、未迁移、未触碰 systemd、未调用 DeepSeek/COS/Tencent

## deployment / service gates

- remote identity: `qimao-deploy`
- remote candidate release: absent；R4 未进入原路径 release 安装
- provider.env: absent after rollback；本轮 provider 安装未到达
- migration: not reached；R4 未写数据库
- 121 drop-ins: backend、term-extraction、secret-validation、connection-test 均 absent after rollback
- new system-frontend target: absent after rollback
- health、protected API 鉴权 JSON、管理员静态 hash/deep-link：not reached
- R4 未触碰 systemd；基线 backend 仍为 active，NRestarts=0，enabled=disabled
- rollback 后基线 worker：term-extraction inactive/dead、secret-validation inactive/dead、connection-test active/running；均 NRestarts=0，原 enabled 状态保持

## production baseline / external actions

- current 恢复并核对仍指向旧 release `20260828-local-ocr-06k-r1`
- system-frontend 恢复并核对仍指向旧 target `system-frontend-20260827-system-live-server05-r1`
- provider.env、121 release、121 static target、121 drop-ins、121 staging 均已 absent
- backend 原 active 状态已完成回滚恢复；未修改业务路由、员工站、控制面或生产业务数据
- R4 仅发生固定 alias 的 staging/候选传输、只读旧依赖核对和隔离 preflight；未读取 Secret、未写 provider/current/static、未迁移、未触碰 systemd；DeepSeek 调用、COS、Tencent、CreateRecTask 均为 `0`

## cleanup / residual

- remote scoped cleanup: completed；`cleanup_errors=0`
- remote residual: `0`（R4 staging；原路径 release、provider.env、新静态目录、四个 R4 drop-in 均未产生）
- local R4 temporary scripts: deleted；local residual=`0`
- retained local immutable candidate archive: `1`（按任务要求保留供审核）

## remaining_gap

需下一 Owner 定位并解决候选 `app` 入口在保留两级既有依赖闭包后的 import 门失败，或提供不改变候选/业务源码的既有运行时依赖装配方案；本轮不部署、不重试、不引入新的部署流程。

## next_owner / requires_user

- `next_owner=规划`
- `requires_user=false`
