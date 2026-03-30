/**
 * Dev-only helper: writes school JSON files under public/data/.
 * Browsers cannot write to the project disk; run alongside `ng serve`.
 *
 *   npm run data-api
 */

import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DEPT_FILE = path.join(ROOT, 'public', 'data', 'departments.json');
const STAFF_FILE = path.join(ROOT, 'public', 'data', 'staff.json');
const STUDENTS_FILE = path.join(ROOT, 'public', 'data', 'students.json');
const TERM_FEES_FILE = path.join(ROOT, 'public', 'data', 'term-fees.json');
const DAILY_FEEDING_FILE = path.join(ROOT, 'public', 'data', 'daily-feeding.json');
const FEES_FILE = path.join(ROOT, 'public', 'data', 'fees.json');
const FEES_USAGE_FILE = path.join(ROOT, 'public', 'data', 'fees-usage.json');

const PORT = Number(process.env.SCHOOL_DATA_API_PORT || 4310);

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
  });
  res.end(data);
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url.startsWith('/api/departments')) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const json = JSON.parse(body);
        if (!Array.isArray(json)) {
          sendJson(res, 400, { error: 'Body must be a JSON array of departments' });
          return;
        }
        fs.mkdirSync(path.dirname(DEPT_FILE), { recursive: true });
        fs.writeFileSync(DEPT_FILE, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
        sendJson(res, 200, { ok: true });
      } catch (e) {
        sendJson(res, 500, { error: String(e) });
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url.startsWith('/api/staff')) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const json = JSON.parse(body);
        if (!Array.isArray(json)) {
          sendJson(res, 400, { error: 'Body must be a JSON array of staff' });
          return;
        }
        fs.mkdirSync(path.dirname(STAFF_FILE), { recursive: true });
        fs.writeFileSync(STAFF_FILE, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
        sendJson(res, 200, { ok: true });
      } catch (e) {
        sendJson(res, 500, { error: String(e) });
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url.startsWith('/api/students')) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const json = JSON.parse(body);
        if (!Array.isArray(json)) {
          sendJson(res, 400, { error: 'Body must be a JSON array of students' });
          return;
        }
        fs.mkdirSync(path.dirname(STUDENTS_FILE), { recursive: true });
        fs.writeFileSync(STUDENTS_FILE, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
        sendJson(res, 200, { ok: true });
      } catch (e) {
        sendJson(res, 500, { error: String(e) });
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url.startsWith('/api/term-fees')) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const json = JSON.parse(body);
        if (!json || typeof json !== 'object' || Array.isArray(json)) {
          sendJson(res, 400, { error: 'Body must be a JSON object (term fees summary)' });
          return;
        }
        fs.mkdirSync(path.dirname(TERM_FEES_FILE), { recursive: true });
        fs.writeFileSync(TERM_FEES_FILE, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
        sendJson(res, 200, { ok: true });
      } catch (e) {
        sendJson(res, 500, { error: String(e) });
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url.startsWith('/api/daily-feeding')) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const json = JSON.parse(body);
        if (!json || typeof json !== 'object' || Array.isArray(json)) {
          sendJson(res, 400, { error: 'Body must be a JSON object (daily feeding summary)' });
          return;
        }
        fs.mkdirSync(path.dirname(DAILY_FEEDING_FILE), { recursive: true });
        fs.writeFileSync(DAILY_FEEDING_FILE, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
        sendJson(res, 200, { ok: true });
      } catch (e) {
        sendJson(res, 500, { error: String(e) });
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url.startsWith('/api/fees')) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const json = JSON.parse(body);
        if (!Array.isArray(json)) {
          sendJson(res, 400, { error: 'Body must be a JSON array of fee records' });
          return;
        }
        fs.mkdirSync(path.dirname(FEES_FILE), { recursive: true });
        fs.writeFileSync(FEES_FILE, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
        sendJson(res, 200, { ok: true });
      } catch (e) {
        sendJson(res, 500, { error: String(e) });
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url.startsWith('/api/fees-usage')) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const json = JSON.parse(body);
        if (!Array.isArray(json)) {
          sendJson(res, 400, { error: 'Body must be a JSON array of fee usage records' });
          return;
        }
        fs.mkdirSync(path.dirname(FEES_USAGE_FILE), { recursive: true });
        fs.writeFileSync(FEES_USAGE_FILE, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
        sendJson(res, 200, { ok: true });
      } catch (e) {
        sendJson(res, 500, { error: String(e) });
      }
    });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`School data API listening on http://localhost:${PORT}`);
  console.log(`  POST /api/departments → ${DEPT_FILE}`);
  console.log(`  POST /api/staff → ${STAFF_FILE}`);
  console.log(`  POST /api/students → ${STUDENTS_FILE}`);
  console.log(`  POST /api/term-fees → ${TERM_FEES_FILE}`);
  console.log(`  POST /api/daily-feeding → ${DAILY_FEEDING_FILE}`);
  console.log(`  POST /api/fees → ${FEES_FILE}`);
  console.log(`  POST /api/fees-usage → ${FEES_USAGE_FILE}`);
});
