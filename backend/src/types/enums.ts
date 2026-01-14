/**
 * User Role Enum
 */
export const EUserRole = {
  ADMIN: 'admin',
  PHOTOGRAPHER: 'photographer',
  CLIENT: 'client',
} as const;

export type EUserRole = typeof EUserRole[keyof typeof EUserRole];

/**
 * Flag Type Enum for image pick/reject/unflag
 */
export const EFlagType = {
  PICK: 'pick',
  REJECT: 'reject',
  NONE: 'none',
} as const;

export type EFlagType = typeof EFlagType[keyof typeof EFlagType];

/**
 * Album Display Mode
 */
export const EDisplayMode = {
  GRID: 'grid',
  FILMSTRIP: 'filmstrip',
} as const;

export type EDisplayMode = typeof EDisplayMode[keyof typeof EDisplayMode];
