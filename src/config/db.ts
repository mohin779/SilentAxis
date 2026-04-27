import { Pool } from "pg";
import { env } from "./env";

export const pool = new Pool({
  connectionString: env.databaseUrl,
  connectionTimeoutMillis: 5000,
  query_timeout: 8000,
  statement_timeout: 8000,
  lock_timeout: 3000
});
