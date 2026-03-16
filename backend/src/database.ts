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

function readEnvWithDevDefault(name: string, fallback: string): string {
  const value = process.env[name];
  if (value && value.length > 0) return value;
  if (process.env.NODE_ENV === 'production') {
    return readRequiredEnv(name);
  }
  return fallback;
}

function buildPoolConfig(): ConstructorParameters<typeof Pool>[0] {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };
  }

  const usingDevFallbacks =
    process.env.NODE_ENV !== 'production'
    && (!process.env.DB_USER || !process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_PORT);

  if (usingDevFallbacks) {
    console.warn(
      'Database env vars missing. Using development defaults ' +
      '(DB_USER=postgres DB_PASSWORD=postgres DB_HOST=127.0.0.1 DB_NAME=metamech_studio DB_PORT=5432).'
    );
  }

  return {
    user: readEnvWithDevDefault('DB_USER', 'postgres'),
    host: readEnvWithDevDefault('DB_HOST', '127.0.0.1'),
    database: readEnvWithDevDefault('DB_NAME', 'metamech_studio'),
    password: process.env.DB_PASSWORD ?? (process.env.NODE_ENV === 'production' ? readRequiredEnv('DB_PASSWORD') : 'postgres'),
    port: Number(readEnvWithDevDefault('DB_PORT', '5432')),
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