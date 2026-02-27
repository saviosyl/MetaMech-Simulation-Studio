import { createApp } from './app.js';

// Load environment variables from .env file if present
import dotenv from 'dotenv';
dotenv.config();

const app = createApp();

// Use PORT from environment or default to 3000
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.listen(port, () => {
  console.log(`MetaMech backend listening on http://localhost:${port}`);
});