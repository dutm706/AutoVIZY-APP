import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/api';
import { deletePage } from '@/lib/facebook';

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    await deletePage(user.uid, id);
    return ok({ success: true });
  } catch (e) { return fail(e); }
}
