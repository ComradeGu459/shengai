// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';

import { ProjectMaterials } from '../../frontend/src/features/materials/ProjectMaterials.js';
import { findPairingBlockers, scanMaterialFiles } from '../../frontend/src/features/materials/scan.js';

const projectId = 'ca65378e-8935-4c4a-9e8b-13efca3d314a';
const project = {
  id: projectId,
  name: '匿名整剧项目',
  workflowStatus: 'draft',
  lifecycleStatus: 'active',
  recycleExpiresAt: null,
  version: 1,
  createdAt: '2026-08-12T08:00:00.000Z',
  updatedAt: '2026-08-12T08:00:00.000Z',
  createdBy: 'local-user',
  updatedBy: 'local-user',
};

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/projects/${projectId}/materials`]}>
        <Routes>
          <Route path="/projects/:projectId/materials" element={<ProjectMaterials />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const localFile = (name: string, path: string, size = 1024) => {
  const file = new File(['x'], name, { lastModified: 1_754_976_000_000 });
  Object.defineProperty(file, 'webkitRelativePath', { value: path });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('整剧素材配对确认页', () => {
  it('只允许同集中文识别与画面字角色共享同一 MP4', () => {
    const sharedVideo = localFile('EP01.mp4', '匿名测试剧/视频/EP01.mp4', 5000);
    const subtitle = localFile('EP01.srt', '匿名测试剧/字幕/EP01.srt');
    const files = scanMaterialFiles([sharedVideo, subtitle]).files;
    const videoPath = '匿名测试剧/视频/EP01.mp4';
    const subtitlePath = '匿名测试剧/字幕/EP01.srt';

    expect(findPairingBlockers(files, [1], {
      1: { company_srt: subtitlePath, asr_video: videoPath, screen_video: videoPath },
    })).toEqual([]);

    expect(findPairingBlockers(files, [1, 2], {
      1: { company_srt: subtitlePath, asr_video: videoPath },
      2: { company_srt: subtitlePath, asr_video: videoPath, screen_video: videoPath },
    })).toEqual(expect.arrayContaining([
      expect.stringContaining(`${subtitlePath} 已用于第 1 集`),
      expect.stringContaining(`${videoPath} 已用于第 1 集`),
    ]));

    expect(findPairingBlockers(files, [1], {
      1: { company_srt: videoPath, asr_video: videoPath },
    })).toEqual(expect.arrayContaining([
      expect.stringContaining(`${videoPath} 已用于第 1 集`),
      expect.stringContaining('素材类型或指纹无效'),
    ]));
  });

  it('刷新后展示后端已确认清单版本与绑定', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      project,
      manifest: {
        id: 'ca65378e-8935-4c4a-9e8b-13efca3d314b',
        projectId,
        version: 2,
        rootName: '匿名测试剧',
        episodeCount: 1,
        bindingCount: 2,
        confirmedAt: '2026-08-12T08:00:00.000Z',
        createdBy: 'local-user',
        bindings: [
          { episodeNumber: 1, role: 'company_srt', relativePath: '匿名测试剧/SRT/EP01.srt', fileName: 'EP01.srt', sizeBytes: 100, lastModifiedMs: 100, fingerprint: 'a', mediaType: 'srt' },
          { episodeNumber: 1, role: 'asr_video', relativePath: '匿名测试剧/视频/EP01.mp4', fileName: 'EP01.mp4', sizeBytes: 1000, lastModifiedMs: 100, fingerprint: 'b', mediaType: 'video' },
        ],
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    renderPage();
    expect(await screen.findByText('已确认素材清单 v2')).toBeInTheDocument();
    expect(screen.getByText('匿名测试剧/SRT/EP01.srt')).toBeInTheDocument();
    expect(screen.getByText('明确留空')).toBeInTheDocument();
    expect(screen.getAllByText('第 1 集')).toHaveLength(3);
    expect(screen.getByText((_, element) => element?.tagName === 'P' && element.textContent?.includes('2 项绑定') === true)).toBeInTheDocument();
  });

  it('本地扫描只提交元数据，完整配对后可确认', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ project, manifest: null }), { status: 200 }))
      .mockImplementationOnce(async (_input, init) => {
        const body = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({
          id: 'ca65378e-8935-4c4a-9e8b-13efca3d314b',
          projectId,
          version: 1,
          rootName: body.rootName,
          episodeCount: 2,
          bindingCount: body.bindings.length,
          confirmedAt: '2026-08-12T08:00:00.000Z',
          createdBy: 'local-user',
          bindings: body.bindings,
        }), { status: 201 });
      });

    const view = renderPage();
    await screen.findByText('尚未建立素材清单');
    const input = view.container.querySelector('#material-folder') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [
      localFile('EP01.srt', '匿名测试剧/公司字幕/EP01.srt'),
      localFile('EP01.mp4', '匿名测试剧/中文视频/EP01.mp4', 5000),
      localFile('EP02.srt', '匿名测试剧/公司字幕/EP02.srt'),
      localFile('EP02.mp4', '匿名测试剧/中文视频/EP02.mp4', 5000),
    ] } });

    expect(await screen.findByText('可以确认')).toBeInTheDocument();
    const confirmTrigger = screen.getByRole('button', { name: '确认整剧素材' });
    fireEvent.click(confirmTrigger);
    expect(screen.getByRole('button', { name: '返回调整' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(confirmTrigger).toHaveFocus();
    fireEvent.click(confirmTrigger);
    fireEvent.click(screen.getByRole('button', { name: '保存清单' }));

    await screen.findByText('已确认素材清单 v1');
    const request = fetchMock.mock.calls[1]!;
    const body = JSON.parse(String(request[1]?.body));
    expect(body).toMatchObject({ expectedVersion: 0, rootName: '匿名测试剧' });
    expect(body.bindings).toHaveLength(6);
    const bindingsByEpisode = new Map<number, Array<Record<string, unknown>>>();
    for (const binding of body.bindings as Array<Record<string, unknown>>) {
      const episode = Number(binding.episodeNumber);
      bindingsByEpisode.set(episode, [...(bindingsByEpisode.get(episode) ?? []), binding]);
    }
    expect([...bindingsByEpisode.keys()].sort()).toEqual([1, 2]);
    for (const episode of [1, 2]) {
      expect((bindingsByEpisode.get(episode) ?? []).map((binding) => binding.role).sort()).toEqual([
        'asr_video', 'company_srt', 'screen_video',
      ]);
      const episodeVideos = (bindingsByEpisode.get(episode) ?? []).filter((binding) => binding.mediaType === 'video');
      expect(episodeVideos).toHaveLength(2);
      expect(episodeVideos[0]?.relativePath).toBe(episodeVideos[1]?.relativePath);
    }
    const videoBindings = (body.bindings as Array<Record<string, unknown>>).filter((binding) => binding.mediaType === 'video');
    expect(new Set(videoBindings.map((binding) => binding.relativePath))).toEqual(new Set([
      '匿名测试剧/中文视频/EP01.mp4', '匿名测试剧/中文视频/EP02.mp4',
    ]));
    expect(new Set(videoBindings.map((binding) => binding.relativePath)).size).toBe(2);
    expect(JSON.stringify(body)).not.toContain('content');
    expect((request[1]?.headers as Record<string, string>)['idempotency-key']).toBeTruthy();
  });

  it('重复候选会留下阻断并禁用确认', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ project, manifest: null }), { status: 200 }),
    );
    const view = renderPage();
    await screen.findByText('尚未建立素材清单');
    const input = view.container.querySelector('#material-folder') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [
      localFile('EP01.srt', '匿名测试剧/公司字幕/EP01.srt'),
      localFile('EP01_old.srt', '匿名测试剧/历史稿/EP01_old.srt'),
      localFile('EP01.mp4', '匿名测试剧/中文视频/EP01.mp4', 5000),
    ] } });

    expect(await screen.findByText(/第 1 集的公司字幕 SRT存在 2 个候选/)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /EP01\.srt · 匿名测试剧\/公司字幕\/EP01\.srt · 1 KB/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /EP01_old\.srt · 匿名测试剧\/历史稿\/EP01_old\.srt · 1 KB/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认整剧素材' })).toBeDisabled();
  });

  it('人工分配只允许 1–100 的整数并显示文件元数据与原因', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ project, manifest: null }), { status: 200 }),
    );
    const view = renderPage();
    await screen.findByText('尚未建立素材清单');
    const invalidVideo = localFile('unknown.mp4', '匿名测试剧/其他/unknown.mp4', 5000);
    const input = view.container.querySelector('#material-folder') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [
      localFile('EP01.srt', '匿名测试剧/公司字幕/EP01.srt'),
      localFile('EP01.mp4', '匿名测试剧/中文视频/EP01.mp4', 5000),
      invalidVideo,
      localFile('notes.txt', '匿名测试剧/其他/notes.txt', 512),
    ] } });

    const episodeInput = await screen.findByRole('spinbutton', { name: 'unknown.mp4 目标集数' });
    const assignButton = screen.getAllByRole('button', { name: '分配' })[0]!;
    expect(screen.getByText('匿名测试剧/其他/unknown.mp4')).toBeInTheDocument();
    expect(screen.getAllByText('4.9 KB').length).toBeGreaterThan(0);
    expect(screen.getByText('文件类型不在本切片范围')).toBeInTheDocument();
    fireEvent.change(episodeInput, { target: { value: '1.5' } });
    expect(screen.getByText('目标集数必须是 1–100 的整数')).toBeInTheDocument();
    expect(assignButton).toBeDisabled();
    fireEvent.change(episodeInput, { target: { value: '101' } });
    expect(assignButton).toBeDisabled();
    fireEvent.change(episodeInput, { target: { value: '2' } });
    expect(assignButton).toBeEnabled();
  });

  it('确认请求进行中时将键盘焦点约束在对话框容器', async () => {
    const pendingResponse = new Promise<Response>(() => undefined);
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ project, manifest: null }), { status: 200 }))
      .mockReturnValueOnce(pendingResponse);
    const view = renderPage();
    await screen.findByText('尚未建立素材清单');
    const input = view.container.querySelector('#material-folder') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [
      localFile('EP01.srt', '匿名测试剧/公司字幕/EP01.srt'),
      localFile('EP01.mp4', '匿名测试剧/中文视频/EP01.mp4', 5000),
    ] } });
    await screen.findByText('可以确认');
    fireEvent.click(screen.getByRole('button', { name: '确认整剧素材' }));
    fireEvent.click(screen.getByRole('button', { name: '保存清单' }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog).toHaveAttribute('aria-busy', 'true'));
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(dialog).toHaveFocus();
  });
});
