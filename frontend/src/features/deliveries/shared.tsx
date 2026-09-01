import { useLayoutEffect, type RefObject } from 'react';

import { DeliveryApiError } from './api.js';
import { deliveryStatusLabels, deliveryStatusTone } from './model.js';
import type { DeliveryProductStatus } from '@qimao-terms-cloud/contracts';
import styles from './Deliveries.module.css';

export const errorDetails = (error: unknown) => ({
  message: error instanceof Error ? error.message : '请求结果未知，请重新读取权威状态。',
  code: error instanceof DeliveryApiError ? error.code : 'REQUEST_FAILED',
  requestId: error instanceof DeliveryApiError ? error.requestId : null,
  retryable: error instanceof DeliveryApiError ? error.retryable : true,
});

export const RequestNotice = ({ error, retry, retryLabel = '重新读取' }: { error: unknown; retry?: () => void; retryLabel?: string }) => {
  const details = errorDetails(error);
  return (
    <div className={styles.errorNotice} role="alert">
      <div>
        <strong>{details.code}</strong>
        <p>{details.message}</p>
        {details.requestId && <small>请求标识：{details.requestId}</small>}
      </div>
      {retry && <button className={styles.button} type="button" onClick={retry}>{retryLabel}</button>}
    </div>
  );
};

export const StatusPill = ({ status }: { status: DeliveryProductStatus }) => (
  <span className={`${styles.tableStatus} ${styles[deliveryStatusTone[status]]}`}>{deliveryStatusLabels[status]}</span>
);

interface FocusTrapOptions {
  open: boolean;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  locked?: boolean;
}

export const useFocusTrap = ({ open, containerRef, initialFocusRef, onClose, locked = false }: FocusTrapOptions) => {
  useLayoutEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;
    const focusable = () => Array.from(container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
    const target = initialFocusRef.current && !initialFocusRef.current.hasAttribute('disabled') ? initialFocusRef.current : focusable()[0];
    target?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!locked) {
          event.preventDefault();
          onClose();
        }
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const active = document.activeElement;
      const activeIndex = active instanceof HTMLElement ? items.indexOf(active) : -1;
      const nextIndex = event.shiftKey
        ? (activeIndex <= 0 ? items.length - 1 : activeIndex - 1)
        : (activeIndex < 0 || activeIndex === items.length - 1 ? 0 : activeIndex + 1);
      event.preventDefault();
      items[nextIndex]?.focus();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [containerRef, initialFocusRef, locked, onClose, open]);
};

export const downloadAllFiles = (urls: string[]) => {
  urls.forEach((url, index) => {
    window.setTimeout(() => {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = '';
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }, index * 80);
  });
};
