'use client';
import { usePathname } from 'next/navigation';
import AppShell, { WorkspaceProvider } from '@/components/AppShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname.split('/').filter(Boolean)[1] || 'dashboard';
  return <WorkspaceProvider><AppShell active={active}>{children}</AppShell></WorkspaceProvider>;
}
