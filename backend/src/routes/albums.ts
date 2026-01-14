import { Elysia, t } from 'elysia';
import { db, schema } from '../db';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { EUserRole, EDisplayMode } from '../types';
import { authMiddleware } from '../middleware/auth';

export const albumRoutes = new Elysia({ prefix: '/albums' })
  .use(authMiddleware)
  // List accessible albums
  .get('/', async ({ user, query, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const { page = '1', limit = '20' } = query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get albums user has access to
    const albums = await db.query.albums.findMany({
      where: user.role === EUserRole.ADMIN
        ? undefined
        : or(
            eq(schema.albums.ownerId, user.id),
            sql`EXISTS (SELECT 1 FROM album_collaborators WHERE album_id = ${schema.albums.id} AND photographer_id = ${user.id})`,
            sql`EXISTS (SELECT 1 FROM album_clients WHERE album_id = ${schema.albums.id} AND client_id = ${user.id})`
          ),
      with: {
        owner: true,
      },
      limit: parseInt(limit),
      offset,
      orderBy: desc(schema.albums.createdAt),
    });

    // Get image counts
    const albumsWithCounts = await Promise.all(
      albums.map(async (album) => {
        const imageCountResult = await db.select({ count: sql<number>`count(*)::int` })
          .from(schema.images)
          .where(eq(schema.images.albumId, album.id));
        
        return {
          ...album,
          imageCount: imageCountResult[0]?.count || 0,
        };
      })
    );

    return {
      success: true,
      data: albumsWithCounts,
    };
  }, {
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Albums'],
      summary: 'List accessible albums',
    },
  })
  // Create album (photographers only)
  .post('/', async ({ user, body, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    if (user.role === EUserRole.CLIENT) {
      set.status = 403;
      return { error: 'Clients cannot create albums' };
    }

    const [album] = await db.insert(schema.albums).values({
      name: body.name,
      description: body.description,
      ownerId: user.id,
      displayMode: body.displayMode || EDisplayMode.GRID,
    }).returning();

    set.status = 201;
    return {
      success: true,
      data: album,
    };
  }, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 255 }),
      description: t.Optional(t.String()),
      displayMode: t.Optional(t.Enum(EDisplayMode)),
    }),
    detail: {
      tags: ['Albums'],
      summary: 'Create album',
      description: 'Photographers and admins only',
    },
  })
  // Get album with images
  .get('/:id', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const album = await db.query.albums.findFirst({
      where: eq(schema.albums.id, params.id),
      with: {
        owner: true,
        collaborators: {
          with: {
            photographer: true,
          },
        },
        clients: {
          with: {
            client: true,
          },
        },
        images: {
          with: {
            photographer: true,
          },
          orderBy: desc(schema.images.createdAt),
        },
      },
    });

    if (!album) {
      set.status = 404;
      return { error: 'Album not found' };
    }

    // Check access
    const hasAccess =
      user.role === EUserRole.ADMIN ||
      album.ownerId === user.id ||
      album.collaborators.some((c) => c.photographerId === user.id) ||
      album.clients.some((c) => c.clientId === user.id);

    if (!hasAccess) {
      set.status = 403;
      return { error: 'Forbidden' };
    }

    return {
      success: true,
      data: album,
    };
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    detail: {
      tags: ['Albums'],
      summary: 'Get album with images',
    },
  })
  // Update album (owner only)
  .patch('/:id', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const album = await db.query.albums.findFirst({
      where: eq(schema.albums.id, params.id),
    });

    if (!album) {
      set.status = 404;
      return { error: 'Album not found' };
    }

    if (album.ownerId !== user.id && user.role !== EUserRole.ADMIN) {
      set.status = 403;
      return { error: 'Only album owner can update' };
    }

    const [updated] = await db.update(schema.albums)
      .set({
        name: body.name ?? album.name,
        description: body.description ?? album.description,
        displayMode: body.displayMode ?? album.displayMode,
        updatedAt: new Date(),
      })
      .where(eq(schema.albums.id, params.id))
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
      name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
      description: t.Optional(t.String()),
      displayMode: t.Optional(t.Enum(EDisplayMode)),
    }),
    detail: {
      tags: ['Albums'],
      summary: 'Update album',
      description: 'Owner only',
    },
  })
  // Delete album (owner only)
  .delete('/:id', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const album = await db.query.albums.findFirst({
      where: eq(schema.albums.id, params.id),
    });

    if (!album) {
      set.status = 404;
      return { error: 'Album not found' };
    }

    if (album.ownerId !== user.id && user.role !== EUserRole.ADMIN) {
      set.status = 403;
      return { error: 'Only album owner can delete' };
    }

    await db.delete(schema.albums).where(eq(schema.albums.id, params.id));

    return {
      success: true,
      message: 'Album deleted',
    };
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    detail: {
      tags: ['Albums'],
      summary: 'Delete album',
      description: 'Owner only',
    },
  })
  // Add collaborator (owner only)
  .post('/:id/collaborators', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const album = await db.query.albums.findFirst({
      where: eq(schema.albums.id, params.id),
    });

    if (!album) {
      set.status = 404;
      return { error: 'Album not found' };
    }

    if (album.ownerId !== user.id && user.role !== EUserRole.ADMIN) {
      set.status = 403;
      return { error: 'Only album owner can add collaborators' };
    }

    // Verify photographer exists and is a photographer
    const photographer = await db.query.users.findFirst({
      where: and(
        eq(schema.users.id, body.photographerId),
        eq(schema.users.role, EUserRole.PHOTOGRAPHER)
      ),
    });

    if (!photographer) {
      set.status = 400;
      return { error: 'Photographer not found' };
    }

    // Check if already a collaborator
    const existing = await db.query.albumCollaborators.findFirst({
      where: and(
        eq(schema.albumCollaborators.albumId, params.id),
        eq(schema.albumCollaborators.photographerId, body.photographerId)
      ),
    });

    if (existing) {
      set.status = 409;
      return { error: 'Already a collaborator' };
    }

    await db.insert(schema.albumCollaborators).values({
      albumId: params.id,
      photographerId: body.photographerId,
    });

    set.status = 201;
    return {
      success: true,
      message: 'Collaborator added',
    };
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    body: t.Object({
      photographerId: t.String({ format: 'uuid' }),
    }),
    detail: {
      tags: ['Albums'],
      summary: 'Add collaborator',
      description: 'Owner only',
    },
  })
  // Remove collaborator
  .delete('/:id/collaborators/:photographerId', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const album = await db.query.albums.findFirst({
      where: eq(schema.albums.id, params.id),
    });

    if (!album) {
      set.status = 404;
      return { error: 'Album not found' };
    }

    if (album.ownerId !== user.id && user.role !== EUserRole.ADMIN) {
      set.status = 403;
      return { error: 'Only album owner can remove collaborators' };
    }

    await db.delete(schema.albumCollaborators)
      .where(and(
        eq(schema.albumCollaborators.albumId, params.id),
        eq(schema.albumCollaborators.photographerId, params.photographerId)
      ));

    return {
      success: true,
      message: 'Collaborator removed',
    };
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
      photographerId: t.String({ format: 'uuid' }),
    }),
    detail: {
      tags: ['Albums'],
      summary: 'Remove collaborator',
      description: 'Owner only',
    },
  })
  // Add client (owner or collaborator)
  .post('/:id/clients', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const album = await db.query.albums.findFirst({
      where: eq(schema.albums.id, params.id),
      with: {
        collaborators: true,
      },
    });

    if (!album) {
      set.status = 404;
      return { error: 'Album not found' };
    }

    const isOwner = album.ownerId === user.id;
    const isCollaborator = album.collaborators.some((c) => c.photographerId === user.id);
    const isAdmin = user.role === EUserRole.ADMIN;

    if (!isOwner && !isCollaborator && !isAdmin) {
      set.status = 403;
      return { error: 'Only album owner or collaborators can add clients' };
    }

    // Verify client exists
    const client = await db.query.users.findFirst({
      where: and(
        eq(schema.users.id, body.clientId),
        eq(schema.users.role, EUserRole.CLIENT)
      ),
    });

    if (!client) {
      set.status = 400;
      return { error: 'Client not found' };
    }

    // Check if already a client
    const existing = await db.query.albumClients.findFirst({
      where: and(
        eq(schema.albumClients.albumId, params.id),
        eq(schema.albumClients.clientId, body.clientId)
      ),
    });

    if (existing) {
      set.status = 409;
      return { error: 'Already a client' };
    }

    await db.insert(schema.albumClients).values({
      albumId: params.id,
      clientId: body.clientId,
    });

    set.status = 201;
    return {
      success: true,
      message: 'Client added',
    };
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    body: t.Object({
      clientId: t.String({ format: 'uuid' }),
    }),
    detail: {
      tags: ['Albums'],
      summary: 'Add client',
      description: 'Owner or collaborator',
    },
  })
  // Remove client
  .delete('/:id/clients/:clientId', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const album = await db.query.albums.findFirst({
      where: eq(schema.albums.id, params.id),
      with: {
        collaborators: true,
      },
    });

    if (!album) {
      set.status = 404;
      return { error: 'Album not found' };
    }

    const isOwner = album.ownerId === user.id;
    const isCollaborator = album.collaborators.some((c) => c.photographerId === user.id);
    const isAdmin = user.role === EUserRole.ADMIN;

    if (!isOwner && !isCollaborator && !isAdmin) {
      set.status = 403;
      return { error: 'Only album owner or collaborators can remove clients' };
    }

    await db.delete(schema.albumClients)
      .where(and(
        eq(schema.albumClients.albumId, params.id),
        eq(schema.albumClients.clientId, params.clientId)
      ));

    return {
      success: true,
      message: 'Client removed',
    };
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
      clientId: t.String({ format: 'uuid' }),
    }),
    detail: {
      tags: ['Albums'],
      summary: 'Remove client',
      description: 'Owner or collaborator',
    },
  })
  // Get album summary (ratings, flags aggregated)
  .get('/:id/summary', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    if (user.role === EUserRole.CLIENT) {
      set.status = 403;
      return { error: 'Photographers only' };
    }

    const album = await db.query.albums.findFirst({
      where: eq(schema.albums.id, params.id),
      with: {
        collaborators: true,
        images: {
          with: {
            photographer: true,
            ratings: {
              with: { user: true },
            },
            flags: {
              with: { user: true },
            },
          },
        },
      },
    });

    if (!album) {
      set.status = 404;
      return { error: 'Album not found' };
    }

    // Check access
    const hasAccess =
      user.role === EUserRole.ADMIN ||
      album.ownerId === user.id ||
      album.collaborators.some((c) => c.photographerId === user.id);

    if (!hasAccess) {
      set.status = 403;
      return { error: 'Forbidden' };
    }

    // Build summary
    const summary = album.images.map((image) => {
      const avgRating = image.ratings.length > 0
        ? image.ratings.reduce((sum, r) => sum + r.rating, 0) / image.ratings.length
        : null;

      const picks = image.flags.filter((f) => f.flagType === 'pick').length;
      const rejects = image.flags.filter((f) => f.flagType === 'reject').length;

      return {
        imageId: image.id,
        originalFilename: image.originalFilename,
        photographerName: `${image.photographer.firstName || ''} ${image.photographer.lastName || ''}`.trim(),
        averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        ratingCount: image.ratings.length,
        pickCount: picks,
        rejectCount: rejects,
        ratings: image.ratings.map((r) => ({
          userId: r.userId,
          userName: `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim(),
          rating: r.rating,
        })),
        flags: image.flags.map((f) => ({
          userId: f.userId,
          userName: `${f.user.firstName || ''} ${f.user.lastName || ''}`.trim(),
          flag: f.flagType,
        })),
      };
    });

    return {
      success: true,
      data: {
        albumId: album.id,
        albumName: album.name,
        images: summary,
      },
    };
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    detail: {
      tags: ['Albums'],
      summary: 'Get album summary',
      description: 'Aggregated ratings and flags for all images',
    },
  });
