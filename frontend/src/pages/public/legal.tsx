import type { ReactNode } from 'react';
import { usePageTitle } from '@/hooks/use-page-title';
import { usePublicSettings } from '@/hooks/use-app-data';
import { BRAND_NAME } from '@/lib/utils';

function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  const { data: settings } = usePublicSettings();
  usePageTitle(title);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">Legal</p>
      <h1 className="mt-3 text-[34px] font-bold tracking-[-0.04em] text-navy-900">{title}</h1>
      <p className="mt-2 text-[12.5px] text-muted">Last updated: {updated}</p>
      <div className="mt-8 space-y-7 text-[13.5px] leading-relaxed text-slate-600 [&_h2]:text-[16px] [&_h2]:font-semibold [&_h2]:text-navy-900 [&_li]:mt-1.5 [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
        <div className="rounded-xl border border-border bg-canvas p-4 text-[12px]">
          Questions about this page? Contact{' '}
          <a
            href={`mailto:${settings?.supportEmail ?? 'support@payflow.local'}`}
            className="font-medium text-brand-600 hover:underline"
          >
            {settings?.supportEmail ?? 'support@payflow.local'}
          </a>
          .
        </div>
      </div>
    </main>
  );
}

export function PrivacyPage() {
  const { data: settings } = usePublicSettings();
  const brand = settings?.brandName ?? BRAND_NAME;
  return (
    <LegalPage title="Privacy Policy" updated="23 October 2026">
      <p>
        This policy explains how {brand} collects, uses and protects information when you use the payment
        checkout, merchant dashboard and related APIs.
      </p>
      <div>
        <h2>Information we collect</h2>
        <ul>
          <li>Account information such as your name, email address and hashed password.</li>
          <li>Transaction information such as amount, currency, reference, status and customer email.</li>
          <li>Technical information such as IP address, browser user agent and session metadata.</li>
          <li>Audit records for sensitive actions performed in the dashboard.</li>
        </ul>
      </div>
      <div>
        <h2>Payment data</h2>
        <p>
          Card details are entered on Paystack’s hosted checkout and are not received or stored by{' '}
          {brand}. We receive payment status and reference information from Paystack so that transactions
          can be verified and reconciled.
        </p>
      </div>
      <div>
        <h2>How we use information</h2>
        <ul>
          <li>To initialize, verify and reconcile payments.</li>
          <li>To authenticate users and protect accounts against unauthorized access.</li>
          <li>To display transaction history and operational metrics to authorized users.</li>
          <li>To deliver signed webhook events to merchant-configured endpoints.</li>
          <li>To investigate failures, abuse and security incidents.</li>
        </ul>
      </div>
      <div>
        <h2>Cookies and sessions</h2>
        <p>
          Authentication uses an opaque, HTTP-only session cookie. A CSRF token is issued alongside the
          session and is required for state-changing requests. We do not use advertising cookies.
        </p>
      </div>
      <div>
        <h2>Sharing and retention</h2>
        <p>
          Payment processing is provided by Paystack. Information may be shared with service providers
          strictly to operate the service or where required by law. Transaction and audit records are
          retained for operational, accounting and security purposes.
        </p>
      </div>
      <div>
        <h2>Your choices</h2>
        <p>
          You can update your profile, change your password and revoke active sessions from the dashboard.
          For deletion or access requests, contact support.
        </p>
      </div>
    </LegalPage>
  );
}

export function TermsPage() {
  const { data: settings } = usePublicSettings();
  const brand = settings?.brandName ?? BRAND_NAME;
  return (
    <LegalPage title="Terms of Service" updated="23 October 2026">
      <p>
        These terms govern use of {brand}’s payment checkout, merchant dashboard and APIs. By using the
        service, you agree to these terms.
      </p>
      <div>
        <h2>Payment processing</h2>
        <p>
          Payments are processed by Paystack. {brand} initializes transactions and verifies their status
          server-side, but does not itself hold customer card details or act as a bank. Settlement timing
          and fees are governed by your Paystack agreement.
        </p>
      </div>
      <div>
        <h2>Merchant responsibilities</h2>
        <ul>
          <li>Keep API keys, passwords and webhook signing secrets confidential.</li>
          <li>Use the service only for lawful transactions and accurate customer information.</li>
          <li>Verify webhook signatures before acting on event payloads.</li>
          <li>Maintain a reachable, secure endpoint for delivered webhooks.</li>
        </ul>
      </div>
      <div>
        <h2>Availability and accuracy</h2>
        <p>
          Payment status is determined by the payment provider. A payment is only treated as successful
          after independent verification. The service may be temporarily unavailable during maintenance or
          provider outages.
        </p>
      </div>
      <div>
        <h2>Prohibited use</h2>
        <p>
          You may not use the service for fraud, money laundering, unlawful goods or services, or any
          activity that violates applicable law or Paystack’s acceptable use policies.
        </p>
      </div>
      <div>
        <h2>Limitation of liability</h2>
        <p>
          To the extent permitted by law, {brand} is not liable for indirect or consequential losses,
          provider outages, or losses caused by compromised credentials or unverified webhook payloads.
        </p>
      </div>
      <div>
        <h2>Changes</h2>
        <p>
          These terms may be updated as the service evolves. Continued use after an update constitutes
          acceptance of the revised terms.
        </p>
      </div>
    </LegalPage>
  );
}
