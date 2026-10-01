import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AutoSocial AI',
  description: 'AI Facebook Publisher — nội dung, hình ảnh, lịch đăng và Facebook Pages.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
