import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createMigrationClient } from './index';

const runMigrations = async () => {
  console.log('Running migrations...');
  
  const db = createMigrationClient();
  
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  
  console.log('Migrations completed successfully!');
  process.exit(0);
};

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
