// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  future: {
    compatibilityVersion: 4
  },

  // Dev server config - localhost only (use '0.0.0.0' to allow LAN access e.g. from phone)
  devServer: {
    host: 'localhost',
    port: 3000
  },

  // Nitro configuration - suppress noisy warnings from dependencies
  nitro: {
    rollupConfig: {
      onwarn(warning, warn) {
        // Suppress "imported but never used" warnings from Supabase internals
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT' && 
            warning.exporter?.includes('@supabase/')) {
          return
        }
        // Suppress circular dependency warnings from node_modules (nitropack internals)
        if (warning.code === 'CIRCULAR_DEPENDENCY' && 
            warning.message?.includes('node_modules')) {
          return
        }
        warn(warning)
      }
    }
  },

  modules: [
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt'
  ],

  // Route-level SSR opt-out: login and register skip SSR entirely so the
  // Supabase server plugin doesn't make network calls (getClaims fetches JWKs
  // with 3 retries × DNS timeout, hanging 30-60s when offline).
  // Protected routes keep SSR with auth cookies.
  routeRules: {
    '/login': { ssr: false },
    '/register': { ssr: false },
  },

  // Supabase configuration
  supabase: {
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      include: undefined,
      exclude: ['/', '/register'],
      cookieRedirect: false,
    }
  },

  // Tailwind configuration
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
  },

  // Runtime config for environment variables
  runtimeConfig: {
    // Server-side only
    supabaseServiceRoleKey: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    // Stripe subscription price IDs
    stripePriceIdMonthly: '',    // 1-month plan
    stripePriceIdSemiannual: '', // 6-month plan
    stripePriceIdYearly: '',     // 12-month plan
    stripePriceIdDefault: '',    // Fallback default
    resendApiKey: '',
    turnstileSecretKey: '',
    skipEmailConfirmation: 'false', // Set to 'true' to auto-confirm new users (dev only)
    
    // Client-side (public)
    public: {
      appUrl: 'http://localhost:3000',
      appEnv: 'development', // development, staging, production
      stripePublishableKey: '',
      turnstileSiteKey: '',
      trialBypass: 'false', // Set to 'true' to bypass trial checks in development
      allowDemoData: 'false', // Set to 'true' to show Reset Demo Data button (dev/test/demo only)
      supabaseUrl: '', // Set via SUPABASE_URL
    }
  },

  // App configuration
  app: {
    head: {
      title: 'TimeReward',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Track your time, earn your rewards' }
      ]
    }
  }
})
