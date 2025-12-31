// 诊断脚本：检查为什么 localhost:5175 无法打开
import { exec } from 'child_process';
import { promisify } from 'util';
import http from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const SERVER_ENDPOINT = 'http://127.0.0.1:7244/ingest/99dbafae-a66d-45a6-82ab-975b44cc18a0';
const LOG_PATH = join(projectRoot, '.cursor', 'debug.log');

function log(data) {
  const payload = {
    sessionId: 'debug-session',
    runId: 'diagnose-5175',
    hypothesisId: data.hypothesisId || 'general',
    location: 'diagnose-port-5175.mjs',
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

async function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(port, () => {
      server.close(() => resolve({ available: true }));
    });
    server.on('error', (err) => resolve({ available: false, error: err.message }));
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
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ success: true, statusCode: res.statusCode, headers: res.headers });
      });
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

async function checkNodeProcesses() {
  try {
    const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV');
    const lines = stdout.split('\n').filter(line => line.includes('node.exe'));
    return lines.length > 0;
  } catch (err) {
    log({ hypothesisId: 'A', message: '检查Node进程失败', data: { error: err.message } });
    return false;
  }
}

async function checkViteConfig() {
  try {
    const configPath = join(projectRoot, 'vite.config.ts');
    if (!existsSync(configPath)) {
      return { exists: false };
    }
    const content = readFileSync(configPath, 'utf-8');
    const portMatch = content.match(/port:\s*(\d+)/);
    const hostMatch = content.match(/host:\s*(true|false|['"]\w+['"])/);
    return {
      exists: true,
      port: portMatch ? parseInt(portMatch[1]) : null,
      host: hostMatch ? hostMatch[1] : null,
      content: content.substring(0, 500) // 前500字符
    };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

async function main() {
  log({ 
    hypothesisId: 'START',
    message: '开始诊断 localhost:5175 无法打开的问题',
    data: { projectRoot, timestamp: new Date().toISOString() }
  });

  // 假设A: 检查 Vite 开发服务器是否启动
  log({ 
    hypothesisId: 'A',
    message: '检查是否有 Node.js 进程运行',
    data: {}
  });
  const hasNodeProcesses = await checkNodeProcesses();
  log({ 
    hypothesisId: 'A',
    message: 'Node.js 进程检查结果',
    data: { hasNodeProcesses }
  });

  // 假设B: 检查端口 5175 是否被占用
  log({ 
    hypothesisId: 'B',
    message: '检查端口 5175 是否可用',
    data: {}
  });
  const port5175Check = await checkPort(5175);
  log({ 
    hypothesisId: 'B',
    message: '端口 5175 可用性检查结果',
    data: port5175Check
  });

  // 假设B: 检查端口 5175 的 HTTP 连接
  log({ 
    hypothesisId: 'B',
    message: '尝试 HTTP 连接 localhost:5175',
    data: {}
  });
  const http5175Check = await checkHttpConnection(5175);
  log({ 
    hypothesisId: 'B',
    message: 'HTTP 连接 5175 结果',
    data: http5175Check
  });

  // 假设C: 检查配置的端口 5173
  log({ 
    hypothesisId: 'C',
    message: '检查 Vite 配置文件',
    data: {}
  });
  const viteConfig = await checkViteConfig();
  log({ 
    hypothesisId: 'C',
    message: 'Vite 配置检查结果',
    data: viteConfig
  });

  // 假设C: 检查端口 5173 的 HTTP 连接
  if (viteConfig.port === 5173) {
    log({ 
      hypothesisId: 'C',
      message: '尝试 HTTP 连接 localhost:5173（配置的端口）',
      data: {}
    });
    const http5173Check = await checkHttpConnection(5173);
    log({ 
      hypothesisId: 'C',
      message: 'HTTP 连接 5173 结果',
      data: http5173Check
    });
  }

  // 假设C: 检查其他常见 Vite 端口 (5174-5180)
  log({ 
    hypothesisId: 'C',
    message: '扫描常见 Vite 端口 (5173-5180)',
    data: {}
  });
  for (let port = 5173; port <= 5180; port++) {
    const check = await checkHttpConnection(port);
    if (check.success) {
      log({ 
        hypothesisId: 'C',
        message: `发现服务器运行在端口 ${port}`,
        data: { port, statusCode: check.statusCode }
      });
    }
  }

  // 假设D: 检查 package.json 中的 dev 脚本
  log({ 
    hypothesisId: 'D',
    message: '检查 package.json 配置',
    data: {}
  });
  try {
    const packageJsonPath = join(projectRoot, 'package.json');
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      log({ 
        hypothesisId: 'D',
        message: 'package.json dev 脚本',
        data: { devScript: packageJson.scripts?.dev || 'not found' }
      });
    }
  } catch (err) {
    log({ 
      hypothesisId: 'D',
      message: '读取 package.json 失败',
      data: { error: err.message }
    });
  }

  // 假设E: 检查 node_modules 是否存在
  log({ 
    hypothesisId: 'E',
    message: '检查依赖是否安装',
    data: {}
  });
  const nodeModulesExists = existsSync(join(projectRoot, 'node_modules'));
  const viteExists = existsSync(join(projectRoot, 'node_modules', 'vite'));
  log({ 
    hypothesisId: 'E',
    message: '依赖检查结果',
    data: { nodeModulesExists, viteExists }
  });

  log({ 
    hypothesisId: 'END',
    message: '诊断完成',
    data: {}
  });
}

main().catch(err => {
  log({ 
    hypothesisId: 'ERROR',
    message: '诊断脚本执行失败',
    data: { error: err.message, stack: err.stack }
  });
  process.exit(1);
});
