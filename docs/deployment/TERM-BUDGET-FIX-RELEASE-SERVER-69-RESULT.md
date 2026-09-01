# TERM-BUDGET-FIX-RELEASE-SERVER-69

- artifact_written: true
- outcome: blocked
- evidence:
  - task: `TERM-BUDGET-FIX-RELEASE-SERVER-69`
  - candidate_archive: `9471790 bytes / 169b62a48f14dec962fcc9041c518e5b2fb36b0aefef15cefb4ad141b025804e`
  - candidate_manifest: `3509202 bytes / b7fc5b8d94704ced0c97cb1ff8c120878c183f0c9a252fae9b0c5dbfd8df967d`
  - candidate_audit: `1562 bytes / 7d20bfa30303af3e5695d080577aae8c997363840c6f0f3acec971f95b8221ea`
  - manifest_contract: `schema/candidate/archive passed; members=15024; regular=12350; sequenceUnchanged=true; symlink=476; absolute=0; escaped=0; missing=0; contentDiff=3; budgetTarget and fiveEntryImports passed`
  - content_diff: `backend/dist/modules/system-control/system-control.budget.service.js (64469 bytes, 58d9c307b027c772b024e4873aafba2b6ce732e91c78b1658fb8ff311ab48c8a); backend/dist/modules/system-control/system-control.budget.service.js.map (44650 bytes, bc0c441b5fc3a5b09a3eefa5889d62c1a33a62efa30e7f26e667b1ea15ddc02e); backend/src/modules/system-control/system-control.budget.service.ts (67160 bytes, 2d6d0df1342bcb883313c8fb422e6818ff1b36d75eaee2013ad0f2db3083702c)`
  - local_gates: `Node v24.19.0 checker --check=0; checker candidate contract=passed; system tar -tzf=0; Git Bash --noprofile --norc -n runner=0; CR byte=0; forbidden parser/helper markers absent`
  - local_runner_artifacts: `manifest-check.mjs=8041 bytes / 01537be3a79a3c5fb39136b7e9279e918770016d9e17cfe98082f0e3dee7fe69; release-runner.sh=12623 bytes / 5b059def4b917f4deb96f98a7a717daab2237af4394ca60a2f44548dde889c3e`
  - remote_orchestration: `direct SCP=1; transient launch=1; no second SCP/runner`
  - checkpoint: `inputs_present → step0_links → baseline → candidate_hashes → candidate_checked → stage_verified → immutable_created → links_switched → units_healthy → failed`
  - first_determinable_failure: `post-verify phase after units_healthy; journal proves runner exited status=1/FAILURE, but runner stdout code was not retained and status cleanup removed the checkpoint file. The exact sub-gate among current/static/health/admin-static/route is not recoverable; no narrower cause is inferred.`
  - rollback: `new release/static had been created and links switched; runner restored current=/opt/qimao-terms-cloud/releases/term-provider-usage-20260830-r1 and static=/srv/qimao-terms-cloud/system-frontend-term-provider-usage-20260830-r1, removed the unreferenced candidate release/static, and completed the authorized rollback unit restarts (forward=4, rollback=4)`
  - final_read_only_audit: `current and static exact old targets; health=200; qimao-backend.service PID=630909 active/running NRestarts=0 ExecMainStatus=0; term-extraction PID=630921 active/running NRestarts=0 ExecMainStatus=0; secret-validation PID=631057 active/running NRestarts=0 ExecMainStatus=0; connection-test PID=631069 active/running NRestarts=0 ExecMainStatus=0`
  - active_route: `one unchanged safe projection: routing_version=8e76ffde-83f6-4cad-b8ff-0f2bf620f38d; target=56d6f40f-608e-4c2a-9628-32599779d984; deployment_version=d149bfec-e95f-4a57-8aea-40655a458053; priority=1; role=preferred; provider=deepseek; adapter_key=terms_api; capability=terms; model=deepseek-v4-flash; version=1; status=active`
  - residual_audit: `transfer=0; stage=0; static_stage=0; status=0; health_file=0; import_probe=0; transient LoadState=not-found; candidate release/static absent after rollback`
  - mutation_boundary: `migration=0; provider.env/drop-in/Secret/CAM/route/DB/business data=0; DeepSeek=0; Tencent=0; COS=0; business API=0; no daemon-reload`
- remaining_gap: `immutable budget candidate was not left published; the exact post-verify failure code was not durably captured by the frozen runner, so the failed sub-gate cannot be distinguished from the available journal/checkpoint evidence. Production baseline is restored and healthy.`
- next_owner: `PLANNER; review the lost post-verify failure-code evidence before issuing any new release slice; do not continue SERVER-69 with an in-place patch or rerun.`
- residual: `remote release transfer/stage/status/transient and unreferenced candidate release/static are absent; production current/static remain on the old provider-usage baseline; local frozen candidate directory is retained; this slice's temporary checker/runner was removed after the report was written.`
- requires_user: false

## SERVER-70 post-verify只读诊断

