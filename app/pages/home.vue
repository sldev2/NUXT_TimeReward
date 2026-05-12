<script setup lang="ts">
import type { ActivityWithTimer, ActivityType } from '~/types/activity'
import { getActivityEstimateSeconds } from '~/types/activity'
import type { Reward, RewardType, BankedReward } from '~/types/rewards'
import { getRewardTypeConfig, formatRewardSeconds } from '~/utils/rewardTypeConfig'

definePageMeta({
  middleware: ['auth', 'subscription']
})

const { profile, signOut } = useAuth()
const { connectionState, statusLabel, statusClass, toastMessage: connectionToast, toastType: connectionToastType, dismissToast } = useConnectionStatus()
const { queue, clearQueue } = useOfflineQueue()
const { settings: userSettings, fetchSettings } = useUserSettings()
const { 
  activities, 
  isLoading, 
  error, 
  todaysTotals,
  effectiveRewardableSeconds,
  toggleTimer,
  stopTimer,
  toggleActivityComplete,
  createActivity,
  updateActivity,
  deleteActivity,
  isAutoPaused,
  autoPausedAfterSeconds,
  autoPauseCumulativeBase,
  autoPauseMinutes,
  clearAutoPause,
  clearError,
  getServerTime,
  isSynced,
  lastResetDate,
  fetchActivities
} = useActivities()

// Rewards composable
const {
  rewards: rewardsList,
  cashedInRewards,
  rewardProgress,
  fetchRewards,
  createReward,
  updateReward,
  archiveReward,
  cashInReward,
  getPeriodBoundaries,
  getClaimedCycles
} = useRewards()

// Breaks composable
const {
  breaks,
  breakProgress,
  fetchBreaks,
  createBreak,
  updateBreak,
  activateBreak,
  resetBreak,
  archiveBreak,
  // Active break state
  activeBreak,
  breakStartedAt,
  breakJustEnded,
  takeBreak,
  endBreak,
  clearBreakEnded
} = useBreaks()

// Runtime config for demo data button visibility
const config = useRuntimeConfig()
// Debug: log the config value to see what's being read
if (import.meta.client) {
  console.log('allowDemoData config value:', config.public.allowDemoData, typeof config.public.allowDemoData)
}
const showDemoButton = computed(() => config.public.allowDemoData === 'true' || config.public.allowDemoData === true)

// Demo data reset state
const isResettingDemo = ref(false)
const demoResetMessage = ref('')

async function resetDemoData() {
  if (!confirm('This will reset all your activities, rewards, and breaks to demo defaults. Continue?')) {
    return
  }
  
  isResettingDemo.value = true
  demoResetMessage.value = ''
  
  try {
    const response = await $fetch('/api/admin/load-demo-data', { method: 'POST' })
    clearQueue()
    demoResetMessage.value = `Demo data loaded: ${response.data.activities} activities, ${response.data.rewards} rewards, ${response.data.breaks} breaks`
    
    // Refresh client state; timeout guard in case realtime event storm causes a hang
    const refreshTimeout = setTimeout(() => {
      demoResetMessage.value = 'Refresh timed out — reloading page...'
      window.location.reload()
    }, 10_000)

    try {
      await fetchSettings()
      await fetchActivities()
      await fetchRewards()
      await fetchBreaks()
    } finally {
      clearTimeout(refreshTimeout)
    }
    
    setTimeout(() => {
      demoResetMessage.value = ''
    }, 5000)
  } catch (e: any) {
    demoResetMessage.value = `Error: ${e.data?.message || e.message || 'Failed to reset demo data'}`
  } finally {
    isResettingDemo.value = false
  }
}

// Three-dot context menu state (shared across all card types)
const openMenuId = ref<string | null>(null)
function toggleMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? null : id
}
function closeMenu() {
  openMenuId.value = null
}
if (import.meta.client) {
  onMounted(() => {
    document.addEventListener('click', closeMenu)
  })
  onUnmounted(() => {
    document.removeEventListener('click', closeMenu)
  })
}

// Modal states
const showAddModal = ref(false)
const showEditModal = ref(false)
const editingActivity = ref<ActivityWithTimer | null>(null)

// Break modal states
const showAddBreakModal = ref(false)
const showEditBreakModal = ref(false)
const editingBreak = ref<{ id: string; name: string; goalMinutes: number; breakDurationMinutes: number | null; isRecurring: boolean } | null>(null)
const breakForm = ref({
  name: '',
  goalMinutes: 30,
  breakDurationMinutes: null as number | null,
  isRecurring: true
})

// Reward modal states
const showAddRewardModal = ref(false)
const showEditRewardModal = ref(false)
const editingRewardItem = ref<Reward | null>(null)
const showCashInConfirm = ref(false)
const cashingInReward = ref<Reward | null>(null)
const rewardForm = ref({
  name: '',
  rewardType: 'daily' as RewardType,
  workGoal: 8,
  isRecurring: true
})

const rewardTypeConfig = computed(() => getRewardTypeConfig(rewardForm.value.rewardType))

watch(() => rewardForm.value.rewardType, (newType) => {
  const config = getRewardTypeConfig(newType)
  rewardForm.value.workGoal = config.default
})

// Estimate type for form
type EstimateTypeForm = 'none' | 'general' | 'weekday'

// Form state for add/edit
const activityForm = ref({
  name: '',
  description: '',
  activityType: 'rewardable' as ActivityType,
  autoRepeat: true,
  estimateType: 'none' as EstimateTypeForm,
  generalEstimateHours: 1.0,
  estimateMon: 1.0,
  estimateTue: 1.0,
  estimateWed: 1.0,
  estimateThu: 1.0,
  estimateFri: 1.0,
  estimateSat: 0.0,
  estimateSun: 0.0
})

// Estimate type options for the form
const estimateTypeOptions = [
  { value: 'none', label: 'No Estimate' },
  { value: 'general', label: 'General Daily' },
  { value: 'weekday', label: 'Specific Days' }
]

// Day names for weekday estimates
const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const isSubmitting = ref(false)

// Activity type options
const activityTypes: { value: ActivityType; label: string; color: string }[] = [
  { value: 'rewardable', label: 'Rewardable', color: 'text-green-400' },
  { value: 'non_rewardable', label: 'Non-Rewardable', color: 'text-yellow-400' },
  { value: 'wasted', label: 'Wasted', color: 'text-red-400' }
]

function resetForm() {
  activityForm.value = {
    name: '',
    description: '',
    activityType: 'rewardable',
    autoRepeat: true,
    estimateType: 'none',
    generalEstimateHours: 1.0,
    estimateMon: 1.0,
    estimateTue: 1.0,
    estimateWed: 1.0,
    estimateThu: 1.0,
    estimateFri: 1.0,
    estimateSat: 0.0,
    estimateSun: 0.0
  }
}

function openAddModal() {
  resetForm()
  showAddModal.value = true
}

function openEditModal(activity: ActivityWithTimer) {
  editingActivity.value = activity
  activityForm.value = { 
    name: activity.name,
    description: activity.description || '',
    activityType: activity.activityType,
    autoRepeat: activity.autoRepeat,
    estimateType: activity.estimateType,
    generalEstimateHours: activity.generalEstimateHours,
    estimateMon: activity.estimateMon,
    estimateTue: activity.estimateTue,
    estimateWed: activity.estimateWed,
    estimateThu: activity.estimateThu,
    estimateFri: activity.estimateFri,
    estimateSat: activity.estimateSat,
    estimateSun: activity.estimateSun
  }
  showEditModal.value = true
}

function closeModals() {
  showAddModal.value = false
  showEditModal.value = false
  editingActivity.value = null
  showAddBreakModal.value = false
  showEditBreakModal.value = false
  editingBreak.value = null
  showAddRewardModal.value = false
  showEditRewardModal.value = false
  editingRewardItem.value = null
  showCashInConfirm.value = false
  cashingInReward.value = null
  resetForm()
  breakForm.value = { name: '', goalMinutes: 30, breakDurationMinutes: null, isRecurring: true }
  rewardForm.value = { name: '', rewardType: 'daily', workGoal: 8, isRecurring: true }
}

async function handleAddActivity() {
  if (!activityForm.value.name.trim()) return
  
  isSubmitting.value = true
  try {
    const result = await createActivity({
      name: activityForm.value.name.trim(),
      activityType: activityForm.value.activityType,
      description: activityForm.value.description || undefined,
      autoRepeat: activityForm.value.autoRepeat,
      estimateType: activityForm.value.estimateType,
      generalEstimateHours: activityForm.value.generalEstimateHours,
      estimateMon: activityForm.value.estimateMon,
      estimateTue: activityForm.value.estimateTue,
      estimateWed: activityForm.value.estimateWed,
      estimateThu: activityForm.value.estimateThu,
      estimateFri: activityForm.value.estimateFri,
      estimateSat: activityForm.value.estimateSat,
      estimateSun: activityForm.value.estimateSun
    })
    if (result) closeModals()
  } finally {
    isSubmitting.value = false
  }
}

