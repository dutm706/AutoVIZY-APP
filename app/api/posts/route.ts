import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/api';
import { db, FieldValue, Timestamp } from '@/lib/firebase/admin';
import type { TargetType, PostStatus } from '@/lib/types';

function asStatus(targetType: TargetType, requested: PostStatus) {
  if (requested === 'draft') return 'draft';
  if (targetType === 'page') return requested === 'scheduled' ? 'scheduled' : 'draft';
  return 'manual_ready';
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const b = await request.json();
    const targetType = b.targetType as TargetType;
    if (!['page','group','profile'].includes(targetType)) throw new Error('Loại đích không hợp lệ.');
    const title = String(b.title || 'Bài Facebook mới').slice(0, 180);
    const content = String(b.content || '').trim();
    if (!content) throw new Error('Nội dung bài viết đang trống.');
    const targetId = String(b.targetId || '');
    const targetName = String(b.targetName || '');
    if (targetType === 'page' && !targetId) throw new Error('Chọn Facebook Page.');
    let scheduledAt: Timestamp | null = null;
    if (b.scheduledAt) {
      const date = new Date(String(b.scheduledAt));
      if (Number.isNaN(date.getTime())) throw new Error('Thời gian lên lịch không hợp lệ.');
      scheduledAt = Timestamp.fromDate(date);
    }
    const status = asStatus(targetType, b.status as PostStatus);
    if (targetType === 'page' && status === 'scheduled' && !scheduledAt) throw new Error('Chọn thời gian đăng.');

    const ref = await db.collection(`users/${user.uid}/posts`).add({
      title, content, targetType, targetId, targetName, status,
      scheduledAt: scheduledAt || null,
      imagePath: String(b.imagePath || ''),
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), attempts: 0,
    });
    return ok({ id: ref.id, status }, 201);
  } catch (e) { return fail(e); }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new Error('Thiếu post id.');
    await db.doc(`users/${user.uid}/posts/${id}`).delete();
    return ok({ success: true });
  } catch (e) { return fail(e); }
}
