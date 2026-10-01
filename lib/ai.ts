import { fetchJson } from '@/lib/http';
import type { AiProvider } from '@/lib/types';

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Thiếu cấu hình ${name}. Hãy đặt Secret/Environment trên Firebase App Hosting.`);
  return value;
}

export function providerStatus() {
  return {
    openai: Boolean(process.env.OPENAI_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    claude: Boolean(process.env.ANTHROPIC_API_KEY),
  };
}

export async function generateContent(provider: AiProvider, prompt: string) {
  if (provider === 'openai') return generateOpenAIText(prompt);
  if (provider === 'gemini') return generateGeminiText(prompt);
  return generateClaudeText(prompt);
}

export async function generateImage(provider: AiProvider, prompt: string, aspectRatio = '4:5') {
  if (provider === 'openai') return generateOpenAIImage(prompt);
  if (provider === 'gemini') return generateGeminiImage(prompt, aspectRatio);
  const imagePrompt = await generateClaudeText(
    `Bạn là art director cho social media. Chuyển yêu cầu dưới đây thành IMAGE PROMPT tiếng Anh, giàu chi tiết hình ảnh, bố cục, ánh sáng, vật liệu, mood, không chèn text/logo trừ khi được yêu cầu. Chỉ trả về prompt.\n\n${prompt}`,
  );
  return { url: '', path: '', imagePrompt };
}

async function generateOpenAIText(prompt: string) {
  const apiKey = required('OPENAI_API_KEY');
  const model = process.env.OPENAI_TEXT_MODEL || 'gpt-5.6-luna';
  const data = await fetchJson<any>('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: prompt, max_output_tokens: 1800 }),
  }, 'OpenAI');
  return { text: data.output_text || extractOpenAIText(data), model };
}

function extractOpenAIText(data: any) {
  const chunks: string[] = [];
  for (const item of data?.output || []) {
    for (const c of item?.content || []) if (c?.type === 'output_text' && c?.text) chunks.push(c.text);
  }
  return chunks.join('\n').trim();
}

async function generateGeminiText(prompt: string) {
  const apiKey = required('GEMINI_API_KEY');
  const model = process.env.GEMINI_TEXT_MODEL || 'gemini-3.1-flash';
  const data = await fetchJson<any>(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
    },
    'Gemini',
  );
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('')?.trim();
  if (!text) throw new Error('Gemini không trả về text.');
  return { text, model };
}

async function generateClaudeText(prompt: string) {
  const apiKey = required('ANTHROPIC_API_KEY');
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
  const data = await fetchJson<any>('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens: 1800, messages: [{ role: 'user', content: prompt }] }),
  }, 'Claude');
  const text = data?.content?.filter((x: any) => x.type === 'text').map((x: any) => x.text).join('\n').trim();
  if (!text) throw new Error('Claude không trả về text.');
  return { text, model };
}

async function generateOpenAIImage(prompt: string) {
  const apiKey = required('OPENAI_API_KEY');
  const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
  const data = await fetchJson<any>('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, size: '1024x1024', n: 1 }),
  }, 'OpenAI Image');
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI Image không trả về dữ liệu ảnh.');
  return { buffer: Buffer.from(b64, 'base64'), mimeType: 'image/png', model };
}

async function generateGeminiImage(prompt: string, aspectRatio: string) {
  const apiKey = required('GEMINI_API_KEY');
  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      model,
      input: prompt,
      response_format: { type: 'image', mime_type: 'image/png', aspect_ratio: aspectRatio, image_size: '1K' },
    }),
    cache: 'no-store',
  });
  const text = await response.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = {}; }
  if (!response.ok) throw new Error(data?.error?.message || `Gemini Image thất bại (${response.status})`);
  const b64 = data?.output_image?.data;
  if (!b64) throw new Error('Gemini Image không trả về output_image.');
  return { buffer: Buffer.from(b64, 'base64'), mimeType: data?.output_image?.mime_type || 'image/png', model };
}
