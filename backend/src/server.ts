import { pathToFileURL } from 'node:url';

import { createApp } from './app.js';

export const startServer = async ({ port = Number(process.env.PORT ?? 3001) } = {}) => {
  const app = createApp();
  await app.listen({ port, host: '127.0.0.1' });
  return app;
};

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entryUrl) {
  await startServer();
}
