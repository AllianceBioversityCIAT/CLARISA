import { of } from 'rxjs';
import { FormBuilder } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { GlossaryTermsPanelComponent } from './glossary-terms-panel.component';
import { ManageApiService } from '../../../../services/manage-api.service';

/** The create dialog never sends `editorial_status`: the panel always creates approved (pinned as-is, 2026-10-29). */
describe('GlossaryTermsPanelComponent — create body contract', () => {
  let createGlossaryTerm: jest.Mock;
  let updateGlossaryTerm: jest.Mock;
  let component: GlossaryTermsPanelComponent;

  beforeEach(() => {
    createGlossaryTerm = jest.fn(() => of({}));
    updateGlossaryTerm = jest.fn(() => of({}));
    const api = { getGlossaryTerms: () => of([]), getAllPortfolios: () => of([]), createGlossaryTerm, updateGlossaryTerm } as unknown as ManageApiService;
    component = new GlossaryTermsPanelComponent(
      api,
      new FormBuilder(),
      { add: jest.fn() } as unknown as MessageService,
      { confirm: jest.fn() } as unknown as ConfirmationService
    );
    component.ngOnInit();
  });

  it('create body has exactly the v1 keys and no editorial_status / replaced_by_id', () => {
    component.openCreate();
    component.form.patchValue({ term: 'Outcome', definition: 'A change' });
    component.submit();

    const body = createGlossaryTerm.mock.calls[0][0];
    expect(Object.keys(body).sort()).toEqual(
      ['alternative_labels', 'definition', 'portfolio_ids', 'reference_date', 'show_in_dashboard', 'source', 'source_url', 'term'].sort()
    );
    expect(body).not.toHaveProperty('editorial_status');
    expect(body).not.toHaveProperty('replaced_by_id');
  });

  it('update body does not send editorial_status either', () => {
    component.openEdit({
      id: 7, group_id: 7, term: 'T', definition: 'D', source: null, source_url: null, reference_date: null,
      alternative_labels: [], is_active: true, show_in_dashboard: false, application_name: null, portfolios: []
    });
    component.submit();
    expect(updateGlossaryTerm).toHaveBeenCalledWith(7, expect.not.objectContaining({ editorial_status: expect.anything() }));
    expect(Object.keys(updateGlossaryTerm.mock.calls[0][1])).not.toContain('editorial_status');
  });
});
