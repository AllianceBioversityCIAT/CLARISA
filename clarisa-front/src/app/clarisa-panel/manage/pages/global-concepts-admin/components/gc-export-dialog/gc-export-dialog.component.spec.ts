import { of, throwError } from 'rxjs';
import { GcExportDialogComponent } from './gc-export-dialog.component';
import { GlobalConceptsApiService, releaseOptions } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';

describe('GcExportDialogComponent', () => {
  const releases = [
    { version: '1.0.0', released_at: '2026-09-29T13:50:08.000Z', release_uri: null, previous_version: null, notes: null, license: null },
    { version: '1.1.0', released_at: '2026-10-01T10:00:00.000Z', release_uri: null, previous_version: '1.0.0', notes: null, license: null }
  ];
  const build = (answer = of(releases) as any) => {
    const api = {
      releases: jest.fn(() => answer),
      exportUrl: jest.fn((s: string, f: string, v?: string | null) => `/api/x/${s}/export?format=${f}${v ? `&version=${v}` : ''}`)
    };
    const dialog = new GcExportDialogComponent(api as unknown as GlobalConceptsApiService);
    dialog.scheme = 'meliaf';
    return { dialog, api };
  };
  const open = (dialog: GcExportDialogComponent) => {
    dialog.visible = true;
    dialog.ngOnChanges({ visible: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false } });
  };

  it('offers Current plus every release, newest first, and loads them only when it opens', () => {
    const { dialog, api } = build();
    expect(api.releases).not.toHaveBeenCalled();
    open(dialog);
    expect(api.releases).toHaveBeenCalledWith('meliaf');
    expect(dialog.versions.map(v => v.value)).toEqual([null, '1.1.0', '1.0.0']);
  });

  it('downloads the current version by default and pins the release picked', () => {
    const { dialog } = build();
    open(dialog);
    expect(dialog.href).toBe('/api/x/meliaf/export?format=csv');
    dialog.format = 'skos';
    dialog.version = '1.0.0';
    expect(dialog.href).toBe('/api/x/meliaf/export?format=skos&version=1.0.0');
  });

  it('without releases (or if they fail) still downloads the current version', () => {
    const { dialog } = build(throwError(() => new Error('down')));
    dialog.version = '9.9.9';
    open(dialog);
    expect(dialog.releasesError).toBe(true);
    expect(dialog.loadingReleases).toBe(false);
    expect(dialog.version).toBeNull();
    expect(dialog.versions).toEqual(releaseOptions([]));
  });

  it('keeps the same options array between change-detection runs', () => {
    const { dialog } = build();
    open(dialog);
    expect(dialog.versions).toBe(dialog.versions);
  });
});
