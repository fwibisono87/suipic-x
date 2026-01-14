import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://suipic:suipic_secret@localhost:5432/suipic';

// Connection for queries
const queryClient = postgres(DATABASE_URL);
export const db = drizzle(queryClient, { schema });

// Connection for migrations (with max 1 connection)
export const createMigrationClient = () => {
  const migrationClient = postgres(DATABASE_URL, { max: 1 });
  return drizzle(migrationClient, { schema });
};

export { schema };
