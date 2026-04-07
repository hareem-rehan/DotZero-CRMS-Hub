import './config/env'; // Validate env vars first — crashes if missing
import { createApp } from './app';
import { logger } from './config/logger';
import { env } from './config/env';

const app = createApp();
const port = parseInt(env.PORT, 10);

app.listen(port, () => {
  logger.info(`DotZero CR Portal server running on port ${port} [${env.NODE_ENV}]`);
});
