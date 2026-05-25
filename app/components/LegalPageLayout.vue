<script setup lang="ts">
defineProps<{
  title: string
  lastUpdated: string
}>()

const config = useRuntimeConfig()
const siteUrl = computed(() => (config.public.appUrl || 'https://myfocusrewards.com').replace(/\/$/, ''))
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
    <div class="max-w-3xl mx-auto">
      <div class="mb-8">
        <NuxtLink
          to="/"
          class="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          ← Back to TimeReward
        </NuxtLink>
      </div>

      <article class="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-8 md:p-10">
        <header class="mb-8 border-b border-slate-700/50 pb-6">
          <h1 class="text-3xl font-bold text-white mb-2">
            {{ title }}
          </h1>
          <p class="text-sm text-slate-400">
            Last updated: {{ lastUpdated }} ·
            <a :href="siteUrl" class="text-blue-400 hover:text-blue-300">{{ siteUrl.replace('https://', '') }}</a>
          </p>
        </header>

        <div class="legal-prose space-y-6 text-slate-300 text-sm leading-relaxed">
          <slot />
        </div>
      </article>

      <footer class="mt-8 flex flex-wrap gap-4 justify-center text-sm text-slate-500">
        <NuxtLink to="/privacy-policy" class="hover:text-slate-300 transition-colors">
          Privacy Policy
        </NuxtLink>
        <span aria-hidden="true">·</span>
        <NuxtLink to="/terms-of-service" class="hover:text-slate-300 transition-colors">
          Terms of Service
        </NuxtLink>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.legal-prose :deep(h2) {
  @apply text-lg font-semibold text-white mt-8 mb-3;
}
.legal-prose :deep(h3) {
  @apply text-base font-semibold text-slate-100 mt-5 mb-2;
}
.legal-prose :deep(p) {
  @apply text-slate-300;
}
.legal-prose :deep(ul) {
  @apply list-disc pl-5 space-y-1;
}
.legal-prose :deep(a) {
  @apply text-blue-400 hover:text-blue-300 underline;
}
</style>
