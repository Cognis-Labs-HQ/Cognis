export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('cognis_token');
  const headers = { ...(options.headers ?? {}), authorization: token ? `Bearer ${token}` : '' };
  return fetch(path, { ...options, headers });
}
