// 启动 Vite 开发服务器并记录详细诊断日志
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const SERVER_ENDPOINT = 'http://127.0.0.1:7244/ingest/99dbafae-a66d-45a6-82ab-975b44cc18a0';

function log(data) {
  const payload = {
    sessionId: 'debug-session',
    runId: 'vite-start-diagnostics',
    hypothesisId: data.hypothesisId || 'general',
    location: 'start-vite-with-diagnostics.mjs',
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

async function checkPortAfterDelay(port, delay = 3000) {
  return new Promise((resolve) => {
    setTimeout(async () => {
      const req = http.request({
        hostname: 'localhost',
        port: port,
        path: '/',
        method: 'GET',
        timeout: 2000
      }, (res) => {
        resolve({ success: true, statusCode: res.statusCode, port });
      });
      
      req.on('error', () => {
        resolve({ success: false, port });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, port, error: 'timeout' });
      });
      
      req.end();
    }, delay);
  });
}

log({ 
  hypothesisId: 'START',
  message: '准备启动 Vite 开发服务器',
  data: { projectRoot, nodeVersion: process.version }
});

const viteProcess = spawn('npm', ['run', 'dev'], {
  cwd: projectRoot,
  shell: true,
  stdio: ['inherit', 'pipe', 'pipe']
});

let stdoutBuffer = '';
let stderrBuffer = '';

viteProcess.stdout.on('data', (data) => {
  const text = data.toString();
  stdoutBuffer += text;
  process.stdout.write(text);
  
  // #region agent log
  // 检测 Vite 启动成功的关键信息
  if (text.includes('Local:') || text.includes('localhost:') || text.includes('http://')) {
    // 提取完整的URL信息
    const urlMatch = text.match(/http[s]?:\/\/[^\s]+/g);
    const localMatch = text.match(/Local:\s*(http[s]?:\/\/[^\s]+)/);
    const networkMatch = text.match(/Network:\s*(http[s]?:\/\/[^\s]+)/);
    
    log({
      hypothesisId: 'A',
      message: '检测到 Vite 服务器URL信息',
      data: { 
        output: text.trim(),
        urls: urlMatch || [],
        localUrl: localMatch ? localMatch[1] : null,
        networkUrl: networkMatch ? networkMatch[1] : null
      }
    });
  }
  if (text.includes('ready')) {
    log({
      hypothesisId: 'A',
      message: 'Vite 服务器就绪',
      data: { output: text.trim() }
    });
  }
  // 捕获所有包含端口号的行
  if (text.match(/:\d{4,5}/)) {
    log({
      hypothesisId: 'A',
      message: '检测到端口信息',
      data: { output: text.trim() }
    });
  }
  // #endregion
});

viteProcess.stderr.on('data', (data) => {
  const text = data.toString();
  stderrBuffer += text;
  process.stderr.write(text);
  
  // #region agent log
  log({
    hypothesisId: 'B',
    message: 'Vite 错误输出',
    data: { error: text.trim() }
  });
  // #endregion
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
    hypothesisId: 'B',
    message: 'Vite 进程退出',
    data: { code, signal, stdout: stdoutBuffer.substring(0, 1000), stderr: stderrBuffer.substring(0, 1000) }
  });
  
  if (code !== 0 && code !== null) {
    process.exit(code);
  }
});

// #region agent log
// 延迟检查端口，给 Vite 时间启动
setTimeout(async () => {
  log({
    hypothesisId: 'C',
    message: '开始检查常见端口 (5173-5180)',
    data: { stdoutPreview: stdoutBuffer.substring(0, 500) }
  });
  
  // 从stdout中提取实际监听的端口
  const portMatches = stdoutBuffer.match(/localhost:(\d{4,5})|:\/\/[^:]+:(\d{4,5})/g);
  if (portMatches) {
    log({
      hypothesisId: 'C',
      message: '从Vite输出中提取的端口信息',
      data: { portMatches }
    });
  }
  
  for (let port = 5173; port <= 5180; port++) {
    const check = await checkPortAfterDelay(port, 1000);
    if (check.success) {
      log({
        hypothesisId: 'C',
        message: `确认服务器运行在端口 ${port}`,
        data: { port, statusCode: check.statusCode }
      });
    } else {
      log({
        hypothesisId: 'C',
        message: `端口 ${port} 无法连接`,
        data: { port, error: check.error }
      });
    }
  }
}, 5000);
// #endregion
