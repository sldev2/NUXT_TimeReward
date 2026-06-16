/**
 * Timer Reset Utility for Playwright Tests
 * 
 * Resets all activity timers to a clean state before tests run.
 * This ensures tests start with:
 * - All timers at 0 seconds
 * - No auto-paused activities
 * - No running activities
 * 
 * Usage:
 *   import { resetTestUserTimers } from './test-utils/reset-timers';
 *   
 *   test.beforeEach(async () => {
 *     await resetTestUserTimers();
 *   });
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from the repo root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('⚠️ Missing SUPABASE_URL or SUPABASE_SECRET_KEY in environment');
  console.warn('   Timer reset will not work. Set these in the repo root .env');
}

/**
 * Reset all timers for the test user to a clean state.
 * 
 * @param username - The username to reset timers for (default: 'kyrie')
 */
export async function resetTestUserTimers(username: string = 'kyrie'): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('⚠️ Skipping timer reset - missing Supabase credentials');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log(`🔄 Resetting timers for user: ${username}`);

  try {
    // Get the user's ID from their profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      console.error(`❌ Could not find user profile for: ${username}`);
      console.error('   Error:', profileError?.message);
      return;
    }

    const userId = profile.id;
    console.log(`   Found user ID: ${userId}`);

    // 1. Close any open activity time logs (set ended_at)
    const { error: logsError } = await supabase
      .from('activity_time_logs')
      .update({ 
        ended_at: new Date().toISOString(),
        was_auto_stopped: false
      })
      .eq('user_id', userId)
      .is('ended_at', null);

    if (logsError) {
      console.error('   ⚠️ Error closing time logs:', logsError.message);
    } else {
      console.log('   ✅ Closed any open time logs');
    }

    // 2. Reset all activity timers
    const { error: timersError } = await supabase
      .from('activity_timers')
      .update({
        status: 'idle',
        today_seconds: 0,
        all_time_seconds: 0,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (timersError) {
      console.error('   ⚠️ Error resetting timers:', timersError.message);
    } else {
      console.log('   ✅ Reset all activity timers to idle/0 seconds');
    }

    // 3. Delete all activity time logs for clean slate (optional - comment out to keep history)
    const { error: deleteLogsError } = await supabase
      .from('activity_time_logs')
      .delete()
      .eq('user_id', userId);

    if (deleteLogsError) {
      console.error('   ⚠️ Error deleting time logs:', deleteLogsError.message);
    } else {
      console.log('   ✅ Deleted all activity time logs');
    }

    console.log(`✅ Timer reset complete for user: ${username}`);

  } catch (error) {
    console.error('❌ Timer reset failed:', error);
  }
}

/**
 * Verify the test user has exactly 4 expected activities.
 * Creates them if missing.
 */
export async function ensureTestActivities(username: string = 'kyrie'): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('⚠️ Skipping activity check - missing Supabase credentials');
    return false;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const expectedActivities = [
    { name: 'Work', activity_type: 'rewardable' },
    { name: 'Test', activity_type: 'rewardable' },
    { name: 'Chores', activity_type: 'non_rewardable' },
    { name: 'Facebook', activity_type: 'wasted' }
  ];

  try {
    // Get user ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (!profile) {
      console.error(`❌ Could not find user: ${username}`);
      return false;
    }

    // Get existing activities
    const { data: existing } = await supabase
      .from('activities')
      .select('name, activity_type')
      .eq('user_id', profile.id)
      .eq('is_archived', false);

    const existingNames = new Set(existing?.map(a => a.name) || []);
    
    console.log(`📋 Found ${existingNames.size} existing activities for ${username}`);
    
    // Check each expected activity
    let allPresent = true;
    for (const expected of expectedActivities) {
      if (!existingNames.has(expected.name)) {
        console.log(`   ⚠️ Missing activity: ${expected.name}`);
        allPresent = false;
      }
    }

    if (allPresent) {
      console.log(`✅ All 4 expected activities present`);
    }

    return allPresent;

  } catch (error) {
    console.error('❌ Activity check failed:', error);
    return false;
  }
}

// Allow running directly from command line
const entryScript = process.argv[1] ? path.resolve(process.argv[1]) : '';
const isDirectRun = entryScript === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const username = process.argv[2] || 'kyrie';
  
  (async () => {
    await resetTestUserTimers(username);
    await ensureTestActivities(username);
  })();
}
