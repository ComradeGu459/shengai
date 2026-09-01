# UPLOAD-BACKGROUND-SERVER-1532

## artifact

```yaml
artifact_written: true
outcome: blocked
requires_user: true
```

## evidence

- 本轮只读复核完成；未执行 build、archive、SCP、root runner、static 切换、rollback、服务重启、真实上传或 Provider 调用。
- 本地输入 `frontend/dist` 为 4 个文件、总计 `3485554` bytes：
  - `index.html`：`1156` / `913c3bfae0c2de2e64cd753a33764455e3aab7d18bc2d2e6a38a18c38e59ddf3`
  - `assets/index-B8Xx-o7V.js`：`729198` / `4f365916b376b25f6bc9d1d4a669dc9eeb0b838a04560db0731869ba3ca72492`
  - `assets/index-B8Xx-o7V.js.map`：`2588240` / `3e581b068c3d3470960e3d4144bcc20879ca25e3fb69e9919e882bd96edeb0be`
  - `assets/index-DM5Ticlc.css`：`166960` / `98a8a0c7a2aaca2162e151d06b47d3fef0ccd5ec6537f6eeba9eb7b8d6cc16f6`
- 本地 bundle 已命中 `qimao-upload-handles-v1` 与“重新授权本地素材目录”；“模拟识别”“零外部网络”“新建模拟识别批次”均为 0 命中。
- 服务器只读基线：员工 static link/realpath=`/srv/qimao-terms-cloud/frontend-ai-hotfix-1552`；health=`200 application/json; charset=utf-8`；`qimao-backend.service`=`active/running/NRestarts=0/ExecMainStatus=0`；ASR=`active/running/NRestarts=0/ExecMainStatus=0`；OCR=`inactive/dead/NRestarts=0/ExecMainStatus=0`。
- 目标 `/srv/qimao-terms-cloud/frontend-employee-upload-background-20260830-r1` 已存在，不可覆盖。其只读 SHA 与本地输入不同：
  - `index.html`：`78cf395af873942755c7fe8dcee2de488ab5af8ce818faaf0b529c34250235a6`
  - `assets/index-B-r0TiiI.js`：`63dbef01412da569b0e7e19d61f8ae31ad670220127d0e42c2dbe63f6da57cf6`
  - `assets/index-B-r0TiiI.js.map`：`d8de3f322173d94e335b6ccfb0e64b28bfa0903406b730fc2d3f4397fb369315`
  - `assets/index-lFahLHkp.css`：`31fbbdf7d8e9d1526d72bfa929108050d382060220b5449e05b0d84502110172`
- 外部调用计数：只读 SSH=`3`；SCP=`0`；root/static runner=`0`；static switch/rollback=`0`；backend/ASR/OCR restart=`0`；真实 upload/Provider/COS=`0`。

## rollback

未触发；生产员工 static、backend、ASR/OCR 服务状态和页面未被本轮修改。

## remaining_gap

同名 immutable 目标已存在且与当前 `frontend/dist` 不一致。覆盖或删除会破坏不可变发布与现有回滚边界；本片无法在不改变候选名称或既有目标内容的情况下完成发布。根页面、`/uploads`、source-map 404 及线上 bundle 门未进入发布后验证。

## next_owner

`PLANNER`：提供新的 immutable candidate 名称，或明确将已存在目标作为本轮输入并给出其内容验收依据；随后再派发唯一 SCP/原子切换路径。

## residual

现有 `frontend-ai-hotfix-1552` 继续作为员工 static；冲突目标保留；本轮无 archive、transfer、staging、next link 或临时文件残留。
