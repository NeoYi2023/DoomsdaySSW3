import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    strictPort: false, // 如果5173被占用，自动尝试其他端口
    open: false, // 不自动打开浏览器
  },
  // #region agent log
  // 添加启动日志
  logLevel: 'info',
  // #endregion
});
