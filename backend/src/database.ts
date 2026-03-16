import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function buildPoolConfig(): ConstructorParameters<typeof Pool>[0] {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };
  }

  return {
    user: readRequiredEnv('DB_USER'),
    host: readRequiredEnv('DB_HOST'),
    database: readRequiredEnv('DB_NAME'),
    password: readRequiredEnv('DB_PASSWORD'),
    port: Number(readRequiredEnv('DB_PORT')),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  };
}

export const pool = new Pool(buildPoolConfig());

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { duration, rows: res.rowCount });
  return res;
}

export async function getClient() {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;
  
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
    console.error(
      `The last executed query on this client was: ${(client as any).lastQuery}`
    );
  }, 5000);
  
  client.query = ((...args: any[]) => {
    (client as any).lastQuery = args;
    return (query as any).apply(client, args);
  }) as typeof client.query;
  
  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release.apply(client);
  };
  
  return client;
}