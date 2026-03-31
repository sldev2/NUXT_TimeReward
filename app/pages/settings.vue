<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-700/50 backdrop-blur-sm sticky top-0 z-10">
      <div class="max-w-2xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <NuxtLink 
              to="/home" 
              class="text-slate-400 hover:text-white transition-colors"
              title="Back to Home"
            >
              <svg class="w-6 h-6" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </NuxtLink>
            <h1 class="text-xl font-semibold text-white">Settings</h1>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-2xl mx-auto px-4 py-8">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
        {{ error }}
      </div>

      <!-- Settings Form -->
      <div v-else class="space-y-6">
        <!-- Auto-Pause Section -->
        <section class="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-700/50">
            <h2 class="text-lg font-medium text-white">Auto-Pause</h2>
            <p class="text-sm text-slate-400 mt-1">
              Automatically pause running timers after a period of inactivity
            </p>
          </div>
          
          <div class="px-6 py-5 space-y-5">
            <!-- Auto-Pause Minutes -->
            <div>
              <label for="autoPauseMinutes" class="block text-sm font-medium text-slate-300 mb-2">
                Auto-pause after (minutes)
              </label>
              <div class="flex items-center gap-4">
                <input
                  id="autoPauseMinutes"
                  v-model.number="localSettings.autoPauseMinutes"
                  type="range"
                  min="1"
                  max="120"
                  step="1"
                  class="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  @change="saveAutoPauseMinutes"
                />
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="localSettings.autoPauseMinutes"
                    type="number"
                    min="1"
                    max="120"
                    class="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    @change="saveAutoPauseMinutes"
                  />
                  <span class="text-slate-400 text-sm">min</span>
                </div>
              </div>
              <p class="text-xs text-slate-500 mt-2">
                Timers will automatically pause after this many minutes of running
              </p>
              <!-- PRD 4.1.3 Case 3 warning -->
              <div v-if="autoPauseWarning" class="mt-3 p-3 bg-amber-900/30 border border-amber-500/50 rounded-lg">
                <p class="text-sm text-amber-300">{{ autoPauseWarning }}</p>
              </div>
            </div>

            <!-- Flash on Auto-Pause Toggle -->
            <div class="flex items-center justify-between">
              <div>
                <label for="flashOnAutoPause" class="text-sm font-medium text-slate-300">
                  Animated indicator on auto-pause
                </label>
                <p class="text-xs text-slate-500 mt-1">
                  Show pulsing animation when a timer is auto-paused
                </p>
              </div>
              <button
                id="flashOnAutoPause"
                type="button"
                :class="[
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800',
                  localSettings.flashOnAutoPause ? 'bg-emerald-500' : 'bg-slate-600'
                ]"
                role="switch"
                :aria-checked="localSettings.flashOnAutoPause"
                @click="toggleFlashOnAutoPause"
              >
                <span
                  :class="[
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    localSettings.flashOnAutoPause ? 'translate-x-5' : 'translate-x-0'
                  ]"
                />
              </button>
            </div>

            <!-- Audio on Auto-Pause Toggle -->
            <div class="flex items-center justify-between">
              <div>
                <label for="audioOnAutoPause" class="text-sm font-medium text-slate-300">
                  Audio notification on auto-pause
                </label>
                <p class="text-xs text-slate-500 mt-1">
                  Play a sound when a timer is auto-paused
                </p>
              </div>
              <button
                id="audioOnAutoPause"
                type="button"
                :class="[
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800',
                  localSettings.audioOnAutoPause ? 'bg-emerald-500' : 'bg-slate-600'
                ]"
                role="switch"
                :aria-checked="localSettings.audioOnAutoPause"
                @click="toggleAudioOnAutoPause"
              >
                <span
                  :class="[
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    localSettings.audioOnAutoPause ? 'translate-x-5' : 'translate-x-0'
                  ]"
                />
              </button>
            </div>
          </div>
        </section>

        <!-- Rewardable Time Section -->
        <section class="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-700/50">
            <h2 class="text-lg font-medium text-white">Rewardable Time Goals</h2>
            <p class="text-sm text-slate-400 mt-1">
              Set your expected working hours for progress tracking
            </p>
          </div>
          
          <div class="px-6 py-5 space-y-5">
            <!-- Average Work Day -->
            <div>
              <label for="averageWorkDay" class="block text-sm font-medium text-slate-300 mb-2">
                Average Work Day (hours)
              </label>
              <div class="flex items-center gap-4">
                <input
                  id="averageWorkDay"
                  v-model.number="localSettings.averageWorkDay"
                  type="range"
                  min="1"
                  max="15"
                  step="0.5"
                  class="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  @change="saveAverageWorkDay"
                />
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="localSettings.averageWorkDay"
                    type="number"
                    min="1"
                    max="15"
                    step="0.5"
                    class="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    @change="saveAverageWorkDay"
                  />
                  <span class="text-slate-400 text-sm">hr</span>
                </div>
              </div>
              <p class="text-xs text-slate-500 mt-2">
                Your expected daily rewardable time goal (1-15 hours)
              </p>
            </div>

            <!-- Average Work Week -->
            <div>
              <label for="averageWorkWeek" class="block text-sm font-medium text-slate-300 mb-2">
                Average Work Week (hours)
              </label>
              <div class="flex items-center gap-4">
                <input
                  id="averageWorkWeek"
                  v-model.number="localSettings.averageWorkWeek"
                  type="range"
                  min="5"
                  max="100"
                  step="1"
                  class="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  @change="saveAverageWorkWeek"
                />
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="localSettings.averageWorkWeek"
                    type="number"
                    min="5"
                    max="100"
                    step="1"
                    class="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    @change="saveAverageWorkWeek"
                  />
                  <span class="text-slate-400 text-sm">hr</span>
                </div>
              </div>
              <p class="text-xs text-slate-500 mt-2">
                Your expected weekly rewardable time goal (5-100 hours)
              </p>
            </div>

            <!-- Include Non-Rewardable in Rewards Toggle -->
            <div class="flex items-center justify-between pt-2 border-t border-slate-700/50">
              <div>
                <label for="includeNonRewardableInRewards" class="text-sm font-medium text-slate-300">
                  Include Non-Rewardable time in Rewards
                </label>
                <p class="text-xs text-slate-500 mt-1">
                  When enabled, Non-Rewardable activity time counts toward Rewardable Time and Reward progress
                </p>
              </div>
              <button
                id="includeNonRewardableInRewards"
                type="button"
                :class="[
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800',
                  localSettings.includeNonRewardableInRewards ? 'bg-emerald-500' : 'bg-slate-600'
                ]"
                role="switch"
                :aria-checked="localSettings.includeNonRewardableInRewards"
                @click="toggleIncludeNonRewardableInRewards"
              >
                <span
                  :class="[
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    localSettings.includeNonRewardableInRewards ? 'translate-x-5' : 'translate-x-0'
                  ]"
                />
              </button>
            </div>

            <!-- Include Non-Rewardable in Breaks Toggle -->
            <div class="flex items-center justify-between pt-2 border-t border-slate-700/50">
              <div>
                <label for="includeNonRewardableInBreaks" class="text-sm font-medium text-slate-300">
                  Include Non-Rewardable time in Breaks
                </label>
                <p class="text-xs text-slate-500 mt-1">
                  When enabled, Non-Rewardable activity time counts toward Earned Break progress
                </p>
              </div>
              <button
                id="includeNonRewardableInBreaks"
                type="button"
                :class="[
                  'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800',
                  localSettings.includeNonRewardableInBreaks ? 'bg-emerald-500' : 'bg-slate-600'
                ]"
                role="switch"
                :aria-checked="localSettings.includeNonRewardableInBreaks"
                @click="toggleIncludeNonRewardableInBreaks"
              >
                <span
                  :class="[
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                    localSettings.includeNonRewardableInBreaks ? 'translate-x-5' : 'translate-x-0'
                  ]"
                />
              </button>
            </div>
          </div>
        </section>

        <!-- Appearance Section -->
        <section class="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-700/50">
            <h2 class="text-lg font-medium text-white">Appearance</h2>
            <p class="text-sm text-slate-400 mt-1">
              Customize how TimeReward looks
            </p>
          </div>
          
          <div class="px-6 py-5">
            <!-- Theme Selection -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-3">
                Theme
              </label>
              <div class="grid grid-cols-3 gap-3">
                <button
                  v-for="themeOption in themeOptions"
                  :key="themeOption.value"
                  :class="[
                    'flex flex-col items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all',
                    localSettings.theme === themeOption.value
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-600 hover:border-slate-500 bg-slate-700/50'
                  ]"
                  @click="setTheme(themeOption.value)"
                >
                  <component :is="themeOption.icon" class="w-6 h-6 text-slate-300" />
                  <span class="text-sm text-slate-300">{{ themeOption.label }}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Archived Activities Section -->
        <section class="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
          <div class="px-6 py-4 border-b border-slate-700/50">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-medium text-white">Archived Activities</h2>
                <p class="text-sm text-slate-400 mt-1">
                  Restore previously deleted activities
                </p>
              </div>
              <button
                v-if="!showArchived"
                class="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                @click="loadArchivedActivities"
              >
                Show archived
              </button>
              <button
                v-else
                class="text-sm text-slate-400 hover:text-slate-300 transition-colors"
                @click="showArchived = false"
              >
                Hide
              </button>
            </div>
          </div>
          
          <div v-if="showArchived" class="px-6 py-5">
            <div v-if="isLoadingArchived" class="flex justify-center py-4">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
            </div>
            
            <div v-else-if="archivedActivities.length === 0" class="text-center py-4">
              <p class="text-slate-500 text-sm">No archived activities</p>
            </div>
            
            <div v-else class="space-y-2">
              <div
                v-for="activity in archivedActivities"
                :key="activity.id"
                class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
              >
                <div>
                  <p class="text-white font-medium">{{ activity.name }}</p>
                  <p class="text-xs text-slate-500 capitalize">{{ activity.activityType.replace('_', ' ') }}</p>
                </div>
                <button
                  class="px-3 py-1.5 text-sm bg-emerald-500/20 text-emerald-400 rounded-lg
                         hover:bg-emerald-500/30 transition-colors"
                  :disabled="isRestoring === activity.id"
                  @click="restoreActivity(activity.id)"
                >
                  <span v-if="isRestoring === activity.id">Restoring...</span>
                  <span v-else>Restore</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Save Indicator -->
        <div 
          v-if="isSaving" 
          class="fixed bottom-6 right-6 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg"
        >
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
          <span class="text-sm text-slate-300">Saving...</span>
        </div>

        <div 
          v-if="showSaved" 
          class="fixed bottom-6 right-6 bg-emerald-500/20 border border-emerald-500/50 rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg"
        >
          <svg class="w-4 h-4 text-emerald-400" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="text-sm text-emerald-400">Saved</span>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'subscription']
})

