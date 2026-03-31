# TimeReward - Nuxt/Supabase Edition

A real-time time tracking application with reward systems, built with Nuxt 4, Vue 3, and Supabase.

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- A Supabase account (free tier works)

### Setup

1. **Install dependencies**
   ```bash
   cd NUXT_TimeReward
   npm install
   ```

2. **Configure environment**
   - Copy the environment template from `docs/ENV-SETUP.md`
   - Create a `.env` file in the `NUXT_TimeReward` root
   - Add your Supabase credentials

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the SQL migrations from `docs/database/` (coming soon)

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   - Navigate to `http://localhost:3000`

## Project Structure

```
NUXT_TimeReward/
├── app/                  # Nuxt app directory (v4 structure)
│   ├── pages/           # Route pages
│   └── layouts/         # Layout templates
├── assets/css/          # Tailwind CSS
├── components/          # Vue components (to be created)
├── composables/         # Vue composables (useAuth, useOfflineQueue, etc.)
├── docs/                # Documentation
│   ├── api/            # API documentation
│   └── decisions/      # Architecture Decision Records
├── middleware/          # Route middleware
├── public/              # Static assets
├── server/              # Nuxt server routes
├── stores/              # Pinia stores
├── types/               # TypeScript types
└── nuxt.config.ts       # Nuxt configuration
```

## Test User

For testing, use:
- **Username**: `kyrie`
- **Password**: `@Password1`

## Development Phases

See the full PRD at `../docs/PRD - Nuxt Supabase Migration.md` for detailed implementation phases.

### Current Phase: 1 - Foundation ✅

- [x] Nuxt 4 project setup
- [x] Supabase integration
- [x] Tailwind CSS
- [x] Authentication pages (login, register)
- [x] Auth middleware
- [x] Offline queue composable
- [x] Connection status composable
- [ ] Database schema (requires Supabase project)

### Next: Phase 2 - Core Timer

- [ ] Activities CRUD
- [ ] Timer start/stop
- [ ] Supabase Realtime integration
- [ ] Multi-browser sync

## Related Documentation

- [PRD](../docs/PRD%20-%20Nuxt%20Supabase%20Migration.md) - Full product requirements
- [Environment Setup](./ENV-SETUP.md) - How to configure environment variables
- [Best Practices](../docs%20-%20best%20practices%20-%20real%20time%20syncronization/REAL%20TIME%20TIME%20LOGGING%20BEST%20PRACTICES.md) - Real-time sync best practices

## Migration Status

This project is a migration from the Blazor WebAssembly version located in the parent directory. It's being developed as a subfolder until core functionality is complete, then will be moved to its own repository.

**Criteria for separation:**
- Core timer functionality working
- Real-time sync working across browsers
- Basic offline queue working
