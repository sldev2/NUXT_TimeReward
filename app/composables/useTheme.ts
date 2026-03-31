/**
 * Composable for managing the application theme
 * Applies dark/light/system theme to the document
 */

type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const { settings, isLoaded } = useUserSettings()
  
  // Track the actual applied theme (resolved from 'system' if needed)
  const appliedTheme = useState<'light' | 'dark'>('applied-theme', () => 'dark')
  
  /**
   * Get the system preference for color scheme
   */
  function getSystemTheme(): 'light' | 'dark' {
    if (import.meta.server) return 'dark' // Default for SSR
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  
  /**
   * Apply the theme to the document
   */
  function applyTheme(theme: Theme) {
    if (import.meta.server) return // Skip on server
    
    const resolvedTheme = theme === 'system' ? getSystemTheme() : theme
    appliedTheme.value = resolvedTheme
    
    // Update document class
    const html = document.documentElement
    html.classList.remove('light', 'dark')
    html.classList.add(resolvedTheme)
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#1e293b' : '#ffffff')
    }
  }
  
  /**
   * Initialize theme watching
   */
  function initTheme() {
    if (import.meta.server) return
    
    // Apply initial theme
    applyTheme(settings.value.theme)
    
    // Watch for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', () => {
      if (settings.value.theme === 'system') {
        applyTheme('system')
      }
    })
  }
  
  // Watch for settings changes
  if (import.meta.client) {
    watch(() => settings.value.theme, (newTheme) => {
      applyTheme(newTheme)
    })
    
    // Watch for settings to be loaded
    watch(isLoaded, (loaded) => {
      if (loaded) {
        applyTheme(settings.value.theme)
      }
    })
  }
  
  return {
    appliedTheme: readonly(appliedTheme),
    applyTheme,
    initTheme,
    getSystemTheme
  }
}
