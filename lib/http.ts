export async function fetchJson<T>(url: string, init: RequestInit, label = 'API request'): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  if (!response.ok) {
    const message = body?.error?.message || body?.error || body?.message || `${label} thất bại (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}
