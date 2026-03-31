/**
 * Demo Data Seeding Script
 * 
 * Creates multiple test users with activities, rewards, and breaks.
 * Based on PRD Section 17.3.1 requirements.
 * 
 * Usage:
 *   npx tsx scripts/seed-demo-data.ts
 * 
 * Environment Variables Required:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (for admin operations)
 */

import { createClient } from '@supabase/supabase-js'

// Configuration
const TEST_USERS = [
  { username: 'kyrie', firstName: 'Kyrie', lastName: 'Irving', email: 'kyrie@timereward.local' },
  { username: 'smurfboz23', firstName: 'Smurf', lastName: 'Boz', email: 'smurfboz23@timereward.local' },
  { username: 'yogiboz23', firstName: 'Yogi', lastName: 'Boz', email: 'yogiboz23@timereward.local' },
  { username: 'speroboz23', firstName: 'Spero', lastName: 'Boz', email: 'speroboz23@timereward.local' },
  { username: 'banjoboz23', firstName: 'Banjo', lastName: 'Boz', email: 'banjoboz23@timereward.local' },
  { username: 'bapujboz23', firstName: 'Bapuj', lastName: 'Boz', email: 'bapujboz23@timereward.local' },
  { username: 'mongoboz23', firstName: 'Mongo', lastName: 'Boz', email: 'mongoboz23@timereward.local' },
]

const DEFAULT_PASSWORD = '@Password1'

// Standard activities for all users
const ACTIVITIES = [
  { name: 'Work', activityType: 'rewardable', sortOrder: 1, estimateType: 'none' },
  { 
    name: 'Test', 
    activityType: 'rewardable', 
    sortOrder: 2, 
    estimateType: 'weekday',  // Weekday-specific estimates (matches frontend EstimateType)
    estimateMon: 0.25,
    estimateTue: 0.25,
    estimateWed: 0.25,
    estimateThu: 0.25,
    estimateFri: 0.25,
    estimateSat: 0.25,
    estimateSun: 0.25,
  },
  { name: 'Chores', activityType: 'non_rewardable', sortOrder: 3, estimateType: 'none' },
  { name: 'Facebook', activityType: 'wasted', sortOrder: 4, estimateType: 'none' },
]