const user = useSupabaseUser()
const { settings, isLoading, isSaving, error, fetchSettings, updateSetting } = useUserSettings()
const { 
  archivedActivities, 
  fetchArchivedActivities, 
  unarchiveActivity,
  runningActivity,
  getEffectiveAutoPauseCumulative,
  triggerAutoPause
} = useActivities()

// Local copy of settings for immediate UI feedback
// Initialize from existing global state (populated on Home page) rather than hardcoded defaults,
// so navigating back to Settings doesn't briefly flash stale values before the DB fetch completes.
const localSettings = ref({
  autoPauseMinutes: settings.value.autoPauseMinutes,
  flashOnAutoPause: settings.value.flashOnAutoPause,
  audioOnAutoPause: settings.value.audioOnAutoPause,
  includeNonRewardableInRewards: settings.value.includeNonRewardableInRewards,
  includeNonRewardableInBreaks: settings.value.includeNonRewardableInBreaks,
  averageWorkDay: settings.value.averageWorkDay,
  averageWorkWeek: settings.value.averageWorkWeek,
  theme: settings.value.theme
})

// Archived activities state
const showArchived = ref(false)
const isLoadingArchived = ref(false)
const isRestoring = ref<string | null>(null)

// Saved indicator
const showSaved = ref(false)
let savedTimeout: ReturnType<typeof setTimeout> | null = null

