import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { fail, ok, cleanDoc } from '@/lib/api';
import { db } from '@/lib/firebase/admin';
import { savePage } from '@/lib/facebook';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const snap = await db.collection(`users/${user.uid}/pages`).orderBy('name').get();
    return ok({ pages: snap.docs.map(d => cleanDoc({ id: d.id, ...d.data() })) });
  } catch (e) { return fail(e); }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const b = await request.json();
    if (!b.id || !b.name || !b.token) throw new Error('Cần Page ID, tên Page và Page Access Token.');
    await savePage(user.uid, { id: String(b.id), name: String(b.name), token: String(b.token), pictureUrl: String(b.pictureUrl || '') });
    return ok({ success: true });
  } catch (e) { return fail(e); }
}
