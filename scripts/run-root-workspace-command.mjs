import { spawnSync } from 'node:child_process';

const commandName = process.argv[2];

const shouldSkipRootDuringRecursiveRun =
  process.env.npm_package_name === '@tang/monorepo-root' &&
  process.env.npm_config_recursive === 'true' &&
  process.env.npm_config_workspace_root === 'true';

if (shouldSkipRootDuringRecursiveRun) {
  console.log(`[root-skip] Skipping root ${commandName} during recursive pnpm selection.`);
  process.exit(0);
}

const commandSteps = {
  build: [
    ['pnpm', ['--dir', 'packages/shared', 'build']],
    ['pnpm', ['--dir', 'apps/web', 'build']],
    ['pnpm', ['--dir', 'apps/server', 'build']],
    ['pnpm', ['--dir', 'apps/admin', 'build']],
  ],
  typecheck: [
    ['pnpm', ['--dir', 'packages/shared', 'typecheck']],
    ['pnpm', ['--dir', 'apps/web', 'typecheck']],
    ['pnpm', ['--dir', 'apps/server', 'typecheck']],
    ['pnpm', ['--dir', 'apps/admin', 'typecheck']],
  ],
  test: [['vitest', ['run', '--passWithNoTests']]],
};

const steps = commandSteps[commandName];

if (!steps) {
  console.error(`Unsupported root workspace command: ${commandName}`);
  process.exit(1);
}

for (const [command, args] of steps) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
