# Proposal — Roles and Users administration (MELIAF Data Admins)

## Why
Héctor Tobón (2026-09-29) set two conditions to take the MELIAF Taxonomy to production:
5. "desarrollar un sistema de roles que yo pueda crear un rol que se llama MELIAF Data Admins y que estos
   puedan gestionar ese listado de control de MELIAF Taxonomy";
6. "terminar la sección de users para que yo pueda asignar tantos usuarios quiera a ese Rol".
CLARISA already stores `users → user_roles → roles → role_permission → permissions`, but the back only reads
them and the panel's Users and Roles pages are Angular placeholders (`works!`). The panel front only checks
that a session exists, so every signed-in user sees the whole admin menu (the back still rejects them).

## What changes
- Roles screen: create/edit a role, tick its permissions (grouped by module, plain labels), see/add/remove members.
- Users screen: server-paginated list (search, filter by role, "without role"), roles as chips, bulk "Assign role",
  per-user drawer to add/remove roles (removal needs a justification).
- Back: endpoints for roles, role permissions, role members and a paginated user list; a `GET /api/users/me/access`
  with the caller's permissions; rules enforced server-side (see design).
- Panel menu shows only what the caller's permissions open (SuperAdmin keeps seeing everything).
- Additive migration: `permissions.module/label/description`, `roles.is_system/level`, new permission
  "Manage roles and users", metadata filled for the existing permissions.

## Not in scope (not asked)
Creating users, editing user profiles, per-scheme scoping of a permission, self-service role requests, e-mails.

## Impact
Shared auth tables (read by every guarded endpoint). Condition 1 ("no rompa nada") → the 53 users who hold a role
today must keep exactly the same access; covered by tests and a before/after check in clarisatest.
