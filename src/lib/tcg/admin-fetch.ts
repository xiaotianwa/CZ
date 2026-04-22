export async function tcgAdminFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
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

export async function tcgAdminGet<T = unknown>(path: string) {
  return tcgAdminFetch<T>(path);
}

export async function tcgAdminPost<T = unknown>(path: string, body: unknown) {
  return tcgAdminFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export async function tcgAdminPut<T = unknown>(path: string, body: unknown) {
  return tcgAdminFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}

export async function tcgAdminPatch<T = unknown>(path: string, body: unknown) {
  return tcgAdminFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function tcgAdminDelete<T = unknown>(path: string) {
  return tcgAdminFetch<T>(path, { method: 'DELETE' });
}

export async function tcgAdminUpload(file: File, category: 'cards' | 'game' = 'cards') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);

  const res = await fetch('/api/tcg/admin/upload', {
    method: 'POST',
    credentials: 'same-origin',
    body: formData,
  });

  const json = await res.json();
  if (!res.ok || json.code !== 0) {
    throw new Error(json.message || '上传失败');
  }

  return json.data as { url: string; cosKey: string; filename: string; size: number };
}
