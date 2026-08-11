const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  me: () => request('/auth/me'),

  listUsers: () => request('/users'),

  createUser: (email, password, role) => request('/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  }),

  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  listFiles: (folderPath) => {
    const qs = folderPath ? `?folderPath=${encodeURIComponent(folderPath)}` : '';
    return request(`/files${qs}`);
  },

  getUploadUrl: (filename, contentType, folderPath) => request('/files/upload-url', {
    method: 'POST',
    body: JSON.stringify({ filename, contentType, folderPath }),
  }),

  getDownloadUrl: (key) => request(`/files/${encodeURIComponent(key)}/download`),

  deleteFile: (key) => request(`/files/${encodeURIComponent(key)}`, { method: 'DELETE' }),

  listFolders: (parentId) => {
    const qs = parentId ? `?parent_id=${parentId}` : '';
    return request(`/folders${qs}`);
  },

  createFolder: (name, parentId) => request('/folders', {
    method: 'POST',
    body: JSON.stringify({ name, parent_id: parentId }),
  }),

  getFolderPath: (id) => request(`/folders/${id}/path`),

  deleteFolder: (id) => request(`/folders/${id}`, { method: 'DELETE' }),

  getSharedFiles: () => request('/shared'),

  shareFile: (fileKey, fileName, sharedWith) => request('/shared', {
    method: 'POST',
    body: JSON.stringify({ file_key: fileKey, file_name: fileName, shared_with: sharedWith }),
  }),

  unshareFile: (id) => request(`/shared/${id}`, { method: 'DELETE' }),
};
