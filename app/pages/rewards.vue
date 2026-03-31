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
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </NuxtLink>
            <h1 class="text-xl font-semibold text-white">Rewards</h1>
          </div>
          <button
            @click="showAddModal = true"
            class="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 
                   text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Reward
          </button>
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

      <!-- Rewards List -->
      <div v-else class="space-y-6">
        <!-- Today's Progress Summary -->
        <section class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h2 class="text-lg font-medium text-white mb-2">Today's Progress</h2>
          <p class="text-3xl font-bold text-emerald-400">
            {{ Math.floor(todaysTotals.rewardable / 60) }} minutes
          </p>
          <p class="text-sm text-slate-400 mt-1">
            of rewardable time logged today
          </p>
        </section>

        <!-- Active Rewards -->
        <section v-if="rewardProgress.length > 0">
          <h2 class="text-lg font-medium text-white mb-4">Your Rewards</h2>
          <div class="space-y-3">
            <div
              v-for="progress in rewardProgress"
              :key="progress.reward.id"
              :class="[
                'bg-slate-800/50 rounded-xl border p-4 transition-colors',
                progress.isComplete 
                  ? 'border-emerald-500/50 bg-emerald-500/5' 
                  : 'border-slate-700/50'
              ]"
            >
              <div class="flex items-start justify-between mb-3">
                <div>
                  <h3 class="text-white font-medium flex items-center gap-2">
                    {{ progress.reward.name }}
                    <span v-if="progress.isComplete" class="text-emerald-400">
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  </h3>
                  <p class="text-xs text-slate-500 capitalize">
                    {{ progress.reward.rewardType.replace('_', ' ') }}
                    <span v-if="progress.reward.isRecurring"> - Recurring</span>
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-white font-medium">
                    {{ progress.currentMinutes }} / {{ progress.goalMinutes }} min
                  </p>
                  <p class="text-xs text-slate-500">
                    {{ Math.round(progress.progressPercent) }}%
                  </p>
                </div>
              </div>
              
              <!-- Progress Bar -->
              <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  class="h-full rounded-full transition-all duration-500"
                  :class="progress.isComplete ? 'bg-emerald-500' : 'bg-blue-500'"
                  :style="{ width: `${Math.min(100, progress.progressPercent)}%` }"
                ></div>
              </div>
              
              <!-- Actions -->
              <div v-if="progress.isComplete" class="mt-3">
                <button
                  class="px-3 py-1.5 text-sm bg-emerald-500/20 text-emerald-400 rounded-lg
                         hover:bg-emerald-500/30 transition-colors"
                  @click="openCashInModal(progress.reward)"
                >
                  Cash In
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Empty State -->
        <div v-else class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-8 text-center">
          <p class="text-slate-400">No rewards yet. Create your first reward to get started!</p>
        </div>

      </div>
    </main>

    <!-- Add Reward Modal -->
    <Teleport to="body">
      <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModals"></div>
        
        <div class="relative bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-md mx-4 shadow-2xl">
          <h2 class="text-xl font-semibold text-white mb-4">Add New Reward</h2>
          
          <form @submit.prevent="handleAddReward" class="space-y-4">
            <div>
              <label class="block text-sm text-slate-400 mb-1">Reward Name</label>
              <input
                v-model="rewardForm.name"
                type="text"
                placeholder="e.g., Watch a movie, Gaming time..."
                class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg
                       text-white placeholder-slate-500
                       focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                autofocus
              />
            </div>
            
            <div>
              <label class="block text-sm text-slate-400 mb-1">Reward Type</label>
              <select
                v-model="rewardForm.rewardType"
                class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg
                       text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="daily">Daily</option>
                <option value="semi_weekly">Semi-Weekly</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm text-slate-400 mb-1">Goal (minutes)</label>
              <input
                v-model.number="rewardForm.goalMinutes"
                type="number"
                min="1"
                max="1440"
                class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg
                       text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            
            <div class="flex items-center gap-2">
              <input
                id="isRecurring"
                v-model="rewardForm.isRecurring"
                type="checkbox"
                class="w-4 h-4 rounded border-slate-600 bg-slate-900/50 text-emerald-500 
                       focus:ring-emerald-500 focus:ring-offset-slate-800"
              />
              <label for="isRecurring" class="text-sm text-slate-300">
                Recurring reward (resets each period)
              </label>
            </div>
            
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="closeModals"
                class="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 
                       text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!rewardForm.name.trim() || isSubmitting"
                class="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 
                       text-white rounded-lg transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isSubmitting ? 'Adding...' : 'Add Reward' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Cash In Confirmation Dialog -->
    <Teleport to="body">
      <div v-if="showCashInModal && cashingInReward" class="fixed inset-0 z-50 flex items-center justify-center">
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
              @click="handleCashIn"
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
  </div>
</template>

<script setup lang="ts">
import type { Reward, RewardType } from '~/types/rewards'

definePageMeta({
  middleware: ['auth', 'subscription']
})

const { 
  rewards, 
  rewardProgress,
  isLoading, 
  error,
  createReward,
  cashInReward
} = useRewards()

const { todaysTotals } = useActivities()

// Modal states
const showAddModal = ref(false)
const showCashInModal = ref(false)
const cashingInReward = ref<Reward | null>(null)
const isSubmitting = ref(false)

// Form state
const rewardForm = ref({
  name: '',
  rewardType: 'daily' as RewardType,
  goalMinutes: 60,
  isRecurring: true
})

function closeModals() {
  showAddModal.value = false
  showCashInModal.value = false
  cashingInReward.value = null
  rewardForm.value = {
    name: '',
    rewardType: 'daily',
    goalMinutes: 60,
    isRecurring: true
  }
}

async function handleAddReward() {
  if (!rewardForm.value.name.trim()) return
  
  isSubmitting.value = true
  try {
    await createReward(
      rewardForm.value.name,
      rewardForm.value.rewardType,
      rewardForm.value.goalMinutes,
      rewardForm.value.isRecurring
    )
    closeModals()
  } finally {
    isSubmitting.value = false
  }
}

function openCashInModal(reward: Reward) {
  cashingInReward.value = reward
  showCashInModal.value = true
}

async function handleCashIn() {
  if (!cashingInReward.value) return
  
  isSubmitting.value = true
  try {
    await cashInReward(cashingInReward.value.id, null, '')
    closeModals()
  } finally {
    isSubmitting.value = false
  }
}
</script>
