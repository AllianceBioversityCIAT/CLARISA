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
});
