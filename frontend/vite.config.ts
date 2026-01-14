import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        '.svelte-kit',
        'src/**/*.d.ts',
        'src/routes/**/+*.ts',
      ],
    },
  },
  server: {
    port: 3000,
  },
});
