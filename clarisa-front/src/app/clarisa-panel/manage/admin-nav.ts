/**
 * Navegación del panel de administración, declarada una sola vez.
 *
 * La lleva el sidebar, y la barra de arriba la lee para saber en qué sección
 * está: con dos listas separadas, renombrar una entrada dejaba el título de la
 * barra diciendo otra cosa que la columna de la izquierda.
 */
/**
 * Una sub-sección de un link, cuando el link en sí es un panel con pestañas
 * propias (hoy solo «Microservices & API keys») en vez de una pantalla única.
 * Vivía como una columna blanca aparte, un segundo sidebar al lado del negro;
 * ahora es un desplegable más dentro de la misma columna (Yeck, 23-sep-2026).
 */
export interface AdminSubLink {
  label: string;
  /** Segunda línea, chica: lo que antes explicaba la tarjeta en la columna blanca. */
  hint: string;
  /** Query params que seleccionan la pestaña, sobre la ruta del link padre. */
  queryParams: Record<string, string>;
  /** Same meaning as `AdminLink.access`, for this one tab. */
  access: AdminAccess;
}

/**
 * Who may see an entry: the back routes whose `PermissionGuard` protects it
 * (see `AdminLink.access`). Access goes by permission only (Yeck, 30-sep-2026):
 * no entry is open to "any signed-in user", so a limited role sees exactly what
 * it ticks and a user without roles sees none of the panel.
 */
export type AdminAccess = string[];

export interface AdminLink {
  label: string;
  route: string;
  /** Clase de Font Awesome 4, que es la que carga el tema del panel. */
  icon: string;
  /** Si existen, el link no navega directo: pliega/despliega estas pestañas. */
  children?: AdminSubLink[];
  /**
   * The back routes the screen calls: the entry opens when the caller holds a
   * permission the back's `PermissionGuard` would accept for ANY of them (same
   * `route.includes(permission)` test); an empty list = Super admin only. A
   * link with `children` opens when any of its tabs does.
   */
  access: AdminAccess;
}

export interface AdminGroup {
  title: string;
  links: AdminLink[];
}

/**
 * Agrupada en vez de plana («S3» en DESIGN.md): seis entradas en una sola
 * columna se leen como un montón, y los tres grupos responden preguntas
 * distintas — qué curo, quién puede entrar, con qué habla la plataforma.
 */
export const ADMIN_GROUPS: AdminGroup[] = [
  {
    title: 'Manage',
    links: [
      {
        label: 'Institution requests',
        route: '/clarisa-panel/manage/partner-request',
        icon: 'fa fa-inbox',
        // Any institution-request permission opens it: IRC (create only) and
        // FIR (create, respond, update) both keep the screen.
        access: ['/api/partner-requests/create', '/api/partner-requests/respond', '/api/partner-requests/update']
      },
      {
        label: 'Institution lifecycle',
        route: '/clarisa-panel/manage/institution-lifecycle',
        icon: 'fa fa-history',
        access: ['/api/institutions/lifecycle/']
      },
      {
        label: 'Glossary',
        route: '/clarisa-panel/manage/glossary-admin',
        icon: 'fa fa-book',
        access: ['/api/glossary/admin/terms']
      },
      {
        label: 'MELIAF Taxonomy',
        route: '/clarisa-panel/manage/global-concepts-admin',
        icon: 'fa fa-sitemap',
        // Both `/api/meliaf-taxonomy/admin` (full admin) and
        // `/api/meliaf-taxonomy/admin/meliaf/concepts` (MELIAF_CE, concepts
        // only) are substrings of this route, so either one opens the screen.
        access: ['/api/meliaf-taxonomy/admin/meliaf/concepts']
      }
    ]
  },
  {
    title: 'Access',
    links: [
      {
        label: 'Users',
        route: '/clarisa-panel/manage/manage-user',
        icon: 'fa fa-users',
        access: ['/api/access-admin/users']
      },
      {
        label: 'Roles',
        route: '/clarisa-panel/manage/manage-role',
        icon: 'fa fa-shield',
        access: ['/api/access-admin/roles']
      }
    ]
  },
  {
    title: 'System',
    links: [
      {
        label: 'Microservices & API keys',
        route: '/clarisa-panel/manage/microservices-admin',
        icon: 'fa fa-plug',
        // Opens through its tabs (`canOpenLink` reads `children`).
        access: [],
        /*
         * El orden es el del flujo, no el de la fecha en que se escribió cada
         * pestaña: primero qué está pasando (Overview: quién consume CLARISA,
         * cuánto y cuándo — lo que Héctor y Enrico preguntaron el 24-sep-2026),
         * después los sistemas registrados y al final las llaves que les
         * pertenecen (Yeck, 24-sep-2026: «MIS Registry de primero»).
         */
        children: [
          {
            label: 'Overview',
            hint: 'Who uses CLARISA, and how much',
            queryParams: { section: 'overview' },
            // `ApiKeyController` requires `/api/api-keys` (SA only).
            access: ['/api/api-keys/usage/overview']
          },
          {
            label: 'MIS Registry',
            hint: 'The systems that hold keys',
            queryParams: { section: 'mises' },
            access: ['/api/mises/create', '/api/mises/deactivate/', '/api/mises/activate/']
          },
          {
            label: 'API Keys',
            hint: 'Create, edit, rotate, and revoke keys',
            queryParams: { section: 'api-keys' },
            access: ['/api/api-keys/create']
          }
        ]
      }
    ]
  }
];

