<script setup lang="ts">
const toastMessage = useState<string>('connection-toast', () => '')
const toastType = useState<'success' | 'error' | 'warning'>('connection-toast-type', () => 'success')

function dismissToast() {
  toastMessage.value = ''
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-6 inset-x-0 z-50 flex justify-start px-6 md:justify-center pointer-events-none">
      <Transition name="toast-slide">
        <div
          v-if="toastMessage"
          :class="[
            'pointer-events-auto text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm w-full sm:w-auto',
            toastType === 'success' ? 'bg-green-600' : '',
            toastType === 'error' ? 'bg-red-600' : '',
            toastType === 'warning' ? 'bg-amber-600' : ''
          ]"
        >
        <svg
          v-if="toastType === 'success'"
          class="w-5 h-5 flex-shrink-0"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <svg
          v-else
          class="w-5 h-5 flex-shrink-0"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <span class="text-sm font-medium flex-1">{{ toastMessage }}</span>
        <button
          type="button"
          class="text-white/80 hover:text-white flex-shrink-0"
          aria-label="Dismiss notification"
          @click="dismissToast"
        >
          <svg class="w-4 h-4" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
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
