import { NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/api';
import { bucket, db, FieldValue } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const b = await request.json();
    const name = String(b.name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    const mimeType = String(b.mimeType || 'application/octet-stream');
    const size = Number(b.size || 0);
    if (!mimeType.startsWith('image/')) throw new Error('MVP chỉ nhận file ảnh.');
    if (size <= 0 || size > 15 * 1024 * 1024) throw new Error('Ảnh phải từ 1 byte đến tối đa 15 MB.');
    const path = `users/${user.uid}/media/${Date.now()}-${randomBytes(4).toString('hex')}-${name}`;
    const [uploadUrl] = await bucket.file(path).getSignedUrl({ version: 'v4', action: 'write', expires: Date.now() + 10 * 60 * 1000, contentType: mimeType });
    const mediaRef = db.collection(`users/${user.uid}/media`).doc();
    await mediaRef.set({ path, name, mimeType, size, createdAt: FieldValue.serverTimestamp(), source: 'upload' });
    return ok({ uploadUrl, path, mediaId: mediaRef.id });
  } catch (e) { return fail(e); }
}