// 36 pre-configured rewards (6 per reward type)
const REWARDS = [
  // Daily rewards (6)
  { name: 'Daily Gaming', rewardType: 'daily', goalMinutes: 60, isRecurring: true },
  { name: 'Daily TV', rewardType: 'daily', goalMinutes: 90, isRecurring: true },
  { name: 'Daily Snack', rewardType: 'daily', goalMinutes: 30, isRecurring: false },
  { name: 'Daily Coffee', rewardType: 'daily', goalMinutes: 45, isRecurring: true },
  { name: 'Daily Walk', rewardType: 'daily', goalMinutes: 120, isRecurring: true },
  { name: 'Daily Social Media', rewardType: 'daily', goalMinutes: 60, isRecurring: true },
  
  // Semi-Weekly rewards (6)
  { name: 'Semi-Weekly Movie', rewardType: 'semi_weekly', goalMinutes: 180, isRecurring: true },
  { name: 'Semi-Weekly Dessert', rewardType: 'semi_weekly', goalMinutes: 120, isRecurring: false },
  { name: 'Semi-Weekly Game Session', rewardType: 'semi_weekly', goalMinutes: 240, isRecurring: true },
  { name: 'Semi-Weekly Hobby', rewardType: 'semi_weekly', goalMinutes: 150, isRecurring: true },
  { name: 'Semi-Weekly Takeout', rewardType: 'semi_weekly', goalMinutes: 200, isRecurring: true },
  { name: 'Semi-Weekly Nap', rewardType: 'semi_weekly', goalMinutes: 180, isRecurring: false },
  
  // Weekly rewards (6)
  { name: 'Weekly Restaurant', rewardType: 'weekly', goalMinutes: 300, isRecurring: true },
  { name: 'Weekly Shopping', rewardType: 'weekly', goalMinutes: 420, isRecurring: false },
  { name: 'Weekly Spa', rewardType: 'weekly', goalMinutes: 480, isRecurring: true },
  { name: 'Weekly Concert', rewardType: 'weekly', goalMinutes: 600, isRecurring: false },
  { name: 'Weekly Gaming Binge', rewardType: 'weekly', goalMinutes: 360, isRecurring: true },
  { name: 'Weekly Day Off', rewardType: 'weekly', goalMinutes: 500, isRecurring: true },
  
  // Monthly rewards (6)
  { name: 'Monthly Vacation Day', rewardType: 'monthly', goalMinutes: 1800, isRecurring: true },
  { name: 'Monthly Gadget', rewardType: 'monthly', goalMinutes: 2400, isRecurring: false },
  { name: 'Monthly Night Out', rewardType: 'monthly', goalMinutes: 1200, isRecurring: true },
  { name: 'Monthly Subscription', rewardType: 'monthly', goalMinutes: 900, isRecurring: true },
  { name: 'Monthly Treat', rewardType: 'monthly', goalMinutes: 1500, isRecurring: true },
  { name: 'Monthly Adventure', rewardType: 'monthly', goalMinutes: 2000, isRecurring: false },
  
  // Quarterly rewards (6)
  { name: 'Quarterly Weekend Trip', rewardType: 'quarterly', goalMinutes: 6000, isRecurring: true },
  { name: 'Quarterly Big Purchase', rewardType: 'quarterly', goalMinutes: 9000, isRecurring: false },
  { name: 'Quarterly Spa Day', rewardType: 'quarterly', goalMinutes: 4500, isRecurring: true },
  { name: 'Quarterly Concert Ticket', rewardType: 'quarterly', goalMinutes: 5000, isRecurring: true },
  { name: 'Quarterly Hobby Upgrade', rewardType: 'quarterly', goalMinutes: 7500, isRecurring: false },
  { name: 'Quarterly Celebration', rewardType: 'quarterly', goalMinutes: 6000, isRecurring: true },
  
  // Yearly rewards (6)
  { name: 'Yearly Vacation', rewardType: 'yearly', goalMinutes: 30000, isRecurring: true },
  { name: 'Yearly Major Purchase', rewardType: 'yearly', goalMinutes: 50000, isRecurring: false },
  { name: 'Yearly Milestone', rewardType: 'yearly', goalMinutes: 20000, isRecurring: true },
  { name: 'Yearly Adventure', rewardType: 'yearly', goalMinutes: 40000, isRecurring: false },
  { name: 'Yearly Self-Gift', rewardType: 'yearly', goalMinutes: 25000, isRecurring: true },
  { name: 'Yearly Celebration', rewardType: 'yearly', goalMinutes: 35000, isRecurring: true },
]

// Sample earned breaks
const BREAKS = [
  { name: 'Coffee Break', goalMinutes: 30, breakDurationMinutes: 5, isRecurring: true },
  { name: 'Stretch Break', goalMinutes: 60, breakDurationMinutes: 10, isRecurring: true },
  { name: 'Lunch Break', goalMinutes: 120, breakDurationMinutes: 30, isRecurring: true },
  { name: 'Quick Rest', goalMinutes: 45, breakDurationMinutes: 5, isRecurring: false },
]

