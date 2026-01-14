import { Elysia, t } from 'elysia';
import { db, schema } from '../db';
import { eq, and, sql } from 'drizzle-orm';
import { EUserRole } from '../types';
import { authMiddleware } from '../middleware/auth';
import { processAndUploadImage, getImageUrl, deleteFromS3 } from '../services/image.service';

export const imageRoutes = new Elysia({ prefix: '/images' })
  .use(authMiddleware)
  // Get image details
  .get('/:id', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const image = await db.query.images.findFirst({
      where: eq(schema.images.id, params.id),
      with: {
        photographer: true,
        album: {
          with: {
            collaborators: true,
            clients: true,
          },
        },
        ratings: {
          with: { user: true },
        },
        flags: {
          with: { user: true },
        },
        comments: {
          with: { user: true },
          orderBy: schema.comments.createdAt,
        },
      },
    });

    if (!image) {
      set.status = 404;
      return { error: 'Image not found' };
    }

    // Check access
    const hasAccess =
      user.role === EUserRole.ADMIN ||
      image.album.ownerId === user.id ||
      image.album.collaborators.some((c) => c.photographerId === user.id) ||
      image.album.clients.some((c) => c.clientId === user.id);

    if (!hasAccess) {
      set.status = 403;
      return { error: 'Forbidden' };
    }

    // Get signed URL for image
    const imageUrl = await getImageUrl(image.storageKey, 3600);

    // Calculate aggregates
    const avgRating = image.ratings.length > 0
      ? image.ratings.reduce((sum, r) => sum + r.rating, 0) / image.ratings.length
      : null;

    return {
      success: true,
      data: {
        ...image,
        imageUrl,
        averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        pickCount: image.flags.filter((f) => f.flagType === 'pick').length,
        rejectCount: image.flags.filter((f) => f.flagType === 'reject').length,
      },
    };
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    detail: {
      tags: ['Images'],
      summary: 'Get image details',
    },
  })
  // Update image caption (uploader or album owner)
  .patch('/:id', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const image = await db.query.images.findFirst({
      where: eq(schema.images.id, params.id),
      with: {
        album: true,
      },
    });

    if (!image) {
      set.status = 404;
      return { error: 'Image not found' };
    }

    // Check permission: uploader can edit their own, album owner can edit all
    const canEdit =
      user.role === EUserRole.ADMIN ||
      image.photographerId === user.id ||
      image.album.ownerId === user.id;

    if (!canEdit) {
      set.status = 403;
      return { error: 'Forbidden' };
    }

    const [updated] = await db.update(schema.images)
      .set({
        caption: body.caption ?? image.caption,
        updatedAt: new Date(),
      })
      .where(eq(schema.images.id, params.id))
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
      caption: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Images'],
      summary: 'Update image caption',
    },
  })
  // Delete image (uploader or album owner)
  .delete('/:id', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const image = await db.query.images.findFirst({
      where: eq(schema.images.id, params.id),
      with: {
        album: true,
      },
    });

    if (!image) {
      set.status = 404;
      return { error: 'Image not found' };
    }

    // Check permission
    const canDelete =
      user.role === EUserRole.ADMIN ||
      image.photographerId === user.id ||
      image.album.ownerId === user.id;

    if (!canDelete) {
      set.status = 403;
      return { error: 'Forbidden' };
    }

    // Delete from S3
    try {
      await deleteFromS3(image.storageKey);
    } catch (error) {
      console.error('Failed to delete from S3:', error);
      // Continue with database deletion even if S3 fails
    }

    // Delete from database
    await db.delete(schema.images).where(eq(schema.images.id, params.id));

    return {
      success: true,
      message: 'Image deleted',
    };
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    detail: {
      tags: ['Images'],
      summary: 'Delete image',
    },
  })
  // Serve image file (with protection headers)
  .get('/:id/file', async ({ user, params, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

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
      user.role === EUserRole.ADMIN ||
      image.album.ownerId === user.id ||
      image.album.collaborators.some((c) => c.photographerId === user.id) ||
      image.album.clients.some((c) => c.clientId === user.id);

    if (!hasAccess) {
      set.status = 403;
      return { error: 'Forbidden' };
    }

    // Redirect to signed S3 URL
    const signedUrl = await getImageUrl(image.storageKey, 300); // 5 min expiry
    
    set.headers['Cache-Control'] = 'private, max-age=60';
    set.headers['X-Content-Type-Options'] = 'nosniff';
    set.redirect = signedUrl;
    
    return;
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    detail: {
      tags: ['Images'],
      summary: 'Get image file',
      description: 'Redirects to signed S3 URL',
    },
  });

// Album image upload route (separate for multipart handling)
export const albumImageRoutes = new Elysia({ prefix: '/albums' })
  .use(authMiddleware)
  // Upload images to album
  .post('/:id/images', async ({ user, params, body, set }) => {
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    if (user.role === EUserRole.CLIENT) {
      set.status = 403;
      return { error: 'Clients cannot upload images' };
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

    // Check if user can upload (owner or collaborator)
    const canUpload =
      user.role === EUserRole.ADMIN ||
      album.ownerId === user.id ||
      album.collaborators.some((c) => c.photographerId === user.id);

    if (!canUpload) {
      set.status = 403;
      return { error: 'Only album owner or collaborators can upload' };
    }

    // Handle file upload
    const file = body.file;
    if (!file) {
      set.status = 400;
      return { error: 'No file provided' };
    }

    try {
      // Get file buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Process and upload
      const { storageKey, metadata } = await processAndUploadImage(buffer, file.name);

      // Save to database
      const [image] = await db.insert(schema.images).values({
        albumId: params.id,
        photographerId: user.id,
        storageKey,
        originalFilename: file.name,
        caption: body.caption || null,
        exifData: metadata.exifData,
        width: metadata.width,
        height: metadata.height,
      }).returning();

      set.status = 201;
      return {
        success: true,
        data: image,
      };
    } catch (error) {
      console.error('Image upload failed:', error);
      set.status = 500;
      return { error: 'Failed to process image' };
    }
  }, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    body: t.Object({
      file: t.File({
        type: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
        maxSize: 50 * 1024 * 1024, // 50MB
      }),
      caption: t.Optional(t.String()),
    }),
    detail: {
      tags: ['Images'],
      summary: 'Upload image to album',
      description: 'Processes and compresses image to WebP',
    },
  });
