import {
  LayoutDashboard,
  ReceiptText,
  ScrollText,
  Settings,
  Store,
  Users,
  Webhook,
} from 'lucide-react';
import { AppShell, type NavGroup } from '@/components/layout/app-shell';

const groups: NavGroup[] = [
  {
    label: 'Platform',
    items: [
      { label: 'Overview', to: '/admin', icon: LayoutDashboard, end: true },
      { label: 'All transactions', to: '/admin/transactions', icon: ReceiptText },
      { label: 'Users', to: '/admin/users', icon: Users },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { label: 'Webhook events', to: '/admin/webhooks', icon: Webhook },
      { label: 'Audit logs', to: '/admin/audit-logs', icon: ScrollText },
    ],
  },
  {
    label: 'Configuration',
    items: [{ label: 'Platform settings', to: '/admin/settings', icon: Settings }],
  },
  {
    label: 'Merchant view',
    items: [{ label: 'Merchant dashboard', to: '/dashboard', icon: Store }],
  },
];

export function AdminLayout() {
  return (
    <AppShell
      navGroups={groups}
      workspaceLabel="Platform console"
      workspaceTone="navy"
      homePath="/admin"
    />
  );
}
