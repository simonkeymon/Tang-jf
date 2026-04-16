import type { Config } from 'drizzle-kit';

import { buildConfig } from './src/db/drizzle-config.shared.mjs';

const config: Config = buildConfig();

export default config;
