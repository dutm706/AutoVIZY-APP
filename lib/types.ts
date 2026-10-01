export type TargetType = 'page' | 'group' | 'profile';
export type PostStatus = 'draft' | 'scheduled' | 'manual_ready' | 'processing' | 'published' | 'failed';
export type AiProvider = 'openai' | 'gemini' | 'claude';

export interface WorkspaceSettings {
  brandName: string;
  defaultTone: string;
  brandContext: string;
  hashtag: string;
  defaultContentProvider: AiProvider;
  defaultImageProvider: AiProvider;
  timezone: string;
}

export interface PageAccount {
  id: string;
  name: string;
  pictureUrl?: string;
  connected: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SocialPost {
  id: string;
  title: string;
  content: string;
  targetType: TargetType;
  targetId: string;
  targetName: string;
  status: PostStatus;
  scheduledAt?: string;
  imagePath?: string;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  publishedPostId?: string;
  lastError?: string;
  attempts?: number;
}

export interface MediaItem {
  id: string;
  path: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt?: string;
  url?: string;
}
