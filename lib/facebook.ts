import { decryptSecret, encryptSecret } from '@/lib/crypto';
import { db, FieldValue } from '@/lib/firebase/admin';

const graphVersion = () => process.env.META_GRAPH_VERSION || 'v26.0';
const graphBase = () => `https://graph.facebook.com/${graphVersion()}`;

function metaConfig() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) throw new Error('Thiếu META_APP_ID hoặc META_APP_SECRET.');
  return { appId, appSecret };
}

export function facebookOAuthUrl(state: string, redirectUri: string) {
  const { appId } = metaConfig();
  const scope = process.env.META_OAUTH_SCOPES || 'pages_show_list,pages_read_engagement,pages_manage_posts';
  const params = new URLSearchParams({ client_id: appId, redirect_uri: redirectUri, state, scope, response_type: 'code' });
  return `https://www.facebook.com/${graphVersion()}/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForUserToken(code: string, redirectUri: string) {
  const { appId, appSecret } = metaConfig();
  const url = new URL(`${graphBase()}/oauth/access_token`);
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('code', code);
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data?.error?.message || 'Không đổi được Facebook OAuth code.');
  return data.access_token as string;
}

export async function fetchPages(userToken: string) {
  const url = new URL(`${graphBase()}/me/accounts`);
  url.searchParams.set('fields', 'id,name,access_token,picture{url}');
  url.searchParams.set('access_token', userToken);
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'Không lấy được danh sách Facebook Page.');
  return (data?.data || []).map((page: any) => ({
    id: String(page.id),
    name: String(page.name || page.id),
    token: String(page.access_token || ''),
    pictureUrl: page?.picture?.data?.url || '',
  }));
}

export async function savePage(uid: string, page: { id: string; name: string; token: string; pictureUrl?: string }) {
  const pageRef = db.doc(`users/${uid}/pages/${page.id}`);
  const secretRef = db.doc(`users/${uid}/pageSecrets/${page.id}`);
  await pageRef.set({
    name: page.name,
    pictureUrl: page.pictureUrl || '',
    connected: Boolean(page.token),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  if (page.token) {
    await secretRef.set({ encryptedToken: encryptSecret(page.token), updatedAt: FieldValue.serverTimestamp() });
  }
}

export async function deletePage(uid: string, pageId: string) {
  await Promise.all([
    db.doc(`users/${uid}/pages/${pageId}`).delete(),
    db.doc(`users/${uid}/pageSecrets/${pageId}`).delete(),
  ]);
}

export async function getPageToken(uid: string, pageId: string) {
  const snap = await db.doc(`users/${uid}/pageSecrets/${pageId}`).get();
  if (!snap.exists) throw new Error('Facebook Page chưa được kết nối hoặc token đã mất.');
  const token = snap.data()?.encryptedToken;
  if (!token) throw new Error('Facebook Page thiếu token.');
  return decryptSecret(String(token));
}

export async function publishPagePost(opts: { uid: string; pageId: string; content: string; imageUrl?: string }) {
  const token = await getPageToken(opts.uid, opts.pageId);
  let endpoint = `${graphBase()}/${encodeURIComponent(opts.pageId)}/feed`;
  const body = new URLSearchParams();
  body.set('message', opts.content);
  body.set('access_token', token);

  if (opts.imageUrl) {
    endpoint = `${graphBase()}/${encodeURIComponent(opts.pageId)}/photos`;
    body.set('url', opts.imageUrl);
    body.set('caption', opts.content);
    body.delete('message');
  }

  const response = await fetch(endpoint, { method: 'POST', body, cache: 'no-store' });
  const data = await response.json();
  if (!response.ok || data?.error) throw new Error(data?.error?.message || 'Facebook publish thất bại.');
  return { id: data?.id || data?.post_id || '' };
}
