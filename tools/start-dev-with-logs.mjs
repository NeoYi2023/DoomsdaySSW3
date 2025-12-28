// 启动 Vite 开发服务器并记录日志
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const SERVER_ENDPOINT = 'http://127.0.0.1:7242/ingest/5b991fa4-8892-4304-ae7f-509a04cb2697';

function log(data) {
  const payload = {
    sessionId: 'debug-session',
    runId: 'vite-start',
    hypothesisId: data.hypothesisId || 'general',
    location: 'start-dev-with-logs.mjs',
    message: data.message,
    data: data.data || {},
    timestamp: Date.now()
  };
  
  fetch(SERVER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {});
  
  console.log(`[${data.hypothesisId || 'INFO'}] ${data.message}`, data.data || '');
}

log({ 
  hypothesisId: 'START',
  message: '准备启动 Vite 开发服务器',
  data: { projectRoot, nodeVersion: process.version }
});

const viteProcess = spawn('npm', ['run', 'dev'], {
  cwd: projectRoot,
  shell: true,
  stdio: 'inherit'
});

viteProcess.on('spawn', () => {
  log({ 
    hypothesisId: 'A',
    message: 'Vite 进程已启动',
    data: { pid: viteProcess.pid }
  });
});

viteProcess.on('error', (err) => {
  log({ 
    hypothesisId: 'B',
    message: 'Vite 启动失败',
    data: { error: err.message, code: err.code }
  });
  process.exit(1);
});

viteProcess.on('exit', (code, signal) => {
  log({ 
    hypothesisId: 'C',
    message: 'Vite 进程退出',
    data: { code, signal }
  });
  process.exit(code || 0);
});

