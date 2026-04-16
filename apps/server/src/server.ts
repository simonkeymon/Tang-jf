import 'dotenv/config';

import { createApp } from './app.js';
import { runDatabaseMigrations } from './db/connection.js';

const port = Number(process.env.PORT) || 3002;

async function main() {
  await runDatabaseMigrations();
  const app = await createApp();

  app.listen(port, () => {
    console.log(`Tang server listening on port ${port}`);
  });
}

void main();