async function handleUpdateActivity() {
  if (!editingActivity.value || !activityForm.value.name.trim()) return
  
  isSubmitting.value = true
  try {
    const ok = await updateActivity(editingActivity.value.id, {
      name: activityForm.value.name.trim(),
      activityType: activityForm.value.activityType,
      description: activityForm.value.description || undefined,
      autoRepeat: activityForm.value.autoRepeat,
      estimateType: activityForm.value.estimateType,
      generalEstimateHours: activityForm.value.generalEstimateHours,
      estimateMon: activityForm.value.estimateMon,
      estimateTue: activityForm.value.estimateTue,
      estimateWed: activityForm.value.estimateWed,
      estimateThu: activityForm.value.estimateThu,
      estimateFri: activityForm.value.estimateFri,
      estimateSat: activityForm.value.estimateSat,
      estimateSun: activityForm.value.estimateSun
    })
    if (ok) closeModals()
  } finally {
    isSubmitting.value = false
  }
}

async function handleDeleteActivity(activity: ActivityWithTimer) {
  if (!confirm(`Are you sure you want to delete "${activity.name}"?`)) return
  
  await deleteActivity(activity.id)
}

// ========== Break handlers ==========

async function handleAddBreak() {
  if (!breakForm.value.name.trim()) return
  isSubmitting.value = true
  try {
    const result = await createBreak(
      breakForm.value.name.trim(),
      breakForm.value.goalMinutes,
      breakForm.value.breakDurationMinutes,
      breakForm.value.isRecurring,
      effectiveRealtimeBreakable.value
    )
    if (result) closeModals()
  } finally {
    isSubmitting.value = false
  }
}

async function handleTakeBreak(breakId: string) {
  try {
    const active = activities.value.find(a =>
      a.timer.status === 'running' || a.timer.status === 'auto_paused'
    )
    if (active) {
      lastActivityBeforeBreak.value = active.name
      await stopTimer(active.timer.id)
    } else {
      const lastPaused = activities.value.find(a => a.timer.status === 'paused')
      lastActivityBeforeBreak.value = lastPaused?.name ?? null
    }

    await takeBreak(breakId)
  } catch (e) {
    console.error('[handleTakeBreak] Error:', e)
  }
}

function openEditBreakModal(userBreak: { id: string; name: string; goalMinutes: number; breakDurationMinutes: number | null; isRecurring: boolean }) {
  editingBreak.value = userBreak
  breakForm.value = {
    name: userBreak.name,
    goalMinutes: userBreak.goalMinutes,
    breakDurationMinutes: userBreak.breakDurationMinutes,
    isRecurring: userBreak.isRecurring
  }
  closeMenu()
  showEditBreakModal.value = true
}

async function handleUpdateBreak() {
  if (!editingBreak.value || !breakForm.value.name.trim()) return
  isSubmitting.value = true
  try {
    const ok = await updateBreak(editingBreak.value.id, {
      name: breakForm.value.name.trim(),
      goalMinutes: breakForm.value.goalMinutes,
      breakDurationMinutes: breakForm.value.breakDurationMinutes,
      isRecurring: breakForm.value.isRecurring
    })
    if (ok) closeModals()
  } finally {
    isSubmitting.value = false
  }
}

async function handleDeleteBreak(userBreak: { id: string; name: string }) {
  if (!confirm(`Delete break "${userBreak.name}"? This cannot be undone.`)) return
  closeMenu()
  await archiveBreak(userBreak.id)
}

async function handleEndBreak() {
  if (!activeBreak.value) return
  
  // Clear last activity reference
  lastActivityBeforeBreak.value = null
  
  // Clear any stale toast message
  breakToastMessage.value = ''
  
  // End the break (clears state, resets recurring breaks with fresh baseline)
  await endBreak(effectiveRealtimeBreakable.value)
  
  // Ensure activities are re-fetched so UI state is fully fresh
  await fetchActivities()
}

// ========== Reward handlers ==========

async function handleAddReward() {
  if (!rewardForm.value.name.trim()) return
  isSubmitting.value = true
  try {
    const result = await createReward(
      rewardForm.value.name.trim(),
      rewardForm.value.rewardType,
      rewardForm.value.workGoal,
      rewardForm.value.isRecurring
    )
    if (result) {
      closeModals()
    }
  } catch (e) {
    console.error('[handleAddReward] Uncaught error:', e)
  } finally {
    isSubmitting.value = false
  }
}

function openEditRewardModal(reward: Reward) {
  editingRewardItem.value = reward
  rewardForm.value = {
    name: reward.name,
    rewardType: reward.rewardType,
    workGoal: reward.workGoal ?? getRewardTypeConfig(reward.rewardType).default,
    isRecurring: reward.isRecurring
  }
  closeMenu()
  showEditRewardModal.value = true
}

async function handleUpdateReward() {
  if (!editingRewardItem.value || !rewardForm.value.name.trim()) return
  isSubmitting.value = true
  try {
    const ok = await updateReward(editingRewardItem.value.id, {
      name: rewardForm.value.name.trim(),
      rewardType: rewardForm.value.rewardType,
      workGoal: rewardForm.value.workGoal,
      isRecurring: rewardForm.value.isRecurring
    })
    if (ok) closeModals()
  } finally {
    isSubmitting.value = false
  }
}

async function handleDeleteReward(reward: Reward) {
  if (!confirm(`Delete reward "${reward.name}"? This cannot be undone.`)) return
  closeMenu()
  await archiveReward(reward.id)
}

function openCashInConfirm(reward: Reward) {
  cashingInReward.value = reward
  showCashInConfirm.value = true
}

async function handleCashInReward() {
  if (!cashingInReward.value) return
  isSubmitting.value = true
  try {
    await cashInReward(cashingInReward.value.id, null, '')
    closeModals()
  } finally {
    isSubmitting.value = false
  }
}

// Current time for real-time timer display (updates every second).
// Always ticks while the page is mounted — getDisplaySeconds only adds
// elapsed time for 'running' timers, so idle timers don't flicker.
// This avoids relying on a computed/watch chain that can break when
// optimistic updates set status='running' via shallowRef reassignment.
const now = ref(Date.now())
let timerInterval: ReturnType<typeof setInterval> | null = null

const hasRunningTimer = computed(() =>
  activities.value.some(a => a.timer.status === 'running') || !!activeBreak.value
)

onMounted(() => {
  now.value = getServerTime()
  timerInterval = setInterval(() => {
    now.value = getServerTime()
  }, 1000)
})

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
})

/**
 * Get the display seconds for an activity timer.
 * For running timers, calculates elapsed time since lastStartedAt.
 * For stopped timers, just returns todaySeconds.
 * Always returns a non-negative value to prevent display glitches.
 */
function getDisplaySeconds(activity: ActivityWithTimer): number {
  // For running timers, calculate elapsed time since start
  if (activity.timer.status === 'running' && activity.timer.lastStartedAt) {
    const startTime = new Date(activity.timer.lastStartedAt).getTime()
    const elapsedSinceStart = Math.floor((now.value - startTime) / 1000)
    // Guard against negative values (can happen with clock sync timing)
    return Math.max(0, activity.timer.todaySeconds + elapsedSinceStart)
  }
  // For auto-paused timers, calculate time up to when auto-pause was triggered
  if (activity.timer.status === 'auto_paused' && activity.timer.lastStartedAt) {
    const startTime = new Date(activity.timer.lastStartedAt).getTime()
    const pauseTime = activity.timer.autoPauseAt 
      ? new Date(activity.timer.autoPauseAt).getTime() 
      : now.value
    const elapsedSinceStart = Math.floor((pauseTime - startTime) / 1000)
    // Guard against negative values
    return Math.max(0, activity.timer.todaySeconds + elapsedSinceStart)
  }
  return Math.max(0, activity.timer.todaySeconds)
}

/**
 * Get the display seconds for the "All" (total) timer.
 * For running timers, adds elapsed time since lastStartedAt so "All" updates in real time.
 * For stopped/paused, returns the persisted allTimeSeconds.
 */
function getDisplayAllSeconds(activity: ActivityWithTimer): number {
  if (activity.timer.status === 'running' && activity.timer.lastStartedAt) {
    const startTime = new Date(activity.timer.lastStartedAt).getTime()
    const elapsedSinceStart = Math.floor((now.value - startTime) / 1000)
    return Math.max(0, activity.timer.allTimeSeconds + elapsedSinceStart)
  }
  if (activity.timer.status === 'auto_paused' && activity.timer.lastStartedAt && activity.timer.autoPauseAt) {
    const startTime = new Date(activity.timer.lastStartedAt).getTime()
    const pauseTime = new Date(activity.timer.autoPauseAt).getTime()
    const elapsedSinceStart = Math.floor((pauseTime - startTime) / 1000)
    return Math.max(0, activity.timer.allTimeSeconds + elapsedSinceStart)
  }
  return Math.max(0, activity.timer.allTimeSeconds)
}

/**
 * Calculate real-time totals by activity type
 */
const realtimeTotals = computed(() => {
  const totals = { rewardable: 0, non_rewardable: 0, wasted: 0 }
  for (const activity of activities.value) {
    const type = activity.activityType as keyof typeof totals
    if (type in totals) {
      totals[type] += getDisplaySeconds(activity)
    }
  }
  return totals
})

/**
 * Calculate effective real-time rewardable seconds based on user setting
 * When includeNonRewardableInRewards is true, includes both rewardable and non_rewardable time
 * This is used for Rewardable Time display and progress calculations
 */
const effectiveRealtimeRewardable = computed(() => {
  const baseRewardable = realtimeTotals.value.rewardable
  if (userSettings.value.includeNonRewardableInRewards) {
    return baseRewardable + realtimeTotals.value.non_rewardable
  }
  return baseRewardable
})