// AutoPause mid-session warning (PRD 4.1.3 Case 3)
const autoPauseWarning = ref('')

// Theme options
const themeOptions = [
  {
    value: 'light' as const,
    label: 'Light',
    icon: {
      template: '<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>'
    }
  },
  {
    value: 'dark' as const,
    label: 'Dark',
    icon: {
      template: '<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>'
    }
  },
  {
    value: 'system' as const,
    label: 'System',
    icon: {
      template: '<svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>'
    }
  }
]

// Sync local settings when fetched settings change
function syncLocalSettings() {
  localSettings.value = {
    autoPauseMinutes: settings.value.autoPauseMinutes,
    flashOnAutoPause: settings.value.flashOnAutoPause,
    audioOnAutoPause: settings.value.audioOnAutoPause,
    includeNonRewardableInRewards: settings.value.includeNonRewardableInRewards,
    includeNonRewardableInBreaks: settings.value.includeNonRewardableInBreaks,
    averageWorkDay: settings.value.averageWorkDay,
    averageWorkWeek: settings.value.averageWorkWeek,
    theme: settings.value.theme
  }
}

// Watch for user to be available (session restore), then fetch settings
watch(user, async (newUser) => {
  if (newUser?.id) {
    await fetchSettings()
    syncLocalSettings()
  }
}, { immediate: true })

// Also try on mount in case user is already available
onMounted(async () => {
  if (user.value?.id) {
    await fetchSettings()
    syncLocalSettings()
  }
})

