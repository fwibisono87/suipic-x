import { pgTable, uuid, varchar, text, timestamp, pgEnum, integer, jsonb, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ===========================================
// Enums
// ===========================================

export const userRoleEnum = pgEnum('user_role', ['admin', 'photographer', 'client']);
export const flagTypeEnum = pgEnum('flag_type', ['pick', 'reject', 'none']);
export const displayModeEnum = pgEnum('display_mode', ['grid', 'filmstrip']);

// ===========================================
// Users Table
// ===========================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  keycloakId: varchar('keycloak_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  role: userRoleEnum('role').notNull().default('client'),
  createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  keycloakIdIdx: uniqueIndex('users_keycloak_id_idx').on(table.keycloakId),
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [users.createdById],
    references: [users.id],
    relationName: 'userCreator',
  }),
  createdUsers: many(users, { relationName: 'userCreator' }),
  ownedAlbums: many(albums, { relationName: 'albumOwner' }),
  collaboratingAlbums: many(albumCollaborators),
  clientAlbums: many(albumClients),
  uploadedImages: many(images),
  ratings: many(ratings),
  flags: many(flags),
  comments: many(comments),
}));

// ===========================================
// Albums Table
// ===========================================

export const albums = pgTable('albums', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  displayMode: displayModeEnum('display_mode').notNull().default('grid'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const albumsRelations = relations(albums, ({ one, many }) => ({
  owner: one(users, {
    fields: [albums.ownerId],
    references: [users.id],
    relationName: 'albumOwner',
  }),
  collaborators: many(albumCollaborators),
  clients: many(albumClients),
  images: many(images),
}));

// ===========================================
// Album Collaborators (Many-to-Many)
// ===========================================

export const albumCollaborators = pgTable('album_collaborators', {
  albumId: uuid('album_id').notNull().references(() => albums.id, { onDelete: 'cascade' }),
  photographerId: uuid('photographer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.albumId, table.photographerId] }),
}));

export const albumCollaboratorsRelations = relations(albumCollaborators, ({ one }) => ({
  album: one(albums, {
    fields: [albumCollaborators.albumId],
    references: [albums.id],
  }),
  photographer: one(users, {
    fields: [albumCollaborators.photographerId],
    references: [users.id],
  }),
}));

// ===========================================
// Album Clients (Many-to-Many)
// ===========================================

export const albumClients = pgTable('album_clients', {
  albumId: uuid('album_id').notNull().references(() => albums.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.albumId, table.clientId] }),
}));

export const albumClientsRelations = relations(albumClients, ({ one }) => ({
  album: one(albums, {
    fields: [albumClients.albumId],
    references: [albums.id],
  }),
  client: one(users, {
    fields: [albumClients.clientId],
    references: [users.id],
  }),
}));

// ===========================================
// Images Table
// ===========================================

export const images = pgTable('images', {
  id: uuid('id').primaryKey().defaultRandom(),
  albumId: uuid('album_id').notNull().references(() => albums.id, { onDelete: 'cascade' }),
  photographerId: uuid('photographer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  storageKey: varchar('storage_key', { length: 512 }).notNull(),
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  caption: text('caption'),
  exifData: jsonb('exif_data'),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const imagesRelations = relations(images, ({ one, many }) => ({
  album: one(albums, {
    fields: [images.albumId],
    references: [albums.id],
  }),
  photographer: one(users, {
    fields: [images.photographerId],
    references: [users.id],
  }),
  ratings: many(ratings),
  flags: many(flags),
  comments: many(comments),
}));

// ===========================================
// Ratings Table
// ===========================================

export const ratings = pgTable('ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  imageId: uuid('image_id').notNull().references(() => images.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(), // 1-5
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueRating: uniqueIndex('ratings_image_user_idx').on(table.imageId, table.userId),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  image: one(images, {
    fields: [ratings.imageId],
    references: [images.id],
  }),
  user: one(users, {
    fields: [ratings.userId],
    references: [users.id],
  }),
}));

// ===========================================
// Flags Table
// ===========================================

export const flags = pgTable('flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  imageId: uuid('image_id').notNull().references(() => images.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  flagType: flagTypeEnum('flag_type').notNull().default('none'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueFlag: uniqueIndex('flags_image_user_idx').on(table.imageId, table.userId),
}));

export const flagsRelations = relations(flags, ({ one }) => ({
  image: one(images, {
    fields: [flags.imageId],
    references: [images.id],
  }),
  user: one(users, {
    fields: [flags.userId],
    references: [users.id],
  }),
}));

// ===========================================
// Comments Table
// ===========================================

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  imageId: uuid('image_id').notNull().references(() => images.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id').references(() => comments.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const commentsRelations = relations(comments, ({ one, many }) => ({
  image: one(images, {
    fields: [comments.imageId],
    references: [images.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: 'commentReplies',
  }),
  replies: many(comments, { relationName: 'commentReplies' }),
}));
