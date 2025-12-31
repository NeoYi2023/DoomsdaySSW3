// 停止所有运行中的 Vite/Node 开发服务器进程
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const SERVER_ENDPOINT = 'http://127.0.0.1:7244/ingest/99dbafae-a66d-45a6-82ab-975b44cc18a0';

function log(data) {
  const payload = {
    sessionId: 'debug-session',
    runId: 'stop-vite',
    hypothesisId: data.hypothesisId || 'general',
    location: 'stop-all-vite.mjs',
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

async function main() {
  log({ 
    hypothesisId: 'CLEANUP',
    message: '开始停止所有 Vite 进程',
    data: {}
  });

  try {
    // Windows: 查找占用5173-5180端口的进程
    for (let port = 5173; port <= 5180; port++) {
      try {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        if (stdout) {
          const lines = stdout.split('\n').filter(line => line.trim());
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && !isNaN(pid)) {
              log({
                hypothesisId: 'CLEANUP',
                message: `发现占用端口 ${port} 的进程`,
                data: { port, pid, line: line.trim() }
              });
              
              try {
                await execAsync(`taskkill /F /PID ${pid}`);
                log({
                  hypothesisId: 'CLEANUP',
                  message: `已终止进程 ${pid}`,
                  data: { pid, port }
                });
              } catch (err) {
                log({
                  hypothesisId: 'CLEANUP',
                  message: `终止进程失败`,
                  data: { pid, error: err.message }
                });
              }
            }
          }
        }
      } catch (err) {
        // 端口未被占用，继续
      }
    }

    // 也尝试停止所有 node.exe 进程（更激进的方法，可选）
    log({
      hypothesisId: 'CLEANUP',
      message: '检查是否还有其他 Node 进程',
      data: {}
    });
    
    try {
      const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV');
      const nodeProcesses = stdout.split('\n').filter(line => line.includes('node.exe'));
      if (nodeProcesses.length > 1) { // 排除当前脚本进程
        log({
          hypothesisId: 'CLEANUP',
          message: '发现其他 Node 进程',
          data: { count: nodeProcesses.length - 1 }
        });
      }
    } catch (err) {
      // 忽略错误
    }

    log({ 
      hypothesisId: 'CLEANUP',
      message: '清理完成',
      data: {}
    });
  } catch (err) {
    log({
      hypothesisId: 'ERROR',
      message: '清理过程出错',
      data: { error: err.message }
    });
  }
}

main().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
