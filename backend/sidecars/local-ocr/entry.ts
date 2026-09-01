import { createLocalOcrSidecarFromEnv } from './sidecar.js';
import { pathToFileURL } from 'node:url';

const main = async () => {
  const sidecar = createLocalOcrSidecarFromEnv();
  if (!sidecar) {
    process.stderr.write('{"error":"LOCAL_OCR_SIDECAR_DISABLED"}\n');
    process.exitCode = 2;
    return;
  }
  let address: { host: '127.0.0.1'; port: number };
  try {
    address = await sidecar.start();
  } catch {
    await sidecar.stop();
    process.stderr.write('{"error":"LOCAL_OCR_SIDECAR_START_FAILED"}\n');
    process.exitCode = 2;
    return;
  }
  process.stdout.write(`${JSON.stringify({ event: 'listening', host: address.host, port: address.port })}\n`);
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await sidecar.stop();
  };
  process.once('SIGINT', () => { void stop(); });
  process.once('SIGTERM', () => { void stop(); });
};

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entryUrl) {
  await main();
}

export { main };
