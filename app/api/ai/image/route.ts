import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/api';
import { db, bucket, FieldValue } from '@/lib/firebase/admin';
import { generateImage } from '@/lib/ai';
import type { AiProvider } from '@/lib/types';
import { randomBytes } from 'node:crypto';

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const provider = body.provider as AiProvider;
    if (!['openai','gemini','claude'].includes(provider)) throw new Error('Provider image không hợp lệ.');
    const prompt = String(body.prompt || '').trim();
    if (!prompt) throw new Error('Thiếu prompt ảnh.');
    const aspectRatio = String(body.aspectRatio || '4:5');
    const result = await generateImage(provider, prompt, aspectRatio);
    if (!('buffer' in result) || !result.buffer) return ok({ imagePrompt: (result as any).imagePrompt || '', url: '' });

    const path = `users/${user.uid}/media/ai-${Date.now()}-${randomBytes(4).toString('hex')}.png`;
    const file = bucket.file(path);
    await file.save(result.buffer, { metadata: { contentType: result.mimeType, metadata: { provider } }, resumable: false });
    const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 60 * 60 * 1000 });
    const mediaRef = db.collection(`users/${user.uid}/media`).doc();
    await mediaRef.set({ path, name: path.split('/').at(-1), mimeType: result.mimeType, size: result.buffer.length, provider, createdAt: FieldValue.serverTimestamp() });
    return ok({ url, path, mediaId: mediaRef.id, provider, model: (result as any).model || '' });
  } catch (e) { return fail(e); }
}
