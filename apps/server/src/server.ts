import 'dotenv/config';

import { createApp } from './app.js';
import { getPersistenceInfo, runDatabaseMigrations } from './db/connection.js';

const port = Number(process.env.PORT) || 3002;

async function main() {
  await runDatabaseMigrations();
  const app = await createApp();
  const persistence = getPersistenceInfo();

  app.listen(port, () => {
    console.log(
      `Tang server listening on port ${port} (${persistence.engine}/${persistence.persistence})`,
    );
  });
}

void main();