- artifact_written: true
- outcome: passed
- evidence:
  - scope: `仅只读；未执行 SCP、transient、mkdir/rm、链接或权限修改、重启、DB/route 写入、Secret/Provider/COS/Tencent/business API 调用`
  - 69 post-verify exact order and labels:
    1. `current_new_target`: `[ "$(readlink -- "$CURRENT_LINK")" = "$NEW_RELEASE" ]`; old baseline root `readlink -- /opt/qimao-terms-cloud/current` stdout=`/opt/qimao-terms-cloud/releases/term-provider-usage-20260830-r1`, exit=`0`; matching root `realpath -- /opt/qimao-terms-cloud/current` stdout same, exit=`0`.
    2. `static_new_target`: `[ "$(readlink -- "$STATIC_LINK")" = "$NEW_STATIC" ]`; old baseline root `readlink -- /srv/qimao-terms-cloud/system-frontend` stdout=`/srv/qimao-terms-cloud/system-frontend-term-provider-usage-20260830-r1`, exit=`0`; matching root `realpath -- /srv/qimao-terms-cloud/system-frontend` stdout same, exit=`0`.
    3. `health_after_status`: 69 function was `curl -fsS --max-time 10 -o "$HEALTH_FILE" -w '%{http_code}' http://127.0.0.1:3001/health`; read-only reproduction to `/dev/null` returned `HTTP=200`, `content-type=application/json; charset=utf-8`, exit=`0`.
    4. `admin_static`: 69 loop was `for path in / /engines /routing /budgets; do code=$(curl -fsS --max-time 10 -o /dev/null -w '%{http_code}' "http://127.0.0.1:8081$path") || die admin_static_request; [ "$code" = 200 ] || die admin_static_status; done`. On the old baseline, each item was run independently without short-circuit: `/`=`403 text/html`, curl exit=`22`; `/engines`=`404 text/html`, curl exit=`22`; `/routing`=`404 text/html`, curl exit=`22`; `/budgets`=`404 text/html`, curl exit=`22`. Body was not read or saved; only safe status/content-type category was recorded.
    5. `route_after`: 69 `route_snapshot` used `sudo -n -u postgres -- psql -X -qAt -d qimao_terms_cloud -c` with the read-only join of `active_control_plane_pointers`, `routing_policy_targets(pool_id='terms_api')`, `engine_deployment_versions`, `engine_deployments`, and latest `routing_policy_status_events`; old baseline exit=`0`, one row: `8e76ffde-83f6-4cad-b8ff-0f2bf620f38d|56d6f40f-608e-4c2a-9628-32599779d984|d149bfec-e95f-4a57-8aea-40655a458053|1|preferred|deepseek|terms_api|terms|deepseek-v4-flash|1|active`.
  - old_static_shape: `test -d /srv/qimao-terms-cloud/system-frontend-term-provider-usage-20260830-r1` exit=`0`; `test -e .../index.html` exit=`1`; `test -e .../dist/index.html` exit=`1`. The target is a directory, but neither root index nor nested dist index exists.
  - nginx_contract: `deploy/debian/nginx/qimao-loopback.conf` defines `root /srv/qimao-terms-cloud/system-frontend`, `index index.html`, exact `/index.html` `try_files /index.html =404`, and non-API fallback `try_files $uri $uri/ /index.html`; therefore the active static target must contain `index.html` directly at its root.
  - 69 static construction exact commands recovered from the executed runner:
    ```sh
    if [ ! -d "$STAGE/system-frontend/dist" ]; then die static_source_missing; fi
    install -d -o root -g qimao -m 0750 -- "$STATIC_STAGE"
    cp -a "$STAGE/system-frontend/dist/." "$STATIC_STAGE/" || die static_copy
    mv -T -- "$STATIC_STAGE" "$NEW_STATIC" || die static_rename
    ln -s -- "$NEW_RELEASE" "$CURRENT_NEXT" || die current_next_create
    mv -Tf -- "$CURRENT_NEXT" "$CURRENT_LINK" || die current_switch
    ln -s -- "$NEW_STATIC" "$STATIC_NEXT" || die static_next_create
    mv -Tf -- "$STATIC_NEXT" "$STATIC_LINK" || die static_switch
    ```
    `STATIC_STAGE=/srv/qimao-terms-cloud/.system-frontend-term-budget-capability-20260830-r1.stage-69`; `NEW_STATIC=/srv/qimao-terms-cloud/system-frontend-term-budget-capability-20260830-r1`; `STATIC_LINK=/srv/qimao-terms-cloud/system-frontend`. Thus 69's recorded construction shape copies the archive's `system-frontend/dist/.` into the static target root; it does not intentionally create `NEW_STATIC/system-frontend` or `NEW_STATIC/dist`.
  - first_falsifiable_candidate: `admin_static` is the only reproduced failing post-verify family: the old target has no direct index and produces 403/404 under the configured Nginx root. This proves a baseline static-shape failure, but does not prove that 69's removed NEW_STATIC had the same contents; the 69 runner stdout/code and new target were not retained. No narrower 69 cause is asserted.
  - unique_minimal_correction: `future release evidence must preserve the existing direct copy shape (STAGE/system-frontend/dist/. → STATIC_STAGE/) and independently persist a root-only test that NEW_STATIC/index.html exists before symlink switch and that the admin root/deep-link statuses are captured before cleanup; do not use the old empty target as proof of the removed candidate's contents.`
- remaining_gap: `SERVER-70 distinguishes the old baseline admin-static failure but cannot identify which 69 post-verify sub-gate failed because 69 removed the new target and did not persist the sub-code. The published budget candidate remains absent by design.`
- next_owner: `PLANNER; use the admin-static finding and the recovered copy shape to decide the next release evidence contract; no SERVER-69 rerun or in-place patch.`
- residual: `remote and local SERVER-69 temporary resources remain absent; production current/static, four units, health, and route are unchanged; candidate input directory is retained.`
- requires_user: false