// Watch for external settings changes
watch(settings, (newSettings) => {
  localSettings.value = {
    autoPauseMinutes: newSettings.autoPauseMinutes,
    flashOnAutoPause: newSettings.flashOnAutoPause,
    audioOnAutoPause: newSettings.audioOnAutoPause,
    includeNonRewardableInRewards: newSettings.includeNonRewardableInRewards,
    includeNonRewardableInBreaks: newSettings.includeNonRewardableInBreaks,
    averageWorkDay: newSettings.averageWorkDay,
    averageWorkWeek: newSettings.averageWorkWeek,
    theme: newSettings.theme
  }
}, { deep: true })

// Show saved indicator
function showSavedIndicator() {
  if (savedTimeout) {
    clearTimeout(savedTimeout)
  }
  showSaved.value = true
  savedTimeout = setTimeout(() => {
    showSaved.value = false
  }, 2000)
}

// Save handlers
async function saveAutoPauseMinutes() {
  localSettings.value.autoPauseMinutes = Math.max(1, Math.min(120, localSettings.value.autoPauseMinutes || 2))
  autoPauseWarning.value = ''

  // PRD 4.1.3 Case 3: check if a running activity has already exceeded the new threshold
  if (runningActivity.value) {
    const effectiveCumulative = getEffectiveAutoPauseCumulative()
    const newThresholdSeconds = localSettings.value.autoPauseMinutes * 60
    if (effectiveCumulative >= newThresholdSeconds) {
      const accumulatedMinutes = Math.round(effectiveCumulative / 60)
      autoPauseWarning.value = `The new autopause default value, applied to the current autopause countdown, will cause an immediate autopause event, which had already accumulated ${accumulatedMinutes} minutes.`
      const success = await updateSetting('autoPauseMinutes', localSettings.value.autoPauseMinutes)
      if (success) {
        showSavedIndicator()
        await triggerAutoPause(runningActivity.value.timer.id)
      }
      return
    }
  }

  const success = await updateSetting('autoPauseMinutes', localSettings.value.autoPauseMinutes)
  if (success) showSavedIndicator()
}

async function toggleFlashOnAutoPause() {
  localSettings.value.flashOnAutoPause = !localSettings.value.flashOnAutoPause
  const success = await updateSetting('flashOnAutoPause', localSettings.value.flashOnAutoPause)
  if (success) showSavedIndicator()
}

async function toggleAudioOnAutoPause() {
  localSettings.value.audioOnAutoPause = !localSettings.value.audioOnAutoPause
  const success = await updateSetting('audioOnAutoPause', localSettings.value.audioOnAutoPause)
  if (success) showSavedIndicator()
}

async function toggleIncludeNonRewardableInRewards() {
  localSettings.value.includeNonRewardableInRewards = !localSettings.value.includeNonRewardableInRewards
  const success = await updateSetting('includeNonRewardableInRewards', localSettings.value.includeNonRewardableInRewards)
  if (success) showSavedIndicator()
}

async function toggleIncludeNonRewardableInBreaks() {
  localSettings.value.includeNonRewardableInBreaks = !localSettings.value.includeNonRewardableInBreaks
  const success = await updateSetting('includeNonRewardableInBreaks', localSettings.value.includeNonRewardableInBreaks)
  if (success) showSavedIndicator()
}

async function saveAverageWorkDay() {
  // Clamp value between 1 and 15
  localSettings.value.averageWorkDay = Math.max(1, Math.min(15, localSettings.value.averageWorkDay || 8))
  const success = await updateSetting('averageWorkDay', localSettings.value.averageWorkDay)
  if (success) showSavedIndicator()
}

async function saveAverageWorkWeek() {
  // Clamp value between 5 and 100
  localSettings.value.averageWorkWeek = Math.max(5, Math.min(100, localSettings.value.averageWorkWeek || 40))
  const success = await updateSetting('averageWorkWeek', localSettings.value.averageWorkWeek)
  if (success) showSavedIndicator()
}

async function setTheme(theme: 'light' | 'dark' | 'system') {
  localSettings.value.theme = theme
  const success = await updateSetting('theme', theme)
  if (success) showSavedIndicator()
}

// Archived activities functions
async function loadArchivedActivities() {
  showArchived.value = true
  isLoadingArchived.value = true
  try {
    await fetchArchivedActivities()
  } finally {
    isLoadingArchived.value = false
  }
}

async function restoreActivity(activityId: string) {
  isRestoring.value = activityId
  try {
    await unarchiveActivity(activityId)
    showSavedIndicator()
  } finally {
    isRestoring.value = null
  }
}
</script>
