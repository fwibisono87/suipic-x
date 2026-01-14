/**
 * User Role Enum
 */
export const EUserRole = {
  ADMIN: 'admin',
  PHOTOGRAPHER: 'photographer',
  CLIENT: 'client',
} as const;

export type EUserRole = (typeof EUserRole)[keyof typeof EUserRole];

/**
 * Flag Type Enum
 */
export const EFlagType = {
  PICK: 'pick',
  REJECT: 'reject',
  NONE: 'none',
} as const;

export type EFlagType = (typeof EFlagType)[keyof typeof EFlagType];

/**
 * Display Mode Enum
 */
export const EDisplayMode = {
  GRID: 'grid',
  FILMSTRIP: 'filmstrip',
} as const;

export type EDisplayMode = (typeof EDisplayMode)[keyof typeof EDisplayMode];

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
  createdAt: string;
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
  createdAt: string;
  updatedAt: string;
};

/**
 * Album with relations
 */
export type TAlbumWithRelations = TAlbum & {
  owner: TUser;
  collaborators: Array<{ photographer: TUser }>;
  clients: Array<{ client: TUser }>;
  images: TImage[];
  imageCount?: number;
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
  createdAt: string;
  updatedAt: string;
};

/**
 * Image with feedback
 */
export type TImageWithFeedback = TImage & {
  photographer: TUser;
  imageUrl: string;
  ratings: TRating[];
  flags: TFlag[];
  comments: TComment[];
  averageRating: number | null;
  pickCount: number;
  rejectCount: number;
};

/**
 * Rating type
 */
export type TRating = {
  id: string;
  imageId: string;
  userId: string;
  user?: TUser;
  rating: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * Flag type
 */
export type TFlag = {
  id: string;
  imageId: string;
  userId: string;
  user?: TUser;
  flagType: EFlagType;
  createdAt: string;
  updatedAt: string;
};

/**
 * Comment type
 */
export type TComment = {
  id: string;
  imageId: string;
  userId: string;
  user?: TUser;
  parentId: string | null;
  content: string;
  replies?: TComment[];
  createdAt: string;
  updatedAt: string;
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
