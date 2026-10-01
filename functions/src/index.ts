import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import crypto from 'node:crypto';

if (!getApps().length) initializeApp();
const db = getFirestore();
const bucket = getStorage().bucket();
const version = process.env.META_GRAPH_VERSION || 'v26.0';
const graphBase = `https://graph.facebook.com/${version}`;

function decryptSecret(payload: string) {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('TOKEN_ENCRYPTION_KEY is missing.');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must decode to 32 bytes.');
  const packed = Buffer.from(payload, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, packed.subarray(0, 12));
  decipher.setAuthTag(packed.subarray(12, 28));
  return Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString('utf8');
}

async function publishPage(uid: string, pageId: string, content: string, imagePath?: string) {
  const secret = await db.doc(`users/${uid}/pageSecrets/${pageId}`).get();
  if (!secret.exists) throw new Error('Page access token not found.');
  const token = decryptSecret(String(secret.data()?.encryptedToken || ''));
  const body = new URLSearchParams({ access_token: token });
  let endpoint = `${graphBase}/${encodeURIComponent(pageId)}/feed`;
  if (imagePath) {
    const [url] = await bucket.file(imagePath).getSignedUrl({ action: 'read', expires: Date.now() + 60 * 60 * 1000 });
    endpoint = `${graphBase}/${encodeURIComponent(pageId)}/photos`;
    body.set('url', url);
    body.set('caption', content);
  } else {
    body.set('message', content);
  }
  const response = await fetch(endpoint, { method: 'POST', body, cache: 'no-store' });
  const data: any = await response.json();
  if (!response.ok || data?.error) throw new Error(data?.error?.message || 'Facebook publish failed.');
  return String(data?.id || data?.post_id || '');
}

export const processScheduledPosts = onSchedule({ region: 'asia-southeast1', schedule: '* * * * *', timeZone: 'Asia/Ho_Chi_Minh', memory: '512MiB', timeoutSeconds: 120, maxInstances: 3, secrets: ['TOKEN_ENCRYPTION_KEY'] }, async () => {
  const now = Timestamp.now();
  const snap = await db.collectionGroup('posts')
    .where('status', '==', 'scheduled')
    .where('scheduledAt', '<=', now)
    .orderBy('scheduledAt', 'asc')
    .limit(25)
    .get();

  if (snap.empty) { logger.debug('No scheduled posts.'); return; }
  logger.info(`Processing ${snap.size} scheduled posts.`);

  for (const doc of snap.docs) {
    const uid = doc.ref.parent.parent?.id;
    if (!uid) continue;
    const locked = await db.runTransaction(async tx => {
      const fresh = await tx.get(doc.ref);
      if (!fresh.exists) return false;
      const data: any = fresh.data();
      if (data.status !== 'scheduled') return false;
      const attempts = Number(data.attempts || 0);
      if (attempts >= 5) {
        tx.update(doc.ref, { status: 'failed', lastError: 'Quá 5 lần thử.', updatedAt: FieldValue.serverTimestamp() });
        return false;
      }
      tx.update(doc.ref, { status: 'processing', processingUntil: Timestamp.fromMillis(Date.now() + 10 * 60 * 1000), attempts: attempts + 1, updatedAt: FieldValue.serverTimestamp() });
      return true;
    });
    if (!locked) continue;

    try {
      const data: any = doc.data();
      if (data.targetType !== 'page') {
        await doc.ref.update({ status: 'manual_ready', lastError: 'Đích không phải Facebook Page — cần thao tác thủ công.', updatedAt: FieldValue.serverTimestamp() });
        continue;
      }
      const postId = await publishPage(uid, String(data.targetId), String(data.content || ''), data.imagePath || undefined);
      await doc.ref.update({ status: 'published', publishedPostId: postId, publishedAt: FieldValue.serverTimestamp(), processingUntil: null, lastError: '', updatedAt: FieldValue.serverTimestamp() });
    } catch (err: any) {
      const message = err?.message || 'Publish failed';
      const next = Timestamp.fromMillis(Date.now() + 5 * 60 * 1000);
      const fresh = await doc.ref.get();
      const attempts = Number(fresh.data()?.attempts || 0);
      if (attempts < 5) await doc.ref.update({ status: 'scheduled', scheduledAt: next, lastError: message, processingUntil: null, updatedAt: FieldValue.serverTimestamp() });
      else await doc.ref.update({ status: 'failed', lastError: message, processingUntil: null, updatedAt: FieldValue.serverTimestamp() });
      logger.error(`Post ${doc.id} failed`, err);
    }
  }
});
