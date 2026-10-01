import {
  ADMIN_GROUPS,
  AdminGroup,
  LOGIN_LANDING,
  NO_ROLE_LANDING,
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

  it('lists Concepts in Manage, right after Glossary', () => {
    const manage = ADMIN_GROUPS.find(group => group.title === 'Manage')?.links.map(link => link.label) ?? [];

    expect(manage.indexOf('Concepts')).toBe(manage.indexOf('Glossary') + 1);
    expect(adminSectionLabel('/clarisa-panel/manage/concepts-admin')).toBe('Concepts');
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
    const concepts = { isSuper: false, permissions: ['/api/concepts/admin'] };
    const irc = { isSuper: false, permissions: ['/api/partner-requests/create'] };
    const fir = { isSuper: false, permissions: ['/api/partner-requests/create', '/api/partner-requests/respond', '/api/partner-requests/update'] };

    it('shows a super everything, tabs included', () => {
      const groups = groupsFor({ isSuper: true, permissions: [] });
      expect(labels(groups)).toEqual(labels(ADMIN_GROUPS));
      expect(tabs(groups)).toEqual(['Overview', 'MIS Registry', 'API Keys']);
    });

    // Access goes by permission only (Yeck, 30-sep-2026): nothing is open to
    // "any signed-in user" any more.
    it('shows a user without any role nothing at all', () => {
      expect(groupsFor(noRole)).toEqual([]);
      ADMIN_GROUPS.flatMap(group => group.links).forEach(link => expect(canOpenLink(link, noRole)).toBe(false));
    });

    it('shows a Concepts Data Admin only Concepts', () => {
      const groups = groupsFor(concepts);
      expect(labels(groups)).toEqual(['Concepts']);
      expect(groups.map(group => group.title)).toEqual(['Manage']);
      expect(tabs(groups)).toEqual([]);
    });

    it('shows a Concepts Editor only Concepts', () => {
      expect(labels(groupsFor({ isSuper: false, permissions: ['/api/concepts/admin/concepts/concepts'] }))).toEqual(['Concepts']);
    });

    it('opens Institution requests for any institution-request permission (IRC create-only and FIR)', () => {
      expect(labels(groupsFor(irc))).toEqual(['Institution requests']);
      expect(labels(groupsFor(fir))).toEqual(['Institution requests']);
      ['/api/partner-requests/respond', '/api/partner-requests/update', '/api/partner-requests'].forEach(permission =>
        expect(labels(groupsFor({ isSuper: false, permissions: [permission] }))).toEqual(['Institution requests'])
      );
      expect(labels(groupsFor({ isSuper: false, permissions: ['/api/country-office-requests/create'] }))).toEqual([]);
    });

    it('opens Overview and API Keys only with the API keys permission', () => {
      const keys = { isSuper: false, permissions: ['/api/api-keys'] };
      expect(labels(groupsFor(keys))).toEqual(['Microservices & API keys']);
      expect(tabs(groupsFor(keys))).toEqual(['Overview', 'API Keys']);
      expect(tabs(groupsFor(concepts))).toEqual([]);
      expect(tabs(groupsFor(irc))).toEqual([]);
    });

    it('keeps the MIS Registry on the MIS permissions, alone', () => {
      expect(tabs(groupsFor({ isSuper: false, permissions: ['/api/mises/create'] }))).toEqual(['MIS Registry']);
      expect(tabs(groupsFor({ isSuper: false, permissions: ['/api/api-keys', '/api/mises/create'] }))).toEqual([
        'Overview',
        'MIS Registry',
        'API Keys'
      ]);
    });

    it('opens Concepts entry for the full and the concepts permission, and nothing else of Concepts', () => {
      const entry = adminLinkFor('/clarisa-panel/manage/concepts-admin')!;
      expect(canOpenLink(entry, { isSuper: true, permissions: [] })).toBe(true);
      expect(canOpenLink(entry, concepts)).toBe(true);
      expect(canOpenLink(entry, { isSuper: false, permissions: ['/api/concepts/admin/concepts/concepts'] })).toBe(true);
      expect(canOpenLink(entry, { isSuper: false, permissions: ['/api/concepts/admin/concepts/lists'] })).toBe(false);
      expect(canOpenLink(entry, { isSuper: false, permissions: ['/api/glossary/admin'] })).toBe(false);
      expect(canOpenLink(entry, noRole)).toBe(false);
    });

    // me/access failed or timed out: the panel as it was before role filtering.
    it('shows the whole menu when the access is unknown (null), as before role filtering', () => {
      expect(labels(groupsFor(null))).toEqual(labels(ADMIN_GROUPS));
      expect(tabs(groupsFor(null))).toEqual(['Overview', 'MIS Registry', 'API Keys']);
      ADMIN_GROUPS.flatMap(group => group.links).forEach(link => expect(canOpenLink(link, null)).toBe(true));
    });

    it('opens Users and Roles with the «Manage roles and users» permission, and nothing else', () => {
      expect(labels(groupsFor({ isSuper: false, permissions: ['/api/access-admin'] }))).toEqual(['Users', 'Roles']);
    });

    it('finds the entry of a URL and says whether it opens', () => {
      const glossary = adminLinkFor('/clarisa-panel/manage/glossary-admin/14?x=1');
      expect(glossary?.label).toBe('Glossary');
      expect(canOpenLink(glossary!, { isSuper: false, permissions: ['/api/glossary/admin'] })).toBe(true);
      expect(canOpenLink(glossary!, { isSuper: false, permissions: ['/api/institutions/create-bulk'] })).toBe(false);
      expect(adminLinkFor('/landing-page/home')).toBeNull();
    });

    describe('the one section a member is for (home redirect + login landing)', () => {
      it('counts every section the permissions open', () => {
        expect(protectedSections(noRole)).toEqual([]);
        expect(protectedSections(concepts).map(section => section.link.label)).toEqual(['Concepts']);
        expect(protectedSections(irc).map(section => section.link.label)).toEqual(['Institution requests']);
        expect(protectedSections({ isSuper: false, permissions: ['/api/mises/create'] })).toEqual([
          { link: adminLinkFor('/clarisa-panel/manage/microservices-admin'), queryParams: { section: 'mises' } }
        ]);
        expect(protectedSections({ isSuper: false, permissions: ['/api/api-keys'] })).toEqual([
          { link: adminLinkFor('/clarisa-panel/manage/microservices-admin'), queryParams: { section: 'overview' } }
        ]);
      });

      it('Concepts-only → Concepts, on the home and after login', () => {
        expect(onlyProtectedSection(concepts)?.link.route).toBe('/clarisa-panel/manage/concepts-admin');
        expect(postLoginRoute(concepts)).toBe('/clarisa-panel/manage/concepts-admin');
        expect(postLoginRoute({ isSuper: false, permissions: ['/api/concepts/admin/concepts/concepts'] })).toBe(
          '/clarisa-panel/manage/concepts-admin'
        );
      });

      it('IRC (create only) and FIR → Institution requests', () => {
        expect(postLoginRoute(irc)).toBe(LOGIN_LANDING);
        expect(postLoginRoute(fir)).toBe(LOGIN_LANDING);
      });

      it('a single protected tab lands on that tab', () => {
        expect(postLoginRoute({ isSuper: false, permissions: ['/api/mises/create'] })).toBe(
          '/clarisa-panel/manage/microservices-admin?section=mises'
        );
      });

      it('no section at all → the public home, not the panel', () => {
        expect(onlyProtectedSection(noRole)).toBeNull();
        expect(postLoginRoute(noRole)).toBe(NO_ROLE_LANDING);
        expect(NO_ROLE_LANDING).toBe('/landing-page/home');
        // A permission that opens no panel screen (e.g. QA tokens) is the same case.
        expect(postLoginRoute({ isSuper: false, permissions: ['/api/qa-token'] })).toBe(NO_ROLE_LANDING);
      });

      it('two or more sections → partner-request when they open it, else the panel home', () => {
        const two = { isSuper: false, permissions: ['/api/glossary/admin', '/api/institutions/lifecycle/'] };
        expect(onlyProtectedSection(two)).toBeNull();
        expect(postLoginRoute(two)).toBe('/clarisa-panel/manage');
        expect(postLoginRoute({ isSuper: false, permissions: ['/api/glossary/admin', '/api/partner-requests/respond'] })).toBe(LOGIN_LANDING);
        // Users + Roles are two sections from one permission.
        expect(postLoginRoute({ isSuper: false, permissions: ['/api/access-admin'] })).toBe('/clarisa-panel/manage');
      });

      it('a super admin → partner-request, as always', () => {
        expect(onlyProtectedSection({ isSuper: true, permissions: [] })).toBeNull();
        expect(postLoginRoute({ isSuper: true, permissions: [] })).toBe(LOGIN_LANDING);
      });

      it('access unknown (me/access error or timeout) → partner-request, no redirect', () => {
        expect(onlyProtectedSection(null)).toBeNull();
        expect(postLoginRoute(null)).toBe(LOGIN_LANDING);
      });

      it('counts sections over any navigation', () => {
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

    it('maps every entry and tab to back routes (no entry is open to any session)', () => {
      const check = (access: string[]) => {
        expect(Array.isArray(access)).toBe(true);
        access.forEach(route => expect(route.startsWith('/api/')).toBe(true));
      };
      ADMIN_GROUPS.flatMap(group => group.links).forEach(link => {
        check(link.access);
        if (!link.children?.length) expect(link.access.length).toBeGreaterThan(0);
        link.children?.forEach(child => {
          check(child.access);
          expect(child.access.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
