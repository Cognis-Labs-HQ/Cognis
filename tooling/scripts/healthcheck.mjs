#!/usr/bin/env node
import { request } from 'node:http';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const host = process.env.HOST ?? '127.0.0.1';

const req = request({
  host,
  port,
  path: '/api/v1/system/health',
  method: 'GET',
  timeout: 4000
}, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on('timeout', () => {
  req.destroy(new Error('request timed out'));
});

req.on('error', () => {
  process.exit(1);
});

req.end();
