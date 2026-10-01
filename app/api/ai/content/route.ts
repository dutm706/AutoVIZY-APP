import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth';
import { fail, ok } from '@/lib/api';
import { db } from '@/lib/firebase/admin';
import { generateContent } from '@/lib/ai';
import { buildSocialPrompt } from '@/lib/prompt';
import type { AiProvider } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const provider = body.provider as AiProvider;
    if (!['openai','gemini','claude'].includes(provider)) throw new Error('Provider content không hợp lệ.');
    const settingsSnap = await db.doc(`users/${user.uid}/settings/main`).get();
    const s: any = settingsSnap.data() || {};
    const prompt = buildSocialPrompt({
      topic: String(body.topic || 'Bài đăng giới thiệu thương hiệu'),
      instruction: String(body.instruction || ''),
      settings: {
        brandName: String(s.brandName || 'AutoSocial AI'), defaultTone: String(s.defaultTone || ''), brandContext: String(s.brandContext || ''), hashtag: String(s.hashtag || ''),
        defaultContentProvider: s.defaultContentProvider || 'openai', defaultImageProvider: s.defaultImageProvider || 'gemini', timezone: s.timezone || 'Asia/Ho_Chi_Minh',
      },
      length: Math.min(2500, Math.max(300, Number(body.length || 1200))),
    });
    const result = await generateContent(provider, prompt);
    return ok(result);
  } catch (e) { return fail(e); }
}
