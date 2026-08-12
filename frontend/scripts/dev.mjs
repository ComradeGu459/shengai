import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = resolve(frontendRoot, 'index.html');
const port = Number(process.env.PORT ?? 3000);

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  if (request.method !== 'GET' || !['/', '/index.html'].includes(url.pathname)) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('资源不存在');
    return;
  }

  response.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  });
  createReadStream(indexPath).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`前端骨架已启动：http://localhost:${port}`);
});
