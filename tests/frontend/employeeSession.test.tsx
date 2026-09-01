// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EmployeeSessionGate, useEmployeeSession } from '../../frontend/src/features/employee-auth/EmployeeSessionGate.js';
import { employeeApiFetch } from '../../frontend/src/platform/employeeApi.js';

const json = (body: unknown, status = 200, headers?: Record<string, string>) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', ...headers },
});

const session = {
  subject: 'employee:admin',
  expiresAt: '2026-09-04T08:00:00.000Z',
  requestId: '11111111-1111-4111-8111-111111111111',
};

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('员工站内登录会话', () => {
  it('无会话时显示登录页，成功后进入工作台且不持久化密码', async () => {
    let resolveLogin!: (response: Response) => void;
    const loginPending = new Promise<Response>((resolve) => { resolveLogin = resolve; });
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ error: { code: 'EMPLOYEE_SESSION_REQUIRED' } }, 401))
      .mockReturnValueOnce(loginPending);

    render(<EmployeeSessionGate><div>真实工作台</div></EmployeeSessionGate>);
    expect(await screen.findByRole('heading', { name: '登录审改工作台' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('账号'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByRole('button', { name: '正在登录…' })).toBeDisabled();
    expect(screen.getByLabelText('账号')).toBeDisabled();
    expect(screen.getByLabelText('密码')).toBeDisabled();
    resolveLogin(json(session));
    expect(await screen.findByText('真实工作台')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST', credentials: 'same-origin' });
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(window.location.search).not.toContain('123456');
  });

  it('登录限流和服务错误显示真实请求编号并把焦点交给错误块', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ error: {} }, 401))
      .mockResolvedValueOnce(json(
        { error: { code: 'EMPLOYEE_LOGIN_RATE_LIMITED', requestId: 'rate-1' } },
        429,
        { 'retry-after': '45' },
      ))
      .mockResolvedValueOnce(json({ error: { code: 'EMPLOYEE_AUTH_UNAVAILABLE', requestId: 'service-1' } }, 503));

    render(<EmployeeSessionGate><div>工作台</div></EmployeeSessionGate>);
    await screen.findByRole('heading', { name: '登录审改工作台' });
    fireEvent.change(screen.getByLabelText('账号'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    const rateAlert = await screen.findByRole('alert');
    expect(rateAlert).toHaveTextContent('请 45 秒后再试');
    expect(rateAlert).toHaveTextContent('rate-1');
    expect(rateAlert).toHaveFocus();

    fireEvent.change(screen.getByLabelText('密码'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));
    const serviceAlert = await screen.findByRole('alert');
    expect(serviceAlert).toHaveTextContent('登录服务暂时不可用');
    expect(serviceAlert).toHaveTextContent('service-1');
    expect(serviceAlert).toHaveFocus();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(2);
  });

  it('登录网络结果未知时不重发POST，只允许GET核对同一会话', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ error: {} }, 401))
      .mockRejectedValueOnce(new TypeError('network reset'))
      .mockResolvedValueOnce(json(session));

    render(<EmployeeSessionGate><div>已核对登录</div></EmployeeSessionGate>);
    await screen.findByRole('heading', { name: '登录审改工作台' });
    fireEvent.change(screen.getByLabelText('账号'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByRole('button', { name: '查询登录结果' })).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: '查询登录结果' }));
    expect(await screen.findByText('已核对登录')).toBeInTheDocument();
    const postCount = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST').length;
    expect(postCount).toBe(1);
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/employee-auth/session');
  });

  it('核心API返回401时统一回到登录页', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(session))
      .mockResolvedValueOnce(json({ error: { code: 'EMPLOYEE_SESSION_REQUIRED' } }, 401));
    const ProtectedAction = () => <button type="button" onClick={() => void employeeApiFetch('/api/projects')}>读取项目</button>;

    render(<EmployeeSessionGate><ProtectedAction /></EmployeeSessionGate>);
    fireEvent.click(await screen.findByRole('button', { name: '读取项目' }));
    expect(await screen.findByRole('heading', { name: '登录审改工作台' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('旧会话请求在重新登录后迟到401不会覆盖新会话', async () => {
    let resolveOldRequest!: (response: Response) => void;
    const oldRequestPending = new Promise<Response>((resolve) => { resolveOldRequest = resolve; });
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(session))
      .mockReturnValueOnce(oldRequestPending)
      .mockResolvedValueOnce(json({ error: { code: 'EMPLOYEE_SESSION_REQUIRED' } }, 401))
      .mockResolvedValueOnce(json({ ...session, requestId: '22222222-2222-4222-8222-222222222222' }));
    const RaceActions = () => (
      <>
        <button type="button" onClick={() => void employeeApiFetch('/api/projects?slow=1')}>启动旧请求</button>
        <button type="button" onClick={() => void employeeApiFetch('/api/tasks')}>当前请求失效</button>
      </>
    );

    render(<EmployeeSessionGate><RaceActions /></EmployeeSessionGate>);
    fireEvent.click(await screen.findByRole('button', { name: '启动旧请求' }));
    fireEvent.click(screen.getByRole('button', { name: '当前请求失效' }));
    await screen.findByRole('heading', { name: '登录审改工作台' });
    fireEvent.change(screen.getByLabelText('账号'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));
    expect(await screen.findByRole('button', { name: '启动旧请求' })).toBeInTheDocument();

    await act(async () => resolveOldRequest(json({ error: { code: 'EMPLOYEE_SESSION_REQUIRED' } }, 401)));
    expect(screen.queryByRole('heading', { name: '登录审改工作台' })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('退出只发送一次POST并回到登录页', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json(session))
      .mockResolvedValueOnce(json({ loggedOut: true, requestId: session.requestId }));
    const LogoutButton = () => {
      const { logout } = useEmployeeSession();
      return <button type="button" onClick={() => void logout()}>退出</button>;
    };

    render(<EmployeeSessionGate><LogoutButton /></EmployeeSessionGate>);
    fireEvent.click(await screen.findByRole('button', { name: '退出' }));
    expect(await screen.findByRole('heading', { name: '登录审改工作台' })).toBeInTheDocument();
    await waitFor(() => expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1));
  });
});
