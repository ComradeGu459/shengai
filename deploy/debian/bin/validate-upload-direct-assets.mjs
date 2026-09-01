import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const nginx = read('nginx/qimao-upload-direct.conf');
const log = read('nginx/qimao-upload-direct-log.conf');
const service = read('systemd/qimao-upload-direct-acme-renew.service');
const timer = read('systemd/qimao-upload-direct-acme-renew.timer');

const requiredNginx = [
  'listen 18443 ssl http2;',
  'server_name upload.milaidi.online;',
  'https://milaidi.online',
  'location = /api/uploads/tus',
  'location ~ "^/api/uploads/tus/[A-Za-z0-9][A-Za-z0-9._-]{0,127}$"',
  'limit_except OPTIONS POST { deny all; }',
  'limit_except OPTIONS HEAD PATCH { deny all; }',
  'proxy_request_buffering off;',
  'proxy_buffering off;',
  'proxy_read_timeout 1h;',
  'limit_conn qimao_upload_direct_per_ip 4;',
  'location / { return 404; }',
];
for (const expected of requiredNginx) {
  if (!nginx.includes(expected)) throw new Error(`missing nginx directive: ${expected}`);
}
for (const forbidden of ['listen 80', 'Access-Control-Allow-Origin "*"', 'Access-Control-Allow-Headers "*"', 'Access-Control-Expose-Headers "*"', 'Access-Control-Allow-Credentials', 'location ^~ /api/', 'location /api/']) {
  if (nginx.includes(forbidden)) throw new Error(`forbidden nginx directive: ${forbidden}`);
}
if (/location\s+=\s+\/api(?:\s|\{|;|$)/.test(nginx)) throw new Error('forbidden ordinary API exact location');
for (const port of ['3001', '5432', '8080', '8081']) {
  if (new RegExp(`\\blisten\\s+[^;\\n]*\\b${port}\\b`).test(nginx)) {
    throw new Error(`forbidden public listener: ${port}`);
  }
}
const count = (value) => nginx.split(value).length - 1;
const allowHeaders = 'Tus-Resumable,Upload-Length,Upload-Metadata,Upload-Offset,Content-Type,x-qimao-upload-capability';
const exposeHeaders = 'Location,Tus-Resumable,Upload-Offset,Upload-Length,Upload-Metadata';
if (count(`Access-Control-Allow-Headers "${allowHeaders}"`) !== 2) throw new Error('CORS allow-header contract mismatch');
if (count(`Access-Control-Expose-Headers "${exposeHeaders}"`) !== 2) throw new Error('CORS expose-header contract mismatch');
if (count('Access-Control-Allow-Origin "https://milaidi.online"') !== 4) throw new Error('CORS origin must match actual and preflight responses');
if (count('add_header Vary "Origin" always;') !== 4) throw new Error('CORS Vary must match actual and preflight responses');
if (count('proxy_set_header X-Qimao-Upload-Capability $http_x_qimao_upload_capability;') !== 2) throw new Error('capability header must be proxied on both TUS routes');
if (count('proxy_set_header Cookie "";') !== 2 || count('proxy_set_header Authorization "";') !== 2) throw new Error('cookies and Authorization must be cleared');
for (const forbiddenLogValue of ['$request_uri', '$http_cookie', '$http_authorization', '$http_upload_metadata', '$remote_addr']) {
  if (log.includes(forbiddenLogValue)) throw new Error(`sensitive log value: ${forbiddenLogValue}`);
}
for (const expected of ['log_format qimao_upload_direct', 'limit_conn_zone $binary_remote_addr']) {
  if (!log.includes(expected)) throw new Error(`missing log directive: ${expected}`);
}
for (const expected of ['ConditionPathExists=/usr/bin/certbot', 'qimao-upload-direct-acme-reload']) {
  if (!service.includes(expected)) throw new Error(`missing service directive: ${expected}`);
}
if (!timer.includes('Persistent=true')) throw new Error('renewal timer must be persistent');

console.log('upload-direct ingress assets: static checks passed');
