<script setup lang="ts">
const user = useSupabaseUser()

// Redirect authenticated users to home
watchEffect(() => {
  if (user.value) {
    navigateTo('/home')
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
    <div class="text-center px-4">
      <!-- Hero -->
      <h1 class="text-5xl md:text-6xl font-bold mb-6">
        <span class="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
          TimeReward
        </span>
      </h1>
      
      <p class="text-xl text-slate-400 mb-8 max-w-md mx-auto">
        Track your time, earn your rewards. Build better habits with intelligent time tracking.
      </p>

      <!-- CTA Buttons -->
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <NuxtLink
          to="/register"
          class="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 
                 text-white font-semibold rounded-lg shadow-lg
                 hover:from-blue-600 hover:to-cyan-600 
                 transition-all duration-200"
        >
          Get Started Free
        </NuxtLink>
        
        <NuxtLink
          to="/login"
          class="px-8 py-3 bg-slate-700/50 border border-slate-600
                 text-white font-semibold rounded-lg
                 hover:bg-slate-700 
                 transition-all duration-200"
        >
          Sign In
        </NuxtLink>
      </div>

      <!-- Features Preview -->
      <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto text-left">
        <div class="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <div class="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-white font-semibold mb-2">Real-Time Tracking</h3>
          <p class="text-slate-400 text-sm">Track activities across all your devices with instant sync.</p>
        </div>
        
        <div class="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <div class="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <h3 class="text-white font-semibold mb-2">Earn Rewards</h3>
          <p class="text-slate-400 text-sm">Set goals and unlock rewards as you build productive habits.</p>
        </div>
        
        <div class="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <div class="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 class="text-white font-semibold mb-2">Works Offline</h3>
          <p class="text-slate-400 text-sm">Keep tracking even without internet. Syncs when you're back online.</p>
        </div>
      </div>
    </div>
  </div>
</template>
