import type { TApiResponse, TUser, TAlbum, TAlbumWithRelations, TImage, TImageWithFeedback } from '$types';

const API_BASE = import.meta.env.PUBLIC_API_URL || '/api';

type TFetchOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string;
};

/**
 * Base fetch function with auth headers
 */
async function apiFetch<T>(
  endpoint: string,
  options: TFetchOptions = {}
): Promise<TApiResponse<T>> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return data as TApiResponse<T>;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// ============================================
// User API
// ============================================

export const userApi = {
  list: (token: string, params?: { role?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.role) query.set('role', params.role);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const queryString = query.toString();
    return apiFetch<TUser[]>(`/users${queryString ? `?${queryString}` : ''}`, { token });
  },

  get: (token: string, id: string) =>
    apiFetch<TUser>(`/users/${id}`, { token }),

  create: (token: string, data: Partial<TUser>) =>
    apiFetch<TUser>('/users', { method: 'POST', body: data, token }),

  update: (token: string, id: string, data: Partial<TUser>) =>
    apiFetch<TUser>(`/users/${id}`, { method: 'PATCH', body: data, token }),

  delete: (token: string, id: string) =>
    apiFetch<void>(`/users/${id}`, { method: 'DELETE', token }),
};

// ============================================
// Album API
// ============================================

export const albumApi = {
  list: (token: string, params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const queryString = query.toString();
    return apiFetch<TAlbumWithRelations[]>(`/albums${queryString ? `?${queryString}` : ''}`, { token });
  },

  get: (token: string, id: string) =>
    apiFetch<TAlbumWithRelations>(`/albums/${id}`, { token }),

  create: (token: string, data: { name: string; description?: string; displayMode?: string }) =>
    apiFetch<TAlbum>('/albums', { method: 'POST', body: data, token }),

  update: (token: string, id: string, data: Partial<TAlbum>) =>
    apiFetch<TAlbum>(`/albums/${id}`, { method: 'PATCH', body: data, token }),

  delete: (token: string, id: string) =>
    apiFetch<void>(`/albums/${id}`, { method: 'DELETE', token }),

  addCollaborator: (token: string, albumId: string, photographerId: string) =>
    apiFetch<void>(`/albums/${albumId}/collaborators`, {
      method: 'POST',
      body: { photographerId },
      token,
    }),

  removeCollaborator: (token: string, albumId: string, photographerId: string) =>
    apiFetch<void>(`/albums/${albumId}/collaborators/${photographerId}`, {
      method: 'DELETE',
      token,
    }),

  addClient: (token: string, albumId: string, clientId: string) =>
    apiFetch<void>(`/albums/${albumId}/clients`, {
      method: 'POST',
      body: { clientId },
      token,
    }),

  removeClient: (token: string, albumId: string, clientId: string) =>
    apiFetch<void>(`/albums/${albumId}/clients/${clientId}`, {
      method: 'DELETE',
      token,
    }),

  getSummary: (token: string, albumId: string) =>
    apiFetch<unknown>(`/albums/${albumId}/summary`, { token }),
};

// ============================================
// Image API
// ============================================

export const imageApi = {
  get: (token: string, id: string) =>
    apiFetch<TImageWithFeedback>(`/images/${id}`, { token }),

  update: (token: string, id: string, data: { caption?: string }) =>
    apiFetch<TImage>(`/images/${id}`, { method: 'PATCH', body: data, token }),

  delete: (token: string, id: string) =>
    apiFetch<void>(`/images/${id}`, { method: 'DELETE', token }),

  getFileUrl: (id: string) => `${API_BASE}/images/${id}/file`,

  upload: async (token: string, albumId: string, file: File, caption?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) formData.append('caption', caption);

    const response = await fetch(`${API_BASE}/albums/${albumId}/images`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    return response.json() as Promise<TApiResponse<TImage>>;
  },
};

// ============================================
// Feedback API
// ============================================

export const feedbackApi = {
  getRating: (token: string, imageId: string) =>
    apiFetch<{ rating: number } | null>(`/images/${imageId}/rating`, { token }),

  setRating: (token: string, imageId: string, rating: number) =>
    apiFetch<unknown>(`/images/${imageId}/rating`, {
      method: 'POST',
      body: { rating },
      token,
    }),

  deleteRating: (token: string, imageId: string) =>
    apiFetch<void>(`/images/${imageId}/rating`, { method: 'DELETE', token }),

  getFlag: (token: string, imageId: string) =>
    apiFetch<{ flagType: string } | null>(`/images/${imageId}/flag`, { token }),

  setFlag: (token: string, imageId: string, flagType: string) =>
    apiFetch<unknown>(`/images/${imageId}/flag`, {
      method: 'POST',
      body: { flagType },
      token,
    }),

  getComments: (token: string, imageId: string) =>
    apiFetch<unknown[]>(`/images/${imageId}/comments`, { token }),

  addComment: (token: string, imageId: string, content: string, parentId?: string) =>
    apiFetch<unknown>(`/images/${imageId}/comments`, {
      method: 'POST',
      body: { content, parentId },
      token,
    }),

  deleteComment: (token: string, imageId: string, commentId: string) =>
    apiFetch<void>(`/images/${imageId}/comments/${commentId}`, {
      method: 'DELETE',
      token,
    }),
};
