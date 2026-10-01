/**
 * Texts of the (i) next to each field of the Users and Roles screens, in one
 * place so they read as one voice. Limits quoted are the back's DTOs
 * (`clarisa-back/src/api/access-admin/dto/access-admin.dto.ts`).
 */
export const ACCESS_INFO = {
  users: {
    search: 'Finds people by first name, last name or e-mail, e.g. “zuniga” or “@cgiar.org”.',
    role: 'Shows only the people who hold this role.',
    withoutRole: 'Shows only the people who hold no role at all: they can use the public pages and request forms, but no admin section.'
  },
  assign: {
    role: 'The role to add to every selected person. You can only give roles whose permissions you hold yourself; only a Super admin can give Super admin.',
    addRole: 'Adds a role to this person. The list shows only the roles you are allowed to give.'
  },
  role: {
    acronym: 'Short code of the role, 2 to 50 letters, digits, “_” or “-”, no spaces, e.g. CONCEPTS_DA. Stored in capitals.',
    description: 'The name people see in lists and chips, e.g. “Concepts Data Admins”. 3 to 255 characters.',
    permissions: 'What members of the role can open and change. Each permission opens one part of the panel; you can only give the ones you hold yourself.',
    level: 'Super admin: everything. User admin: manages roles and users. Module: opens one part of the panel.'
  },
  members: {
    search: 'Finds members of this role by name or e-mail.',
    add: 'Type a name or e-mail and pick one or more people. People who already hold the role are left as they are.'
  },
  justification:
    'Why the role is removed, e.g. “Left the Concepts team on 2026-09-30.” Stored with the change so the next admin knows. 5 to 500 characters.'
} as const;
