import { useLayoutEffect, type RefObject } from 'react';
import type { AcceptancePreflight } from './api.js';
import type { AcceptanceSession, AcceptanceSessionDetail, AcceptanceTrack } from '@qimao-terms-cloud/contracts';

export type CueFilter = 'all' | AcceptanceTrack;
export type EpisodeFilter = 'all' | 'screen' | 'multi' | 'issues';
export type SidebarTab = 'subtitles' | 'issues';
export type SaveState = 'saved' | 'dirty' | 'saving' | 'failed';

export interface CommandError {
  message: string;
  code: string;
  requestId: string | null;
}

export interface CommandSpec {
  label: string;
  key: string;
  body: unknown;
  execute: () => Promise<unknown>;
  onSuccess?: (result: unknown) => void | Promise<void>;
  focus?: HTMLElement | null | undefined;
  errorFocus?: HTMLElement | null | undefined;
}

export interface CommandIntent extends CommandSpec {
  bodyText: string;
  pending: boolean;
  error?: CommandError;
}

export type PreflightState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; result: AcceptancePreflight; at: string; sessionId: string }
  | { kind: 'failed'; message: string; code: string; requestId: string | null };

interface FocusTrapOptions {
  open: boolean;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  locked?: boolean;
}

export const useFocusTrap = ({ open, containerRef, initialFocusRef, onClose, locked = false }: FocusTrapOptions) => {
  useLayoutEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;
    const getFocusable = () => Array.from(container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
    const target = initialFocusRef?.current && !initialFocusRef.current.hasAttribute('disabled')
      ? initialFocusRef.current
      : getFocusable()[0];
    target?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!locked) {
          event.preventDefault();
          onClose();
        }
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const activeIndex = document.activeElement instanceof HTMLElement ? focusable.indexOf(document.activeElement) : -1;
      const nextIndex = event.shiftKey
        ? (activeIndex <= 0 ? focusable.length - 1 : activeIndex - 1)
        : (activeIndex < 0 || activeIndex === focusable.length - 1 ? 0 : activeIndex + 1);
      event.preventDefault();
      focusable[nextIndex]?.focus();
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [containerRef, initialFocusRef, locked, onClose, open]);
};

export const writableStatus = (session: AcceptanceSession) =>
  session.status === 'draft' || session.status === 'ready_to_release';

export const isInputTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
};

export const sourceLabel = (release: { id: string; version?: number; createdAt?: string }) =>
  `V${release.version ?? '—'} · ${release.createdAt ? new Date(release.createdAt).toLocaleString('zh-CN') : release.id.slice(0, 8)}`;

export const readOnlyReason = (session: AcceptanceSessionDetail | undefined) => {
  if (!session) return '未选择验收会话';
  if (session.status === 'released') return '历史验收版本已发布，当前会话只读。';
  if (session.status === 'stale') return '来源已变化，旧会话只读；如需继续请从新来源新建。';
  if (session.status === 'blocked') return '服务端标记会话阻塞，所有写入已锁定。';
  if (session.status === 'preflighting') return '服务端正在核对验收结果，本轮只读。';
  return null;
};

export const defaultCueText = (track: AcceptanceTrack) => track === 'dialogue' ? '新增台词' : '新增画面字';
