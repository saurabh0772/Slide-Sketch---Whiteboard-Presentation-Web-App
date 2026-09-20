import type { IDocument, IDocumentSummary, IPageData } from '../types/document';

const getNormalizedApiUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL || '/api').trim().replace(/\/$/, '');
  if (envUrl === '/api') return '/api';
  return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
};

const API_BASE_URL = getNormalizedApiUrl();

export const AUTH_TOKEN_KEY = 'slidesketch_auth_token';
export const AUTH_USER_KEY = 'slidesketch_auth_user';
export const AUTH_EXPIRES_KEY = 'slidesketch_auth_expires_at';

// Callback registry for handling 401 unauthorized globally
let unauthorizedListener: (() => void) | null = null;

export const onUnauthorized = (callback: (() => void) | null) => {
  unauthorizedListener = callback;
};

/**
 * Retrieve active token if present and not expired (30-day window)
 */
export const getStoredToken = (): string | null => {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const expiresAtStr = localStorage.getItem(AUTH_EXPIRES_KEY);
    if (!token || !expiresAtStr) return null;

    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      clearStoredAuth();
      return null;
    }

    return token;
  } catch {
    return null;
  }
};

export const getStoredUser = (): { username: string } | null => {
  try {
    const userStr = localStorage.getItem(AUTH_USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

export const setStoredAuth = (
  token: string,
  user: { username: string },
  expiresAt: number
): void => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  localStorage.setItem(AUTH_EXPIRES_KEY, expiresAt.toString());
};

export const clearStoredAuth = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_EXPIRES_KEY);
};

/**
 * Wrapper for fetch that automatically injects Authorization Bearer header
 * and handles 401 Unauthorized responses.
 */
const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
  const token = getStoredToken();
  const headers = new Headers(init.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status === 401) {
    clearStoredAuth();
    if (unauthorizedListener) {
      unauthorizedListener();
    }
  }

  return response;
};

/**
 * Authenticate with username and password
 */
export const loginUser = async (
  username: string,
  password: string
): Promise<{ success: boolean; token: string; user: { username: string }; expiresAt: number }> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Login failed. Please check your credentials.');
  }

  // Persist session for 30 days
  setStoredAuth(data.token, data.user, data.expiresAt);
  return data;
};

/**
 * Verify active JWT session
 */
export const verifyAuthToken = async (): Promise<boolean> => {
  const token = getStoredToken();
  if (!token) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      clearStoredAuth();
      return false;
    }
    const data = await response.json();
    return !!data.valid;
  } catch {
    return false;
  }
};

/**
 * Fetch all documents (summary list, 16:9 only)
 */
export const fetchDocuments = async (): Promise<IDocumentSummary[]> => {
  const response = await authFetch(`${API_BASE_URL}/documents`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch documents');
  }
  const data = await response.json();
  return data.documents;
};

/**
 * Fetch full document by ID
 */
export const fetchDocumentById = async (id: string): Promise<IDocument> => {
  const response = await authFetch(`${API_BASE_URL}/documents/${id}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch document');
  }
  const data = await response.json();
  return data.document;
};

/**
 * Upload a PDF file
 */
export const uploadPdfDocument = async (
  file: File,
  title?: string
): Promise<IDocument> => {
  const formData = new FormData();
  formData.append('file', file);
  if (title) {
    formData.append('title', title);
  }

  const response = await authFetch(`${API_BASE_URL}/documents`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to upload document');
  }

  const data = await response.json();
  return data.document;
};

/**
 * Create a new blank 16:9 presentation
 */
export const createBlankDocument = async (title?: string): Promise<IDocument> => {
  const response = await authFetch(`${API_BASE_URL}/documents/blank`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create presentation');
  }

  const data = await response.json();
  return data.document;
};

/**
 * Update document annotations, title, or totalPages
 */
export const updateDocument = async (
  id: string,
  payload: { title?: string; pages?: IPageData[]; totalPages?: number }
): Promise<IDocument> => {
  const response = await authFetch(`${API_BASE_URL}/documents/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to save document');
  }

  const data = await response.json();
  return data.document;
};

/**
 * Delete document by ID
 */
export const deleteDocument = async (id: string): Promise<void> => {
  const response = await authFetch(`${API_BASE_URL}/documents/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete document');
  }
};

/**
 * Get direct stream URL for the PDF (includes auth token in query param)
 */
export const getPdfFileUrl = (id: string): string => {
  const token = getStoredToken();
  const base = `${API_BASE_URL}/documents/${id}/file`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
};
