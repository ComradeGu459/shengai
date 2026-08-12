import { createServer as createNodeServer } from 'node:http';
import { pathToFileURL } from 'node:url';

const sendJson = (response, statusCode, body) => {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(body));
};

export const createServer = () =>
  createNodeServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');

    if (request.method === 'GET' && url.pathname === '/health') {
      sendJson(response, 200, {
        service: 'qimao-terms-cloud-backend',
        status: 'ok',
        milestone: 'skeleton',
      });
      return;
    }

    sendJson(response, 404, {
      code: 'NOT_FOUND',
      message: '资源不存在',
    });
  });

export const startServer = ({ port = Number(process.env.PORT ?? 3001) } = {}) => {
  const server = createServer();
  server.listen(port, '127.0.0.1', () => {
    const address = server.address();
    const activePort = typeof address === 'object' && address ? address.port : port;
    console.log(`后端骨架已启动：http://localhost:${activePort}`);
  });
  return server;
};

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entryUrl) {
  startServer();
}
