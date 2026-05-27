<script setup lang="ts">
useSeoMeta({
  title: 'Terms of Service — TimeReward',
  description: 'Terms and conditions for using the TimeReward application.'
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
  <LegalPageLayout title="Terms of Service" :last-updated="lastUpdated">
    <p>
      These Terms of Service ("Terms") govern your access to and use of TimeReward, the time-tracking and rewards
      application available at <a :href="siteUrl">{{ siteUrl }}</a> (the "Service"), operated by us ("we," "us," or "our").
      By creating an account or using the Service, you agree to these Terms.
    </p>

    <h2>1. Eligibility</h2>
    <p>
      You must be at least 13 years old (or the minimum age required in your jurisdiction) and able to form a binding contract
      to use the Service. You are responsible for ensuring your use complies with applicable laws.
    </p>

    <h2>2. Your account</h2>
    <ul>
      <li>You must provide accurate registration information and keep your credentials secure.</li>
      <li>You are responsible for activity that occurs under your account.</li>
      <li>Notify us promptly at <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a> if you suspect unauthorized access.</li>
      <li>We may suspend or terminate accounts that violate these Terms or pose a security or abuse risk.</li>
    </ul>
    <p>
      In some environments we may restrict registration (for example, requiring usernames to include specific patterns during testing).
      Those restrictions apply only to new sign-ups and do not affect login for existing accounts unless otherwise stated.
    </p>

    <h2>3. Acceptable use</h2>
    <p>You agree not to:</p>
    <ul>
      <li>Use the Service for unlawful, harmful, or fraudulent purposes</li>
      <li>Attempt to gain unauthorized access to the Service, other accounts, or our systems</li>
      <li>Interfere with or disrupt the Service, including by automated scraping or excessive requests</li>
      <li>Reverse engineer or copy the Service except as permitted by law</li>
      <li>Upload malware or content that infringes others' rights</li>
    </ul>

    <h2>4. Subscriptions and payments</h2>
    <p>
      Some features may require a paid subscription. Prices, billing intervals, and trial terms are shown at checkout
      or in the app. Payments are processed by Stripe. By subscribing, you authorize us and Stripe to charge your
      payment method on a recurring basis until you cancel.
    </p>
    <ul>
      <li>Subscriptions renew automatically unless canceled before the renewal date.</li>
      <li>Taxes may apply depending on your location.</li>
      <li>Refunds are handled according to our refund policy and applicable law; contact support for billing questions.</li>
    </ul>

    <h2>5. Free trial</h2>
    <p>
      We may offer a free trial period for new users. Trial length and eligibility are described in the app.
      When a trial ends, continued use of paid features may require an active subscription.
    </p>

    <h2>6. Your content</h2>
    <p>
      You retain ownership of the data you enter into the Service (activities, timers, rewards, and similar content).
      You grant us a limited license to host, store, process, and display that data solely to operate and improve the Service.
    </p>

    <h2>7. Intellectual property</h2>
    <p>
      The Service, including its software, design, and branding, is owned by us or our licensors and is protected by
      intellectual property laws. These Terms do not grant you any rights to our trademarks or branding except as needed
      to use the Service as intended.
    </p>

    <h2>8. Disclaimer</h2>
    <p>
      THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED,
      INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
    </p>
    <p>
      TimeReward is a productivity and habit-tracking tool. It is not medical, psychological, or professional advice.
      Do not rely on the Service for health, safety, or compliance decisions.
    </p>

    <h2>9. Limitation of liability</h2>
    <p>
      TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE AND OUR SUPPLIERS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
      SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF
      THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE IS LIMITED TO THE GREATER OF (A) THE AMOUNT
      YOU PAID US IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) USD $100.
    </p>
    <p>
      Some jurisdictions do not allow certain limitations; in those cases, our liability is limited to the fullest extent permitted by law.
    </p>

    <h2>10. Indemnification</h2>
    <p>
      You agree to indemnify and hold us harmless from claims, damages, and expenses (including reasonable attorneys' fees)
      arising from your misuse of the Service or violation of these Terms.
    </p>

    <h2>11. Termination</h2>
    <p>
      You may stop using the Service at any time. We may suspend or terminate your access if you breach these Terms,
      if required by law, or if we discontinue the Service. Sections that by their nature should survive termination
      (including disclaimers, limitations of liability, and indemnification) will survive.
    </p>

    <h2>12. Changes to the Service or Terms</h2>
    <p>
      We may modify the Service or these Terms from time to time. We will post updated Terms on this page and update
      the "Last updated" date. Continued use after changes become effective constitutes acceptance of the revised Terms.
      If you do not agree, you must stop using the Service.
    </p>

    <h2>13. Governing law</h2>
    <p>
      These Terms are governed by the laws of the United States and the State of Washington, without regard to
      conflict-of-law principles, except where mandatory consumer protection laws in your country of residence apply.
    </p>

    <h2>14. Contact</h2>
    <p>
      Questions about these Terms:
      <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>.
    </p>
    <p>
      See also our
      <NuxtLink to="/privacy-policy">Privacy Policy</NuxtLink>.
    </p>
  </LegalPageLayout>
</template>
