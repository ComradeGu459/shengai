import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import type { EmployeeAuthSession } from '@qimao-terms-cloud/contracts';

import {
  EMPLOYEE_SESSION_EXPIRED_EVENT,
  EmployeeAuthApiError,
  advanceEmployeeSessionGeneration,
  currentEmployeeSessionGeneration,
  loginEmployee,
  logoutEmployee,
  readEmployeeSession,
} from '../../platform/employeeApi.js';
import styles from '../../components/AppShell.module.css';

interface EmployeeSessionContextValue {
  session: EmployeeAuthSession;
  logout: () => Promise<void>;
  logoutBusy: boolean;
  logoutError: string | null;
}

const EmployeeSessionContext = createContext<EmployeeSessionContextValue | null>(null);

export const useOptionalEmployeeSession = () => useContext(EmployeeSessionContext);

export const useEmployeeSession = () => {
  const value = useOptionalEmployeeSession();
  if (!value) throw new Error('员工会话上下文尚未建立。');
  return value;
};

type GateState =
  | { phase: 'checking' }
  | { phase: 'signed_out'; error: EmployeeAuthApiError | null; unknownLogin: boolean }
  | { phase: 'signed_in'; session: EmployeeAuthSession }
  | { phase: 'unavailable'; error: EmployeeAuthApiError };

const errorText = (error: EmployeeAuthApiError) => {
  if (error.status === 401) return '账号或密码不正确，请重新输入。';
  if (error.status === 429) return error.retryAfterSeconds === null
    ? '登录尝试过于频繁，请稍后再试。'
    : `登录尝试过于频繁，请 ${error.retryAfterSeconds} 秒后再试。`;
  if (error.status === 503) return '登录服务暂时不可用，请稍后重新读取。';
  return error.message || '登录请求未完成。';
};

const requestIdText = (error: EmployeeAuthApiError | null) => error?.requestId
  ? `请求编号：${error.requestId}`
  : null;

