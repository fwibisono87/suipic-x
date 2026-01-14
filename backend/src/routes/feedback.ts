import { Elysia, t } from 'elysia';
import { db, schema } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { EFlagType } from '../types';
import { authMiddleware } from '../middleware/auth';

export const feedbackRoutes = new Elysia({ prefix: '/images' })
  .use(authMiddleware)
  // Set rating (upsert)
  .post('/:id/rating', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    // Validate rating
    if (body.rating < 1 || body.rating > 5) {
      set.status = 400;
      return { error: 'Rating must be between 1 and 5' };
    }

    // Check image exists and user has access
    const image = await db.query.images.findFirst({
      where: eq(schema.images.id, params.id),
      with: {
        album: {
          with: {
            collaborators: true,
            clients: true,
          },
        },
      },
    });

    if (!image) {
      set.status = 404;
      return { error: 'Image not found' };
    }

    // Check access
    const hasAccess =
      image.album.ownerId === user.id ||
      image.album.collaborators.some((c) => c.photographerId === user.id) ||
      image.album.clients.some((c) => c.clientId === user.id);

    if (!hasAccess) {
      set.status = 403;
      return { error: 'Forbidden' };
    }

    // Upsert rating
    const existing = await db.query.ratings.findFirst({
      where: and(
        eq(schema.ratings.imageId, params.id),
        eq(schema.ratings.userId, user.id)
      ),
    });

    let rating;
    if (existing) {
      [rating] = await db.update(schema.ratings)
        .set({
          rating: body.rating,
          updatedAt: new Date(),
        })
        .where(eq(schema.ratings.id, existing.id))
        .returning();
    } else {
      [rating] = await db.insert(schema.ratings).values({
        imageId: params.id,
        userId: user.id,
        rating: body.rating,
      }).returning();
    }

    return {
      success: true,
      data: rating,
    };
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    body: t.Object({
      rating: t.Number({ minimum: 1, maximum: 5 }),
    }),
    detail: {
      tags: ['Feedback'],
      summary: 'Set image rating',
      description: 'Upserts rating (1-5) for the current user',
    },
  })
  // Get my rating
  .get('/:id/rating', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const rating = await db.query.ratings.findFirst({
      where: and(
        eq(schema.ratings.imageId, params.id),
        eq(schema.ratings.userId, user.id)
      ),
    });

    return {
      success: true,
      data: rating || null,
    };
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    detail: {
      tags: ['Feedback'],
      summary: 'Get my rating for image',
    },
  })
  // Delete my rating
  .delete('/:id/rating', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    await db.delete(schema.ratings)
      .where(and(
        eq(schema.ratings.imageId, params.id),
        eq(schema.ratings.userId, user.id)
      ));

    return {
      success: true,
      message: 'Rating removed',
    };
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    detail: {
      tags: ['Feedback'],
      summary: 'Remove my rating',
    },
  })
  // Set flag (upsert)
  .post('/:id/flag', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    // Check image exists and user has access
    const image = await db.query.images.findFirst({
      where: eq(schema.images.id, params.id),
      with: {
        album: {
          with: {
            collaborators: true,
            clients: true,
          },
        },
      },
    });

    if (!image) {
      set.status = 404;
      return { error: 'Image not found' };
    }

    // Check access
    const hasAccess =
      image.album.ownerId === user.id ||
      image.album.collaborators.some((c) => c.photographerId === user.id) ||
      image.album.clients.some((c) => c.clientId === user.id);

    if (!hasAccess) {
      set.status = 403;
      return { error: 'Forbidden' };
    }

    // Upsert flag
    const existing = await db.query.flags.findFirst({
      where: and(
        eq(schema.flags.imageId, params.id),
        eq(schema.flags.userId, user.id)
      ),
    });

    let flag;
    if (existing) {
      [flag] = await db.update(schema.flags)
        .set({
          flagType: body.flagType,
          updatedAt: new Date(),
        })
        .where(eq(schema.flags.id, existing.id))
        .returning();
    } else {
      [flag] = await db.insert(schema.flags).values({
        imageId: params.id,
        userId: user.id,
        flagType: body.flagType,
      }).returning();
    }

    return {
      success: true,
      data: flag,
    };
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    body: t.Object({
      flagType: t.Enum(EFlagType),
    }),
    detail: {
      tags: ['Feedback'],
      summary: 'Set image flag',
      description: 'Upserts flag (pick/reject/none) for the current user',
    },
  })
  // Get my flag
  .get('/:id/flag', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const flag = await db.query.flags.findFirst({
      where: and(
        eq(schema.flags.imageId, params.id),
        eq(schema.flags.userId, user.id)
      ),
    });

    return {
      success: true,
      data: flag || null,
    };
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    detail: {
      tags: ['Feedback'],
      summary: 'Get my flag for image',
    },
  })
  // Get comments
  .get('/:id/comments', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    // Check image exists and user has access
    const image = await db.query.images.findFirst({
      where: eq(schema.images.id, params.id),
      with: {
        album: {
          with: {
            collaborators: true,
            clients: true,
          },
        },
      },
    });

    if (!image) {
      set.status = 404;
      return { error: 'Image not found' };
    }

    // Check access
    const hasAccess =
      image.album.ownerId === user.id ||
      image.album.collaborators.some((c) => c.photographerId === user.id) ||
      image.album.clients.some((c) => c.clientId === user.id);

    if (!hasAccess) {
      set.status = 403;
      return { error: 'Forbidden' };
    }

    const comments = await db.query.comments.findMany({
      where: eq(schema.comments.imageId, params.id),
      with: {
        user: true,
        replies: {
          with: {
            user: true,
          },
        },
      },
      orderBy: desc(schema.comments.createdAt),
    });

    // Build threaded structure (top-level only, with nested replies)
    const topLevel = comments.filter((c) => c.parentId === null);

    return {
      success: true,
      data: topLevel,
    };
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    detail: {
      tags: ['Feedback'],
      summary: 'Get comment thread',
    },
  })
  // Add comment
  .post('/:id/comments', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    // Check image exists and user has access
    const image = await db.query.images.findFirst({
      where: eq(schema.images.id, params.id),
      with: {
        album: {
          with: {
            collaborators: true,
            clients: true,
          },
        },
      },
    });

    if (!image) {
      set.status = 404;
      return { error: 'Image not found' };
    }

    // Check access
    const hasAccess =
      image.album.ownerId === user.id ||
      image.album.collaborators.some((c) => c.photographerId === user.id) ||
      image.album.clients.some((c) => c.clientId === user.id);

    if (!hasAccess) {
      set.status = 403;
      return { error: 'Forbidden' };
    }

    // If replying, verify parent exists
    if (body.parentId) {
      const parent = await db.query.comments.findFirst({
        where: and(
          eq(schema.comments.id, body.parentId),
          eq(schema.comments.imageId, params.id)
        ),
      });

      if (!parent) {
        set.status = 400;
        return { error: 'Parent comment not found' };
      }
    }

    const [comment] = await db.insert(schema.comments).values({
      imageId: params.id,
      userId: user.id,
      parentId: body.parentId || null,
      content: body.content,
    }).returning();

    // Fetch with user data
    const fullComment = await db.query.comments.findFirst({
      where: eq(schema.comments.id, comment.id),
      with: { user: true },
    });

    set.status = 201;
    return {
      success: true,
      data: fullComment,
    };
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    body: t.Object({
      content: t.String({ minLength: 1 }),
      parentId: t.Optional(t.String({ format: 'uuid' })),
    }),
    detail: {
      tags: ['Feedback'],
      summary: 'Add comment',
    },
  })
  // Delete comment (own comments only)
  .delete('/:imageId/comments/:commentId', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const comment = await db.query.comments.findFirst({
      where: eq(schema.comments.id, params.commentId),
    });

    if (!comment) {
      set.status = 404;
      return { error: 'Comment not found' };
    }

    if (comment.userId !== user.id) {
      set.status = 403;
      return { error: 'Can only delete own comments' };
    }

    await db.delete(schema.comments).where(eq(schema.comments.id, params.commentId));

    return {
      success: true,
      message: 'Comment deleted',
    };
  }, {
    params: t.Object({
      imageId: t.String({ format: 'uuid' }),
      commentId: t.String({ format: 'uuid' }),
    }),
    detail: {
      tags: ['Feedback'],
      summary: 'Delete comment',
      description: 'Own comments only',
    },
  });