/**
 * Calculate effective real-time breakable seconds based on user setting
 * When includeNonRewardableInBreaks is true, includes both rewardable and non_rewardable time
 * This is used for Earned Breaks progress calculations
 */
const effectiveRealtimeBreakable = computed(() => {
  const baseRewardable = realtimeTotals.value.rewardable
  if (userSettings.value.includeNonRewardableInBreaks) {
    return baseRewardable + realtimeTotals.value.non_rewardable
  }
  return baseRewardable
})

/**
 * Real-time reward progress — uses live effectiveRealtimeRewardable instead of DB-backed values
 */
const realtimeRewardProgress = computed(() => {
  const rawSeconds = effectiveRealtimeRewardable.value
  const rawMinutes = Math.floor(rawSeconds / 60)
  return rewardsList.value.map(reward => {
    const goalSeconds = reward.goalMinutes * 60
    const { start, end } = getPeriodBoundaries(reward.rewardType)

    if (reward.isRecurring) {
      const totalEarned = reward.goalMinutes > 0 ? Math.floor(rawMinutes / reward.goalMinutes) : 0
      const claimed = getClaimedCycles(reward.id, start, end)
      const unclaimed = Math.max(0, totalEarned - claimed)
      const consumedSeconds = claimed * goalSeconds
      const effectiveSeconds = Math.max(0, rawSeconds - consumedSeconds)
      const cycleSeconds = effectiveSeconds % goalSeconds
      const progressPercent = goalSeconds > 0 ? (cycleSeconds / goalSeconds) * 100 : 0

      return {
        reward,
        currentMinutes: Math.floor(cycleSeconds / 60),
        currentSeconds: cycleSeconds,
        goalMinutes: reward.goalMinutes,
        goalSeconds,
        progressPercent,
        isComplete: unclaimed > 0,
        unclaimedCycles: unclaimed,
        periodStart: start,
        periodEnd: end
      }
    }

    const progressPercent = reward.goalMinutes > 0
      ? Math.min(100, (rawMinutes / reward.goalMinutes) * 100)
      : 0
    return {
      reward,
      currentMinutes: rawMinutes,
      currentSeconds: rawSeconds,
      goalMinutes: reward.goalMinutes,
      goalSeconds,
      progressPercent,
      isComplete: rawMinutes >= reward.goalMinutes,
      unclaimedCycles: rawMinutes >= reward.goalMinutes ? 1 : 0,
      periodStart: start,
      periodEnd: end
    }
  })
})

/**
 * Check if a timestamp falls on or after today's 3 AM rollover boundary.
 * Used to determine whether a break's baseline_seconds should be applied.
 */
function isCreatedToday(createdAt: string): boolean {
  const created = new Date(createdAt)
  const now = new Date()
  const rollover = new Date(now)
  rollover.setHours(3, 0, 0, 0)
  if (now < rollover) {
    rollover.setDate(rollover.getDate() - 1)
  }
  return created >= rollover
}

/**
 * Real-time break progress — uses live effectiveRealtimeBreakable.
 * For breaks created today, subtracts baseline_seconds so they don't
 * retroactively inherit time accumulated before they existed.
 */
const realtimeBreakProgress = computed(() => {
  return breaks.value
    .filter(userBreak => {
      // PRD 10.7.4: Hide non-recurring breaks that have been taken (unless currently active)
      if (!userBreak.isRecurring && userBreak.activatedToday && activeBreak.value?.id !== userBreak.id) {
        return false
      }
      return true
    })
    .map(userBreak => {
      const rawProgress = Math.max(0, effectiveRealtimeBreakable.value - userBreak.baselineSeconds)
      const goalSeconds = userBreak.goalMinutes * 60
      const isComplete = rawProgress >= goalSeconds
      const progressSeconds = Math.min(rawProgress, goalSeconds)
      const progressPercent = goalSeconds > 0 ? Math.min(100, (progressSeconds / goalSeconds) * 100) : 0
      return {
        break: userBreak,
        progressMinutes: Math.floor(progressSeconds / 60),
        progressSeconds,
        goalMinutes: userBreak.goalMinutes,
        progressPercent,
        isComplete,
        earnedBreakMinutes: isComplete ? userBreak.breakDurationMinutes : 0
      }
    })
})

/**
 * Reward tab state
 */
const activeRewardTab = ref<RewardType>('daily')
const availableRewardTabs = computed(() => {
  const types = new Set(rewardsList.value.map(r => r.rewardType))
  const allTabs: RewardType[] = ['daily', 'semi_weekly', 'weekly', 'monthly', 'quarterly', 'yearly']
  return allTabs.filter(t => types.has(t))
})

// Auto-select first available tab when rewards change
watch(availableRewardTabs, (tabs) => {
  if (tabs.length > 0 && !tabs.includes(activeRewardTab.value)) {
    activeRewardTab.value = tabs[0]
  }
}, { immediate: true })

/**
 * Rewards filtered by active tab
 */
const filteredRewardProgress = computed(() => {
  return realtimeRewardProgress.value.filter(rp => rp.reward.rewardType === activeRewardTab.value)
})

/**
 * Tab label formatting
 */
function getTabLabel(type: RewardType): string {
  switch (type) {
    case 'daily': return 'Daily'
    case 'semi_weekly': return 'Semi-Weekly'
    case 'weekly': return 'Weekly'
    case 'monthly': return 'Monthly'
    case 'quarterly': return 'Quarterly'
    case 'yearly': return 'Yearly'
    default: return type
  }
}

/**
 * Find the running or last-active activity for status display
 */
const activeActivity = computed(() => {
  return activities.value.find(a => a.timer.status === 'running') 
      || activities.value.find(a => a.timer.status === 'auto_paused')
      || activities.value.find(a => a.timer.status === 'paused')
})

/**
 * Calculate total time across ALL activity types for AutoPause
 * AutoPause tracks cumulative time from Rewardable, Non-Rewardable, AND Wasted activities
 */
const totalAllActivitySeconds = computed(() => {
  return realtimeTotals.value.rewardable + 
         realtimeTotals.value.non_rewardable + 
         realtimeTotals.value.wasted
})

/**
 * Calculate countdown remaining (seconds until auto-pause)
 * Based on cumulative daily time across ALL activity types, minus the cumulative base
 * (PRD 4.1.1: fresh window after each AutoPause cycle)
 * Returns null if no running timer
 */
const autoPauseCountdown = computed(() => {
  const running = activities.value.find(a => a.timer.status === 'running')
  if (!running?.timer.lastStartedAt) return null
  
  const timeoutSeconds = autoPauseMinutes.value * 60
  const effectiveCumulative = Math.max(0, totalAllActivitySeconds.value - autoPauseCumulativeBase.value)
  return Math.max(0, timeoutSeconds - effectiveCumulative)
})

/**
 * Format countdown as "Xm Ys"
 */
const autoPauseCountdownFormatted = computed(() => {
  if (autoPauseCountdown.value === null) return ''
  const mins = Math.floor(autoPauseCountdown.value / 60)
  const secs = autoPauseCountdown.value % 60
  return `${mins}m ${secs}s`
})

/**
 * Break countdown - seconds remaining in active break
 * Returns null for open-ended breaks or when no break is active
 */
const breakCountdown = computed(() => {
  if (!activeBreak.value?.breakDurationMinutes || !breakStartedAt.value) return null
  const durationSeconds = activeBreak.value.breakDurationMinutes * 60
  const elapsed = Math.floor((now.value - breakStartedAt.value) / 1000)
  return Math.max(0, durationSeconds - elapsed)
})

/**
 * Format break countdown as "Xm Ys"
 */
const breakCountdownFormatted = computed(() => {
  if (breakCountdown.value === null) return ''
  const mins = Math.floor(breakCountdown.value / 60)
  const secs = breakCountdown.value % 60
  return `${mins}m ${secs}s`
})

/**
 * Track the last activity name before break was taken
 * Used to display "Last activity: X" during break
 */
const lastActivityBeforeBreak = ref<string | null>(null)

const breakToastMessage = ref('')
let breakToastTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * Auto-end break when countdown reaches 0
 */
watch(breakCountdown, (val) => {
  if (val === 0 && activeBreak.value) {
    handleEndBreak()
  }
})

/**
 * PRD 4.4: Clamp a seconds value to the AutoPause threshold if within ±5 seconds.
 * Only affects presentation; underlying data is unchanged.
 */
function clampNearThreshold(seconds: number): number {
  const thresholdSeconds = autoPauseMinutes.value * 60
  if (Math.abs(seconds - thresholdSeconds) <= 5) {
    return thresholdSeconds
  }
  return seconds
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m ${secs}s`
}

function formatGoalTime(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}h ${m}m`
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'rewardable':
      return 'border-l-green-500'
    case 'non_rewardable':
      return 'border-l-blue-500'
    case 'wasted':
      return 'border-l-orange-500'
    default:
      return 'border-l-slate-500'
  }
}

async function handleToggleTimer(activity: ActivityWithTimer) {
  console.log('[handleToggleTimer]', activity.name, 'status:', activity.timer.status)
  if (activeBreak.value) {
    breakToastMessage.value = 'End your current break before starting an activity.'
    if (breakToastTimeout) clearTimeout(breakToastTimeout)
    breakToastTimeout = setTimeout(() => { breakToastMessage.value = '' }, 3000)
    return
  }
  // Clear "break just ended" status when starting an activity
  if (breakJustEnded.value && activity.timer.status !== 'running') {
    clearBreakEnded()
  }
  await toggleTimer(activity)
  console.log('[handleToggleTimer] Completed for', activity.name)
}

