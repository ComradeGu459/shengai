# LOCAL-OCR-SERVER-05D-R1 结果

- outcome: blocked (自动回滚完成)
- 最后成功门: `qimao` 服务身份配置读取门；父目录可穿越，`backend.env`、`object-storage.env`、05B env 可读。实测权限为目录 `root:qimao 0750`、三份 env `root:qimao 0640`。
- 首个失败门: `preflight/current_resolution`。
- 直接原因: 重放 wrapper 以 `qimao-deploy` 普通身份执行 `readlink -f /opt/qimao-terms-cloud/current`，因 `/opt` 发布链的遍历权限返回空；同一身份用 `sudo -n readlink -f` 可解析到旧 release。该命令缺少 root 解析权限，未进入候选解包、安装、切换或 Worker 启动。

## 归档与实际动作

- 唯一归档: `C:\tmp\local-ocr-05d-r1.tar.gz`
- archive SHA-256: `6bac3c0028a0fd6bc7c7017226f95f107b414393cef929b7cd2c0be88ed4fd62`
- manifest SHA-256: `4ef975904350d700897dd3a5e3d6334b66d28e77c47f8bd4ea62ffc084fc90ba`
- 实际外部动作: 归档上传至远端 `/tmp` 后执行一次有界脚本；脚本在 preflight 首错退出。自动回滚仅重启既有 backend 以复核旧版本健康，并删除远端归档/临时路径；未执行迁移、候选解包、COS/DB/业务路由写入。
- 本地归档保留；远端 archive、stage、candidate、05D env、backend drop-in、generic worker unit/drop-in 均不存在。

## 回滚后只读证据

- current backend: `/opt/qimao-terms-cloud/releases/20260827-system-live-server05-r1`
- backend: `active`，`NRestarts=0`，health `200`
- 未认证 API: `401`，`application/json; charset=utf-8`
- upload-completion Worker: `active`，`NRestarts=0`
- OpenVINO 04G: `active/enabled`，`NRestarts=0`，loopback `3100`
- ONNX: `inactive/disabled`，`3101` 无监听
- screen-text Worker: `inactive/disabled`（本轮未安装）
- 员工/管理员静态指针未改变；现有监听集合未增加（仅既有 SSH、18080/18081、3001、3100、5432、8080/8081 等）
- 候选 release `/opt/qimao-terms-cloud/releases/20260827-local-ocr-05d-backend-r1`: absent

## 范围与残留

- 04G/05B、既有 backend/Worker、COS、数据库、业务 route、静态、Nginx 均未改动（backend 仅因回滚复核发生一次重启）。
- OCR 进程/新 unit/3101 监听: 0；候选与临时残留: 0；真实素材/业务数据: 0 操作。
- rollback: ready，旧 release 保持 current；需修复的唯一差口是发布 wrapper 在解析 root-owned current 时使用 `sudo -n readlink -f`（或等价 root 只读解析），之后由新授权切片决定是否再试；本轮按首错停止，不第三次重放。
- files: `docs/deployment/LOCAL-OCR-SERVER-05D-R1-RESULT.md`（本轮唯一仓库写入）；本地归档保留。
- residual: 0（仅保留既有旧 release/04G/05B 历史资产）
- remaining_gap: candidate 未发布，screen-text Worker 未启用；原因仅为上述 preflight 权限解析。
- next_owner: SERVER
- requires_user: false
