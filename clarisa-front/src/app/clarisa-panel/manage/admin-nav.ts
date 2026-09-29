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
  access: string[];
}

export interface AdminLink {
  label: string;
  route: string;
  /** Clase de Font Awesome 4, que es la que carga el tema del panel. */
  icon: string;
  /** Si existen, el link no navega directo: pliega/despliega estas pestañas. */
  children?: AdminSubLink[];
  /**
   * Back routes this screen writes to. The entry opens when the caller holds a
   * permission the back's `PermissionGuard` would accept for ANY of them (same
   * `route.includes(permission)` test). Empty = the back has no permission for
   * it today, so only a Super admin sees it. A link with `children` opens when
   * any of its tabs does.
   */
  access: string[];
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
        access: ['/api/partner-requests/respond', '/api/partner-requests/update']
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
        access: ['/api/meliaf-taxonomy/admin/']
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
            // The usage endpoints (`/api/api-keys/usage/*`) carry no permission check today.
            access: []
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
            // `ApiKeyController` is guarded by JwtAuthGuard only: no permission to map.
            access: []
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

/** Minimal view of `MeAccess` the navigation needs. */
export interface NavAccess {
  isSuper: boolean;
  permissions: readonly string[];
}

function opens(access: readonly string[], who: NavAccess | null): boolean {
  if (!who) return false;
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

/** The entry a panel URL belongs to (longest route prefix), or `null`. */
export function adminLinkFor(url: string): AdminLink | null {
  const path = url.split('?')[0].split('#')[0];
  return ADMIN_GROUPS.reduce<AdminLink | null>((best, group) => {
    const hit = group.links.find(link => path === link.route || path.startsWith(`${link.route}/`));
    if (!hit) return best;
    return !best || hit.route.length > best.route.length ? hit : best;
  }, null);
}
