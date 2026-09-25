import { ADMIN_GROUPS, adminSectionLabel } from './admin-nav';

describe('admin navigation', () => {
  it('names the section a panel URL belongs to', () => {
    expect(adminSectionLabel('/clarisa-panel/manage/partner-request')).toBe('Institution requests');
    expect(adminSectionLabel('/clarisa-panel/manage/microservices-admin')).toBe('Microservices & API keys');
  });

  // Las pantallas abren detalles colgando de su propia ruta, y la barra tiene que
  // seguir diciendo en qué sección está.
  it('keeps the section on a child route, and ignores query and fragment', () => {
    expect(adminSectionLabel('/clarisa-panel/manage/glossary-admin/14')).toBe('Glossary');
    expect(adminSectionLabel('/clarisa-panel/manage/manage-user?page=2#top')).toBe('Users');
  });

  it('claims nothing outside the panel', () => {
    expect(adminSectionLabel('/landing-page/home')).toBeNull();
    // Prefijo parecido, sección distinta: `manage-user` no puede quedarse con esto.
    expect(adminSectionLabel('/clarisa-panel/manage/manage-users-report')).toBeNull();
  });

  it('gives every entry an icon, which is what the sidebar draws', () => {
    const links = ADMIN_GROUPS.flatMap(group => group.links);

    expect(links.length).toBeGreaterThan(0);
    links.forEach(link => {
      expect(link.icon).toMatch(/^fa fa-/);
      expect(link.route.startsWith('/clarisa-panel/manage/')).toBe(true);
    });
  });

  // La columna blanca de «Microservices & API keys» se plegó dentro del menú
  // negro (Yeck, 23-sep-2026): sus tres pestañas viven aquí como `children`,
  // seleccionables por query param sobre la misma ruta del link padre. El
  // orden es el del flujo: primero qué pasa, luego los sistemas, luego sus
  // llaves (Yeck, 24-sep-2026).
  it('breaks Microservices & API keys into its three sections, over its own route', () => {
    const microservices = ADMIN_GROUPS.find(group => group.title === 'System')?.links[0];

    expect(microservices?.children?.map(child => child.label)).toEqual(['Overview', 'MIS Registry', 'API Keys']);
    expect(microservices?.children?.map(child => child.queryParams['section'])).toEqual(['overview', 'mises', 'api-keys']);
    microservices?.children?.forEach(child => {
      expect(child.hint.length).toBeGreaterThan(0);
      expect(Object.keys(child.queryParams)).toEqual(['section']);
    });
  });
});
