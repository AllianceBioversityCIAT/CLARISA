import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { ControlListsApiService } from './control-lists-api.service';
import { NewFieldBody } from '../models/control-lists.models';

describe('ControlListsApiService', () => {
  let api: ControlListsApiService;
  let http: HttpTestingController;
  const admin = `${environment.apiUrl}api/control-lists/admin/`;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    api = TestBed.inject(ControlListsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function expectOne(method: string, url: string) {
    const req = http.expectOne(r => r.method === method && r.urlWithParams === url);
    return req;
  }

  it('builds the public address from the API url', () => {
    expect(api.publicUrl('crops')).toBe(`${environment.apiUrl}api/control-lists/crops`);
  });

  it('reads types, owners, lists and one list', () => {
    api.types().subscribe();
    expectOne('GET', `${admin}schema/types`).flush([]);
    api.owners().subscribe();
    expectOne('GET', `${admin}schema/owners`).flush([]);
    api.lists().subscribe();
    expectOne('GET', `${admin}schema/lists`).flush([]);
    api.list(7).subscribe();
    expectOne('GET', `${admin}schema/lists/7`).flush({});
    api.sql(7).subscribe();
    expectOne('GET', `${admin}schema/lists/7/sql`).flush({ sql: null });
    api.deleteImpact(7).subscribe();
    expectOne('GET', `${admin}schema/lists/7/delete-impact`).flush({});
  });

  it('creates a list with a POST body', () => {
    api.createList({ code: 'crops', name: 'Crops' }).subscribe();
    const req = expectOne('POST', `${admin}schema/lists`);
    expect(req.request.body).toEqual({ code: 'crops', name: 'Crops' });
    req.flush({});
  });

  it('adds a field, publishes and deletes a list with its request id', () => {
    const body: NewFieldBody = {
      code: 'name',
      label: 'Name',
      type: 'text',
      is_required: true,
      is_unique: false,
      is_indexed: false,
      request_id: 'r1'
    };
    api.addField(7, body).subscribe();
    const add = expectOne('POST', `${admin}schema/lists/7/fields`);
    expect(add.request.body).toEqual(body);
    add.flush({});

    api.publish(7, 'r2').subscribe();
    const pub = expectOne('POST', `${admin}schema/lists/7/publish`);
    expect(pub.request.body).toEqual({ request_id: 'r2' });
    pub.flush({});

    api.deleteList(7, 'r3').subscribe();
    const del = expectOne('DELETE', `${admin}schema/lists/7?request_id=r3`);
    del.flush({ deleted: true });
  });

  it('asks the impact of deleting or retyping a field', () => {
    api.fieldImpact(3, 'delete').subscribe();
    expectOne('GET', `${admin}schema/fields/3/impact?action=delete`).flush({});
    api.fieldImpact(3, 'type', 'integer').subscribe();
    expectOne('GET', `${admin}schema/fields/3/impact?action=type&type=integer`).flush({});
  });

  it('renames, retypes and deletes a field', () => {
    api.renameField(3, { label: 'Title', code: 'title', request_id: 'a' }).subscribe();
    const rename = expectOne('PATCH', `${admin}schema/fields/3`);
    expect(rename.request.body).toEqual({ label: 'Title', code: 'title', request_id: 'a' });
    rename.flush({});

    api.changeType(3, { type: 'integer', confirm_affected: 2, request_id: 'b' }).subscribe();
    const retype = expectOne('PATCH', `${admin}schema/fields/3/type`);
    expect(retype.request.body).toEqual({ type: 'integer', confirm_affected: 2, request_id: 'b' });
    retype.flush({});

    api.deleteField(3, 'c').subscribe();
    expectOne('DELETE', `${admin}schema/fields/3?request_id=c`).flush({});
  });

  it('reads, creates and updates records by list code', () => {
    api.records('crops').subscribe();
    expectOne('GET', `${admin}data/crops`).flush([]);

    api.createRecord('crops', { name: 'Maize', request_id: 'x' }).subscribe();
    const create = expectOne('POST', `${admin}data/crops`);
    expect(create.request.body).toEqual({ name: 'Maize', request_id: 'x' });
    create.flush({});

    api.updateRecord('crops', 4, { is_active: true }).subscribe();
    const update = expectOne('PATCH', `${admin}data/crops/4`);
    expect(update.request.body).toEqual({ is_active: true });
    update.flush({});
  });

  it('deactivates a record with a DELETE that carries the justification in its body', () => {
    api.deactivateRecord('crops', 4, 'duplicate').subscribe();
    const req = expectOne('DELETE', `${admin}data/crops/4`);
    expect(req.request.body).toEqual({ modification_justification: 'duplicate' });
    req.flush({});

    api.deactivateRecord('crops', 5).subscribe();
    const bare = expectOne('DELETE', `${admin}data/crops/5`);
    expect(bare.request.body).toEqual({});
    bare.flush({});
  });

  it('reads the public address with its status', done => {
    api.publicRead('crops').subscribe(res => {
      expect(res).toEqual({ status: 200, body: [] });
      done();
    });
    expectOne('GET', `${environment.apiUrl}api/control-lists/crops`).flush([]);
  });
});
