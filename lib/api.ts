import { NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';

export function ok<T extends Record<string, any>>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(error: unknown) {
  if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
  const message = error instanceof Error ? error.message : 'Đã xảy ra lỗi.';
  return NextResponse.json({ error: message }, { status: 400 });
}

export function serializeValue(value: any): any {
  if (value == null) return value;
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serializeValue(v)]));
  return value;
}

export function cleanDoc<T extends Record<string, any>>(data: T) {
  return serializeValue(data);
}
