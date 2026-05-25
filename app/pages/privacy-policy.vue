<script setup lang="ts">
useSeoMeta({
  title: 'Privacy Policy — TimeReward',
  description: 'How TimeReward collects, uses, and protects your personal information.'
})

definePageMeta({
  layout: false
})

const config = useRuntimeConfig()
const siteUrl = computed(() => (config.public.appUrl || 'https://myfocusrewards.com').replace(/\/$/, ''))
const contactEmail = 'support@myfocusrewards.com'
const lastUpdated = 'May 23, 2026'
</script>

<template>
  <LegalPageLayout title="Privacy Policy" :last-updated="lastUpdated">
    <p>
      TimeReward ("we," "us," or "our") operates the time-tracking and rewards application
      available at <a :href="siteUrl">{{ siteUrl }}</a> (the "Service").
      This Privacy Policy explains what information we collect, how we use it, and the choices you have.
    </p>

    <h2>1. Information we collect</h2>
    <h3>Account information</h3>
    <p>When you register, we collect information you provide, such as:</p>
    <ul>
      <li>Username, first and last name, and email address</li>
      <li>Password (stored securely by our authentication provider; we do not store plain-text passwords)</li>
    </ul>

    <h3>App usage data</h3>
    <p>To provide the Service, we store data you create in the app, including:</p>
    <ul>
      <li>Activities, timers, and time logs</li>
      <li>Rewards, breaks, and related settings</li>
      <li>User preferences and subscription status</li>
    </ul>

    <h3>Payment information</h3>
    <p>
      If you subscribe to a paid plan, payment processing is handled by
      <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Stripe</a>.
      We receive subscription status and limited billing metadata from Stripe; we do not store full card numbers on our servers.
    </p>

    <h3>Technical information</h3>
    <p>
      Like most web applications, our hosting and infrastructure providers may process standard technical data
      such as IP address, browser type, device information, and request logs for security, performance, and troubleshooting.
    </p>

    <h3>Local device storage</h3>
    <p>
      The Service may store data locally in your browser (for example, session tokens and offline queue data)
      so the app can work when you are temporarily offline and sync when connectivity returns.
    </p>

    <h2>2. How we use information</h2>
    <p>We use the information we collect to:</p>
    <ul>
      <li>Create and manage your account and authenticate you</li>
      <li>Provide, maintain, and improve the Service</li>
      <li>Sync your data across devices you use with the same account</li>
      <li>Process subscriptions and communicate about billing</li>
      <li>Send transactional emails (such as account confirmation or password reset) when applicable</li>
      <li>Respond to support requests and protect against abuse or security incidents</li>
    </ul>
    <p>We do not sell your personal information.</p>

    <h2>3. Service providers</h2>
    <p>We use trusted third parties to operate the Service, including:</p>
    <ul>
      <li><strong>Supabase</strong> — authentication, database, and hosting infrastructure</li>
      <li><strong>Vercel</strong> — application hosting</li>
      <li><strong>Stripe</strong> — payment processing for subscriptions</li>
      <li><strong>Email providers</strong> — delivery of authentication and transactional email (for example, Supabase and/or Resend, depending on configuration)</li>
    </ul>
    <p>
      These providers process data on our behalf according to their own privacy policies and our agreements with them.
    </p>

    <h2>4. Data retention</h2>
    <p>
      We retain your account and app data for as long as your account is active or as needed to provide the Service.
      If you delete your account or ask us to delete your data, we will delete or anonymize personal information
      within a reasonable period, except where we must retain certain records for legal, security, or billing purposes.
    </p>

    <h2>5. Security</h2>
    <p>
      We use industry-standard measures to protect your information, including encrypted connections (HTTPS),
      access controls, and row-level security in our database. No method of transmission or storage is completely secure,
      and we cannot guarantee absolute security.
    </p>

    <h2>6. Your choices and rights</h2>
    <p>Depending on where you live, you may have the right to:</p>
    <ul>
      <li>Access, correct, or delete personal information we hold about you</li>
      <li>Export your data or close your account</li>
      <li>Object to or restrict certain processing</li>
      <li>Withdraw consent where processing is based on consent</li>
    </ul>
    <p>
      To make a request, contact us at
      <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>.
      We may need to verify your identity before fulfilling a request.
    </p>

    <h2>7. Children</h2>
    <p>
      The Service is not directed to children under 13 (or the minimum age required in your jurisdiction),
      and we do not knowingly collect personal information from children. If you believe a child has provided us
      personal information, please contact us so we can delete it.
    </p>

    <h2>8. International users</h2>
    <p>
      Your information may be processed in the United States and other countries where our service providers operate.
      By using the Service, you consent to this transfer and processing, subject to applicable law.
    </p>

    <h2>9. Changes to this policy</h2>
    <p>
      We may update this Privacy Policy from time to time. We will post the revised version on this page and update
      the "Last updated" date. Material changes may also be communicated by email or in-app notice where appropriate.
    </p>

    <h2>10. Contact us</h2>
    <p>
      Questions about this Privacy Policy or our data practices:
      <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>.
    </p>
    <p>
      See also our
      <NuxtLink to="/terms-of-service">Terms of Service</NuxtLink>.
    </p>
  </LegalPageLayout>
</template>
