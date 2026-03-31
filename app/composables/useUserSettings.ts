/**
 * Composable for managing user settings
 * Handles fetching, updating, and caching user preferences
 */

interface UserSettings {
  autoPauseMinutes: number
  flashOnAutoPause: boolean
  audioOnAutoPause: boolean
  autoPauseCumulativeBase: number
  includeNonRewardableInBreaks: boolean
  includeNonRewardableInRewards: boolean
  // Rewardable Time Goals (for progress circles)
  averageWorkDay: number   // Range: 1.0 - 15.0 hours, default 8.0
  averageWorkWeek: number  // Range: 5.0 - 100.0 hours, default 40.0
  theme: 'light' | 'dark' | 'system'
}

export function useUserSettings() {
  const supabase = useHealthySupabaseClient()
  const user = useSupabaseUser()

  // Use useState for SSR-safe shared state across all components
  const userSettings = useState<UserSettings>('user-settings', () => ({
    autoPauseMinutes: 2,
    flashOnAutoPause: true,
    audioOnAutoPause: false,
    autoPauseCumulativeBase: 0,
    includeNonRewardableInBreaks: false,
    includeNonRewardableInRewards: true,
    averageWorkDay: 8.0,
    averageWorkWeek: 40.0,
    theme: 'dark'
  }))
  const isLoading = useState<boolean>('user-settings-loading', () => false)
  const isSaving = useState<boolean>('user-settings-saving', () => false)
  const error = useState<string | null>('user-settings-error', () => null)
  const isLoaded = useState<boolean>('user-settings-loaded', () => false)
  // Cache the user ID to avoid issues with user ref changing
  const cachedUserId = useState<string | null>('user-settings-cached-user-id', () => null)
  
  /**
   * Helper to get user ID from various possible user object shapes
   */
  function getUserId(): string | null {
    // Try standard Supabase User object first
    if (user.value?.id) return user.value.id
    // Fallback to JWT sub claim if user object is raw session data
    if ((user.value as any)?.sub) return (user.value as any).sub
    // Use cached ID as last resort
    return cachedUserId.value
  }

  /**
   * Fetch user settings from the database
   */
  async function fetchSettings() {
    const userId = getUserId()
    if (!userId) {
      // Don't set error for SSR - just return silently
      // The client will retry when the user is available
      return
    }

    // Cache the user ID for future operations
    cachedUserId.value = userId
    isLoading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (fetchError) {
        // If no settings exist, create default settings
        if (fetchError.code === 'PGRST116') {
          await createDefaultSettings(userId)
          return
        }
        throw fetchError
      }

      if (data) {
        userSettings.value = {
          autoPauseMinutes: data.auto_pause_minutes ?? 2,
          flashOnAutoPause: data.flash_on_auto_pause ?? true,
          audioOnAutoPause: data.audio_on_auto_pause ?? false,
          autoPauseCumulativeBase: data.auto_pause_cumulative_base ?? 0,
          includeNonRewardableInBreaks: data.include_non_rewardable_in_breaks ?? false,
          includeNonRewardableInRewards: data.include_non_rewardable_in_rewards ?? true,
          averageWorkDay: data.average_work_day ?? 8.0,
          averageWorkWeek: data.average_work_week ?? 40.0,
          theme: (data.theme as UserSettings['theme']) ?? 'dark'
        }
        isLoaded.value = true
      }
    } catch (e) {
      console.error('Error fetching user settings:', e)
      error.value = e instanceof Error ? e.message : 'Failed to fetch settings'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create default settings for a new user
   */
  async function createDefaultSettings(userId: string) {
    try {
      const { data, error: insertError } = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          auto_pause_minutes: 2,
          flash_on_auto_pause: true,
          audio_on_auto_pause: false,
          auto_pause_cumulative_base: 0,
          include_non_rewardable_in_breaks: false,
          include_non_rewardable_in_rewards: true,
          average_work_day: 8.0,
          average_work_week: 40.0,
          theme: 'dark'
        })
        .select()
        .single()

      if (insertError) throw insertError

      if (data) {
        userSettings.value = {
          autoPauseMinutes: data.auto_pause_minutes ?? 2,
          flashOnAutoPause: data.flash_on_auto_pause ?? true,
          audioOnAutoPause: data.audio_on_auto_pause ?? false,
          autoPauseCumulativeBase: data.auto_pause_cumulative_base ?? 0,
          includeNonRewardableInBreaks: data.include_non_rewardable_in_breaks ?? false,
          includeNonRewardableInRewards: data.include_non_rewardable_in_rewards ?? true,
          averageWorkDay: data.average_work_day ?? 8.0,
          averageWorkWeek: data.average_work_week ?? 40.0,
          theme: (data.theme as UserSettings['theme']) ?? 'dark'
        }
        isLoaded.value = true
      }
    } catch (e) {
      console.error('Error creating default settings:', e)
      error.value = e instanceof Error ? e.message : 'Failed to create settings'
    }
  }

  /**
   * Update a single setting
   */
  async function updateSetting<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) {
    const userId = getUserId()
    if (!userId) {
      error.value = 'Not authenticated'
      return false
    }

    isSaving.value = true
    error.value = null

    // Map frontend keys to database column names
    const dbKeyMap: Record<keyof UserSettings, string> = {
      autoPauseMinutes: 'auto_pause_minutes',
      flashOnAutoPause: 'flash_on_auto_pause',
      audioOnAutoPause: 'audio_on_auto_pause',
      autoPauseCumulativeBase: 'auto_pause_cumulative_base',
      includeNonRewardableInBreaks: 'include_non_rewardable_in_breaks',
      includeNonRewardableInRewards: 'include_non_rewardable_in_rewards',
      averageWorkDay: 'average_work_day',
      averageWorkWeek: 'average_work_week',
      theme: 'theme'
    }

    try {
      const { data, error: updateError } = await supabase
        .from('user_settings')
        .update({ [dbKeyMap[key]]: value })
        .eq('user_id', userId)
        .select()
        .single()

      if (updateError) throw updateError

      if (!data) {
        throw new Error('Settings update returned no data — row may not exist for this user')
      }

      // Update local state from the confirmed DB response
      userSettings.value = {
        autoPauseMinutes: data.auto_pause_minutes ?? userSettings.value.autoPauseMinutes,
        flashOnAutoPause: data.flash_on_auto_pause ?? userSettings.value.flashOnAutoPause,
        audioOnAutoPause: data.audio_on_auto_pause ?? userSettings.value.audioOnAutoPause,
        autoPauseCumulativeBase: data.auto_pause_cumulative_base ?? userSettings.value.autoPauseCumulativeBase,
        includeNonRewardableInBreaks: data.include_non_rewardable_in_breaks ?? userSettings.value.includeNonRewardableInBreaks,
        includeNonRewardableInRewards: data.include_non_rewardable_in_rewards ?? userSettings.value.includeNonRewardableInRewards,
        averageWorkDay: data.average_work_day ?? userSettings.value.averageWorkDay,
        averageWorkWeek: data.average_work_week ?? userSettings.value.averageWorkWeek,
        theme: (data.theme as UserSettings['theme']) ?? userSettings.value.theme
      }
      return true
    } catch (e) {
      console.error('Error updating setting:', e)
      error.value = e instanceof Error ? e.message : 'Failed to update setting'
      return false
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Update multiple settings at once
   */
  async function updateSettings(updates: Partial<UserSettings>) {
    const userId = getUserId()
    if (!userId) {
      error.value = 'Not authenticated'
      return false
    }

    isSaving.value = true
    error.value = null

    // Map frontend keys to database column names
    const dbUpdates: Record<string, unknown> = {}
    if (updates.autoPauseMinutes !== undefined) {
      dbUpdates.auto_pause_minutes = updates.autoPauseMinutes
    }
    if (updates.flashOnAutoPause !== undefined) {
      dbUpdates.flash_on_auto_pause = updates.flashOnAutoPause
    }
    if (updates.audioOnAutoPause !== undefined) {
      dbUpdates.audio_on_auto_pause = updates.audioOnAutoPause
    }
    if (updates.autoPauseCumulativeBase !== undefined) {
      dbUpdates.auto_pause_cumulative_base = updates.autoPauseCumulativeBase
    }
    if (updates.includeNonRewardableInBreaks !== undefined) {
      dbUpdates.include_non_rewardable_in_breaks = updates.includeNonRewardableInBreaks
    }
    if (updates.includeNonRewardableInRewards !== undefined) {
      dbUpdates.include_non_rewardable_in_rewards = updates.includeNonRewardableInRewards
    }
    if (updates.averageWorkDay !== undefined) {
      dbUpdates.average_work_day = updates.averageWorkDay
    }
    if (updates.averageWorkWeek !== undefined) {
      dbUpdates.average_work_week = updates.averageWorkWeek
    }
    if (updates.theme !== undefined) {
      dbUpdates.theme = updates.theme
    }

    try {
      const { data, error: updateError } = await supabase
        .from('user_settings')
        .update(dbUpdates)
        .eq('user_id', userId)
        .select()
        .single()

      if (updateError) throw updateError

      if (!data) {
        throw new Error('Settings update returned no data — row may not exist for this user')
      }

      // Update local state from the confirmed DB response
      userSettings.value = {
        autoPauseMinutes: data.auto_pause_minutes ?? userSettings.value.autoPauseMinutes,
        flashOnAutoPause: data.flash_on_auto_pause ?? userSettings.value.flashOnAutoPause,
        audioOnAutoPause: data.audio_on_auto_pause ?? userSettings.value.audioOnAutoPause,
        autoPauseCumulativeBase: data.auto_pause_cumulative_base ?? userSettings.value.autoPauseCumulativeBase,
        includeNonRewardableInBreaks: data.include_non_rewardable_in_breaks ?? userSettings.value.includeNonRewardableInBreaks,
        includeNonRewardableInRewards: data.include_non_rewardable_in_rewards ?? userSettings.value.includeNonRewardableInRewards,
        averageWorkDay: data.average_work_day ?? userSettings.value.averageWorkDay,
        averageWorkWeek: data.average_work_week ?? userSettings.value.averageWorkWeek,
        theme: (data.theme as UserSettings['theme']) ?? userSettings.value.theme
      }
      return true
    } catch (e) {
      console.error('Error updating settings:', e)
      error.value = e instanceof Error ? e.message : 'Failed to update settings'
      return false
    } finally {
      isSaving.value = false
    }
  }

  return {
    settings: readonly(userSettings),
    isLoading: readonly(isLoading),
    isSaving: readonly(isSaving),
    error: readonly(error),
    isLoaded: readonly(isLoaded),
    fetchSettings,
    updateSetting,
    updateSettings
  }
}