/**
 * Sección en la que está una URL. Compara por prefijo porque las pantallas
 * abren detalles colgando de su propia ruta (`…/glossary-admin/14`), y devuelve
 * la coincidencia más larga para que una ruta que empieza igual que otra no se
 * quede con el título de la vecina.
 */
export function adminSectionLabel(url: string): string | null {
  return adminLinkFor(url)?.label ?? null;
}

/**
 * Minimal view of `MeAccess` the navigation needs.
 *
 * Every function below takes `NavAccess | null`, and `null` means the access
 * is UNKNOWN (`me/access` failed or timed out; see `PanelAccessService`): the
 * panel then falls back to how it worked before role filtering — every entry
 * visible, no guard redirect. That opens nothing new, since the back still
 * enforces each permission.
 */
export interface NavAccess {
  isSuper: boolean;
  permissions: readonly string[];
}

function opens(access: AdminAccess, who: NavAccess | null): boolean {
  if (!who) return true;
  if (who.isSuper) return true;
  return access.some(route => who.permissions.some(p => !!p && route.includes(p)));
}

export function canOpenSubLink(child: AdminSubLink, who: NavAccess | null): boolean {
  return opens(child.access, who);
}

export function canOpenLink(link: AdminLink, who: NavAccess | null): boolean {
  if (link.children?.length) return link.children.some(child => canOpenSubLink(child, who));
  return opens(link.access, who);
}

/**
 * The navigation the caller may see: links they cannot open leave, a link with
 * tabs keeps only its open tabs, and a group left empty leaves with them.
 * `null` (access unknown) = the whole menu, as before role filtering.
 */
export function groupsFor(who: NavAccess | null, groups: AdminGroup[] = ADMIN_GROUPS): AdminGroup[] {
  return groups
    .map(group => ({
      ...group,
      links: group.links
        .filter(link => canOpenLink(link, who))
        .map(link => (link.children ? { ...link, children: link.children.filter(child => canOpenSubLink(child, who)) } : link))
    }))
    .filter(group => group.links.length > 0);
}

/** Where a sign-in lands today; kept for everyone who can open it. */
export const LOGIN_LANDING = '/clarisa-panel/manage/partner-request';
/** Same value as `ADMIN_HOME` in `admin-access.guard.ts` (that file imports this one). */
const PANEL_HOME = '/clarisa-panel/manage';
/** Where a user whose roles open nothing in the panel lands: the public site. */
export const NO_ROLE_LANDING = '/landing-page/home';

/** A permission-protected section the caller opens, and the tab it opens on. */
export interface ProtectedSection {
  link: AdminLink;
  queryParams?: Record<string, string>;
}

/**
 * The sections the caller's permissions open. A link with tabs counts once,
 * when any of its tabs opens, and lands on the first of those.
 */
export function protectedSections(who: NavAccess, groups: AdminGroup[] = ADMIN_GROUPS): ProtectedSection[] {
  return groups
    .flatMap(group => group.links)
    .reduce<ProtectedSection[]>((found, link) => {
      if (link.children?.length) {
        const tab = link.children.find(child => opens(child.access, who));
        if (tab) found.push({ link, queryParams: tab.queryParams });
      } else if (opens(link.access, who)) {
        found.push({ link });
      }
      return found;
    }, []);
}

/**
 * The one section a member's roles are for (exactly one section open), or
 * `null`: no answer (fail-open), a Super admin, zero or several. The panel home and the sign-in both go straight there, so a
 * MELIAF-only member opens the MELIAF Taxonomy instead of a list of cards.
 */
export function onlyProtectedSection(who: NavAccess | null, groups: AdminGroup[] = ADMIN_GROUPS): ProtectedSection | null {
  if (!who || who.isSuper) return null;
  const sections = protectedSections(who, groups);
  return sections.length === 1 ? sections[0] : null;
}

/** URL of a section, with the query params of its tab. */
export function sectionUrl(section: ProtectedSection): string {
  const query = new URLSearchParams(section.queryParams ?? {}).toString();
  return query ? `${section.link.route}?${query}` : section.link.route;
}

/**
 * The first screen after signing in (a URL, for `navigateByUrl`):
 * - access unknown (`null`) or Super admin → partner-request, as always;
 * - no section open → the public home: the panel has nothing for them;
 * - exactly one section → that section;
 * - several → partner-request when the caller opens it, else the panel home
 *   instead of bouncing off the guard (login → partner-request → refused → home).
 */
export function postLoginRoute(who: NavAccess | null): string {
  if (!who || who.isSuper) return LOGIN_LANDING;
  const sections = protectedSections(who);
  if (sections.length === 0) return NO_ROLE_LANDING;
  const only = onlyProtectedSection(who);
  if (only) return sectionUrl(only);
  const landing = adminLinkFor(LOGIN_LANDING);
  return !landing || canOpenLink(landing, who) ? LOGIN_LANDING : PANEL_HOME;
}

/** The entry a panel URL belongs to (longest route prefix), or `null`. */
export function adminLinkFor(url: string): AdminLink | null {
  const path = url.split('?')[0].split('#')[0];
  return ADMIN_GROUPS.reduce<AdminLink | null>((best, group) => {
    const hit = group.links.find(link => path === link.route || path.startsWith(`${link.route}/`));
    if (!hit) return best;
    return !best || hit.route.length > best.route.length ? hit : best;
  }, null);
}
