import { defineConfig } from 'vitest/config';

// Rules tests only. They talk to the Firestore emulator, so they run under
// `firebase emulators:exec` (see the test:rules script) rather than on every
// save. The pure money-math suite lives in functions-trading, where the
// functions themselves are.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    // The emulator is shared mutable state; parallel files would clear each
    // other's seed data mid-assertion.
    fileParallelism: false,
  },
});
