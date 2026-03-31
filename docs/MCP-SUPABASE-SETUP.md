# Setting Up Supabase MCP Server in Cursor

This guide helps you set up an MCP server to run SQL against your Supabase database directly from Cursor.

## Prerequisites

- A Supabase project (we're using `time-reward-test`)
- Cursor IDE with MCP support

## Step 1: Get Your Supabase Connection String

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (`time-reward-test`)
3. Go to **Settings** → **Database**
4. Find the **Connection string** section
5. Copy the **URI** connection string (it looks like):
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

**Important**: Use the **Transaction pooler** connection (port 6543) for MCP, not the direct connection.

## Step 2: Add MCP Server in Cursor

1. Open **Cursor Settings** (`Ctrl + ,`)
2. Go to **Features** → **MCP** (or **Tools & MCP**)
3. Click **"+ Add new MCP server"**

### Configuration:

| Field | Value |
|-------|-------|
| **Name** | `mcp-time-reward-test` |
| **Type** | `command` (or `stdio`) |
| **Command** | `npx` |
| **Args** | `pg-mcp-server postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres` |

Or in JSON format (if editing the config file directly):

```json
{
  "mcp-time-reward-test": {
    "command": "npx",
    "args": [
      "pg-mcp-server",
      "postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
    ]
  }
}
```

## Step 3: Verify Connection

1. After saving, look for `mcp-time-reward-test` in the MCP server list
2. It should show a **green indicator** (connected)
3. Click "Show Output" to verify it says "Connected to database"

## Step 4: Test It

In a Cursor chat, try:
> "List all tables in the public schema using mcp-time-reward-test"

Or:
> "Run this SQL: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"

## Using the MCP Server to Run Migrations

Once connected, you can run the migration files:

1. Open `supabase/migrations/001_user_profiles.sql`
2. Ask Cursor: "Run this SQL migration against mcp-time-reward-test"
3. Repeat for each migration file in order

## Troubleshooting

### "Database does not exist" error
- Make sure you're using the correct database name (usually `postgres` for Supabase)
- Verify the connection string is correct

### Connection refused
- Check if you're using the pooler connection (port 6543)
- Verify your IP is allowed in Supabase Dashboard → Settings → Database → Connection Pooler

### Authentication failed
- Double-check the password in the connection string
- The password should be URL-encoded if it contains special characters

## Security Notes

- The MCP connection string contains your database password
- It's stored in Cursor's settings, not in your project files
- Never commit connection strings to version control

---

## Supabase URL-based MCP vs Direct Postgres (pg-mcp-server)

You can connect to the time-reward-test Supabase Postgres in two ways in Cursor:

### Option A: Supabase MCP (URL-based)

From the Supabase project dashboard you get a URL-based MCP config, for example:

```json
"mcp-time-reward-test": {
  "url": "https://mcp.supabase.com/mcp?project_ref=fwszbpuqaowoniogtowm"
}
```

- **Pros:** No database password in config; Supabase handles auth. Tools like `list_tables` and `execute_sql` work against your project.
- **Cons:** Different structure from other Postgres MCPs; depends on Supabase’s MCP endpoint; tool set is whatever Supabase exposes (e.g. you may not see an `auth.users` table in `list_tables`, but you can still query it with `execute_sql`).

**Note:** In Cursor the server may appear as `user-mcp-time-reward-test`. Use that name when asking the AI to use this MCP (e.g. “use user-mcp-time-reward-test to run SQL”).

### Option B: Direct Postgres (pg-mcp-server + DATABASE_URL)

Same pattern as other DBs (e.g. postgres-intro, postgres-test):

```json
"postgres-supabase-timereward": {
  "command": "npx",
  "args": ["--yes", "pg-mcp-server", "--transport", "stdio"],
  "env": {
    "DATABASE_URL": "postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require"
  }
}
```

Use the **Direct connection** or **Session pooler** URI from Supabase Dashboard → Project Settings → Database.

**Pros:**

- **Consistency:** Same config shape and tool interface for TimeRewardIntro, TimeRewardTest, and time-reward-test.
- **Same tool surface:** One interface (e.g. `query` / `execute_sql`) for the AI across all DBs.
- **Full Postgres access:** Any SQL the connected role is allowed (e.g. `auth.users`, extensions, maintenance).
- **No dependency on Supabase MCP:** Works as long as the DB is reachable.

**Cons:**

- You must store the Supabase Postgres connection string (in Cursor env/settings).
- You choose the role and must respect RLS semantics (e.g. use a role that doesn’t bypass RLS unless you intend admin access).

### Recommendation

- **Keep** the Supabase URL-based MCP if you like it and it’s working.
- **Optionally add** a second server using pg-mcp-server + `DATABASE_URL` for time-reward-test when you want one consistent Postgres interface and full SQL (including `auth.users`) across all environments.
