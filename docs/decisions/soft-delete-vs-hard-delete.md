# Decision: Soft Delete vs Hard Delete for Activities

**Date:** January 23, 2026  
**Status:** Implemented  
**Context:** Activity CRUD with Supabase Realtime sync

---

## Summary

Activities use **soft delete** (archiving) instead of hard delete to ensure reliable real-time synchronization across multiple browsers.

---

## The Problem

When implementing real-time sync for activity deletions, we discovered that **Supabase Realtime DELETE events don't work reliably with row-level filters**.

### Why DELETE Events Fail with Filters

1. Supabase Realtime uses PostgreSQL's Write-Ahead Log (WAL) to detect changes
2. By default, PostgreSQL only includes the **primary key** in DELETE events, not the full row
3. When we subscribe with a filter like `filter: 'user_id=eq.123'`, Realtime can't match the event because `user_id` isn't in the payload
4. Result: DELETE events are silently dropped

### Example of the Problem

```typescript
// This subscription won't receive DELETE events:
supabase
  .channel('activities')
  .on('postgres_changes', {
    event: 'DELETE',
    table: 'activities',
    filter: `user_id=eq.${userId}`  // ❌ Can't match - user_id not in DELETE payload
  }, callback)
```

---

## Solution: Soft Delete (Archive)

Instead of deleting rows, we set `is_archived = true`. This triggers an **UPDATE event**, which includes the full row data and works with filters.

### Implementation

```typescript
// In useActivities.ts
async function deleteActivity(activityId: string) {
  // Soft delete - sets is_archived = true
  // This triggers an UPDATE event that syncs via Realtime
  await archiveActivity(activityId)
}

async function archiveActivity(activityId: string) {
  await supabase
    .from('activities')
    .update({ is_archived: true })
    .eq('id', activityId)
}
```

### Query Filters Out Archived Items

```typescript
// fetchActivities only returns non-archived activities
const { data } = await supabase
  .from('activities')
  .select('*')
  .eq('user_id', userId)
  .eq('is_archived', false)  // Archived activities are hidden
```

---

## Alternative: Enable REPLICA IDENTITY FULL

If hard deletes are needed in the future, you can enable `REPLICA IDENTITY FULL` on the table:

```sql
ALTER TABLE public.activities REPLICA IDENTITY FULL;
```

This tells PostgreSQL to include **all columns** in DELETE events, allowing filters to work.

### When This Was Applied

We ran this command on January 23, 2026, so the option for hard deletes exists if needed.

### Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| **Soft Delete** | Data preserved, easy undo, reliable sync | Slightly more storage, need to filter queries |
| **Hard Delete + REPLICA IDENTITY FULL** | True deletion, simpler queries | Data lost, larger WAL size, more I/O |

---

## Benefits of Soft Delete

1. **Reliable Realtime sync** - UPDATE events always include full row data
2. **Data recovery** - Users can potentially restore deleted activities
3. **Audit trail** - Know what was deleted and when
4. **Analytics** - Can analyze deleted activities for insights
5. **Simpler foreign keys** - No cascade delete issues with `activity_timers`

---

## Related Files

- `app/composables/useActivities.ts` - Contains `deleteActivity()` and `archiveActivity()`
- `types/activity.ts` - `Activity.isArchived` field
- `supabase/migrations/002_activities.sql` - Table schema with `is_archived` column

---

## Future Considerations

- **Unarchive feature** - Allow users to restore archived activities
- **Permanent delete** - Admin function to hard-delete after X days
- **Archived activities view** - UI to see/manage archived items
