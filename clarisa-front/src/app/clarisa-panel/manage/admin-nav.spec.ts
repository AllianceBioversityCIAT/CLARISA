import {
  ADMIN_GROUPS,
  ANY_SIGNED_IN,
  AdminGroup,
  LOGIN_LANDING,
  adminLinkFor,
  adminSectionLabel,
  canOpenLink,
  groupsFor,
  onlyProtectedSection,
  postLoginRoute,
  protectedSections,
  sectionUrl
} from './admin-nav';

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
    const tabs = (groups: ReturnType<typeof groupsFor>) =>
      groups.find(group => group.title === 'System')?.links[0].children?.map(child => child.label) ?? [];
    const noRole = { isSuper: false, permissions: [] as string[] };

    // What every signed-in user saw before role filtering, because the back
    // guards it with the session only: it must stay for everybody.
    const OPEN = ['Institution requests', 'Microservices & API keys'];
    const OPEN_TABS = ['Overview', 'API Keys'];

    it('shows a super everything, tabs included', () => {
      const groups = groupsFor({ isSuper: true, permissions: [] });
      expect(labels(groups)).toEqual(labels(ADMIN_GROUPS));
      expect(tabs(groups)).toEqual(['Overview', 'MIS Registry', 'API Keys']);
    });

    it('keeps the entries the back does not permission-guard for a user without any role', () => {
      const groups = groupsFor(noRole);
      expect(labels(groups)).toEqual(OPEN);
      expect(groups.map(group => group.title)).toEqual(['Manage', 'System']);
      expect(tabs(groups)).toEqual(OPEN_TABS);
    });

    it('hides every permission-guarded entry from a user without any role', () => {
      const hidden = labels(groupsFor(noRole));
      ['Institution lifecycle', 'Glossary', 'MELIAF Taxonomy', 'Users', 'Roles'].forEach(label => expect(hidden).not.toContain(label));
      expect(tabs(groupsFor(noRole))).not.toContain('MIS Registry');
    });

    it('declares the open entries explicitly, not as an empty list', () => {
      expect(adminLinkFor('/clarisa-panel/manage/partner-request')?.access).toBe(ANY_SIGNED_IN);
      const microservices = adminLinkFor('/clarisa-panel/manage/microservices-admin')!;
      expect(microservices.children?.filter(child => child.access === ANY_SIGNED_IN).map(child => child.label)).toEqual(OPEN_TABS);
    });

    it('shows a MELIAF Data Admin the MELIAF Taxonomy plus the open entries', () => {
      const groups = groupsFor({ isSuper: false, permissions: ['/api/meliaf-taxonomy/admin'] });
      expect(labels(groups)).toEqual(['Institution requests', 'MELIAF Taxonomy', 'Microservices & API keys']);
      expect(tabs(groups)).toEqual(OPEN_TABS);
    });

    it('shows a MELIAF Concepts Editor the MELIAF Taxonomy plus the open entries', () => {
      const groups = groupsFor({ isSuper: false, permissions: ['/api/meliaf-taxonomy/admin/meliaf/concepts'] });
      expect(labels(groups)).toEqual(['Institution requests', 'MELIAF Taxonomy', 'Microservices & API keys']);
    });

    it('opens the MELIAF Taxonomy entry for the full and the concepts permission, and nothing else of MELIAF', () => {
      const meliaf = adminLinkFor('/clarisa-panel/manage/global-concepts-admin')!;
      expect(canOpenLink(meliaf, { isSuper: true, permissions: [] })).toBe(true);
      expect(canOpenLink(meliaf, { isSuper: false, permissions: ['/api/meliaf-taxonomy/admin'] })).toBe(true);
      expect(canOpenLink(meliaf, { isSuper: false, permissions: ['/api/meliaf-taxonomy/admin/meliaf/concepts'] })).toBe(true);
      expect(canOpenLink(meliaf, { isSuper: false, permissions: ['/api/meliaf-taxonomy/admin/meliaf/lists'] })).toBe(false);
      expect(canOpenLink(meliaf, { isSuper: false, permissions: ['/api/glossary/admin'] })).toBe(false);
      expect(canOpenLink(meliaf, noRole)).toBe(false);
    });

    // me/access failed or timed out: the panel as it was before role filtering.
    it('shows the whole menu when the access is unknown (null), as before role filtering', () => {
      expect(labels(groupsFor(null))).toEqual(labels(ADMIN_GROUPS));
      expect(tabs(groupsFor(null))).toEqual(['Overview', 'MIS Registry', 'API Keys']);
      ADMIN_GROUPS.flatMap(group => group.links).forEach(link => expect(canOpenLink(link, null)).toBe(true));
    });

    it('opens Users and Roles with the «Manage roles and users» permission', () => {
      expect(labels(groupsFor({ isSuper: false, permissions: ['/api/access-admin'] }))).toEqual([
        'Institution requests',
        'Users',
        'Roles',
        'Microservices & API keys'
      ]);
    });

    it('adds the MIS Registry tab to the open ones with a MIS permission', () => {
      expect(tabs(groupsFor({ isSuper: false, permissions: ['/api/mises/create'] }))).toEqual(['Overview', 'MIS Registry', 'API Keys']);
    });

    it('finds the entry of a URL and says whether it opens', () => {
      const glossary = adminLinkFor('/clarisa-panel/manage/glossary-admin/14?x=1');
      expect(glossary?.label).toBe('Glossary');
      expect(canOpenLink(glossary!, { isSuper: false, permissions: ['/api/glossary/admin'] })).toBe(true);
      expect(canOpenLink(glossary!, { isSuper: false, permissions: ['/api/institutions/create-bulk'] })).toBe(false);
      expect(adminLinkFor('/landing-page/home')).toBeNull();
    });

    describe('the one section a member is for (home redirect + login landing)', () => {
      const meliaf = { isSuper: false, permissions: ['/api/meliaf-taxonomy/admin'] };

      it('counts only permission-protected sections, never the open entries', () => {
        expect(protectedSections(noRole)).toEqual([]);
        expect(protectedSections(meliaf).map(section => section.link.label)).toEqual(['MELIAF Taxonomy']);
        expect(protectedSections({ isSuper: false, permissions: ['/api/mises/create'] })).toEqual([
          { link: adminLinkFor('/clarisa-panel/manage/microservices-admin'), queryParams: { section: 'mises' } }
        ]);
      });

      it('MELIAF-only → the MELIAF Taxonomy, on the home and after login', () => {
        expect(onlyProtectedSection(meliaf)?.link.route).toBe('/clarisa-panel/manage/global-concepts-admin');
        expect(postLoginRoute(meliaf)).toBe('/clarisa-panel/manage/global-concepts-admin');
        expect(postLoginRoute({ isSuper: false, permissions: ['/api/meliaf-taxonomy/admin/meliaf/concepts'] })).toBe(
          '/clarisa-panel/manage/global-concepts-admin'
        );
      });

      it('a single protected tab lands on that tab', () => {
        expect(postLoginRoute({ isSuper: false, permissions: ['/api/mises/create'] })).toBe(
          '/clarisa-panel/manage/microservices-admin?section=mises'
        );
      });

      it('no protected section → partner-request, as today', () => {
        expect(onlyProtectedSection(noRole)).toBeNull();
        expect(postLoginRoute(noRole)).toBe(LOGIN_LANDING);
      });

      it('two or more protected sections → partner-request (open to everyone), and the home shows the list', () => {
        const two = { isSuper: false, permissions: ['/api/glossary/admin', '/api/institutions/lifecycle/'] };
        expect(onlyProtectedSection(two)).toBeNull();
        expect(postLoginRoute(two)).toBe(LOGIN_LANDING);
        // Users + Roles are two sections from one permission.
        expect(postLoginRoute({ isSuper: false, permissions: ['/api/access-admin'] })).toBe(LOGIN_LANDING);
      });

      it('a super admin → partner-request, as always', () => {
        expect(onlyProtectedSection({ isSuper: true, permissions: [] })).toBeNull();
        expect(postLoginRoute({ isSuper: true, permissions: [] })).toBe(LOGIN_LANDING);
      });

      it('access unknown (me/access error or timeout) → partner-request, no redirect', () => {
        expect(onlyProtectedSection(null)).toBeNull();
        expect(postLoginRoute(null)).toBe(LOGIN_LANDING);
      });

      it('without partner-request open to them, several sections go to the panel home', () => {
        const groups: AdminGroup[] = [
          {
            title: 'x',
            links: [
              { label: 'A', route: '/clarisa-panel/manage/a', icon: 'fa fa-a', access: ['/api/a'] },
              { label: 'B', route: '/clarisa-panel/manage/b', icon: 'fa fa-b', access: ['/api/b'] }
            ]
          }
        ];
        expect(onlyProtectedSection({ isSuper: false, permissions: ['/api/a', '/api/b'] }, groups)).toBeNull();
        expect(onlyProtectedSection({ isSuper: false, permissions: ['/api/a'] }, groups)?.link.label).toBe('A');
      });

      it('builds the URL of a section with its tab', () => {
        const link = adminLinkFor('/clarisa-panel/manage/glossary-admin')!;
        expect(sectionUrl({ link })).toBe('/clarisa-panel/manage/glossary-admin');
        expect(sectionUrl({ link, queryParams: { section: 'mises' } })).toBe('/clarisa-panel/manage/glossary-admin?section=mises');
      });
    });

    it('maps every entry to back routes, or declares it open to any session', () => {
      const check = (access: string[] | typeof ANY_SIGNED_IN) => {
        if (access === ANY_SIGNED_IN) return;
        expect(Array.isArray(access)).toBe(true);
        access.forEach(route => expect(route.startsWith('/api/')).toBe(true));
      };
      ADMIN_GROUPS.flatMap(group => group.links).forEach(link => {
        check(link.access);
        link.children?.forEach(child => check(child.access));
      });
    });
  });
});
