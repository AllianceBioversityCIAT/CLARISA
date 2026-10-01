import { of } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AdminIcon, GlobalConceptsApiService } from '../../../../../../shared/services/global-concepts/global-concepts-api.service';
import { GcIconsEditorComponent } from './gc-icons-editor.component';

describe('GcIconsEditorComponent', () => {
  const icon: AdminIcon = { id: 3, icon_code: 'LEAF', icon_status: 'draft', file_link_primary: 'https://cdn.example.org/leaf.svg', alt_text: null };
  let api: Record<string, jest.Mock>;
  let component: GcIconsEditorComponent;

  beforeEach(() => {
    api = {
      icons: jest.fn(() => of([icon, { ...icon, id: 4, file_link_primary: 'file:///c/leaf.svg' }])),
      createIcon: jest.fn(() => of({ ...icon, id: 9, icon_status: 'final', alt_text: 'A green leaf' })),
      updateIcon: jest.fn(() => of(icon)),
      deleteIcon: jest.fn(() => of({ deleted: 3 }))
    };
    component = new GcIconsEditorComponent(
      api as unknown as GlobalConceptsApiService,
      { add: jest.fn() } as unknown as MessageService,
      { confirm: jest.fn(({ accept }) => accept()) } as unknown as ConfirmationService
    );
    component.termId = 12;
    component.ngOnInit();
  });

  it('previews only http(s) links', () => {
    expect(component.previewUrl(component.icons[0])).toBe('https://cdn.example.org/leaf.svg');
    expect(component.previewUrl(component.icons[1])).toBeNull();
  });

  it('refuses a final icon without alt text, then creates it once the text is there', () => {
    component.openNew();
    component.form.icon_status = 'final';
    expect(component.altRequired).toBe(true);
    component.save();
    expect(api['createIcon']).not.toHaveBeenCalled();

    component.form.alt_text = 'A green leaf';
    component.save();
    expect(api['createIcon']).toHaveBeenCalledWith('meliaf-taxonomy', 12, expect.objectContaining({ icon_status: 'final', alt_text: 'A green leaf' }));
    expect(component.icons.map(item => item.id)).toEqual([3, 4, 9]);
    expect(component.editingId).toBeNull();
  });

  it('patches only what changed and deletes after confirming', () => {
    component.openEdit(icon);
    component.form.icon_code = 'LEAF-2';
    component.save();
    expect(api['updateIcon']).toHaveBeenCalledWith('meliaf-taxonomy', 12, 3, { icon_code: 'LEAF-2' });

    component.remove(icon);
    expect(api['deleteIcon']).toHaveBeenCalledWith('meliaf-taxonomy', 12, 3);
    expect(component.icons.map(item => item.id)).toEqual([4]);
  });
});
