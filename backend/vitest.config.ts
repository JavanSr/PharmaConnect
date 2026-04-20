import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['./tests/**/*.test.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    pool: 'forks',
    fileParallelism: false,
    maxConcurrency: 1,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'src/modules/patient-safety/patient-safety.service.ts',
        'src/modules/reports/reports.service.ts',
        'src/jobs/vfd-retry.ts',
      ],
    },
  },
});
