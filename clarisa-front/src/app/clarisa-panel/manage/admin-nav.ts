/**
 * Navegación del panel de administración, declarada una sola vez.
 *
 * La lleva el sidebar, y la barra de arriba la lee para saber en qué sección
 * está: con dos listas separadas, renombrar una entrada dejaba el título de la
 * barra diciendo otra cosa que la columna de la izquierda.
 */
export interface AdminLink {
  label: string;
  route: string;
  /** Clase de Font Awesome 4, que es la que carga el tema del panel. */
  icon: string;
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
        icon: 'fa fa-inbox'
      },
      {
        label: 'Institution lifecycle',
        route: '/clarisa-panel/manage/institution-lifecycle',
        icon: 'fa fa-history'
      },
      {
        label: 'Glossary',
        route: '/clarisa-panel/manage/glossary-admin',
        icon: 'fa fa-book'
      }
    ]
  },
  {
    title: 'Access',
    links: [
      {
        label: 'Users',
        route: '/clarisa-panel/manage/manage-user',
        icon: 'fa fa-users'
      },
      {
        label: 'Roles',
        route: '/clarisa-panel/manage/manage-role',
        icon: 'fa fa-shield'
      }
    ]
  },
  {
    title: 'System',
    links: [
      {
        label: 'Microservices & API keys',
        route: '/clarisa-panel/manage/microservices-admin',
        icon: 'fa fa-plug'
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
  const path = url.split('?')[0].split('#')[0];

  return (
    ADMIN_GROUPS.reduce<AdminLink | null>((best, group) => {
      const hit = group.links.find(link => path === link.route || path.startsWith(`${link.route}/`));

      if (!hit) return best;

      return !best || hit.route.length > best.route.length ? hit : best;
    }, null)?.label ?? null
  );
}
