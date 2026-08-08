import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.test.ts', '**/*.test.js'],
    exclude: ['node_modules', '.netlify'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['netlify/functions/**/*.ts', 'public/js/**/*.js'],
      exclude: ['**/*.test.ts', '**/*.test.js', 'netlify/functions/shared/types.d.ts'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 75,
        statements: 85,
      },
    },
  },
});
