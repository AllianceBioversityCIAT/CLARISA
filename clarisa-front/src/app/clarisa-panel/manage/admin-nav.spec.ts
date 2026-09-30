import { ADMIN_GROUPS, adminLinkFor, adminSectionLabel, canOpenLink, groupsFor } from './admin-nav';

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

  it('lists the MELIAF Taxonomy in Manage, right after Glossary', () => {
    const manage = ADMIN_GROUPS.find(group => group.title === 'Manage')?.links.map(link => link.label) ?? [];

    expect(manage.indexOf('MELIAF Taxonomy')).toBe(manage.indexOf('Glossary') + 1);
    expect(adminSectionLabel('/clarisa-panel/manage/global-concepts-admin')).toBe('MELIAF Taxonomy');
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

  describe('by permission', () => {
    const labels = (groups: ReturnType<typeof groupsFor>) => groups.flatMap(group => group.links.map(link => link.label));

    it('shows a super everything, tabs included', () => {
      const groups = groupsFor({ isSuper: true, permissions: [] });
      expect(labels(groups)).toEqual(labels(ADMIN_GROUPS));
      expect(groups.find(group => group.title === 'System')?.links[0].children?.length).toBe(3);
    });

    it('shows a MELIAF Data Admin only the MELIAF Taxonomy', () => {
      const groups = groupsFor({ isSuper: false, permissions: ['/api/meliaf-taxonomy/admin'] });
      expect(groups.map(group => group.title)).toEqual(['Manage']);
      expect(labels(groups)).toEqual(['MELIAF Taxonomy']);
    });

    it('shows a MELIAF Concepts Editor only the MELIAF Taxonomy', () => {
      const groups = groupsFor({ isSuper: false, permissions: ['/api/meliaf-taxonomy/admin/meliaf/concepts'] });
      expect(groups.map(group => group.title)).toEqual(['Manage']);
      expect(labels(groups)).toEqual(['MELIAF Taxonomy']);
    });

    it('opens the MELIAF Taxonomy entry for the full and the concepts permission, and nothing else of MELIAF', () => {
      const meliaf = adminLinkFor('/clarisa-panel/manage/global-concepts-admin')!;
      expect(canOpenLink(meliaf, { isSuper: true, permissions: [] })).toBe(true);
      expect(canOpenLink(meliaf, { isSuper: false, permissions: ['/api/meliaf-taxonomy/admin'] })).toBe(true);
      expect(canOpenLink(meliaf, { isSuper: false, permissions: ['/api/meliaf-taxonomy/admin/meliaf/concepts'] })).toBe(true);
      expect(canOpenLink(meliaf, { isSuper: false, permissions: ['/api/meliaf-taxonomy/admin/meliaf/lists'] })).toBe(false);
      expect(canOpenLink(meliaf, { isSuper: false, permissions: ['/api/glossary/admin'] })).toBe(false);
      expect(canOpenLink(meliaf, { isSuper: false, permissions: [] })).toBe(false);
      expect(canOpenLink(meliaf, null)).toBe(false);
    });

    it('shows nothing to someone without a role, or without an answer', () => {
      expect(groupsFor({ isSuper: false, permissions: [] })).toEqual([]);
      expect(groupsFor(null)).toEqual([]);
    });

    it('opens Users and Roles with the «Manage roles and users» permission', () => {
      expect(labels(groupsFor({ isSuper: false, permissions: ['/api/access-admin'] }))).toEqual(['Users', 'Roles']);
    });

    // API keys and usage carry no permission in the back today: only a super
    // sees them; a MIS permission opens the MIS Registry tab alone.
    it('keeps the tabs without a back permission for supers', () => {
      const groups = groupsFor({ isSuper: false, permissions: ['/api/mises/create'] });
      const microservices = groups.find(group => group.title === 'System')?.links[0];
      expect(microservices?.children?.map(child => child.label)).toEqual(['MIS Registry']);
    });

    it('finds the entry of a URL and says whether it opens', () => {
      const glossary = adminLinkFor('/clarisa-panel/manage/glossary-admin/14?x=1');
      expect(glossary?.label).toBe('Glossary');
      expect(canOpenLink(glossary!, { isSuper: false, permissions: ['/api/glossary/admin'] })).toBe(true);
      expect(canOpenLink(glossary!, { isSuper: false, permissions: ['/api/institutions/create-bulk'] })).toBe(false);
      expect(adminLinkFor('/landing-page/home')).toBeNull();
    });

    it('maps every entry to at least one back route, or declares it super-only', () => {
      ADMIN_GROUPS.flatMap(group => group.links).forEach(link => {
        expect(Array.isArray(link.access)).toBe(true);
        link.access.forEach(route => expect(route.startsWith('/api/')).toBe(true));
      });
    });
  });
});
