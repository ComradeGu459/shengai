# TENCENT-ASR-BACK-102-IMMUTABLE-CANDIDATE

outcome: artifact_written
evidence:
  - 只读基底 `C:\\tmp\\qimao-terms-cloud-asr-04b-candidate-20260828.tar.gz` 存在。
  - Python 标准库 `tarfile` 流式重写，未在 Windows 落地链接；成员名、类型和 linkname 集合保持一致，仅四个指定 regular-file 成员内容变化。
  - 固定候选：`C:\\tmp\\qimao-terms-cloud-asr-100-candidate-20260829.tar.gz`；SHA-256=`d2cacb4f7f26152a63347de08b12c1f020e17113d3379be2f613a0575a6fa6a9`，大小 8800522 bytes，成员 14894。
  - 替换成员仅为 source `asr-worker.repository.ts` 与 dist `.js/.d.ts/.js.map`；临时提取 JS `node --check` 通过，descriptorDigest 与 deployment config digest 映射均保留。
validation:
  - 流式成员/类型/linkname/内容 SHA 对账：通过（仅四项变化）。
  - 候选 dist JS `node --check`：通过。
remaining_gap: 未访问服务器、COS、腾讯 API、数据库或 Secret；旧 archive 未改写。
next_owner: PLANNING
