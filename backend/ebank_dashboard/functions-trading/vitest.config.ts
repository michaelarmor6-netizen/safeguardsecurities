import { defineConfig } from 'vitest/config';

// Without this, Vitest walks up and picks up the app's config at the repo
// root, whose `include` only matches tests/ - and these tests silently stop
// running. Money math must never go quiet.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    root: __dirname,
  },
});
