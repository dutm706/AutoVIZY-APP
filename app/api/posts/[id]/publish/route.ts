import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { fail, ok, cleanDoc } from '@/lib/api';
import { db, FieldValue, bucket } from '@/lib/firebase/admin';
import { publishPagePost } from '@/lib/facebook';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const ref = db.doc(`users/${user.uid}/posts/${id}`);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Không tìm thấy bài viết.');
    const post: any = snap.data();
    if (post.targetType !== 'page') throw new Error('Chỉ Page mới đăng tự động bằng API.');

    let imageUrl = '';
    if (post.imagePath) {
      const [signed] = await bucket.file(post.imagePath).getSignedUrl({ action: 'read', expires: Date.now() + 60 * 60 * 1000 });
      imageUrl = signed;
    }
    const result = await publishPagePost({ uid: user.uid, pageId: String(post.targetId), content: String(post.content), imageUrl });
    await ref.update({ status: 'published', publishedPostId: result.id, publishedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), lastError: '' });
    return ok({ success: true, publishedPostId: result.id });
  } catch (e) {
    try {
      const user = await requireUser(request);
      const { id } = await context.params;
      await db.doc(`users/${user.uid}/posts/${id}`).set({ status: 'failed', lastError: e instanceof Error ? e.message : 'Publish failed', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    } catch { /* preserve original error */ }
    return fail(e);
  }
}
