<script setup lang="ts">
/**
 * StackedProgressCircle Component
 * 
 * Displays a dual-circle progress indicator:
 * - First circle (inner): Linear progress 0-100% of goal
 * - Second circle (outer): Non-linear overflow when exceeding 100%
 * 
 * The overflow circle uses an asymptotic formula that never reaches 100%,
 * matching the parent project's StackedProgress.razor behavior.
 */

interface Props {
  /** Progress percentage (0-100+, can exceed 100%) */
  progress: number
  /** Color class for normal progress (0-100%) */
  normalColor?: string
  /** Color class for overflow progress (>100%) */
  overflowColor?: string
  /** Size of the circle */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show the percentage label */
  showLabel?: boolean
  /** Stroke width for the circle */
  strokeWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  normalColor: 'text-emerald-500',
  overflowColor: 'text-red-500',
  size: 'md',
  showLabel: true,
  strokeWidth: 3
})

// Size configurations
const sizeConfig = computed(() => {
  switch (props.size) {
    case 'sm':
      return { diameter: 40, fontSize: 'text-[10px]', innerDiameter: 32 }
    case 'lg':
      return { diameter: 80, fontSize: 'text-base', innerDiameter: 64 }
    case 'md':
    default:
      return { diameter: 56, fontSize: 'text-xs', innerDiameter: 44 }
  }
})

// Calculate the overflow circle percentage using the asymptotic formula
// This matches the parent project's GetOverTime property
const overflowPercent = computed(() => {
  if (props.progress <= 100) {
    return 0
  }
  
  if (props.progress > 200) {
    // Asymptotic approach: approaches 100% but never reaches it
    // Formula: 50 + 50 * (progress - 200) / (progress + 200)
    return 50 + 50 * (props.progress - 200) / (props.progress + 200)
  }
  
  // Linear from 0% to 50% for progress 100% to 200%
  // Formula: 100 * (progress - 100) / 200
  return 100 * (props.progress - 100) / 200
})

// Whether to show the overflow (second) circle
const showOverflow = computed(() => props.progress > 100)

// Clamp the first circle to 100%
const normalPercent = computed(() => Math.min(props.progress, 100))

// SVG calculations
const radius = computed(() => (sizeConfig.value.diameter - props.strokeWidth) / 2)
const innerRadius = computed(() => (sizeConfig.value.innerDiameter - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const innerCircumference = computed(() => 2 * Math.PI * innerRadius.value)

// Calculate stroke-dashoffset for progress visualization
const normalStrokeDashoffset = computed(() => {
  const offset = innerCircumference.value - (normalPercent.value / 100) * innerCircumference.value
  return offset
})

const overflowStrokeDashoffset = computed(() => {
  const offset = circumference.value - (overflowPercent.value / 100) * circumference.value
  return offset
})

// Center coordinates
const center = computed(() => sizeConfig.value.diameter / 2)
const innerCenter = computed(() => sizeConfig.value.innerDiameter / 2)
</script>

<template>
  <div 
    class="relative inline-flex items-center justify-center"
    :style="{ width: `${sizeConfig.diameter}px`, height: `${sizeConfig.diameter}px` }"
  >
    <!-- Background circles (faint) -->
    <svg 
      class="absolute inset-0"
      :width="sizeConfig.diameter"
      :height="sizeConfig.diameter"
    >
      <!-- Inner background circle -->
      <circle
        :cx="center"
        :cy="center"
        :r="innerRadius"
        fill="none"
        :stroke-width="strokeWidth"
        class="text-slate-700 opacity-30"
        stroke="currentColor"
      />
      <!-- Outer background circle (only if overflow) -->
      <circle
        v-if="showOverflow"
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke-width="strokeWidth"
        class="text-slate-700 opacity-20"
        stroke="currentColor"
      />
    </svg>

    <!-- Progress circles -->
    <svg 
      class="absolute inset-0 -rotate-90"
      :width="sizeConfig.diameter"
      :height="sizeConfig.diameter"
    >
      <!-- Inner progress circle (normal, 0-100%) -->
      <circle
        :cx="center"
        :cy="center"
        :r="innerRadius"
        fill="none"
        :stroke-width="strokeWidth"
        :class="normalColor"
        stroke="currentColor"
        :stroke-dasharray="innerCircumference"
        :stroke-dashoffset="normalStrokeDashoffset"
        stroke-linecap="round"
        class="transition-all duration-300"
      />
      
      <!-- Outer overflow circle (>100%) -->
      <circle
        v-if="showOverflow"
        :cx="center"
        :cy="center"
        :r="radius"
        fill="none"
        :stroke-width="strokeWidth"
        :class="overflowColor"
        stroke="currentColor"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="overflowStrokeDashoffset"
        stroke-linecap="round"
        class="transition-all duration-300"
      />
    </svg>

    <!-- Percentage label -->
    <span 
      v-if="showLabel"
      :class="[
        'relative z-10 font-semibold tabular-nums',
        sizeConfig.fontSize,
        progress > 100 ? overflowColor : 'text-slate-200'
      ]"
    >
      {{ Math.round(progress) }}%
    </span>
  </div>
</template>
