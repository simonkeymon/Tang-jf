# Issues

- None currently blocking the testing scaffold; potential issues to watch:
  - Vitest resolution with monorepo path aliases in CI may require additional config tweaks.
  - Running per-package tests via pnpm filter relies on tests being located under each package's src tree.
