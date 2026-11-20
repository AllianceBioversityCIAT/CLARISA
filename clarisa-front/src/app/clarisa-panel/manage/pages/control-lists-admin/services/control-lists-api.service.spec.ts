import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { environment } from '../../../../../../environments/environment';
import { readApiError } from '../utils/api-error';
import { ControlListsApiService, REQUEST_TIMEOUT_MS } from './control-lists-api.service';
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

  it('edits the name and description of a list, the rules of a field, and adds several records at once', () => {
    api.updateList(7, { name: 'Crop species', description: null }).subscribe();
    const edit = expectOne('PATCH', `${admin}schema/lists/7`);
    expect(edit.request.body).toEqual({ name: 'Crop species', description: null });
    edit.flush({});

    api.setFieldRules(3, { is_required: true, is_unique: false, is_indexed: true, request_id: 'r' }).subscribe();
    const rules = expectOne('PATCH', `${admin}schema/fields/3/rules`);
    expect(rules.request.body).toEqual({ is_required: true, is_unique: false, is_indexed: true, request_id: 'r' });
    rules.flush({});

    let created: unknown = null;
    api.createRecords('crop types', { request_id: 'b', records: [{ name: 'Maize' }, { name: 'Rice' }] }).subscribe(r => (created = r));
    const bulk = expectOne('POST', `${admin}data/crop%20types/bulk`);
    expect(bulk.request.body).toEqual({ request_id: 'b', records: [{ name: 'Maize' }, { name: 'Rice' }] });
    bulk.flush({ created: 2 });
    expect(created).toEqual({ created: 2 });
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

  describe('a call that never answers', () => {
    it('gives up after 30 seconds', () => {
      expect(REQUEST_TIMEOUT_MS).toBe(30_000);
    });

    const calls: [string, string, (a: ControlListsApiService) => import('rxjs').Observable<unknown>][] = [
      ['GET', 'types', a => a.types()],
      ['GET', 'owners', a => a.owners()],
      ['GET', 'lists', a => a.lists()],
      ['GET', 'one list', a => a.list(7)],
      ['GET', 'sql', a => a.sql(7)],
      ['GET', 'delete impact', a => a.deleteImpact(7)],
      ['GET', 'field impact', a => a.fieldImpact(3, 'delete')],
      ['GET', 'records', a => a.records('crops')],
      ['GET', 'public address', a => a.publicRead('crops')],
      ['POST', 'create list', a => a.createList({ code: 'c', name: 'C' })],
      [
        'POST',
        'add field',
        a => a.addField(7, { code: 'a', label: 'A', type: 'text', is_required: false, is_unique: false, is_indexed: false, request_id: 'r' })
      ],
      ['POST', 'publish', a => a.publish(7, 'r')],
      ['POST', 'create record', a => a.createRecord('crops', {})],
      ['PATCH', 'rename field', a => a.renameField(3, { label: 'A', code: 'a', request_id: 'r' })],
      ['PATCH', 'change type', a => a.changeType(3, { type: 'integer', confirm_affected: 0, request_id: 'r' })],
      ['PATCH', 'update record', a => a.updateRecord('crops', 4, {})],
      ['PATCH', 'edit list', a => a.updateList(7, { name: 'C', description: null })],
      ['PATCH', 'field rules', a => a.setFieldRules(3, { is_required: false, is_unique: false, is_indexed: false, request_id: 'r' })],
      ['POST', 'create records', a => a.createRecords('crops', { request_id: 'r', records: [{}] })],
      ['DELETE', 'delete list', a => a.deleteList(7, 'r')],
      ['DELETE', 'delete field', a => a.deleteField(3, 'r')],
      ['DELETE', 'deactivate record', a => a.deactivateRecord('crops', 4)]
    ];

    it.each(calls)('%s %s ends in a timeout the screens can read, and the request is cancelled', (method, _name, call) => {
      fakeAsync(() => {
        let failure: unknown = null;
        call(api).subscribe({ error: e => (failure = e) });
        const pending = http.match(r => r.method === method);
        expect(pending).toHaveLength(1);
        tick(REQUEST_TIMEOUT_MS - 1);
        expect(failure).toBeNull();
        tick(1);
        expect(readApiError(failure)).toMatchObject({ message: 'The server is taking too long to answer.', unsettled: true });
        expect(pending[0].cancelled).toBe(true);
      })();
    });

    it('does not time out a call that answered', fakeAsync(() => {
      let answered: unknown = null;
      api.types().subscribe(r => (answered = r));
      expectOne('GET', `${admin}schema/types`).flush([{ value: 'text', label: 'Short text' }]);
      tick(REQUEST_TIMEOUT_MS * 2);
      expect(answered).toEqual([{ value: 'text', label: 'Short text' }]);
    }));
  });
});
