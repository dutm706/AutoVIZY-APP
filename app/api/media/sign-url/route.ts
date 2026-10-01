import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/api';
import { bucket } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const path = request.nextUrl.searchParams.get('path') || '';
    if (!path.startsWith(`users/${user.uid}/`)) throw new Error('Media path không hợp lệ.');
    const file = bucket.file(path);
    const [exists] = await file.exists();
    if (!exists) throw new Error('File không tồn tại.');
    const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 30 * 60 * 1000 });
    return ok({ url });
  } catch (e) { return fail(e); }
}
