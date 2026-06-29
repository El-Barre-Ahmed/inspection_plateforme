export class ApiError extends Error {
  status: number;
  fields?: Record<string, string[]>;
  constructor(status: number, message: string, fields?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.fields = fields;
    this.name = 'ApiError';
  }
}
const apiHost = import.meta.env.VITE_API_URL || '';
const baseUrl = `${apiHost}/api`;

export interface ApiRequestOptions extends RequestInit {
  suppressGlobalError?: boolean;
}

export function createRequest(
  token: string | null,
  refreshToken: string | null,
  setToken: (accessToken: string | null, refreshToken?: string | null, username?: string | null, role?: string | null) => void,
  onGlobalError?: (status: number, message: string) => void
) {
  return async (path: string, options: ApiRequestOptions = {}) => {
    const { suppressGlobalError, ...fetchOptions } = options;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string> || {})
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...fetchOptions,
        headers,
        credentials: 'include'
      });
    } catch (err) {
      const msg = "Impossible de contacter le serveur";
      if (onGlobalError) {
        onGlobalError(0, msg);
      }
      throw new ApiError(0, msg);
    }

    if (response.status === 401) {
      if (refreshToken) {
        try {
          const refreshed = await refreshTokenRequest(refreshToken);
          if (refreshed.access) {
            setToken(refreshed.access, refreshed.refresh ?? refreshToken);
            headers.Authorization = `Bearer ${refreshed.access}`;
            
            const retryResponse = await fetch(`${baseUrl}${path}`, {
              ...fetchOptions,
              headers,
              credentials: 'include'
            });

            if (retryResponse.status === 204) {
              return null;
            }
            if (!retryResponse.ok) {
              let errData;
              try {
                errData = await retryResponse.json();
              } catch {
                errData = await retryResponse.text();
              }
              const msg = typeof errData === 'object' ? (errData.detail || JSON.stringify(errData)) : errData;
              throw new ApiError(retryResponse.status, msg || retryResponse.statusText, typeof errData === 'object' ? errData : undefined);
            }
            return retryResponse.json();
          }
        } catch (refreshErr) {
          setToken(null, null);
          const msg = "Session expirée";
          if (onGlobalError) onGlobalError(401, msg);
          throw new ApiError(401, msg);
        }
      } else {
        setToken(null, null);
        const msg = "Session expirée";
        if (onGlobalError) onGlobalError(401, msg);
        throw new ApiError(401, msg);
      }
    }

    if (!response.ok) {
      let errData;
      try {
        errData = await response.json();
      } catch {
        errData = await response.text();
      }
      const msg = typeof errData === 'object' ? (errData.detail || JSON.stringify(errData)) : errData;
      
      if (
        onGlobalError &&
        [403, 404, 500].includes(response.status) &&
        !options.suppressGlobalError
      ) {
        onGlobalError(response.status, msg || response.statusText);
      }
      
      throw new ApiError(response.status, msg || response.statusText, typeof errData === 'object' ? errData : undefined);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  };
}

export async function login(username: string, password: string) {
  const response = await fetch(`${baseUrl}/auth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include'
  });
  if (!response.ok) {
    let errData;
    try {
      errData = await response.json();
    } catch {
      errData = await response.text();
    }
    const msg = typeof errData === 'object' ? (errData.detail || JSON.stringify(errData)) : errData;
    throw new ApiError(response.status, msg || 'Login failed', typeof errData === 'object' ? errData : undefined);
  }
  return response.json();
}

async function refreshTokenRequest(refreshToken: string) {
  const response = await fetch(`${baseUrl}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refreshToken }),
    credentials: 'include'
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Refresh token failed');
  }
  return response.json();
}
