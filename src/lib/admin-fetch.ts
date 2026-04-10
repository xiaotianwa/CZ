export async function adminFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ code: number; message: string; data: T }> {
  const res = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const json = await res.json();

  if (!res.ok || json.code !== 0) {
    throw new Error(json.message || `请求失败 (${res.status})`);
  }

  return json;
}

export async function adminGet<T = unknown>(path: string) {
  return adminFetch<T>(path);
}

export async function adminPost<T = unknown>(path: string, body: unknown) {
  return adminFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export async function adminPut<T = unknown>(path: string, body: unknown) {
  return adminFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}

export async function adminPatch<T = unknown>(path: string, body: unknown) {
  return adminFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function adminDelete<T = unknown>(path: string) {
  return adminFetch<T>(path, { method: 'DELETE' });
}

export async function adminUpload(file: File, category: string = 'general') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);

  const res = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'same-origin',
    body: formData,
  });

  const json = await res.json();
  if (!res.ok || json.code !== 0) {
    throw new Error(json.message || '上传失败');
  }

  return json.data as { id: string; url: string; filename: string; size: number };
}
