/**
 * Ensures the dev data API (scripts/school-data-api.mjs) is running.
 *
 * Used by npm scripts so commands like `npm run build` can run while the UI is
 * being served, without the user manually starting the data API.
 *
 * If the API is already listening, this script does nothing.
 * If not, it starts the API in detached mode and exits immediately.
 */

import net from 'net';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const PORT = Number(process.env.SCHOOL_DATA_API_PORT || 4310);
const HOST = process.env.SCHOOL_DATA_API_HOST || '127.0.0.1';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_SCRIPT = path.join(__dirname, 'school-data-api.mjs');

function canConnectToApi() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: HOST, port: PORT }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.setTimeout(700, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const running = await canConnectToApi();
  if (running) return;

  const child = spawn(process.execPath, [API_SCRIPT], {
    detached: true,
    stdio: 'ignore',
    env: process.env,
  });

  child.unref();
  // eslint-disable-next-line no-console
  console.log(`[data-api] Started (detached) on http://${HOST}:${PORT} (pid ${child.pid}).`);
}

await main();

