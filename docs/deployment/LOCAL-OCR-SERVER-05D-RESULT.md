# LOCAL-OCR-SERVER-05D 终态

- outcome: `rolled_back`
- slice_outcome: `blocked_then_rolled_back`
- remaining_gap: 旧 backend 的 root-only 配置目录原先为 `root:qima 0750`，但服务身份为 `qimao:qimao` 且 env 为 `root:qimao 0640`；重启时 `ExecStartPre=/usr/bin/test -r backend.env` 失败。已保留 0750 并将目录组校正为 `qimao`，旧服务已恢复健康。
- next_owner: `规划`
- requires_user: `false`

## 构建与归档

- formal lease=`1`；未修改业务源码，保留既有脏工作树。
- backend typecheck/build：通过。
- base Git commit=`45179303982d6c13838668eba0ec0c6519003006`。
- dirty snapshot SHA-256=`d4484f18c127449505227533fab5b35b054aac45de9e01af474e64dbfcaeab6c`。
- 唯一本地 immutable archive：`C:\tmp\local-ocr-05d-r1.tar.gz`，SHA-256=`6bac3c0028a0fd6bc7c7017226f95f107b414393cef929b7cd2c0be88ed4fd62`；payload=`539` files。
- archive manifest SHA-256=`4ef975904350d700897dd3a5e3d6334b66d28e77c47f8bd4ea62ffc084fc90ba`。
- generic Worker unit 资产 SHA-256=`c67700e806a3cde65785cc303921dd8bcde2404e98fa6c57ffa29d4ac457db25`。
- fresh runtime 指纹：`server.js`=`8177a7c5c4b9993b3db938211ed09edc8518e0622050b0360e12d9879fe9bb51`；`screen-text.worker.entry.js`=`20c4cf024bb11509b4d47d62964cb9faab9ed6258df2dc3be16f1f314f67b91c`；`screen-text.evidence-storage.js`=`c5de72a0ad08721c89f473b942ef3078df509618f919d040e3395c1795a373aa`；`local-ocr-runtime.js`=`a7616f2e086e4e08cb1ef01040e1bbc98b33c2d3b508f443c229455b917fb2ce`；`s3-compatible-storage.js`=`8ca7f689df8111a209b1e100880b1f7ea0c006c3750dcfd31c1684de82614a13`；`frame-extractor.js`=`b9c09abc4bd08785d269ac7dccdd5e8e9c137a742c6ec79c9bf27c145d8ff498`；contracts `index.js`=`d55385a3067304f370f38cdd2416078110c31aeb54c76d62a5e54ba8d589ef24`。

## 发布尝试与首错

- 远端 archive hash/manifest 预检通过后，曾以 `/opt/qimao-terms-cloud/releases/20260827-local-ocr-05d-backend-r1` 克隆当前 release，并短时装配 backend/Worker drop-in、OpenVINO-only root env 与 generic Worker unit；未执行迁移、数据库业务写入、COS 请求、浏览器或真实素材操作。
- 原子切换后 backend 重启进入 `activating`，最高 `NRestarts=17`，health 暂为 `000`。只读 `systemctl` 证据显示首错为 `ExecStartPre=/usr/bin/test -r /etc/qimao-terms-cloud/backend.env`，status=`1`；并非候选 Node/build/OCR 错误。
- 根因：父目录 `root:qima 0750`，`qima` 组无成员；`qimao:qimao` 无法穿越目录读取既有 `root:qimao 0640` env。已停止重启循环；没有重跑 candidate。
- 最小回滚修复：仅执行 `chgrp qimao /etc/qimao-terms-cloud`，保留目录 mode=`0750`；随后 `systemctl reset-failed` 与启动旧 backend，health=`200`、NRestarts=`0`。

## 回滚后的实际状态

- current=`/opt/qimao-terms-cloud/releases/20260827-system-live-server05-r1`（旧 release）。
- backend：`active`，health=`200`，未认证 `/api/projects`=`401`、`application/json`，NRestarts=`0`。
- upload-completion Worker：`active`，NRestarts=`0`。
- screen-text Worker：`inactive`/`not-found`；本轮 generic unit、drop-in 均已移除。
- OpenVINO：`active`，NRestarts=`0`，`127.0.0.1:3100` 单监听；ONNX：`inactive`、`disabled`，`3101` 无监听，未改 04G。
- 员工/管理员静态指针未变化：`frontend-20260826-upload-cos-perf03-r1`、`system-frontend-20260827-system-live-server05-r1`。

## 清理与残留

- 远端 candidate release、上传 archive、staging、OCR env、backend drop-in、generic Worker unit、Worker drop-in 均已精确清理并核对 absent。
- 本地 staging `C:\tmp\local-ocr-05d-r1` 已删除；唯一 archive 保留于 `C:\tmp` 作为审计/重放材料。
- 04G/05B release、模型、env 与既有服务均保留；无 COS/DB/项目/素材/控制面残留。
- residual=`0`（候选、临时件、Worker 与新增端口）；保留 archive 与旧 release 属有意历史资产。
