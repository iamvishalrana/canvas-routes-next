import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Only this project's own *.test.js files — the default glob also
    // matched tests/health.spec.js (a Playwright spec, incompatible with
    // Vitest's test() runner) and any stray agent-worktree copies of it.
    include: ['lib/**/*.test.js'],
  },
})
