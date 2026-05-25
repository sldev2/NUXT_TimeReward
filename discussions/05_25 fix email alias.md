# 05_25 Fix Email Alias

Priority: fix Google Workspace alias problems for `myfocusrewards.com` (`contact@`, `deletemydata@`, `info@`, etc. as aliases of `spero@myfocusrewards.com`).

Setup context: inbound MX → Google; DNS on GoDaddy; transactional send via Resend/SES on `send` subdomain (unaffected by inbox aliases). `admin@` alias works; others reported broken. No typo in Google Workspace Admin Console for `info@`.

Stale **forwards** usually live in **GoDaddy** (old product) or **Google Admin → Gmail → Routing** (address maps / rules), not in alias settings alone.

---

## 1. GoDaddy — domain email forwarding

Do this first if you ever used GoDaddy Email, Professional Email, or “forward only” on `myfocusrewards.com`.

### A. Open the right product

1. Go to [https://account.godaddy.com/products](https://account.godaddy.com/products) and sign in.
2. Find anything email-related for **myfocusrewards.com**, for example:
   - **Email Forwarding**
   - **Professional Email**
   - **Microsoft 365** (even if “cancelled”, forwards sometimes remain)
   - **Workspace Email** (GoDaddy-branded)
3. Click **Manage** on that product (not “DNS” — that’s separate).

### B. Remove forwards for the broken addresses

Exact labels vary by product; look for one of these:

| UI label | What to do |
|----------|------------|
| **Forwarding** / **Forwarders** | Open the list. Delete any row for `contact@`, `deletemydata@`, `info@`, `admin@`, or catch‑all `@myfocusrewards.com` that forwards **out** of Google (e.g. to Outlook, personal Gmail, or a deleted mailbox). |
| **Create Forward** / **Add forward** | If you see active forwards, use **Delete** / **Remove** (trash icon) on each bad one. |
| **Catch-all** | If enabled, turn it **off** or delete it unless you intend it. |

**Keep:** Nothing that sends `contact@` / `deletemydata@` / `info@` to an external address if those addresses should only exist as **Google aliases on `spero@`**.

**If there is no email product** under My Products for this domain, GoDaddy is probably not forwarding mail (MX already goes to Google). Then focus on section 2.

### C. Confirm DNS is not still sending mail to GoDaddy

1. GoDaddy → **My Products** → **Domains** → **myfocusrewards.com** → **DNS** (or **Manage DNS**).
2. Open **MX** records for the **root** `@` host.
3. You want **only** Google, e.g. priorities like:
   - `aspmx.l.google.com`
   - `alt1.aspmx.l.google.com`, etc.
4. **Delete** any MX pointing to `smtp.secureserver.net`, `mailstore1.secureserver.net`, Outlook (`*.mail.protection.outlook.com`), or other non-Google hosts.

Website **domain forward** (http → www) does **not** affect email; only **email forwarders** and **MX** do.

---

## 2. Google Workspace Admin — routing / address maps

This is the most common cause when **aliases are correct in the user profile** but mail still fails or vanishes: an admin **address map** or **routing rule** overrides delivery.

### A. Recipient address map (admin “forwarding”)

1. Open [https://admin.google.com](https://admin.google.com) as a super admin.
2. **Menu** (☰) → **Apps** → **Google Workspace** → **Gmail** → **Routing**  
   Direct link pattern: `https://admin.google.com/ac/apps/gmail/routing`
3. On the left, select your **top-level** org (often your domain name) — address maps are often **only** editable at the root.
4. Scroll to **Email forwarding using recipient address map**.
5. If it says **Configure** or shows an existing rule, open it.
6. In the table, look for rows like:

   | Address | Map to address |
   |---------|----------------|
   | `contact@myfocusrewards.com` | something **other than** `spero@myfocusrewards.com` |
   | `deletemydata@...` | old Outlook / deleted user |
   | `info@...` | external address |

7. For each bad row:
   - Select the row → **Remove** / delete the mapping, **or**
   - Use **Delete** on the whole setting (trash) if the entire rule was only for old M365 migration.
8. Click **Save** at the bottom.

**Important:** User **Email aliases** (User → `spero@` → **User information** → **Email aliases**) are the right way to receive mail at `contact@`. An **address map** that forwards `contact@` elsewhere can fight that or send mail to a dead address.

**What you want:** No address-map entry for addresses that are already aliases on `spero@`, unless the map explicitly sends to `spero@myfocusrewards.com` and you know you need it (usually you don’t if aliases are set).

### B. Other Gmail routing rules

Still on **Apps → Google Workspace → Gmail → Routing**:

1. **Default routing** — open each rule. If any rule **changes route**, **rejects**, or **redirects** messages whose recipient is `contact@`, `deletemydata@`, or `info@`, disable or delete that rule.
2. **Routing** (custom rules) — same check: recipient contains those addresses → **Delete** the rule or edit so it does not reroute them.
3. **Receiving routing** — check for **dual delivery** / **split delivery** to a non-Gmail server (old M365). Remove if present.

After changes, allow **15–30 minutes** for propagation.

---

## 3. Gmail (as `spero@`) — personal forwarding

Admin maps are separate from per-user forwarding.

1. Sign in to Gmail as **spero@myfocusrewards.com**.
2. **Settings** (gear) → **See all settings** → tab **Forwarding and POP/IMAP**.
3. If **Forward a copy of incoming mail to** is enabled → **Disable forwarding** (or remove the forward address).
4. **Save Changes**.

Also check **Filters** (Settings → **Filters and Blocked Addresses**): delete filters that **forward** mail sent to `contact@` / `deletemydata@` / `info@` to another address.

---

## 4. Microsoft 365 — only if anything is still active

You said M365 mailboxes were removed; still check:

1. [https://admin.microsoft.com](https://admin.microsoft.com) → **Users** → **Active users**  
   - No standalone users `contact@`, `deletemydata@`, `info@` on `myfocusrewards.com`.
2. **Exchange admin center** → **Mail flow** → **Rules**  
   - Delete rules that forward those addresses externally.
3. GoDaddy **My Products** → if **Microsoft 365** still shows for this domain → **Manage** → remove **shared mailbox** / **forwarding** there too.

If the tenant is fully gone, section 2 (Google address maps) + section 1 (GoDaddy) matter more.

---

## 5. Verify after cleanup

**Send test** (from a personal Gmail, not `spero@`):

- To: `contact@myfocusrewards.com`
- Subject: `test contact alias`

Then in Admin:

1. **Reporting** → **Email log search** (or **Audit and investigation** → **Email log events**).
2. Search recipient `contact@myfocusrewards.com`, last hour.
3. You want **Delivered** to `spero@myfocusrewards.com`.  
   If you see **Rejected**, **Forwarded** to an external address, or **Routing**, note the rule name — that’s what to remove in section 2.

---

## Quick decision tree

| Where you find a forward | Action |
|--------------------------|--------|
| GoDaddy Email / Forwarding product | **Delete** the forwarder for that address |
| GoDaddy MX not Google | **Fix MX** to Google only |
| Admin → **recipient address map** | **Remove** row or delete rule if destination ≠ `spero@` (or redundant with alias) |
| Admin → **Routing** / **Default routing** | **Delete** or disable rule affecting those recipients |
| Gmail → **Forwarding and POP/IMAP** | **Disable** forwarding on `spero@` |
| Separate GW **user** for `contact@` | Not a forward — **delete user** or merge; alias must live on `spero@` only |

---

## Next steps after walking 1 → 2 → 3

Use **Email log search** on the first address that still fails. Note what you see under GoDaddy **My Products** (email product names) and whether **Email forwarding using recipient address map** in Google shows any rules.