export const EmployeeSessionGate = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<GateState>({ phase: 'checking' });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const sessionGenerationRef = useRef(currentEmployeeSessionGeneration());

  const advanceSessionGeneration = useCallback(() => {
    sessionGenerationRef.current = advanceEmployeeSessionGeneration();
  }, []);

  const checkSession = useCallback(async (signal?: AbortSignal) => {
    try {
      const session = await readEmployeeSession(signal);
      advanceSessionGeneration();
      setState({ phase: 'signed_in', session });
      setLogoutError(null);
      return session;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null;
      if (error instanceof EmployeeAuthApiError && error.status === 401) {
        advanceSessionGeneration();
        setState({ phase: 'signed_out', error: null, unknownLogin: false });
        return null;
      }
      const authError = error instanceof EmployeeAuthApiError
        ? error
        : new EmployeeAuthApiError(0, 'EMPLOYEE_AUTH_UNKNOWN', null, true, '无法读取登录状态。');
      setState({ phase: 'unavailable', error: authError });
      return null;
    }
  }, [advanceSessionGeneration]);

  useEffect(() => {
    const controller = new AbortController();
    void checkSession(controller.signal);
    return () => controller.abort();
  }, [checkSession]);

  useEffect(() => {
    const expire = (event: Event) => {
      const eventGeneration = (event as CustomEvent<{ generation?: unknown }>).detail?.generation;
      if (eventGeneration !== sessionGenerationRef.current) return;
      advanceSessionGeneration();
      setPassword('');
      setState({ phase: 'signed_out', error: null, unknownLogin: false });
    };
    window.addEventListener(EMPLOYEE_SESSION_EXPIRED_EVENT, expire);
    return () => window.removeEventListener(EMPLOYEE_SESSION_EXPIRED_EVENT, expire);
  }, [advanceSessionGeneration]);

  useLayoutEffect(() => {
    if (state.phase === 'signed_out' && state.error) errorRef.current?.focus();
    else if (state.phase === 'unavailable') errorRef.current?.focus();
    else if (state.phase === 'signed_out' && !loginBusy) usernameRef.current?.focus();
  }, [loginBusy, state]);

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    if (loginBusy || state.phase !== 'signed_out' || state.unknownLogin) return;
    setLoginBusy(true);
    setState({ phase: 'signed_out', error: null, unknownLogin: false });
    try {
      const session = await loginEmployee({ username, password });
      advanceSessionGeneration();
      setPassword('');
      setState({ phase: 'signed_in', session });
    } catch (error) {
      const authError = error instanceof EmployeeAuthApiError
        ? error
        : new EmployeeAuthApiError(0, 'EMPLOYEE_AUTH_UNKNOWN', null, true, '登录请求结果未知。');
      setPassword('');
      setState({
        phase: 'signed_out',
        error: authError,
        unknownLogin: authError.status === 0,
      });
    } finally {
      setLoginBusy(false);
    }
  };

  const reconcileUnknownLogin = async () => {
    if (state.phase !== 'signed_out' || !state.unknownLogin || loginBusy) return;
    setLoginBusy(true);
    const session = await checkSession();
    if (!session) {
      setState((current) => current.phase === 'signed_out'
        ? { phase: 'signed_out', error: null, unknownLogin: false }
        : current);
    }
    setLoginBusy(false);
  };

  const logout = useCallback(async () => {
    if (logoutBusy) return;
    setLogoutBusy(true);
    setLogoutError(null);
    try {
      await logoutEmployee();
      advanceSessionGeneration();
      setPassword('');
      setState({ phase: 'signed_out', error: null, unknownLogin: false });
    } catch (error) {
      if (error instanceof EmployeeAuthApiError && error.status === 401) {
        advanceSessionGeneration();
        setState({ phase: 'signed_out', error: null, unknownLogin: false });
      } else {
        const session = await checkSession();
        if (session) setLogoutError('退出请求结果未知，当前登录仍然有效。');
      }
    } finally {
      setLogoutBusy(false);
    }
  }, [advanceSessionGeneration, checkSession, logoutBusy]);

  if (state.phase === 'checking') {
    return <div className={styles.authPage}><div className={styles.authStatus} role="status">正在确认登录状态…</div></div>;
  }

  if (state.phase === 'unavailable') {
    return (
      <div className={styles.authPage}>
        <section className={styles.authCard} aria-labelledby="employee-login-title">
          <span className={styles.authBrand} aria-hidden="true">审</span>
          <h1 id="employee-login-title">暂时无法进入工作台</h1>
          <div ref={errorRef} className={styles.authError} role="alert" tabIndex={-1}>
            <strong>{errorText(state.error)}</strong>
            {requestIdText(state.error) ? <span>{requestIdText(state.error)}</span> : null}
          </div>
          <button className={styles.authPrimaryButton} type="button" onClick={() => { setState({ phase: 'checking' }); void checkSession(); }}>重新读取</button>
        </section>
      </div>
    );
  }

  if (state.phase === 'signed_out') {
    return (
      <div className={styles.authPage}>
        <section className={styles.authCard} aria-labelledby="employee-login-title">
          <span className={styles.authBrand} aria-hidden="true">审</span>
          <div>
            <p className={styles.authEyebrow}>员工工作台</p>
            <h1 id="employee-login-title">登录审改工作台</h1>
            <p className={styles.authHint}>登录状态最长保留两周，请勿在公共设备上保存密码。</p>
          </div>
          {state.error ? (
            <div ref={errorRef} className={styles.authError} role="alert" tabIndex={-1}>
              <strong>{state.unknownLogin ? '登录结果未知，请先查询登录结果。' : errorText(state.error)}</strong>
              {requestIdText(state.error) ? <span>{requestIdText(state.error)}</span> : null}
            </div>
          ) : null}
          <form className={styles.authForm} onSubmit={submitLogin}>
            <label htmlFor="employee-username">账号</label>
            <input ref={usernameRef} id="employee-username" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} disabled={loginBusy || state.unknownLogin} required />
            <label htmlFor="employee-password">密码</label>
            <input id="employee-password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={loginBusy || state.unknownLogin} required />
            {state.unknownLogin ? (
              <button className={styles.authPrimaryButton} type="button" onClick={() => void reconcileUnknownLogin()} disabled={loginBusy}>
                {loginBusy ? '正在查询…' : '查询登录结果'}
              </button>
            ) : (
              <button className={styles.authPrimaryButton} type="submit" disabled={loginBusy}>
                {loginBusy ? '正在登录…' : '登录'}
              </button>
            )}
          </form>
        </section>
      </div>
    );
  }

  return (
    <EmployeeSessionContext.Provider value={{ session: state.session, logout, logoutBusy, logoutError }}>
      {children}
    </EmployeeSessionContext.Provider>
  );
};
