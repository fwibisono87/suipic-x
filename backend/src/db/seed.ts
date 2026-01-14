import { db, schema } from './index';
import { eq } from 'drizzle-orm';

const ADMIN_KEYCLOAK_ID = process.env.ADMIN_KEYCLOAK_ID || 'admin-keycloak-id';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@suipic.local';

const seed = async () => {
  console.log('Seeding database...');

  // Check if admin already exists
  const existingAdmin = await db.query.users.findFirst({
    where: eq(schema.users.role, 'admin'),
  });

  if (existingAdmin) {
    console.log('Admin user already exists, skipping seed.');
    process.exit(0);
  }

  // Create admin user
  const [admin] = await db.insert(schema.users).values({
    keycloakId: ADMIN_KEYCLOAK_ID,
    email: ADMIN_EMAIL,
    firstName: 'System',
    lastName: 'Administrator',
    role: 'admin',
    createdById: null,
  }).returning();

  console.log('Created admin user:');
  console.log(`  ID: ${admin.id}`);
  console.log(`  Email: ${admin.email}`);
  console.log(`  Keycloak ID: ${admin.keycloakId}`);
  console.log('');
  console.log('NOTE: Update the Keycloak ID after first login to link accounts.');

  process.exit(0);
};

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
