import { Elysia, t } from 'elysia';
import { db, schema } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { EUserRole } from '../types';
import { authMiddleware } from '../middleware/auth';

export const userRoutes = new Elysia({ prefix: '/users' })
  .use(authMiddleware)
  // List users (admin sees all, photographer sees their clients)
  .get('/', async ({ user, query, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const { role, page = '1', limit = '20' } = query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let users;
    
    if (user.role === EUserRole.ADMIN) {
      // Admin can see all users, optionally filtered by role
      users = await db.query.users.findMany({
        where: role ? eq(schema.users.role, role as EUserRole) : undefined,
        limit: parseInt(limit),
        offset,
        orderBy: desc(schema.users.createdAt),
      });
    } else if (user.role === EUserRole.PHOTOGRAPHER) {
      // Photographer can only see clients they created
      users = await db.query.users.findMany({
        where: and(
          eq(schema.users.createdById, user.id),
          eq(schema.users.role, EUserRole.CLIENT)
        ),
        limit: parseInt(limit),
        offset,
        orderBy: desc(schema.users.createdAt),
      });
    } else {
      set.status = 403;
      return { error: 'Forbidden' };
    }

    return {
      success: true,
      data: users,
    };
  }, {
    query: t.Object({
      role: t.Optional(t.Enum(EUserRole)),
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Users'],
      summary: 'List users',
      description: 'Admin sees all users, photographer sees their clients',
    },
  })
  // Create user (admin creates photographers, photographers create clients)
  .post('/', async ({ user, body, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const { email, firstName, lastName, role, keycloakId } = body;

    // Validate permissions
    if (user.role === EUserRole.ADMIN) {
      // Admin can create any role
    } else if (user.role === EUserRole.PHOTOGRAPHER) {
      // Photographer can only create clients
      if (role !== EUserRole.CLIENT) {
        set.status = 403;
        return { error: 'Photographers can only create client accounts' };
      }
    } else {
      set.status = 403;
      return { error: 'Forbidden' };
    }

    // Check if email already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (existingUser) {
      set.status = 409;
      return { error: 'Email already exists' };
    }

    // Create user
    const [newUser] = await db.insert(schema.users).values({
      keycloakId: keycloakId || `pending-${crypto.randomUUID()}`,
      email,
      firstName,
      lastName,
      role,
      createdById: user.id,
    }).returning();

    set.status = 201;
    return {
      success: true,
      data: newUser,
    };
  }, {
    body: t.Object({
      email: t.String({ format: 'email' }),
      firstName: t.Optional(t.String()),
      lastName: t.Optional(t.String()),
      role: t.Enum(EUserRole),
      keycloakId: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Users'],
      summary: 'Create user',
      description: 'Admin creates any user, photographer creates clients',
    },
  })
  // Get user by ID
  .get('/:id', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const targetUser = await db.query.users.findFirst({
      where: eq(schema.users.id, params.id),
    });

    if (!targetUser) {
      set.status = 404;
      return { error: 'User not found' };
    }

    // Users can view themselves, admins can view anyone
    // Photographers can view their created clients
    if (
      user.id !== targetUser.id &&
      user.role !== EUserRole.ADMIN &&
      !(user.role === EUserRole.PHOTOGRAPHER && targetUser.createdById === user.id)
    ) {
      set.status = 403;
      return { error: 'Forbidden' };
    }

    return {
      success: true,
      data: targetUser,
    };
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    detail: {
      tags: ['Users'],
      summary: 'Get user by ID',
    },
  })
  // Update user
  .patch('/:id', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const targetUser = await db.query.users.findFirst({
      where: eq(schema.users.id, params.id),
    });

    if (!targetUser) {
      set.status = 404;
      return { error: 'User not found' };
    }

    // Users can update themselves (except role), admins can update anyone
    const canUpdate = user.id === targetUser.id || user.role === EUserRole.ADMIN;
    if (!canUpdate) {
      set.status = 403;
      return { error: 'Forbidden' };
    }

    // Non-admins cannot change their role
    if (body.role && user.role !== EUserRole.ADMIN) {
      set.status = 403;
      return { error: 'Cannot change own role' };
    }

    const [updated] = await db.update(schema.users)
      .set({
        firstName: body.firstName ?? targetUser.firstName,
        lastName: body.lastName ?? targetUser.lastName,
        role: body.role ?? targetUser.role,
      })
      .where(eq(schema.users.id, params.id))
      .returning();

    return {
      success: true,
      data: updated,
    };
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    body: t.Object({
      firstName: t.Optional(t.String()),
      lastName: t.Optional(t.String()),
      role: t.Optional(t.Enum(EUserRole)),
    }),
    detail: {
      tags: ['Users'],
      summary: 'Update user',
    },
  })
  // Delete user (admin only)
  .delete('/:id', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    if (user.role !== EUserRole.ADMIN) {
      set.status = 403;
      return { error: 'Admin only' };
    }

    // Prevent deleting self
    if (user.id === params.id) {
      set.status = 400;
      return { error: 'Cannot delete yourself' };
    }

    const deleted = await db.delete(schema.users)
      .where(eq(schema.users.id, params.id))
      .returning();

    if (deleted.length === 0) {
      set.status = 404;
      return { error: 'User not found' };
    }

    return {
      success: true,
      message: 'User deleted',
    };
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    detail: {
      tags: ['Users'],
      summary: 'Delete user',
      description: 'Admin only',
    },
  });
