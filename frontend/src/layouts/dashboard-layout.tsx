import {
  Code2,
  KeyRound,
  LayoutDashboard,
  ReceiptText,
  Settings,
  Shield,
  ShieldCheck,
  Webhook,
} from 'lucide-react';
import { AppShell, type NavGroup } from '@/components/layout/app-shell';
import { useAuth } from '@/hooks/use-auth';

export function DashboardLayout() {
  const { user } = useAuth();

  const groups: NavGroup[] = [
    {
      label: 'Workspace',
      items: [
        { label: 'Overview', to: '/dashboard', icon: LayoutDashboard, end: true },
        { label: 'Transactions', to: '/dashboard/transactions', icon: ReceiptText },
      ],
    },
    {
      label: 'Developers',
      items: [
        { label: 'API keys', to: '/dashboard/api-keys', icon: KeyRound },
        { label: 'Webhooks', to: '/dashboard/webhooks', icon: Webhook },
        { label: 'Integration', to: '/dashboard/integration', icon: Code2 },
      ],
    },
    {
      label: 'Account',
      items: [
        { label: 'Settings', to: '/dashboard/settings', icon: Settings },
        { label: 'Security', to: '/dashboard/security', icon: Shield },
      ],
    },
  ];

  if (user?.role === 'ADMIN') {
    groups.push({
      label: 'Platform',
      items: [{ label: 'Admin console', to: '/admin', icon: ShieldCheck, end: true }],
    });
  }

  return <AppShell navGroups={groups} workspaceLabel="Merchant workspace" />;
}
