import { EUserRole, EFlagType, EDisplayMode } from './enums';

/**
 * User type
 */
export type TUser = {
  id: string;
  keycloakId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: EUserRole;
  createdById: string | null;
  createdAt: Date;
};

/**
 * Album type
 */
export type TAlbum = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  displayMode: EDisplayMode;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Image type
 */
export type TImage = {
  id: string;
  albumId: string;
  photographerId: string;
  storageKey: string;
  originalFilename: string;
  caption: string | null;
  exifData: Record<string, unknown> | null;
  width: number;
  height: number;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Rating type
 */
export type TRating = {
  id: string;
  imageId: string;
  userId: string;
  rating: number; // 1-5
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Flag type
 */
export type TFlag = {
  id: string;
  imageId: string;
  userId: string;
  flagType: EFlagType;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Comment type
 */
export type TComment = {
  id: string;
  imageId: string;
  userId: string;
  parentId: string | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Album with relations
 */
export type TAlbumWithRelations = TAlbum & {
  owner: TUser;
  collaborators: TUser[];
  clients: TUser[];
  imageCount: number;
};

/**
 * Image with feedback summary
 */
export type TImageWithFeedback = TImage & {
  photographer: TUser;
  averageRating: number | null;
  ratingCount: number;
  pickCount: number;
  rejectCount: number;
  commentCount: number;
};

/**
 * API response wrapper
 */
export type TApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

/**
 * Paginated response
 */
export type TPaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export * from './enums';
