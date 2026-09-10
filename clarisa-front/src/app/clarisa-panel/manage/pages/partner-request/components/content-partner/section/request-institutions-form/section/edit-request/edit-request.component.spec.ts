import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { EditRequestComponent } from './edit-request.component';

/**
 * Shape of `api/institution-types/from-parent`: four levels of NGO plus the root
 * types that have no children at all ("Other", "Private company (other than
 * financial)"). Those childless roots are the ones the Edit Request modal used
 * to mishandle.
 */
const TYPE_TREE = [
  {
    code: 37,
    name: 'NGO',
    children: [
      {
        code: 47,
        name: 'NGO Local',
        children: [
          { code: 48, name: 'NGO Local (General)', children: [] },
          { code: 49, name: 'NGO Local (Farmers)', children: [] },
        ],
      },
    ],
  },
  { code: 75, name: 'Private company (other than financial)', children: [] },
  { code: 78, name: 'Other', children: [] },
];

function partnerRequest(institutionTypeDTO: any) {
  return {
    id: 5873,
    partnerName: 'Happy Smala',
    acronym: null,
    webPage: 'https://www.happysmala.com/',
    mis: 'CLARISA',
    category_1: null,
    category_2: null,
    externalUserComments: '',
    externalUserMail: 'someone@cgiar.org',
    externalUserName: 'Someone',
    countryDTO: { code: 504, name: 'Morocco', isoAlpha2: 'MA' },
    institutionTypeDTO,
  };
}

describe('EditRequestComponent', () => {
  let component: EditRequestComponent;
  let fixture: ComponentFixture<EditRequestComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, ReactiveFormsModule],
      declarations: [EditRequestComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EditRequestComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('editing a request whose type is a childless root type', () => {
    beforeEach(() => {
      component.informationContent = partnerRequest({
        code: 78,
        name: 'Other',
        id_parent: null,
      });
      component.ngOnInit();
      http.expectOne((r) => r.url.includes('api/countries')).flush([]);
      http
        .expectOne((r) => r.url.includes('api/institution-types/from-parent'))
        .flush(TYPE_TREE);
    });

    it('sends the type the request already has when the dropdowns are untouched', () => {
      // The regression this pins: reading `.code` off an untouched control gave
      // NaN, the PATCH carried `institutionTypeCode: null`, and the API stored
      // the request as institution type 3, "CGIAR Center".
      component.group.controls['modification_justification'].setValue('typo');

      component.edit(component.group.value);

      const req = http.expectOne((r) =>
        r.url.includes('api/partner-requests/update'),
      );
      expect(req.request.body.institutionTypeCode).toBe(78);
      expect(req.request.body.hqCountryIso).toBe('MA');
      req.flush({ response: {} });
    });

    it('sends the newly picked type when the user does change it', () => {
      component.selectType(TYPE_TREE[1]);
      component.group.controls['modification_justification'].setValue('typo');

      component.edit(component.group.value);

      const req = http.expectOne((r) =>
        r.url.includes('api/partner-requests/update'),
      );
      expect(req.request.body.institutionTypeCode).toBe(75);
      req.flush({ response: {} });
    });

    it('releases the spinner and reports the reason when the API rejects the update', () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      component.group.controls['modification_justification'].setValue('typo');

      component.edit(component.group.value);

      const req = http.expectOne((r) =>
        r.url.includes('api/partner-requests/update'),
      );
      req.flush(
        {
          response: { response: ["An institution type with id '0' could not be found"] },
        },
        { status: 400, statusText: 'Bad Request' },
      );

      expect(component.loading).toBe(false);
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining("An institution type with id '0' could not be found"),
      );
      alertSpy.mockRestore();
    });

    it('names the Justification field instead of the old blanket message', () => {
      expect(component.group.valid).toBe(false);
      expect(component.buildValidationMessage()).toContain('Justification');
    });
  });

  describe('editing a request whose type is nested', () => {
    it('keeps sending the nested type when the dropdowns are untouched', () => {
      component.informationContent = partnerRequest({
        code: 49,
        name: 'NGO Local (Farmers)',
        id_parent: 47,
      });
      component.ngOnInit();
      http.expectOne((r) => r.url.includes('api/countries')).flush([]);
      http
        .expectOne((r) => r.url.includes('api/institution-types/get/'))
        .flush({ code: 47, name: 'NGO Local', parent_id: 37 });
      http
        .expectOne((r) => r.url.includes('api/institution-types/from-parent'))
        .flush(TYPE_TREE);

      component.group.controls['modification_justification'].setValue('typo');
      component.edit(component.group.value);

      const req = http.expectOne((r) =>
        r.url.includes('api/partner-requests/update'),
      );
      expect(req.request.body.institutionTypeCode).toBe(49);
      req.flush({ response: {} });
    });
  });
});
