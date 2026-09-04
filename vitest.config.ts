import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/**/*.test.ts',
      'contract/src/**/*.test.ts',
      'frontend/src/**/*.test.ts',
      'indexer/src/**/*.test.ts'
    ],
  },
});