/**
 * Get progress percentage for an activity's estimate
 * Returns null if no estimate is configured
 */
function getActivityProgressPercent(activity: ActivityWithTimer): number | null {
  const estimateSeconds = getActivityEstimateSeconds(activity)
  if (!estimateSeconds || estimateSeconds <= 0) return null
  
  const displaySeconds = getDisplaySeconds(activity)
  return (displaySeconds / estimateSeconds) * 100
}

/**
 * Calculate daily rewardable time progress percentage
 * Based on average work day setting
 * Respects includeNonRewardableInRewards setting
 */
const dailyProgressPercent = computed(() => {
  const goalSeconds = userSettings.value.averageWorkDay * 3600
  if (goalSeconds <= 0) return 0
  return (effectiveRealtimeRewardable.value / goalSeconds) * 100
})

/**
 * Calculate weekly rewardable time progress percentage
 * For now, we estimate weekly by multiplying daily by days elapsed in week
 * TODO: Implement proper weekly tracking with activity_time_logs
 * Respects includeNonRewardableInRewards setting
 */
const weeklyProgressPercent = computed(() => {
  const goalSeconds = userSettings.value.averageWorkWeek * 3600
  if (goalSeconds <= 0) return 0
  // For now, just show daily progress as weekly estimate
  // Proper implementation would query weekly totals from logs
  return (effectiveRealtimeRewardable.value / goalSeconds) * 100
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
    <!-- Header -->
    <header class="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50">
      <div class="max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
        <h1 class="text-lg sm:text-xl font-bold text-white">TimeReward</h1>
        
        <div class="flex items-center gap-4">
          <!-- Connection Status - prominent when offline -->
          <div 
            :class="[
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors',
              connectionState === 'online' ? 'bg-green-500/10 text-green-400' : '',
              connectionState === 'offline' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : '',
              connectionState === 'connecting' ? 'bg-yellow-500/10 text-yellow-400' : ''
            ]"
          >
            <span class="w-2 h-2 rounded-full" :class="{
              'bg-green-500': connectionState === 'online',
              'bg-red-500 animate-pulse': connectionState === 'offline',
              'bg-yellow-500 animate-pulse': connectionState === 'connecting'
            }"></span>
            {{ statusLabel }}
            <span v-if="queue.length > 0" class="ml-1 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium">
              {{ queue.length }} queued
            </span>
          </div>
          
          <!-- Clock Sync Status -->
          <div v-if="isSynced" class="text-xs text-slate-500 hidden sm:block" title="Time synchronized with server">
            <span class="text-green-400">⏲</span> Synced
          </div>
          
          <!-- User Menu -->
          <div class="flex items-center gap-3">
            <span class="text-slate-400 text-sm">
              {{ profile ? `${profile.firstName} ${profile.lastName}`.trim() : 'User' }}
            </span>
            <NuxtLink
              to="/settings"
              class="text-slate-400 hover:text-white text-sm px-2 py-1.5 rounded-lg
                     hover:bg-slate-700/50 transition-colors duration-200"
              title="Settings"
            >
              <svg class="w-5 h-5" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </NuxtLink>
            <button
              @click="signOut"
              class="text-slate-400 hover:text-white text-sm px-2 py-1.5 rounded-lg
                     hover:bg-slate-700/50 transition-colors duration-200"
              title="Sign out"
            >
              <svg class="w-5 h-5" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto px-4 py-8">
      <!-- Demo Data Reset Button (dev/test/demo environments only) -->
      <div v-if="showDemoButton" class="mb-4 flex items-center gap-4">
        <button
          @click="resetDemoData"
          :disabled="isResettingDemo"
          class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 
                 text-white text-sm font-medium rounded-lg transition-colors duration-200
                 flex items-center gap-2"
        >
          <svg v-if="isResettingDemo" class="w-4 h-4 animate-spin" width="16" height="16" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else class="w-4 h-4" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ isResettingDemo ? 'Resetting...' : 'Reset Demo Data' }}
        </button>
        <span v-if="demoResetMessage" 
              :class="[
                'text-sm',
                demoResetMessage.startsWith('Error') ? 'text-red-400' : 'text-green-400'
              ]">
          {{ demoResetMessage }}
        </span>
      </div>

      <!-- Offline Banner -->
      <div 
        v-if="connectionState === 'offline'"
        class="mb-6 bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-center gap-3"
      >
        <svg class="w-5 h-5 text-red-400 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
        </svg>
        <div class="flex-1">
          <p class="text-red-400 font-medium">You're offline</p>
          <p class="text-red-400/70 text-sm">
            Actions will be queued and synced when you reconnect.
            <span v-if="queue.length > 0" class="font-medium">{{ queue.length }} action(s) pending.</span>
          </p>
        </div>
      </div>

      <!-- Reconnecting Banner -->
      <div
        v-else-if="connectionState === 'connecting'"
        class="mb-6 bg-amber-500/10 border border-amber-500/50 rounded-xl p-4 flex items-center gap-3"
      >
        <div class="w-5 h-5 flex-shrink-0">
          <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-400"></div>
        </div>
        <p class="text-amber-400 font-medium">Reconnecting...</p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>

      <!-- Error Banner (non-blocking — shows alongside content) -->
      <div v-if="error && !isLoading" class="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-4 flex items-center justify-between">
        <p class="text-red-400 text-sm">{{ error }}</p>
        <button @click="clearError()" class="text-red-400 hover:text-red-300 ml-4 flex-shrink-0" title="Dismiss">
          <svg class="w-4 h-4" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Today Section -->
      <section v-if="!isLoading" class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-white">Today's Activities</h2>
          <button
            @click="openAddModal"
            class="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 
                   text-white text-sm font-medium rounded-lg transition-colors duration-200"
          >
            <svg class="w-4 h-4" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Activity
          </button>
        </div>
        
        <!-- Status Lines: Break Status OR AutoPause Status -->
        <!-- Active Break Status (replaces AutoPause when break is active) -->
        <div v-if="activeBreak" 
             id="status-message-container"
             class="bg-teal-900/50 rounded-xl border border-teal-700/50 p-4 mb-4">
          <div class="flex items-center justify-between">
            <div>
              <p id="break-status" class="text-white text-lg">
                <span class="bg-teal-500 text-white px-2 py-0.5 rounded mr-2">On Break</span>
                <template v-if="activeBreak.breakDurationMinutes && breakCountdown !== null">
                  <span class="font-bold">{{ breakCountdownFormatted }}</span> remaining
                </template>
              </p>
              <p class="text-sm text-slate-400 mt-1">
                Break: <b>{{ activeBreak.name }}</b>
                <span v-if="lastActivityBeforeBreak"> · Last activity: {{ lastActivityBeforeBreak }}</span>
              </p>
            </div>
            <button
              @click="handleEndBreak"
              class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              End Break
            </button>
          </div>
        </div>
        
        <!-- Break Over Status -->
        <div v-else-if="breakJustEnded" 
             id="status-message-container"
             class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 mb-4">
          <p id="break-over-status" class="text-white">
            <span class="bg-slate-600 text-white px-2 py-0.5 rounded">Break over</span>
          </p>
          <p class="text-sm text-slate-400 mt-1">
            Start an activity to resume work
          </p>
        </div>
        
        <!-- Normal AutoPause Status Lines -->
        <div v-else-if="activeActivity" 
             id="status-message-container"
             class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 mb-4">
          
          <!-- Running: show countdown (PRD 4.2.1 — primary line only) -->
          <template v-if="activeActivity.timer.status === 'running'">
            <p id="autopause-status" class="text-white">
              Activity <b>{{ activeActivity.name }}</b> Auto Pause in <span class="font-bold">{{ autoPauseCountdownFormatted }}</span>
            </p>
          </template>
          
          <!-- Auto-Paused -->
          <template v-else-if="activeActivity.timer.status === 'auto_paused'">
            <p id="autopause-status" class="text-white">
              <span :class="['bg-yellow-200 text-yellow-900 px-1 rounded', userSettings.flashOnAutoPause && 'autopause-flash-text']">Auto Paused</span> 
              after {{ Math.round(autoPausedAfterSeconds / 60) }} minutes of total activity
            </p>
            <p class="text-sm text-slate-400">
              last Activity run: <b>{{ activeActivity.name }}</b>
            </p>
          </template>
          
          <!-- Manually Paused -->
          <template v-else-if="activeActivity.timer.status === 'paused'">
            <p id="autopause-status" class="text-white">
              Activity <b>{{ activeActivity.name }}</b> Manually Paused
            </p>
          </template>
        </div>
        
        <!-- Empty State -->
        <div v-if="activities.length === 0" class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-8 text-center">
          <p class="text-slate-400">No activities yet. Create your first activity to get started!</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="activity in activities"
            :key="activity.id"
            :class="[
              'relative backdrop-blur-sm rounded-xl border-l-4 p-4',
              'border border-slate-700/50',
              getTypeColor(activity.activityType),
              activity.timer.status === 'running' && !activity.timer.isCompleted && 'bg-slate-800/50 ring-2 ring-blue-500/50',
              activity.timer.status === 'auto_paused' && !activity.timer.isCompleted && userSettings.flashOnAutoPause && 'autopause-flash',
              activity.timer.status === 'auto_paused' && !activity.timer.isCompleted && !userSettings.flashOnAutoPause && 'bg-[#FAFAD2]/20',
              activity.timer.status !== 'running' && activity.timer.status !== 'auto_paused' && 'bg-slate-800/50',
              activity.timer.isCompleted && 'opacity-60',
              openMenuId === activity.id && 'z-30'
            ]"
          >
            <div class="flex items-center gap-3">
              <!-- Start/Stop button (far left; activity card control column) -->
              <button
                class="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0"
                :class="[
                  activity.timer.isCompleted || activeBreak
                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    : activity.timer.status === 'auto_paused'
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      : activity.activityType === 'wasted'
                        ? (activity.timer.status === 'running' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-orange-500 hover:bg-orange-600') + ' text-white'
                        : activity.activityType === 'non_rewardable'
                          ? (activity.timer.status === 'running' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600') + ' text-white'
                          : (activity.timer.status === 'running' ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600') + ' text-white',
                  { 'opacity-50': activeBreak && !activity.timer.isCompleted }
                ]"
                @click="handleToggleTimer(activity)"
                :disabled="activity.timer.isCompleted || !!activeBreak"
                :title="activeBreak ? 'End your break first' : (activity.timer.isCompleted ? 'Activity completed' : (activity.timer.status === 'auto_paused' ? 'Resume' : (activity.timer.status === 'running' ? 'Stop' : 'Start')))"
              >
                <svg v-if="activity.timer.isCompleted" class="w-5 h-5" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <svg v-else-if="activity.timer.status === 'running'" class="w-5 h-5" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                <svg v-else class="w-5 h-5 ml-0.5" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </button>

              <!-- Activity progress circle (when estimate configured) -->
              <StackedProgressCircle 
                v-if="getActivityProgressPercent(activity) !== null"
                :progress="getActivityProgressPercent(activity) || 0"
                size="sm"
                :normal-color="activity.activityType === 'rewardable' ? 'text-emerald-500' : activity.activityType === 'wasted' ? 'text-red-500' : 'text-yellow-500'"
                overflow-color="text-red-500"
              />

              <!-- Activity name + inline timer values (center, fills available space) -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h3 :class="[
                    'font-medium truncate',
                    activity.timer.isCompleted ? 'text-slate-500 line-through' : 'text-white'
                  ]">{{ activity.name }}</h3>
                  <span class="text-xs text-slate-500 capitalize whitespace-nowrap">
                    {{ activity.activityType.replace('_', ' ') }}
                    <template v-if="!activity.autoRepeat"> &middot; one-time</template>
                  </span>
                  <span v-if="activity.timer.isCompleted" class="text-xs text-green-400 whitespace-nowrap">Done</span>
                  <span v-else-if="activity.timer.status === 'auto_paused'" class="text-xs text-yellow-600 whitespace-nowrap">Auto-paused</span>
                </div>
                <div class="flex items-center gap-1 mt-0.5">
                  <span class="text-xs text-slate-500">Time</span>
                  <span class="timer-display font-mono" :class="{
                    'text-blue-400': activity.timer.status === 'running' && !activity.timer.isCompleted,
                    'text-yellow-600': activity.timer.status === 'auto_paused' && !activity.timer.isCompleted,
                    'text-slate-500': activity.timer.isCompleted,
                    'text-slate-300': !activity.timer.isCompleted && activity.timer.status !== 'running' && activity.timer.status !== 'auto_paused'
                  }">
                    {{ formatTime(clampNearThreshold(getDisplaySeconds(activity))) }}
                  </span>
                  <template v-if="activity.autoRepeat && getDisplayAllSeconds(activity) > 0">
                    <span class="text-xs text-slate-500 ml-2">All:</span>
                    <span class="font-mono text-sm text-slate-400">
                      {{ formatTime(getDisplayAllSeconds(activity)) }}
                    </span>
                  </template>
                </div>
              </div>

              <!-- Check-off checkbox (right side) -->
              <input
                type="checkbox"
                :checked="activity.timer.isCompleted"
                @change="toggleActivityComplete(activity)"
                class="w-5 h-5 rounded border-slate-600 bg-slate-900/50
                       text-green-500 focus:ring-green-500 focus:ring-offset-0
                       cursor-pointer flex-shrink-0"
                :title="activity.timer.isCompleted ? 'Mark as not done' : 'Mark as done'"
              />

              <!-- Three-dot context menu (far right) -->
              <div class="relative flex-shrink-0">
                <button
                  @click.stop="toggleMenu(activity.id)"
                  class="p-1 text-slate-500 hover:text-slate-300 rounded transition-colors"
                  title="More options"
                >
                  <svg class="w-5 h-5" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                  </svg>
                </button>
                <div
                  v-if="openMenuId === activity.id"
                  class="absolute right-0 top-full mt-1 z-20 bg-slate-700 border border-slate-600 rounded-lg shadow-xl py-1 min-w-[120px]"
                >
                  <button @click.stop="openEditModal(activity); closeMenu()" class="w-full px-3 py-1.5 text-left text-sm text-slate-200 hover:bg-slate-600 flex items-center gap-2">
                    <svg class="w-3.5 h-3.5" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Edit
                  </button>
                  <button @click.stop="handleDeleteActivity(activity); closeMenu()" class="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-slate-600 flex items-center gap-2">
                    <svg class="w-3.5 h-3.5" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ============================================================ -->
      <!-- Section 2: Earned Breaks (always visible per PRD 9.6.2)      -->
      <!-- ============================================================ -->
      <section v-if="!isLoading" class="mb-8">
        <div class="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-slate-400 text-sm">Earned Breaks</h3>
            <button
              @click="showAddBreakModal = true"
              class="flex items-center gap-1 px-2.5 py-1 bg-teal-500/20 hover:bg-teal-500/30
                     text-teal-400 text-xs font-medium rounded-lg transition-colors"
            >
              <svg class="w-3.5 h-3.5" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          </div>

          <!-- Empty state -->
          <div v-if="breaks.length === 0" class="text-center py-4">
            <p class="text-slate-500 text-sm">No breaks configured. Add a break to start earning time off!</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="bp in realtimeBreakProgress"
              :key="bp.break.id"
              :class="[
                'relative rounded-lg border p-3 transition-colors',
                activeBreak?.id === bp.break.id
                  ? 'border-teal-400 bg-teal-500/20 ring-2 ring-teal-500/50 animate-pulse'
                  : bp.isComplete
                    ? 'border-teal-500/50 bg-teal-500/5'
                    : 'border-slate-700/50 bg-slate-900/30',
                openMenuId === 'break-' + bp.break.id && 'z-30'
              ]"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-white text-sm font-medium">{{ bp.break.name }}</span>
                  <span v-if="bp.break.isRecurring" class="text-slate-500 text-xs" title="Recurring">&#x1F504;</span>
                  <span v-if="bp.isComplete && !activeBreak && !bp.break.activatedToday" class="px-1.5 py-0.5 bg-teal-500/20 text-teal-400 text-xs font-bold rounded">$</span>
                  <span v-if="activeBreak?.id === bp.break.id" class="px-1.5 py-0.5 bg-teal-500 text-white text-xs font-medium rounded">
                    Active
                    <template v-if="bp.break.breakDurationMinutes && breakCountdown !== null">
                      · {{ breakCountdownFormatted }}
                    </template>
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-400">
                    {{ bp.progressMinutes }}m / {{ bp.goalMinutes }}m
                  </span>
                  <span class="text-xs text-slate-500">{{ Math.round(bp.progressPercent) }}%</span>
                  <!-- Three-dot context menu -->
                  <div class="relative">
                    <button
                      @click.stop="toggleMenu('break-' + bp.break.id)"
                      class="p-0.5 text-slate-500 hover:text-slate-300 rounded transition-colors"
                      title="More options"
                    >
                      <svg class="w-4 h-4" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>
                    <div
                      v-if="openMenuId === 'break-' + bp.break.id"
                      class="absolute right-0 top-full mt-1 z-20 bg-slate-700 border border-slate-600 rounded-lg shadow-xl py-1 min-w-[120px]"
                    >
                      <button
                        @click.stop="openEditBreakModal(bp.break)"
                        :disabled="activeBreak?.id === bp.break.id"
                        :class="['w-full px-3 py-1.5 text-left text-sm flex items-center gap-2', activeBreak?.id === bp.break.id ? 'text-slate-500 cursor-not-allowed' : 'text-slate-200 hover:bg-slate-600']"
                      >
                        <svg class="w-3.5 h-3.5" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Edit
                      </button>
                      <button @click.stop="handleDeleteBreak(bp.break); closeMenu()" class="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-slate-600 flex items-center gap-2">
                        <svg class="w-3.5 h-3.5" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Progress bar -->
              <div class="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="bp.isComplete ? 'bg-teal-500' : 'bg-teal-600/70'"
                  :style="{ width: `${Math.min(100, bp.progressPercent)}%` }"
                ></div>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-xs text-slate-500">
                  <template v-if="bp.break.breakDurationMinutes">Earns: {{ bp.break.breakDurationMinutes }} min break</template>
                  <template v-else>Earns: Open-ended break</template>
                </span>
                <div class="flex items-center gap-2">
                  <button
                    v-if="bp.isComplete && !bp.break.activatedToday && !activeBreak"
                    @click="handleTakeBreak(bp.break.id)"
                    class="px-2.5 py-1 text-xs font-medium bg-teal-500 hover:bg-teal-600
                           text-white rounded-lg transition-colors"
                  >
                    Take
                  </button>
                  <span v-else-if="bp.break.activatedToday && activeBreak?.id !== bp.break.id" class="text-xs text-teal-400">
                    Taken
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ============================================================ -->
      <!-- Section 3: Rewardable Time                                    -->
      <!-- ============================================================ -->
      <section v-if="!isLoading" class="space-y-4 mb-8">
        <!-- Rewardable Time with Progress Circles -->
        <div class="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
          <h3 class="text-slate-400 text-sm mb-3">Rewardable Time</h3>
          <div class="space-y-3">
            <!-- Daily Progress -->
            <div class="flex items-center gap-3">
              <StackedProgressCircle 
                :progress="dailyProgressPercent"
                size="lg"
                normal-color="text-emerald-500"
                overflow-color="text-red-500"
              />
              <div>
                <p class="text-sm font-medium text-white">Today</p>
                <p class="text-green-400 timer-display">{{ formatTime(clampNearThreshold(effectiveRealtimeRewardable)) }} / <span class="text-slate-400">(est.)</span> {{ formatGoalTime(userSettings.averageWorkDay) }}</p>
              </div>
            </div>
            
            <!-- Weekly Progress -->
            <div class="flex items-center gap-3">
              <StackedProgressCircle 
                :progress="weeklyProgressPercent"
                size="lg"
                normal-color="text-blue-500"
                overflow-color="text-purple-500"
              />
              <div>
                <p class="text-sm font-medium text-white">This Week</p>
                <p class="text-blue-400 timer-display">{{ formatTime(clampNearThreshold(effectiveRealtimeRewardable)) }} / <span class="text-slate-400">(est.)</span> {{ formatGoalTime(userSettings.averageWorkWeek) }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ============================================================ -->
      <!-- Section 4: Rewards (always visible per PRD 9.6.2)            -->
      <!-- ============================================================ -->
      <section v-if="!isLoading" class="mb-8">
        <div class="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-slate-400 text-sm">Rewards</h3>
            <button
              @click="showAddRewardModal = true"
              class="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30
                     text-emerald-400 text-xs font-medium rounded-lg transition-colors"
            >
              <svg class="w-3.5 h-3.5" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          </div>

          <!-- Empty state -->
          <div v-if="rewardsList.length === 0" class="text-center py-4">
            <p class="text-slate-500 text-sm">No rewards configured. Add a reward to track your progress!</p>
          </div>

          <!-- Rewards content (only show when rewards exist) -->
          <template v-else>
          <!-- Tab bar -->
          <div class="flex gap-1 mb-4 overflow-x-auto pb-1">
            <button
              v-for="tab in availableRewardTabs"
              :key="tab"
              @click="activeRewardTab = tab"
              :class="[
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                activeRewardTab === tab
                  ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50'
                  : 'bg-slate-900/30 text-slate-400 hover:bg-slate-700/50'
              ]"
            >
              {{ getTabLabel(tab) }}
            </button>
          </div>

          <!-- Reward cards for active tab -->
          <div class="space-y-3">
            <div
              v-for="rp in filteredRewardProgress"
              :key="rp.reward.id"
              :class="[
                'relative rounded-lg border p-3 transition-colors',
                rp.isComplete
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : 'border-slate-700/50 bg-slate-900/30',
                openMenuId === 'reward-' + rp.reward.id && 'z-30'
              ]"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-white text-sm font-medium">{{ rp.reward.name }}</span>
                  <span v-if="rp.reward.isRecurring" class="text-slate-500 text-xs" title="Recurring">&#x1F504;</span>
                  <span v-if="rp.isComplete" class="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded">
                    ${{ rp.unclaimedCycles > 1 ? ` x${rp.unclaimedCycles}` : '' }}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-400">
                    {{ formatRewardSeconds(Math.min(rp.currentSeconds, rp.goalSeconds)) }} / {{ formatRewardSeconds(rp.goalSeconds) }}
                  </span>
                  <span class="text-xs text-slate-500">{{ Math.round(rp.progressPercent) }}%</span>
                  <!-- Three-dot context menu -->
                  <div class="relative">
                    <button
                      @click.stop="toggleMenu('reward-' + rp.reward.id)"
                      class="p-0.5 text-slate-500 hover:text-slate-300 rounded transition-colors"
                      title="More options"
                    >
                      <svg class="w-4 h-4" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>
                    <div
                      v-if="openMenuId === 'reward-' + rp.reward.id"
                      class="absolute right-0 top-full mt-1 z-20 bg-slate-700 border border-slate-600 rounded-lg shadow-xl py-1 min-w-[120px]"
                    >
                      <button @click.stop="openEditRewardModal(rp.reward)" class="w-full px-3 py-1.5 text-left text-sm text-slate-200 hover:bg-slate-600 flex items-center gap-2">
                        <svg class="w-3.5 h-3.5" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Edit
                      </button>
                      <button @click.stop="handleDeleteReward(rp.reward)" class="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-slate-600 flex items-center gap-2">
                        <svg class="w-3.5 h-3.5" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Progress bar -->
              <div class="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="rp.isComplete ? 'bg-emerald-500' : 'bg-emerald-600/70'"
                  :style="{ width: `${Math.min(100, rp.progressPercent)}%` }"
                ></div>
              </div>

              <!-- Actions when earned -->
              <div v-if="rp.isComplete" class="flex items-center justify-between">
                <span class="text-xs text-emerald-400 font-medium">
                  EARNED!{{ rp.unclaimedCycles > 1 ? ` (${rp.unclaimedCycles} available)` : '' }}
                </span>
                <button
                  @click="openCashInConfirm(rp.reward)"
                  class="px-2.5 py-1 text-xs font-medium bg-emerald-500 hover:bg-emerald-600
                         text-white rounded-lg transition-colors"
                >
                  Cash In
                </button>
              </div>
            </div>
          </div>

          <!-- Link to full rewards page -->
          <div class="mt-3 text-center">
            <NuxtLink
              to="/rewards"
              class="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Manage all rewards &rarr;
            </NuxtLink>
          </div>
          </template>
        </div>
      </section>

      <!-- ============================================================ -->
      <!-- Other Stats                                                   -->
      <!-- ============================================================ -->
      <section v-if="!isLoading" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
            <h3 class="text-slate-400 text-sm">Today's Wasted</h3>
            <p class="text-2xl font-bold text-red-400 timer-display mt-1">{{ formatTime(clampNearThreshold(realtimeTotals.wasted)) }}</p>
          </div>
          
          <div class="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
            <h3 class="text-slate-400 text-sm">Today's Non-Rewardable</h3>
            <p class="text-2xl font-bold text-yellow-400 timer-display mt-1">{{ formatTime(clampNearThreshold(realtimeTotals.non_rewardable)) }}</p>
          </div>
        </div>
      </section>
    </main>

    <!-- Add Activity Modal -->
    <Teleport to="body">
      <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModals"></div>
        
        <!-- Modal -->
        <div class="relative bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
          <h2 class="text-xl font-semibold text-white mb-4">Add New Activity</h2>
          
          <form @submit.prevent="handleAddActivity" class="space-y-4">
            <!-- Name Input -->
            <div>
              <label class="block text-sm text-slate-400 mb-1">Activity Name</label>
              <input
                v-model="activityForm.name"
                type="text"
                placeholder="e.g., Work, Exercise, Reading..."
                class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg
                       text-white placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autofocus
              />
            </div>

            <!-- Description (optional) -->
            <div>
              <label class="block text-sm text-slate-400 mb-1">Description (optional)</label>
              <textarea
                v-model="activityForm.description"
                placeholder="Brief description of this activity..."
                rows="2"
                class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg
                       text-white placeholder-slate-500 resize-none
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              ></textarea>
            </div>
            
            <!-- Activity Type -->
            <div>
              <label class="block text-sm text-slate-400 mb-2">Activity Type</label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="type in activityTypes"
                  :key="type.value"
                  type="button"
                  @click="activityForm.activityType = type.value"
                  :class="[
                    'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    activityForm.activityType === type.value
                      ? 'bg-slate-700 ring-2 ring-blue-500 ' + type.color
                      : 'bg-slate-900/50 text-slate-400 hover:bg-slate-700/50'
                  ]"
                >
                  {{ type.label }}
                </button>
              </div>
            </div>

            <!-- Time Estimate Section -->
            <div class="border-t border-slate-700 pt-4">
              <label class="block text-sm text-slate-400 mb-2">Time Estimate</label>
              <div class="flex gap-2 mb-3">
                <button
                  v-for="opt in estimateTypeOptions"
                  :key="opt.value"
                  type="button"
                  @click="activityForm.estimateType = opt.value as EstimateTypeForm"
                  :class="[
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                    activityForm.estimateType === opt.value
                      ? 'bg-blue-500/20 ring-1 ring-blue-500 text-blue-400'
                      : 'bg-slate-900/50 text-slate-400 hover:bg-slate-700/50'
                  ]"
                >
                  {{ opt.label }}
                </button>
              </div>

              <!-- General Daily Estimate -->
              <div v-if="activityForm.estimateType === 'general'" class="space-y-2">
                <div class="flex items-center gap-3">
                  <input
                    v-model.number="activityForm.generalEstimateHours"
                    type="range"
                    min="0.25"
                    max="14"
                    step="0.25"
                    class="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div class="flex items-center gap-1">
                    <input
                      v-model.number="activityForm.generalEstimateHours"
                      type="number"
                      min="0.25"
                      max="14"
                      step="0.25"
                      class="w-16 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-center text-sm"
                    />
                    <span class="text-slate-400 text-xs">hr</span>
                  </div>
                </div>
                <p class="text-xs text-slate-500">Daily time goal for this activity</p>
              </div>

              <!-- Specific Day Estimates -->
              <div v-if="activityForm.estimateType === 'weekday'" class="space-y-2">
                <div class="grid grid-cols-7 gap-1">
                  <div 
                    v-for="(day, index) in dayNames" 
                    :key="day"
                    class="flex flex-col items-center"
                  >
                    <span class="text-xs text-slate-500 mb-1">{{ day }}</span>
                    <input
                      v-model.number="activityForm[`estimate${day}` as keyof typeof activityForm]"
                      type="number"
                      min="0"
                      max="14"
                      step="0.5"
                      class="w-full px-1 py-1 bg-slate-700 border border-slate-600 rounded text-white text-center text-xs"
                    />
                  </div>
                </div>
                <p class="text-xs text-slate-500">Hours per day (0 = no goal for that day)</p>
              </div>
            </div>

            <!-- Recurring Activity -->
            <div class="border-t border-slate-700 pt-4">
              <label class="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="activityForm.autoRepeat"
                  class="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-900/50
                         text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                />
                <div>
                  <span class="text-sm text-white font-medium">Recurring Activity</span>
                  <p class="text-xs text-slate-500 mt-0.5">
                    Recurring activities reappear daily after being checked off.
                    Use for general activities like "Algebra Homework".
                    Uncheck for one-time activities like "Algebra Sections 4.2-4.3".
                  </p>
                </div>
              </label>
            </div>
            
            <!-- Buttons -->
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="closeModals"
                class="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 
                       text-white rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!activityForm.name.trim() || isSubmitting"
                class="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 
                       text-white rounded-lg transition-colors duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isSubmitting ? 'Adding...' : 'Add Activity' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Edit Activity Modal -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModals"></div>
        
        <!-- Modal -->
        <div class="relative bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
          <h2 class="text-xl font-semibold text-white mb-4">Edit Activity</h2>
          
          <form @submit.prevent="handleUpdateActivity" class="space-y-4">
            <!-- Name Input -->
            <div>
              <label class="block text-sm text-slate-400 mb-1">Activity Name</label>
              <input
                v-model="activityForm.name"
                type="text"
                placeholder="e.g., Work, Exercise, Reading..."
                class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg
                       text-white placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autofocus
              />
            </div>

            <!-- Description (optional) -->
            <div>
              <label class="block text-sm text-slate-400 mb-1">Description (optional)</label>
              <textarea
                v-model="activityForm.description"
                placeholder="Brief description of this activity..."
                rows="2"
                class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg
                       text-white placeholder-slate-500 resize-none
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              ></textarea>
            </div>
            
            <!-- Activity Type -->
            <div>
              <label class="block text-sm text-slate-400 mb-2">Activity Type</label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="type in activityTypes"
                  :key="type.value"
                  type="button"
                  @click="activityForm.activityType = type.value"
                  :class="[
                    'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    activityForm.activityType === type.value
                      ? 'bg-slate-700 ring-2 ring-blue-500 ' + type.color
                      : 'bg-slate-900/50 text-slate-400 hover:bg-slate-700/50'
                  ]"
                >
                  {{ type.label }}
                </button>
              </div>
            </div>

            <!-- Time Estimate Section -->
            <div class="border-t border-slate-700 pt-4">
              <label class="block text-sm text-slate-400 mb-2">Time Estimate</label>
              <div class="flex gap-2 mb-3">
                <button
                  v-for="opt in estimateTypeOptions"
                  :key="opt.value"
                  type="button"
                  @click="activityForm.estimateType = opt.value as EstimateTypeForm"
                  :class="[
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                    activityForm.estimateType === opt.value
                      ? 'bg-blue-500/20 ring-1 ring-blue-500 text-blue-400'
                      : 'bg-slate-900/50 text-slate-400 hover:bg-slate-700/50'
                  ]"
                >
                  {{ opt.label }}
                </button>
              </div>

              <!-- General Daily Estimate -->
              <div v-if="activityForm.estimateType === 'general'" class="space-y-2">
                <div class="flex items-center gap-3">
                  <input
                    v-model.number="activityForm.generalEstimateHours"
                    type="range"
                    min="0.25"
                    max="14"
                    step="0.25"
                    class="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div class="flex items-center gap-1">
                    <input
                      v-model.number="activityForm.generalEstimateHours"
                      type="number"
                      min="0.25"
                      max="14"
                      step="0.25"
                      class="w-16 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-center text-sm"
                    />
                    <span class="text-slate-400 text-xs">hr</span>
                  </div>
                </div>
                <p class="text-xs text-slate-500">Daily time goal for this activity</p>
              </div>

              <!-- Specific Day Estimates -->
              <div v-if="activityForm.estimateType === 'weekday'" class="space-y-2">
                <div class="grid grid-cols-7 gap-1">
                  <div 
                    v-for="(day, index) in dayNames" 
                    :key="day"
                    class="flex flex-col items-center"
                  >
                    <span class="text-xs text-slate-500 mb-1">{{ day }}</span>
                    <input
                      v-model.number="activityForm[`estimate${day}` as keyof typeof activityForm]"
                      type="number"
                      min="0"
                      max="14"
                      step="0.5"
                      class="w-full px-1 py-1 bg-slate-700 border border-slate-600 rounded text-white text-center text-xs"
                    />
                  </div>
                </div>
                <p class="text-xs text-slate-500">Hours per day (0 = no goal for that day)</p>
              </div>
            </div>

            <!-- Recurring Activity -->
            <div class="border-t border-slate-700 pt-4">
              <label class="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="activityForm.autoRepeat"
                  class="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-900/50
                         text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                />
                <div>
                  <span class="text-sm text-white font-medium">Recurring Activity</span>
                  <p class="text-xs text-slate-500 mt-0.5">
                    Recurring activities reappear daily after being checked off.
                    Use for general activities like "Algebra Homework".
                    Uncheck for one-time activities like "Algebra Sections 4.2-4.3".
                  </p>
                </div>
              </label>
            </div>
            
            <!-- Buttons -->
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="closeModals"
                class="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 
                       text-white rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!activityForm.name.trim() || isSubmitting"
                class="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 
                       text-white rounded-lg transition-colors duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Add Break Modal -->
    <Teleport to="body">
      <div v-if="showAddBreakModal" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModals"></div>
        <div class="relative bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-md mx-4 shadow-2xl">
          <h2 class="text-xl font-semibold text-white mb-4">Add Earned Break</h2>
          
          <form @submit.prevent="handleAddBreak" class="space-y-4">
            <div>
              <label class="block text-sm text-slate-400 mb-1">Break Name</label>
              <input
                v-model="breakForm.name"
                type="text"
                placeholder="e.g., Coffee Break, Walk..."
                class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg
                       text-white placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                autofocus
              />
            </div>

            <div>
              <label class="block text-sm text-slate-400 mb-1">Goal Time (minutes)</label>
              <p class="text-xs text-slate-500 mb-2">How many minutes of work to earn this break</p>
              <input
                v-model.number="breakForm.goalMinutes"
                type="number"
                min="1"
                max="480"
                class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg
                       text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm text-slate-400 mb-1">Break Duration (minutes) <span class="text-slate-600">- optional</span></label>
              <p class="text-xs text-slate-500 mb-2">Optional. If specified, a countdown timer will show during your break. Leave blank for an open-ended break.</p>
              <input
                v-model.number="breakForm.breakDurationMinutes"
                type="number"
                min="1"
                max="120"
                placeholder="Leave empty for open-ended"
                class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg
                       text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div class="border-t border-slate-700 pt-4">
              <label class="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="breakForm.isRecurring"
                  class="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-900/50
                         text-teal-500 focus:ring-teal-500 focus:ring-offset-0"
                />
                <div>
                  <span class="text-sm text-white font-medium">Recurring Break</span>
                  <p class="text-xs text-slate-500 mt-0.5">
                    Recurring breaks can be earned again each day.
                  </p>
                </div>
              </label>
            </div>
            
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="closeModals"
                class="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 
                       text-white rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!breakForm.name.trim() || isSubmitting"
                class="flex-1 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 
                       text-white rounded-lg transition-colors duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isSubmitting ? 'Adding...' : 'Add Break' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Edit Break Modal -->
    <Teleport to="body">
      <div v-if="showEditBreakModal && editingBreak" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModals"></div>
        <div class="relative bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-md mx-4 shadow-2xl">
          <h2 class="text-xl font-semibold text-white mb-4">Edit Break</h2>
          
          <form @submit.prevent="handleUpdateBreak" class="space-y-4">
            <div>
              <label class="block text-sm text-slate-400 mb-1">Break Name</label>
              <input
                v-model="breakForm.name"
                type="text"
                placeholder="e.g., Coffee Break, Walk..."
                class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg
                       text-white placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                autofocus
              />
            </div>

            <div>
              <label class="block text-sm text-slate-400 mb-1">Goal Time (minutes)</label>
              <p class="text-xs text-slate-500 mb-2">How many minutes of work to earn this break</p>
              <input
                v-model.number="breakForm.goalMinutes"
                type="number"
                min="1"
                max="480"
                class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg
                       text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm text-slate-400 mb-1">Break Duration (minutes) <span class="text-slate-600">- optional</span></label>
              <p class="text-xs text-slate-500 mb-2">Optional. If specified, a countdown timer will show during your break. Leave blank for an open-ended break.</p>
              <input
                v-model.number="breakForm.breakDurationMinutes"
                type="number"
                min="1"
                max="120"
                placeholder="Leave empty for open-ended"
                class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg
                       text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div class="border-t border-slate-700 pt-4">
              <label class="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="breakForm.isRecurring"
                  class="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-900/50
                         text-teal-500 focus:ring-teal-500 focus:ring-offset-0"
                />
                <div>
                  <span class="text-sm text-white font-medium">Recurring Break</span>
                  <p class="text-xs text-slate-500 mt-0.5">
                    Recurring breaks can be earned again each day.
                  </p>
                </div>
              </label>
            </div>
            
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="closeModals"
                class="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 
                       text-white rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!breakForm.name.trim() || isSubmitting"
                class="flex-1 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 
                       text-white rounded-lg transition-colors duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Add Reward Modal -->
    <Teleport to="body">
      <div v-if="showAddRewardModal" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModals"></div>
        <div class="relative bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-md mx-4 shadow-2xl">
          <h2 class="text-xl font-semibold text-white mb-4">Add Reward</h2>
          
          <form @submit.prevent="handleAddReward" class="space-y-4">
            <div>
              <label class="block text-sm text-slate-400 mb-1">Reward Name</label>
              <input
                v-model="rewardForm.name"
                type="text"
                placeholder="e.g., Movie Night, Gaming Time..."
                class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg
                       text-white placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                autofocus
              />
            </div>

            <div>
              <label class="block text-sm text-slate-400 mb-2">Reward Period</label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="rt in (['daily', 'semi_weekly', 'weekly', 'monthly', 'quarterly', 'yearly'] as RewardType[])"
                  :key="rt"
                  type="button"
                  @click="rewardForm.rewardType = rt"
                  :class="[
                    'px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                    rewardForm.rewardType === rt
                      ? 'bg-emerald-500/20 ring-1 ring-emerald-500 text-emerald-400'
                      : 'bg-slate-900/50 text-slate-400 hover:bg-slate-700/50'
                  ]"
                >
                  {{ getTabLabel(rt) }}
                </button>
              </div>
              <p class="text-xs text-slate-500 mt-2">The time period over which progress accumulates. Daily rewards reset every day at 3 AM.</p>
            </div>

            <div>
              <label class="block text-sm text-slate-400 mb-1">{{ rewardTypeConfig.label }}</label>
              <p class="text-xs text-slate-500 mb-2">Rewardable time needed to earn this reward</p>
              <input
                v-model.number="rewardForm.workGoal"
                type="number"
                :min="rewardTypeConfig.min"
                :max="rewardTypeConfig.max"
                :step="rewardTypeConfig.step"
                class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg
                       text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div class="border-t border-slate-700 pt-4">
              <label class="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="rewardForm.isRecurring"
                  class="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-900/50
                         text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                />
                <div>
                  <span class="text-sm text-white font-medium">Recurring Reward</span>
                  <p class="text-xs text-slate-500 mt-0.5">
                    Recurring rewards reset to 0 after being earned and can be earned multiple times per period.
                    Non-recurring rewards stop accumulating once the goal is reached.
                  </p>
                </div>
              </label>
            </div>
            
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="closeModals"
                class="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 
                       text-white rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!rewardForm.name.trim() || isSubmitting"
                class="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 
                       text-white rounded-lg transition-colors duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isSubmitting ? 'Adding...' : 'Add Reward' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Edit Reward Modal -->
    <Teleport to="body">
      <div v-if="showEditRewardModal && editingRewardItem" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModals"></div>
        <div class="relative bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-md mx-4 shadow-2xl">
          <h2 class="text-xl font-semibold text-white mb-4">Edit Reward</h2>
          
          <form @submit.prevent="handleUpdateReward" class="space-y-4">
            <div>
              <label class="block text-sm text-slate-400 mb-1">Reward Name</label>
              <input
                v-model="rewardForm.name"
                type="text"
                placeholder="e.g., Movie Night, Gaming Time..."
                class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg
                       text-white placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                autofocus
              />
            </div>

            <div>
              <label class="block text-sm text-slate-400 mb-2">Reward Period</label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="rt in (['daily', 'semi_weekly', 'weekly', 'monthly', 'quarterly', 'yearly'] as RewardType[])"
                  :key="rt"
                  type="button"
                  @click="rewardForm.rewardType = rt"
                  :class="[
                    'px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                    rewardForm.rewardType === rt
                      ? 'bg-emerald-500/20 ring-1 ring-emerald-500 text-emerald-400'
                      : 'bg-slate-900/50 text-slate-400 hover:bg-slate-700/50'
                  ]"
                >
                  {{ getTabLabel(rt) }}
                </button>
              </div>
              <p class="text-xs text-slate-500 mt-2">The time period over which progress accumulates. Daily rewards reset every day at 3 AM.</p>
            </div>

            <div>
              <label class="block text-sm text-slate-400 mb-1">{{ rewardTypeConfig.label }}</label>
              <p class="text-xs text-slate-500 mb-2">Rewardable time needed to earn this reward</p>
              <input
                v-model.number="rewardForm.workGoal"
                type="number"
                :min="rewardTypeConfig.min"
                :max="rewardTypeConfig.max"
                :step="rewardTypeConfig.step"
                class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg
                       text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div class="border-t border-slate-700 pt-4">
              <label class="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="rewardForm.isRecurring"
                  class="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-900/50
                         text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                />
                <div>
                  <span class="text-sm text-white font-medium">Recurring Reward</span>
                  <p class="text-xs text-slate-500 mt-0.5">
                    Recurring rewards reset to 0 after being earned and can be earned multiple times per period.
                    Non-recurring rewards stop accumulating once the goal is reached.
                  </p>
                </div>
              </label>
            </div>
            
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="closeModals"
                class="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 
                       text-white rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!rewardForm.name.trim() || isSubmitting"
                class="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 
                       text-white rounded-lg transition-colors duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Cash In Confirmation Dialog -->
    <Teleport to="body">
      <div v-if="showCashInConfirm && cashingInReward" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModals"></div>
        <div class="relative bg-slate-800 rounded-2xl border border-slate-700 p-5 w-full max-w-sm mx-4 shadow-2xl">
          <p class="text-white text-sm mb-4">
            Cash in <span class="font-semibold text-emerald-400">{{ cashingInReward.name }}</span>?
          </p>
          <div class="flex gap-3">
            <button
              @click="closeModals"
              class="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600
                     text-white text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              @click="handleCashInReward"
              :disabled="isSubmitting"
              class="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600
                     text-white text-sm rounded-lg transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubmitting ? 'Cashing In...' : 'Cash In' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Break-active toast notification -->
    <Teleport to="body">
      <Transition name="toast-slide">
        <div
          v-if="breakToastMessage"
          class="fixed bottom-6 right-6 z-50 bg-amber-600 text-white px-4 py-3 rounded-lg shadow-lg
                 flex items-center gap-2 max-w-sm"
        >
          <svg class="w-5 h-5 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span class="text-sm font-medium">{{ breakToastMessage }}</span>
        </div>
      </Transition>
    </Teleport>

    <!-- Connection status toast (back online, queue synced, offline errors) -->
    <Teleport to="body">
      <Transition name="toast-slide">
        <div
          v-if="connectionToast"
          :class="[
            'fixed bottom-6 left-6 z-50 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm',
            connectionToastType === 'success' ? 'bg-green-600' : '',
            connectionToastType === 'error' ? 'bg-red-600' : '',
            connectionToastType === 'warning' ? 'bg-amber-600' : ''
          ]"
        >
          <svg v-if="connectionToastType === 'success'" class="w-5 h-5 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <svg v-else class="w-5 h-5 flex-shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span class="text-sm font-medium flex-1">{{ connectionToast }}</span>
          <button @click="dismissToast()" class="text-white/80 hover:text-white flex-shrink-0">
            <svg class="w-4 h-4" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* PRD 4.3.2: AutoPause flash effect — toggles between #FAFAD2 and transparent at 0.5 Hz */
@keyframes autopause-flash {
  0%, 49.9% { background-color: rgba(250, 250, 210, 0.2); }
  50%, 100% { background-color: transparent; }
}
.autopause-flash {
  animation: autopause-flash 1s step-start infinite;
}

@keyframes autopause-flash-text {
  0%, 49.9% { opacity: 1; }
  50%, 100% { opacity: 0.3; }
}
.autopause-flash-text {
  animation: autopause-flash-text 1s step-start infinite;
}

.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.3s ease;
}
.toast-slide-enter-from,
.toast-slide-leave-to {
  opacity: 0;
  transform: translateY(1rem);
}
</style>
