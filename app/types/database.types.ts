/**
 * Database types for Supabase
 * Generated from SQL migrations
 * 
 * These types match the database schema defined in supabase/migrations/
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          username: string
          first_name: string
          last_name: string
          email: string
          stripe_customer_id: string | null
          subscription_status: 'trial' | 'active' | 'canceled' | 'expired'
          trial_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          first_name: string
          last_name: string
          email: string
          stripe_customer_id?: string | null
          subscription_status?: 'trial' | 'active' | 'canceled' | 'expired'
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          first_name?: string
          last_name?: string
          email?: string
          stripe_customer_id?: string | null
          subscription_status?: 'trial' | 'active' | 'canceled' | 'expired'
          trial_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          auto_pause_minutes: number
          flash_on_auto_pause: boolean
          include_non_rewardable_in_breaks: boolean
          theme: 'light' | 'dark' | 'system'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          auto_pause_minutes?: number
          flash_on_auto_pause?: boolean
          include_non_rewardable_in_breaks?: boolean
          theme?: 'light' | 'dark' | 'system'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          auto_pause_minutes?: number
          flash_on_auto_pause?: boolean
          include_non_rewardable_in_breaks?: boolean
          theme?: 'light' | 'dark' | 'system'
          created_at?: string
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          user_id: string
          name: string
          activity_type: 'rewardable' | 'non_rewardable' | 'wasted'
          sort_order: number
          is_archived: boolean
          auto_repeat: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          activity_type: 'rewardable' | 'non_rewardable' | 'wasted'
          sort_order?: number
          is_archived?: boolean
          auto_repeat?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          activity_type?: 'rewardable' | 'non_rewardable' | 'wasted'
          sort_order?: number
          is_archived?: boolean
          auto_repeat?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      activity_timers: {
        Row: {
          id: string
          user_id: string
          activity_id: string
          status: 'idle' | 'running' | 'paused' | 'auto_paused'
          today_seconds: number
          all_time_seconds: number
          last_started_at: string | null
          last_stopped_at: string | null
          auto_pause_at: string | null
          is_completed: boolean
          completed_at: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity_id: string
          status?: 'idle' | 'running' | 'paused' | 'auto_paused'
          today_seconds?: number
          all_time_seconds?: number
          last_started_at?: string | null
          last_stopped_at?: string | null
          auto_pause_at?: string | null
          is_completed?: boolean
          completed_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          activity_id?: string
          status?: 'idle' | 'running' | 'paused' | 'auto_paused'
          today_seconds?: number
          all_time_seconds?: number
          last_started_at?: string | null
          last_stopped_at?: string | null
          auto_pause_at?: string | null
          is_completed?: boolean
          completed_at?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      activity_time_logs: {
        Row: {
          id: string
          user_id: string
          activity_id: string
          timer_id: string
          started_at: string
          ended_at: string | null
          auto_pause_at: string | null
          was_auto_stopped: boolean
          duration_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity_id: string
          timer_id: string
          started_at: string
          ended_at?: string | null
          auto_pause_at?: string | null
          was_auto_stopped?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          activity_id?: string
          timer_id?: string
          started_at?: string
          ended_at?: string | null
          auto_pause_at?: string | null
          was_auto_stopped?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_email_by_username: {
        Args: { p_username: string }
        Returns: string | null
      }
      start_activity: {
        Args: { p_timer_id: string }
        Returns: void
      }
      stop_activity: {
        Args: { p_timer_id: string }
        Returns: void
      }
      auto_pause_activity: {
        Args: { p_timer_id: string }
        Returns: void
      }
      reset_daily_timers: {
        Args: { p_user_id: string }
        Returns: void
      }
      get_activity_summary: {
        Args: { p_user_id: string }
        Returns: {
          activity_id: string
          activity_name: string
          activity_type: string
          today_seconds: number
          all_time_seconds: number
        }[]
      }
      get_server_time: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']

export type UserSettings = Database['public']['Tables']['user_settings']['Row']
export type UserSettingsInsert = Database['public']['Tables']['user_settings']['Insert']
export type UserSettingsUpdate = Database['public']['Tables']['user_settings']['Update']

export type Activity = Database['public']['Tables']['activities']['Row']
export type ActivityInsert = Database['public']['Tables']['activities']['Insert']
export type ActivityUpdate = Database['public']['Tables']['activities']['Update']

export type ActivityTimer = Database['public']['Tables']['activity_timers']['Row']
export type ActivityTimerInsert = Database['public']['Tables']['activity_timers']['Insert']
export type ActivityTimerUpdate = Database['public']['Tables']['activity_timers']['Update']

export type ActivityTimeLog = Database['public']['Tables']['activity_time_logs']['Row']
export type ActivityTimeLogInsert = Database['public']['Tables']['activity_time_logs']['Insert']
export type ActivityTimeLogUpdate = Database['public']['Tables']['activity_time_logs']['Update']

// Activity type enum
export type ActivityType = 'rewardable' | 'non_rewardable' | 'wasted'

// Timer status enum
export type TimerStatus = 'idle' | 'running' | 'paused' | 'auto_paused'

// Subscription status enum
export type SubscriptionStatus = 'trial' | 'active' | 'canceled' | 'expired'

// Theme enum
export type Theme = 'light' | 'dark' | 'system'