async function main() {
  // Load environment variables
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required')
    console.error('Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-demo-data.ts')
    process.exit(1)
  }

  // Create admin client with service role key
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('Starting demo data seeding...\n')

  let usersCreated = 0
  let usersSkipped = 0

  for (const testUser of TEST_USERS) {
    console.log(`\n--- Processing user: ${testUser.username} ---`)

    try {
      // Check if user already exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', testUser.username)
        .single()

      if (existingProfile) {
        console.log(`  User "${testUser.username}" already exists, skipping`)
        usersSkipped++
        continue
      }

      // Create auth user via Admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: testUser.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          first_name: testUser.firstName,
          last_name: testUser.lastName,
          username: testUser.username
        }
      })

      if (authError) {
        console.error(`  Error creating auth user: ${authError.message}`)
        continue
      }

      const userId = authData.user.id
      console.log(`  Created auth user: ${userId}`)

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          username: testUser.username,
          email: testUser.email,
          first_name: testUser.firstName,
          last_name: testUser.lastName,
          subscription_status: 'active'
        })

      if (profileError) {
        console.error(`  Error creating profile: ${profileError.message}`)
        continue
      }
      console.log('  Created user profile')

      // Create user settings
      const { error: settingsError } = await supabase
        .from('user_settings')
        .insert({ user_id: userId })

      if (settingsError) {
        console.error(`  Error creating settings: ${settingsError.message}`)
      } else {
        console.log('  Created user settings')
      }

      // Create activities
      for (const activity of ACTIVITIES) {
        const activityRecord: Record<string, unknown> = {
          user_id: userId,
          name: activity.name,
          activity_type: activity.activityType,
          sort_order: activity.sortOrder,
          is_archived: false,
          estimate_type: activity.estimateType || 'none',
        }
        
        // Add specific day estimates if present
        if (activity.estimateType === 'weekday') {
          activityRecord.estimate_mon = (activity as any).estimateMon ?? 1.0
          activityRecord.estimate_tue = (activity as any).estimateTue ?? 1.0
          activityRecord.estimate_wed = (activity as any).estimateWed ?? 1.0
          activityRecord.estimate_thu = (activity as any).estimateThu ?? 1.0
          activityRecord.estimate_fri = (activity as any).estimateFri ?? 1.0
          activityRecord.estimate_sat = (activity as any).estimateSat ?? 0.0
          activityRecord.estimate_sun = (activity as any).estimateSun ?? 0.0
        }
        
        const { data: activityData, error: activityError } = await supabase
          .from('activities')
          .insert(activityRecord)
          .select()
          .single()

        if (activityError) {
          console.error(`  Error creating activity ${activity.name}: ${activityError.message}`)
          continue
        }

        // Create timer for this activity
        const { error: timerError } = await supabase
          .from('activity_timers')
          .insert({
            user_id: userId,
            activity_id: activityData.id,
            status: 'idle',
            today_seconds: 0,
            all_time_seconds: 0
          })

        if (timerError) {
          console.error(`  Error creating timer for ${activity.name}: ${timerError.message}`)
        }
      }
      console.log(`  Created ${ACTIVITIES.length} activities with timers`)

      // Create rewards (all 36)
      let rewardsCreated = 0
      for (const reward of REWARDS) {
        const { error: rewardError } = await supabase
          .from('rewards')
          .insert({
            user_id: userId,
            name: reward.name,
            reward_type: reward.rewardType,
            goal_minutes: reward.goalMinutes,
            is_recurring: reward.isRecurring,
            is_archived: false,
            sort_order: rewardsCreated
          })

        if (!rewardError) {
          rewardsCreated++
        }
      }
      console.log(`  Created ${rewardsCreated} rewards`)

      // Create earned breaks
      let breaksCreated = 0
      for (const brk of BREAKS) {
        const { error: breakError } = await supabase
          .from('user_breaks')
          .insert({
            user_id: userId,
            name: brk.name,
            goal_minutes: brk.goalMinutes,
            break_duration_minutes: brk.breakDurationMinutes,
            is_recurring: brk.isRecurring,
            progress_seconds: 0,
            is_archived: false
          })

        if (!breakError) {
          breaksCreated++
        }
      }
      console.log(`  Created ${breaksCreated} earned breaks`)

      usersCreated++
      console.log(`  ✅ User "${testUser.username}" setup complete`)

    } catch (e) {
      console.error(`  Unexpected error for ${testUser.username}:`, e)
    }
  }

  console.log('\n========================================')
  console.log(`Demo data seeding complete!`)
  console.log(`  Users created: ${usersCreated}`)
  console.log(`  Users skipped: ${usersSkipped}`)
  console.log(`  Total users: ${TEST_USERS.length}`)
  console.log('\nTest user credentials:')
  console.log(`  Password (all users): ${DEFAULT_PASSWORD}`)
  console.log('========================================\n')
}

main().catch(console.error)
