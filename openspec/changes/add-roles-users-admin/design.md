# Design — Roles and Users administration

## Data (additive, reversible)
- `permissions` + `module varchar(50) NULL`, `label varchar(255) NULL`, `description text NULL`.
- `roles` + `is_system tinyint NOT NULL DEFAULT 0` (SuperAdmin `SA`, `MS`, `CRON_EXEC`, `RQAT`, `OU` → 1:
  not editable/deletable from the screen) and `level varchar(20) NOT NULL DEFAULT 'module'`
  (`super` = SA, `user_admin` = UM, `module` = the rest).
- New permission row `/api/access-admin` (label "Manage roles and users", module "Access") granted to SA.
- No new audit table: every table already has `is_active`, `created_by`, `updated_by`,
  `modification_justification`. Removing a role from a user = `user_roles.is_active = 0` + `updated_by` +
  justification; re-granting reactivates the same row (no duplicates).

## Levels and rules (enforced in the back, mirrored in the UI)
1. super (SA): everything; only a super can grant `SA`; the last active SA cannot be removed.
2. user_admin (UM) and anyone with "Manage roles and users": may create `module` roles and assign roles, but
   **only roles whose permissions are a subset of their own** and never `super`.
3. module roles (e.g. MELIAF Data Admins): open one part of the panel.
4. base (no role): public pages and request forms only; no admin menu.
- Idempotent: assigning a role already held returns the existing row (no second row), double submit safe.
- A role cannot be deleted while it has active members; it is deactivated instead.

## API (all under JwtAuthGuard + PermissionGuard on `/api/access-admin`, except `me/access`)
- `GET  /api/users/me/access` → `{ userId, email, roles:[{id,acronym,description,level}], permissions:[name], isSuper }`
- `GET  /api/access-admin/users?search=&roleId=&withoutRole=&page=&pageSize=` → `{ items, total, page, pageSize }`
  item: `{ id, firstName, lastName, email, isCgiarUser, lastLogin, isActive, roles:[{id,acronym,description}] }`
- `GET  /api/access-admin/roles` → roles with `memberCount`, `permissionIds`, `isSystem`, `level`
- `POST /api/access-admin/roles` `{ acronym, description, permissionIds[] }`; `PATCH /api/access-admin/roles/:id`
- `PUT  /api/access-admin/roles/:id/permissions` `{ permissionIds[] }`
- `GET  /api/access-admin/roles/:id/members?search=&page=`
- `POST /api/access-admin/roles/:id/members` `{ userIds[] }` (bulk) → `{ added, alreadyMembers }`
- `DELETE /api/access-admin/roles/:id/members/:userId` body `{ justification }` (deactivates)
- `GET  /api/access-admin/permissions` → grouped `[{ module, items:[{id,name,label,description}] }]`

## Front
- `clarisa-panel/manage/pages/manage-user` and `manage-role` replace the placeholders; same design line as the
  MELIAF admin (titled sections, 38 px fields, info tooltips, sticky footer).
- Admin sidebar filters its entries by `me/access` permissions; SA sees all. While loading → skeleton, never
  the full menu.

## Local test bed (not committed)
`clarisa-back/local/access-admin/`: MySQL in Docker with the real DDL of the five auth tables, the 8 roles and the
current permissions (structure copied from clarisatest, no real users), fake users, real JWT + PermissionGuard.
