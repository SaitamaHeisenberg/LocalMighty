import 'dotenv/config';
import { startServer } from './server.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

startServer(PORT);
