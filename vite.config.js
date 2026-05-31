import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  const basePath = process.env.BASE_PATH || '/';

  return {
    base: basePath,
    plugins: [react()],
    server: {
      port: 3000
    }
  };
});
