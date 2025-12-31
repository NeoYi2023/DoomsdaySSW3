import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const SERVER_ENDPOINT = 'http://127.0.0.1:7244/ingest/99dbafae-a66d-45a6-82ab-975b44cc18a0';

function log(data: any) {
  const payload = {
    sessionId: 'debug-session',
    runId: 'vite-config',
    hypothesisId: data.hypothesisId || 'general',
    location: 'vite.config.ts',
    message: data.message,
    data: data.data || {},
    timestamp: Date.now()
  };
  
  fetch(SERVER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => {});
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    host: true,
    strictPort: true, // 如果5175被占用，报错而不是自动尝试其他端口
    open: false, // 不自动打开浏览器
    // #region agent log
    onListening(server) {
      const address = server.address();
      if (address && typeof address === 'object') {
        log({
          hypothesisId: 'A',
          message: 'Vite 服务器已启动',
          data: {
            port: address.port,
            address: address.address,
            family: address.family
          }
        });
      }
    },
    // #endregion
  },
  // #region agent log
  logLevel: 'info',
  // #endregion
});
