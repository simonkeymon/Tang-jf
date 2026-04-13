import dotenv from 'dotenv';

import { createApp } from './app.js';

dotenv.config();

const app = createApp();
const port = Number(process.env.PORT) || 3002;

app.listen(port, () => {
  console.log(`Tang server listening on port ${port}`);
});
