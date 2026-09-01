import { createContext, useContext, type ReactNode } from 'react';

export type ControlRefreshState = {
  autoRefresh: boolean;
  refreshSignal: number;
  requestRefresh: () => void;
  enableAutoRefresh: () => void;
};

const ControlRefreshContext = createContext<ControlRefreshState | null>(null);

export const ControlRefreshProvider = ({ value, children }: { value: ControlRefreshState; children: ReactNode }) =>
  <ControlRefreshContext.Provider value={value}>{children}</ControlRefreshContext.Provider>;

export const useControlRefresh = () => useContext(ControlRefreshContext);
