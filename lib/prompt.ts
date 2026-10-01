import type { WorkspaceSettings } from '@/lib/types';

export function buildSocialPrompt(opts: { topic: string; instruction?: string; settings: WorkspaceSettings; length?: number }) {
  const { settings } = opts;
  return `Bạn là chuyên gia content social media tại Việt Nam. Hãy tạo nội dung Facebook có khả năng đọc tự nhiên, không sáo rỗng và không có kiểu “AI nói chuyện”.\n\nTHƯƠNG HIỆU\n${settings.brandName}\n\nNGỮ CẢNH THƯƠNG HIỆU\n${settings.brandContext}\n\nGIỌNG ĐIỆU\n${settings.defaultTone}\n\nCHỦ ĐỀ\n${opts.topic}\n\nYÊU CẦU BỔ SUNG\n${opts.instruction || 'Tự chủ đề xuất hook, nội dung chính và CTA phù hợp.'}\n\nHASHTAG\n${settings.hashtag}\n\nYÊU CẦU OUTPUT\n- Viết bằng tiếng Việt.\n- Không ghi tiêu đề “Nội dung bài đăng”.\n- Không giải thích quá trình suy luận.\n- Có xuống dòng hợp lý.\n- Ưu tiên một hook rõ ràng ở 1–2 câu đầu.\n- CTA tự nhiên, không ép mua.\n- Độ dài khoảng ${opts.length || 1200} ký tự.\n`;
}
