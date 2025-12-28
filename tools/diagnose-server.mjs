// 简单的诊断脚本
import http from 'http';

const SERVER_ENDPOINT = 'http://127.0.0.1:7242/ingest/5b991fa4-8892-4304-ae7f-509a04cb2697';

function log(data) {
  const payload = {
    sessionId: 'debug-session',
    runId: 'diagnose',
    hypothesisId: data.hypothesisId || 'general',
    location: 'diagnose-server.mjs',
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
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      log({ 
        hypothesisId: 'A',
        message: `端口${port} HTTP响应`,
        data: { port, statusCode: res.statusCode, headers: res.headers }
      });
      resolve({ success: true, port, statusCode: res.statusCode });
    });
    
    req.on('error', (err) => {
      log({ 
        hypothesisId: 'A',
        message: `端口${port}连接失败`,
        data: { port, error: err.code || err.message }
      });
      resolve({ success: false, port, error: err.code || err.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      log({ 
        hypothesisId: 'A',
        message: `端口${port}连接超时`,
        data: { port }
      });
      resolve({ success: false, port, error: 'timeout' });
    });
    
    req.end();
  });
}

async function main() {
  log({ 
    hypothesisId: 'START',
    message: '开始诊断',
    data: {}
  });

  // 检查5173端口
  const result5173 = await checkPort(5173);
  
  // 检查其他可能的端口
  for (let port = 5174; port <= 5180; port++) {
    await checkPort(port);
  }

  log({ 
    hypothesisId: 'END',
    message: '诊断完成',
    data: { mainPortResult: result5173 }
  });
}

main().catch(err => {
  log({ 
    hypothesisId: 'ERROR',
    message: '诊断脚本错误',
    data: { error: err.message }
  });
});

