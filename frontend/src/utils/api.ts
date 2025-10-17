// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Get the full API URL for a given endpoint
 * @param endpoint - The API endpoint (e.g., '/auth/sign-in')
 * @returns The full URL
 */
export const getApiUrl = (endpoint: string): string => {
  // If endpoint already starts with http, return as-is
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  
  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // If no API_BASE_URL, use relative path (for development with proxy)
  if (!API_BASE_URL) {
    return `/${cleanEndpoint}`;
  }
  
  // Remove trailing slash from base URL if present
  const cleanBaseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  
  return `${cleanBaseUrl}/${cleanEndpoint}`;
};

/**
 * Fetch wrapper that automatically uses the correct API base URL
 * and handles authentication errors
 */
export const apiFetch = async (endpoint: string, options?: RequestInit): Promise<Response> => {
  const url = getApiUrl(endpoint);
  const response = await fetch(url, options);
  
  // Handle 401 Unauthorized responses
  if (response.status === 401) {
    console.warn('Authentication failed - token may be expired');
    
    // Clear stored authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Redirect to login page if we're not already there
    if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
      window.location.href = '/login';
    }
  }
  
  return response;
};

export default apiFetch;

