import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Code2,
  KeyRound,
  ShieldCheck,
  Terminal,
  Webhook,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CodeBlock } from '@/components/ui/code-block';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/alert';
import { usePageTitle } from '@/hooks/use-page-title';
import { API_BASE_URL } from '@/lib/api';

const endpoints = [
  {
    method: 'POST',
    path: '/payments/initialize',
    auth: 'API key or public',
    description: 'Create a transaction and receive a Paystack authorization URL.',
  },
  {
    method: 'GET',
    path: '/payments/verify/:reference',
    auth: 'Public',
    description: 'Verify a transaction directly with Paystack and reconcile its status.',
  },
  {
    method: 'GET',
    path: '/payments/:reference',
    auth: 'Public',
    description: 'Read a masked payment receipt by reference.',
  },
  {
    method: 'GET',
    path: '/payments',
    auth: 'Session',
    description: 'List your transactions with filters and pagination.',
  },
  {
    method: 'POST',
    path: '/webhooks/paystack',
    auth: 'Signature',
    description: 'Inbound Paystack events. Requires x-paystack-signature.',
  },
  {
    method: 'GET',
    path: '/settings/public',
    auth: 'Public',
    description: 'Public business name, support email and currency.',
  },
];

export default function IntegrationPage() {
  usePageTitle('Integration');
  const baseUrl = API_BASE_URL;

  const curlSnippet = `curl -X POST ${baseUrl}/payments/initialize \\
  -H "Authorization: Bearer pf_test_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "customer@example.com",
    "amount": 25000
  }'`;

  const nodeSnippet = `const response = await fetch('${baseUrl}/payments/initialize', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.PAYFLOW_SECRET_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'customer@example.com',
    amount: 25000,
  }),
});

const { data } = await response.json();
// Redirect the customer to data.authorizationUrl`;

  const verifySnippet = `curl ${baseUrl}/payments/verify/PF-YOUR-REFERENCE \\
  -H "Content-Type: application/json"`;

  const webhookSnippet = `import crypto from 'node:crypto';

export function verifyPayflowSignature(rawBody, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const a = Buffer.from(expected);
  const b = Buffer.from(signature ?? '');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Integration"
        description="Accept payments from your server with a small, predictable API."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard/api-keys">
                <KeyRound />
                API keys
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/dashboard/webhooks">
                <Webhook />
                Webhooks
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            step: '01',
            title: 'Create an API key',
            body: 'Generate a test key for local development and keep it on your server.',
            link: '/dashboard/api-keys',
          },
          {
            step: '02',
            title: 'Initialize a payment',
            body: 'Send the customer email and amount in naira. Redirect them to the authorization URL.',
            link: '#initialize',
          },
          {
            step: '03',
            title: 'Verify before fulfilment',
            body: 'Call the verify endpoint from your server or trust the signed webhook after verification.',
            link: '#verify',
          },
        ].map((item) => (
          <Card key={item.step} className="p-5">
            <span className="text-[11px] font-bold tracking-[0.1em] text-brand-600">{item.step}</span>
            <h3 className="mt-2 text-[13.5px] font-semibold text-navy-900">{item.title}</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{item.body}</p>
          </Card>
        ))}
      </div>

      <Alert tone="info" title="Amounts are in naira, not kobo">
        Send <code className="rounded bg-white/60 px-1 font-mono text-[11px]">25000</code> for ₦25,000. The
        API converts to kobo for Paystack and returns both{' '}
        <code className="rounded bg-white/60 px-1 font-mono text-[11px]">amountNgn</code> and{' '}
        <code className="rounded bg-white/60 px-1 font-mono text-[11px]">amountKobo</code>.
      </Alert>

      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>API examples</CardTitle>
            <p className="mt-0.5 text-[12px] text-muted">Test against your local API base URL</p>
          </div>
          <Badge variant="neutral">
            <Terminal className="size-3" />
            {baseUrl.replace(/^https?:\/\//, '')}
          </Badge>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="curl">
            <TabsList>
              <TabsTrigger value="curl">
                <Terminal className="size-3.5" />
                cURL
              </TabsTrigger>
              <TabsTrigger value="node">
                <Code2 className="size-3.5" />
                Node.js
              </TabsTrigger>
              <TabsTrigger value="verify">
                <FileVerifyIcon />
                Verify
              </TabsTrigger>
              <TabsTrigger value="webhook">
                <ShieldCheck className="size-3.5" />
                Signature
              </TabsTrigger>
            </TabsList>
            <TabsContent value="curl">
              <CodeBlock code={curlSnippet} language="bash" filename="initialize.sh" />
            </TabsContent>
            <TabsContent value="node">
              <CodeBlock code={nodeSnippet} language="javascript" filename="initialize.js" />
            </TabsContent>
            <TabsContent value="verify">
              <CodeBlock code={verifySnippet} language="bash" filename="verify.sh" />
            </TabsContent>
            <TabsContent value="webhook">
              <CodeBlock code={webhookSnippet} language="javascript" filename="verify-webhook.js" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-border bg-canvas/60">
              <tr>
                <th className="px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                  Method
                </th>
                <th className="px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                  Path
                </th>
                <th className="px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                  Auth
                </th>
                <th className="px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {endpoints.map((endpoint) => (
                <tr key={`${endpoint.method}-${endpoint.path}`}>
                  <td className="px-5 py-3">
                    <span className="rounded-md bg-brand-50 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-brand-700">
                      {endpoint.method}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-[11px] text-navy-900">{endpoint.path}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-[11.5px] text-muted">{endpoint.auth}</td>
                  <td className="px-5 py-3 text-[12px] text-slate-600">{endpoint.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <BookOpen className="size-5 text-brand-600" />
          <h3 className="mt-3 text-[13.5px] font-semibold text-navy-900">Error handling</h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            Errors return a consistent shape with a machine-readable code, message and optional field
            details. Treat 4xx as client errors and retry 5xx with backoff only where safe.
          </p>
          <Link
            to="/dashboard/api-keys"
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-600 hover:underline"
          >
            Create an API key
            <ArrowRight className="size-3" />
          </Link>
        </Card>
        <Card className="p-5">
          <ShieldCheck className="size-5 text-accent-600" />
          <h3 className="mt-3 text-[13.5px] font-semibold text-navy-900">Verification is mandatory</h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            Never fulfil an order from a browser redirect alone. Call the verify endpoint or process a
            signed webhook, and check that amount, currency and reference match your records.
          </p>
        </Card>
      </div>
    </div>
  );
}

function FileVerifyIcon() {
  return <ShieldCheck className="size-3.5" />;
}
