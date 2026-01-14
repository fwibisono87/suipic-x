import { Elysia } from 'elysia';
import * as jose from 'jose';
import { db, schema } from '../db';
import { eq } from 'drizzle-orm';
import type { EUserRole } from '../types';

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'suipic';

type TAuthUser = {
  id: string;
  keycloakId: string;
  email: string;
  role: EUserRole;
  firstName: string | null;
  lastName: string | null;
};

let jwks: jose.JWTVerifyGetKey | null = null;

const getJWKS = async (): Promise<jose.JWTVerifyGetKey> => {
  if (!jwks) {
    const issuer = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;
    jwks = jose.createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`));
  }
  return jwks;
};

const verifyToken = async (token: string): Promise<jose.JWTPayload | null> => {
  try {
    const jwks = await getJWKS();
    const issuer = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;
    
    const { payload } = await jose.jwtVerify(token, jwks, {
      issuer,
    });
    
    return payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

export const authMiddleware = new Elysia({ name: 'auth' })
  .derive(async ({ request, set }): Promise<{ user: TAuthUser | null }> => {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return { user: null };
    }

    const token = authHeader.slice(7);
    const payload = await verifyToken(token);

    if (!payload || !payload.sub) {
      return { user: null };
    }

    // Find or sync user from database
    const keycloakId = payload.sub;
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.keycloakId, keycloakId),
    });

    if (existingUser) {
      return {
        user: {
          id: existingUser.id,
          keycloakId: existingUser.keycloakId,
          email: existingUser.email,
          role: existingUser.role as EUserRole,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
        },
      };
    }

    // User not found in database - they need to be created via /auth/sync
    return { user: null };
  })
  .macro({
    requireAuth(enabled: boolean) {
      return {
        beforeHandle({ user, set }) {
          if (enabled && !user) {
            set.status = 401;
            return { error: 'Unauthorized' };
          }
        },
      };
    },
    requireRole(roles: EUserRole[]) {
      return {
        beforeHandle({ user, set }) {
          if (!user) {
            set.status = 401;
            return { error: 'Unauthorized' };
          }
          if (!roles.includes(user.role)) {
            set.status = 403;
            return { error: 'Forbidden' };
          }
        },
      };
    },
  });

export type AuthMiddleware = typeof authMiddleware;
