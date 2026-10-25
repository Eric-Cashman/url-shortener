import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Look for *.test.ts files anywhere under the project.
    include: ['**/*.test.ts'],
    // Each test file runs in a clean environment.
    environment: 'node',
    // Collect coverage so we can see how much of our code is tested.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts'],
    },
  },
});
