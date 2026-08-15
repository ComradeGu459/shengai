import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import type { Project } from '@qimao-terms-cloud/contracts';

import { PlusIcon } from '../../components/Icons.js';
import { AsrProjectDispatch } from '../asr-dispatch/AsrProjectDispatch.js';
import { recycleProject, RecycleApiError } from '../recycle/api.js';
import { createProject, listProjects } from './api.js';
import styles from './ProjectCenter.module.css';

export const ProjectCenter = () => {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState('');
  const [recycleTarget, setRecycleTarget] = useState<Project | null>(null);
  const [recycleNotice, setRecycleNotice] = useState('');
  const createIntent = useRef<{ name: string; idempotencyKey: string } | null>(null);
  const recycleIntent = useRef<{ projectId: string; version: number; idempotencyKey: string } | null>(null);
  const recycleDialog = useRef<HTMLDivElement | null>(null);
  const recycleCancelButton = useRef<HTMLButtonElement | null>(null);
  const recycleTrigger = useRef<HTMLButtonElement | null>(null);
  const recycleNoticeElement = useRef<HTMLDivElement | null>(null);
  const restoreTriggerFocus = useRef(false);
  const focusRecycleNotice = useRef(false);
  const projects = useQuery({
    queryKey: ['projects', ''],
    queryFn: () => listProjects(''),
  });
  const projectVersions = useMemo(
    () => new Map((projects.data?.items ?? []).map((project) => [project.id, project])),
    [projects.data?.items],
  );
  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      createIntent.current = null;
      setName('');
      setCreating(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['asr-eligibility-search'] }),
      ]);
    },
  });
  const recycleMutation = useMutation({
    mutationFn: async (project: Project) => {
      const current = recycleIntent.current;
      const intent = current?.projectId === project.id && current.version === project.version
        ? current
        : { projectId: project.id, version: project.version, idempotencyKey: crypto.randomUUID() };
      recycleIntent.current = intent;
      const result = await recycleProject(project.id, project.version, intent.idempotencyKey);
      return { project, result };
    },
    onMutate: () => setRecycleNotice(''),
    onSuccess: async ({ project, result }) => {
      recycleIntent.current = null;
      restoreTriggerFocus.current = false;
      focusRecycleNotice.current = true;
      setRecycleTarget(null);
      setRecycleNotice(
        `项目“${project.name}”已移入回收站，48 小时内可以恢复${result.terminatedUploadCount > 0
          ? `；${result.terminatedUploadCount} 个未完成上传已终止`
          : ''}。`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['recycle-bin'] }),
        queryClient.invalidateQueries({ queryKey: ['asr-eligibility-search'] }),
      ]);
    },
  });

  useEffect(() => {
    if (recycleTarget) {
      recycleCancelButton.current?.focus();
      return;
    }
    if (focusRecycleNotice.current && recycleNotice) {
      focusRecycleNotice.current = false;
      recycleTrigger.current = null;
      recycleNoticeElement.current?.focus();
      return;
    }
    if (restoreTriggerFocus.current) {
      restoreTriggerFocus.current = false;
      recycleTrigger.current?.focus();
    }
  }, [recycleNotice, recycleTarget]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('请输入项目名称。');
      return;
    }
    setFormError('');
    const intent = createIntent.current?.name === trimmedName
      ? createIntent.current
      : { name: trimmedName, idempotencyKey: crypto.randomUUID() };
    createIntent.current = intent;
    createMutation.mutate({ body: { name: trimmedName }, idempotencyKey: intent.idempotencyKey });
  };

  const cancelCreate = () => {
    createIntent.current = null;
    setCreating(false);
  };

  const openRecycleDialog = (project: Project, trigger: HTMLButtonElement) => {
    recycleMutation.reset();
    recycleIntent.current = null;
    recycleTrigger.current = trigger;
    restoreTriggerFocus.current = false;
    focusRecycleNotice.current = false;
    setRecycleTarget(project);
  };

  const closeRecycleDialog = () => {
    if (recycleMutation.isPending) return;
    recycleIntent.current = null;
    recycleMutation.reset();
    restoreTriggerFocus.current = true;
    setRecycleTarget(null);
  };

  const handleRecycleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (recycleMutation.isPending) {
      if (event.key === 'Escape' || event.key === 'Tab') event.preventDefault();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeRecycleDialog();
      return;
    }
    if (event.key !== 'Tab') return;

    const controls = [...(recycleDialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
    const first = controls[0];
    const last = controls.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const recycleError = recycleMutation.error instanceof RecycleApiError ? recycleMutation.error : null;

  useEffect(() => {
    if (!recycleTarget) return;
    if (recycleMutation.isPending) {
      recycleDialog.current?.focus();
      return;
    }
    if (recycleError) {
      recycleCancelButton.current?.focus();
    }
  }, [recycleError, recycleMutation.isPending, recycleTarget]);

  return (
    <section className={styles.page} aria-label="项目列表">
      <div className={styles.toolbar}>
        <div className={styles.summary}>
          <strong>{projects.data?.total ?? 0}</strong>
          <span>个进行中的项目</span>
        </div>
        <button className={styles.primaryButton} type="button" onClick={() => setCreating(true)}>
          <PlusIcon />
          创建项目
        </button>
      </div>

      {recycleNotice && (
        <div className={styles.notice} role="status" tabIndex={-1} ref={recycleNoticeElement}>
          {recycleNotice}
        </div>
      )}

      {creating && (
        <form className={styles.createForm} onSubmit={submit}>
          <div>
            <label htmlFor="project-name">项目名称</label>
            <p>使用剧名或内部项目名，后续素材都会归入这个项目。</p>
          </div>
          <div className={styles.nameField}>
            <input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              autoFocus
              aria-invalid={Boolean(formError)}
              aria-describedby={formError ? 'project-name-error' : undefined}
              placeholder="例如：海外短剧项目 A"
            />
            {formError && <span id="project-name-error">{formError}</span>}
            {createMutation.error && <span>{createMutation.error.message}</span>}
          </div>
          <div className={styles.formActions}>
            <button type="button" onClick={cancelCreate} disabled={createMutation.isPending}>
              取消
            </button>
            <button className={styles.primaryButton} type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? '正在创建…' : '确认创建'}
            </button>
          </div>
        </form>
      )}

      <AsrProjectDispatch projectVersions={projectVersions} onRecycle={openRecycleDialog} />

      {recycleTarget && (
        <div className={styles.dialogBackdrop} role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeRecycleDialog();
        }}>
          <div
            className={styles.dialog}
            role="dialog"
            ref={recycleDialog}
            tabIndex={-1}
            aria-modal="true"
            aria-labelledby="recycle-dialog-title"
            aria-describedby="recycle-dialog-description"
            onKeyDown={handleRecycleDialogKeyDown}
          >
            <span className={styles.dangerMark} aria-hidden="true">!</span>
            <div>
              <h2 id="recycle-dialog-title">将“{recycleTarget.name}”移入回收站？</h2>
              <p id="recycle-dialog-description">这会影响整个项目，请确认以下三项结果：</p>
              <ul>
                <li>立即终止全部未完成上传，恢复项目后这些上传不会自动复活。</li>
                <li>已完成 Asset、素材清单和项目资料会在 48 小时恢复窗口内保留。</li>
                <li>恢复窗口到期并进入后台清理后，项目将不可恢复。</li>
              </ul>
              {recycleError && (
                <div className={styles.dialogError} role="alert">
                  <strong>项目尚未确认移入回收站</strong>
                  <span>{recycleError.message}</span>
                  {recycleError.requestId && <span>请求标识 {recycleError.requestId}</span>}
                  {recycleError.resultUnknown && <span>请求结果未知，请使用下方同一操作重试。</span>}
                </div>
              )}
              <div className={styles.dialogActions}>
                <button
                  type="button"
                  ref={recycleCancelButton}
                  onClick={closeRecycleDialog}
                  disabled={recycleMutation.isPending}
                >
                  取消
                </button>
                <button
                  className={styles.dangerButton}
                  type="button"
                  disabled={recycleMutation.isPending}
                  onClick={() => recycleMutation.mutate(recycleTarget)}
                >
                  {recycleMutation.isPending ? '正在移入…' : '确认移入回收站'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
