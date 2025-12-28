// 诊断脚本：检查 Vite 开发服务器状态
import { exec } from 'child_process';
import { promisify } from 'util';
import http from 'http';

const execAsync = promisify(exec);
const SERVER_ENDPOINT = 'http://127.0.0.1:7242/ingest/5b991fa4-8892-4304-ae7f-509a04cb2697';

function log(data) {
  const payload = {
    sessionId: 'debug-session',
    runId: 'check-dev-server',
    hypothesisId: data.hypothesisId || 'general',
    location: 'check-dev-server.js',
    message: data.message,
    data: data.data || {},
    timestamp: Date.now()
  };
  
  fetch(SERVER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {});
  
  console.log(`[LOG] ${data.message}`, data.data || '');
}

async function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

async function checkHttpConnection(port) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      resolve({ success: true, statusCode: res.statusCode });
    });
    
    req.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'timeout' });
    });
    
    req.end();
  });
}

async function main() {
  log({ 
    hypothesisId: 'A',
    message: '开始诊断 Vite 开发服务器',
    data: { timestamp: new Date().toISOString() }
  });

  // 假设A: 检查端口5173是否被占用
  log({ 
    hypothesisId: 'A',
    message: '检查端口5173是否可用',
    data: {}
  });
  const port5173Available = await checkPort(5173);
  log({ 
    hypothesisId: 'A',
    message: '端口5173可用性检查结果',
    data: { available: port5173Available }
  });

  // 假设B: 检查HTTP连接
  log({ 
    hypothesisId: 'B',
    message: '尝试连接 localhost:5173',
    data: {}
  });
  const httpCheck = await checkHttpConnection(5173);
  log({ 
    hypothesisId: 'B',
    message: 'HTTP连接检查结果',
    data: httpCheck
  });

  // 假设C: 检查其他常见端口（5174, 5175等）
  for (let port = 5174; port <= 5180; port++) {
    const check = await checkHttpConnection(port);
    if (check.success) {
      log({ 
        hypothesisId: 'C',
        message: `发现服务器运行在端口${port}`,
        data: { port, statusCode: check.statusCode }
      });
    }
  }

  // 假设D: 检查node进程
  try {
    const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV');
    log({ 
      hypothesisId: 'D',
      message: '检查Node.js进程',
      data: { hasNodeProcesses: stdout.includes('node.exe') }
    });
  } catch (err) {
    log({ 
      hypothesisId: 'D',
      message: '检查Node.js进程失败',
      data: { error: err.message }
    });
  }

  // 假设E: 检查npm/node版本
  try {
    const nodeVersion = await execAsync('node --version');
    const npmVersion = await execAsync('npm --version');
    log({ 
      hypothesisId: 'E',
      message: '检查Node.js和npm版本',
      data: { 
        nodeVersion: nodeVersion.stdout.trim(),
        npmVersion: npmVersion.stdout.trim()
      }
    });
  } catch (err) {
    log({ 
      hypothesisId: 'E',
      message: '检查Node.js/npm版本失败',
      data: { error: err.message }
    });
  }

  log({ 
    hypothesisId: 'general',
    message: '诊断完成',
    data: {}
  });
}

main().catch(err => {
  log({ 
    hypothesisId: 'general',
    message: '诊断脚本执行失败',
    data: { error: err.message, stack: err.stack }
  });
});

