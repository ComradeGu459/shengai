import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const runNode = (args: string[], env: NodeJS.ProcessEnv) => new Promise<{ code: number | null; stdout: string; stderr: string }>((resolveResult, reject) => {
  const child = spawn(process.execPath, args, { cwd: resolve('.'), env, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => { stdout += chunk; });
  child.stderr.on('data', (chunk: string) => { stderr += chunk; });
  child.once('error', reject);
  child.once('close', (code) => resolveResult({ code, stdout, stderr }));
});

const ensureSidecarBuild = async () => {
  const command = process.platform === 'win32' ? (process.env.ComSpec ?? 'C:\\Windows\\System32\\cmd.exe') : 'pnpm';
  const commandArgs = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'pnpm.cmd --filter @qimao-terms-cloud/backend run build:sidecars']
    : ['--filter', '@qimao-terms-cloud/backend', 'run', 'build:sidecars'];
  await new Promise<void>((resolveBuild, rejectBuild) => {
    const child = spawn(command, commandArgs, {
      cwd: resolve('.'),
      env: { ...process.env },
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      rejectBuild(new Error('LOCAL_OCR_SIDECAR_BUILD_TIMEOUT'));
    }, 30_000);
    child.once('error', (error) => { clearTimeout(timer); rejectBuild(error); });
    child.once('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolveBuild();
      else rejectBuild(new Error('LOCAL_OCR_SIDECAR_BUILD_FAILED'));
    });
  });
};

describe('local OCR sidecar production build', () => {
  it('产出可由 plain Node import 的 entry/sidecar，直接执行默认禁用且 fail-closed', async () => {
    const entryPath = resolve('backend/dist/sidecars/local-ocr/entry.js');
    const sidecarPath = resolve('backend/dist/sidecars/local-ocr/sidecar.js');
    await ensureSidecarBuild();
    expect(existsSync(entryPath)).toBe(true);
    expect(existsSync(sidecarPath)).toBe(true);
    const source = await readFile(entryPath, 'utf8');
    expect(source).not.toContain('tsx');
    const backendPackage = JSON.parse(await readFile(resolve('backend/package.json'), 'utf8')) as { scripts?: Record<string, string> };
    expect(backendPackage.scripts?.['start:local-ocr-sidecar']).toBe('node dist/sidecars/local-ocr/entry.js');
    const importResult = await runNode(['--input-type=module', '-e', `await import(${JSON.stringify(pathToFileURL(entryPath).href)}); process.stdout.write('IMPORT_OK\\n');`], { PATH: process.env.PATH ?? '', NODE_ENV: 'test' });
    expect(importResult.code).toBe(0);
    expect(importResult.stdout).toBe('IMPORT_OK\n');
    expect(importResult.stderr).toBe('');
    const disabledResult = await runNode([entryPath], { PATH: process.env.PATH ?? '', NODE_ENV: 'test' });
    expect(disabledResult.code).toBe(2);
    expect(disabledResult.stderr).toContain('LOCAL_OCR_SIDECAR_DISABLED');
    expect(disabledResult.stdout).toBe('');
  });
});
