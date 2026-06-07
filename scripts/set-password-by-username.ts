/**
 * Set a user's password by username (Supabase Auth Admin).
 * Uses get_email_by_username RPC to resolve email, then Auth Admin API to set password.
 *
 * Usage (from NUXT_TimeReward folder):
 *   npx tsx scripts/set-password-by-username.ts <username> <newpassword>
 *
 * Example:
 *   npx tsx scripts/set-password-by-username.ts slarres3 @Password1
 *
 * Environment: Loaded from NUXT_TimeReward/.env if present. Required:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SECRET_KEY - Service-role / secret key (required for auth admin)
 */

import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

// Load .env from project root (when run as: npx tsx scripts/set-password-by-username.ts)
const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env') })

async function main() {
  const username = process.argv[2]
  const newPassword = process.argv[3]

  if (!username || !newPassword) {
    console.error('Usage: npx tsx scripts/set-password-by-username.ts <username> <newpassword>')
    console.error('Example: npx tsx scripts/set-password-by-username.ts slarres3 @Password1')
    process.exit(1)
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: SUPABASE_URL and SUPABASE_SECRET_KEY must be set (e.g. in .env)')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Resolve email from username (TimeReward RPC)
  const { data: email, error: rpcError } = await supabase
    .rpc('get_email_by_username', { p_username: username })

  if (rpcError) {
    console.error('Error looking up username:', rpcError.message)
    console.error('(Is the migration 011_get_email_by_username.sql applied in this project?)')
    process.exit(1)
  }
  if (!email) {
    console.error(`No user found with username: ${username}`)
    // List usernames that do exist in this project
    const { data: profiles } = await supabase.from('user_profiles').select('username').order('username')
    if (profiles?.length) {
      console.error('Usernames in this project:', profiles.map((p) => p.username).join(', '))
    } else {
      console.error('This project has no rows in user_profiles (or the table does not exist).')
    }
    process.exit(1)
  }

  // Find auth user by email (list users and match)
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listError) {
    console.error('Error listing users:', listError.message)
    process.exit(1)
  }
  const authUser = listData?.users?.find((u) => u.email?.toLowerCase() === String(email).toLowerCase())
  if (!authUser) {
    console.error(`No auth user found for email: ${email}`)
    process.exit(1)
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, { password: newPassword })
  if (updateError) {
    console.error('Error updating password:', updateError.message)
    process.exit(1)
  }

  console.log(`Password updated for username "${username}" (${email}).`)
}

main()
