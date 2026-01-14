import { Elysia, t } from 'elysia';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import type { AuthMiddleware } from '../middleware/auth';
import { EUserRole } from '../types';

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post('/sync', async ({ body, set }) => {
    const { keycloakId, email, firstName, lastName, role } = body;

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.keycloakId, keycloakId),
    });

    if (existingUser) {
      // Update user info
      const [updated] = await db.update(schema.users)
        .set({
          email,
          firstName,
          lastName,
        })
        .where(eq(schema.users.keycloakId, keycloakId))
        .returning();

      return {
        success: true,
        data: updated,
        message: 'User synchronized',
      };
    }

    // For new users, only allow creating clients via sync
    // Admin and photographer accounts must be created by authorized users
    if (role !== EUserRole.CLIENT) {
      set.status = 403;
      return {
        success: false,
        error: 'Cannot self-register as admin or photographer',
      };
    }

    // Create new client user
    const [newUser] = await db.insert(schema.users).values({
      keycloakId,
      email,
      firstName,
      lastName,
      role: EUserRole.CLIENT,
    }).returning();

    set.status = 201;
    return {
      success: true,
      data: newUser,
      message: 'User created',
    };
  }, {
    body: t.Object({
      keycloakId: t.String(),
      email: t.String({ format: 'email' }),
      firstName: t.Optional(t.String()),
      lastName: t.Optional(t.String()),
      role: t.Optional(t.Enum(EUserRole)),
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Sync Keycloak user to database',
      description: 'Creates or updates a user record based on Keycloak token data',
    },
  });
