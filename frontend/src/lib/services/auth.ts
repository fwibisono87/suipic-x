import Keycloak from 'keycloak-js';
import { browser } from '$app/environment';
import { writable, derived, type Readable } from 'svelte/store';
import type { TUser, EUserRole } from '$types';

// Keycloak configuration
const KEYCLOAK_URL = import.meta.env.PUBLIC_KEYCLOAK_URL || '/auth';
const KEYCLOAK_REALM = import.meta.env.PUBLIC_KEYCLOAK_REALM || 'suipic';
const KEYCLOAK_CLIENT_ID = import.meta.env.PUBLIC_KEYCLOAK_CLIENT_ID || 'suipic-frontend';

// Keycloak instance
let keycloak: Keycloak | null = null;

// Auth stores
const isInitializing = writable(true);
const isAuthenticated = writable(false);
const user = writable<TUser | null>(null);
const token = writable<string | null>(null);

/**
 * Initialize Keycloak
 */
export async function initAuth(): Promise<void> {
  if (!browser) return;

  try {
    keycloak = new Keycloak({
      url: KEYCLOAK_URL,
      realm: KEYCLOAK_REALM,
      clientId: KEYCLOAK_CLIENT_ID,
    });

    const authenticated = await keycloak.init({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
      pkceMethod: 'S256',
    });

    isAuthenticated.set(authenticated);

    if (authenticated && keycloak.token) {
      token.set(keycloak.token);
      await syncUser();
    }

    // Auto-refresh token
    setInterval(async () => {
      if (keycloak?.authenticated) {
        try {
          const refreshed = await keycloak.updateToken(60);
          if (refreshed && keycloak.token) {
            token.set(keycloak.token);
          }
        } catch {
          logout();
        }
      }
    }, 30000);
  } catch (error) {
    console.error('Keycloak init failed:', error);
  } finally {
    isInitializing.set(false);
  }
}

/**
 * Sync user data from Keycloak to backend
 */
async function syncUser(): Promise<void> {
  if (!keycloak?.tokenParsed || !keycloak.token) return;

  const { sub, email, given_name, family_name, realm_access } = keycloak.tokenParsed as {
    sub: string;
    email?: string;
    given_name?: string;
    family_name?: string;
    realm_access?: { roles?: string[] };
  };

  // Determine role from Keycloak
  const roles = realm_access?.roles || [];
  let role: EUserRole = 'client';
  if (roles.includes('admin')) role = 'admin';
  else if (roles.includes('photographer')) role = 'photographer';

  try {
    const response = await fetch('/api/auth/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${keycloak.token}`,
      },
      body: JSON.stringify({
        keycloakId: sub,
        email: email || '',
        firstName: given_name || null,
        lastName: family_name || null,
        role,
      }),
    });

    const result = await response.json();
    if (result.success && result.data) {
      user.set(result.data);
    }
  } catch (error) {
    console.error('User sync failed:', error);
  }
}

/**
 * Login
 */
export function login(): void {
  if (keycloak) {
    keycloak.login();
  }
}

/**
 * Logout
 */
export function logout(): void {
  if (keycloak) {
    keycloak.logout();
  }
  isAuthenticated.set(false);
  user.set(null);
  token.set(null);
}

/**
 * Get current access token
 */
export function getToken(): string | null {
  return keycloak?.token || null;
}

// Export stores
export const auth = {
  isInitializing: { subscribe: isInitializing.subscribe } as Readable<boolean>,
  isAuthenticated: { subscribe: isAuthenticated.subscribe } as Readable<boolean>,
  user: { subscribe: user.subscribe } as Readable<TUser | null>,
  token: { subscribe: token.subscribe } as Readable<string | null>,
};

// Derived stores
export const isAdmin: Readable<boolean> = derived(user, ($user) => $user?.role === 'admin');
export const isPhotographer: Readable<boolean> = derived(
  user,
  ($user) => $user?.role === 'photographer' || $user?.role === 'admin'
);
export const isClient: Readable<boolean> = derived(user, ($user) => $user?.role === 'client');
