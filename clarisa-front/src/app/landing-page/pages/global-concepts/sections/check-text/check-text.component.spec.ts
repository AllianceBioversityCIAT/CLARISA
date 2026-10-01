// The spec tsconfig carries no Node typings; jest runs on Node, so both exist at runtime.
declare const require: (id: string) => any;
declare const __dirname: string;
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { CheckTextComponent } from './check-text.component';
import { GlobalConceptsApiService } from '../../../../../shared/services/global-concepts/global-concepts-api.service';

describe('CheckTextComponent', () => {
  let component: CheckTextComponent;
  let fixture: ComponentFixture<CheckTextComponent>;
  let api: any;

  beforeEach(async () => {
    api = {
      suggest: jest.fn().mockReturnValue(
        of({
          scheme: 'concepts',
          retained: false,
          suggestions: [
            {
              term_id: 7,
              term_uri: 'https://x/7',
              preferred_label: 'Theory of Change',
              status: 'approved',
              matched: [
                { label: 'ToC', kind: 'acronym', count: 2 },
                { label: 'theory of change', kind: 'pref', count: 1 }
              ],
              replaced_by: null
            }
          ]
        })
      )
    };
    await TestBed.configureTestingModule({
      declarations: [CheckTextComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [{ provide: GlobalConceptsApiService, useValue: api }]
    }).compileComponents();
    fixture = TestBed.createComponent(CheckTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('says the text is not stored', () => {
    expect(fixture.nativeElement.textContent).toContain('Your text is not stored.');
  });

  it('does not call the API with an empty or oversized text', () => {
    component.text = '   ';
    component.check();
    component.text = 'x'.repeat(component.max + 1);
    component.check();
    expect(api.suggest).not.toHaveBeenCalled();
  });

  it('sends the text in the body and lists the matched labels with counts', () => {
    component.scheme = 'concepts';
    component.text = 'Our ToC and the theory of change';
    component.check();
    expect(api.suggest).toHaveBeenCalledWith('concepts', 'Our ToC and the theory of change');
    expect(component.checking).toBe(false);
    expect(component.totalMatches(component.suggestions![0])).toBe(3);

    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Theory of Change');
    expect(text).toContain('"ToC" × 2');
  });

  it('tells apart "nothing found" from "not checked yet"', () => {
    expect(component.suggestions).toBeNull();
    api.suggest.mockReturnValue(of({ scheme: 'concepts', retained: false, suggestions: [] }));
    component.text = 'Nothing official here';
    component.check();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No official concept found in this text.');
  });

  it('stops the spinner and explains a rate limit', () => {
    api.suggest.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 429 })));
    component.text = 'Some text';
    component.check();
    expect(component.checking).toBe(false);
    expect(component.error).toContain('Too many attempts');
  });

  describe('layout inside the card', () => {
    const fs = require('fs');
    const path = require('path');
    const html: string = fs.readFileSync(path.join(__dirname, 'check-text.component.html'), 'utf8');
    const scss: string = fs.readFileSync(path.join(__dirname, 'check-text.component.scss'), 'utf8');
    const kit: string = fs.readFileSync(path.join(__dirname, '..', '..', '_gc.scss'), 'utf8');
    const classes = (html.match(/class="[^"]+"/g) ?? []).flatMap(attr => attr.slice(7, -1).split(/\s+/));

    it('does not reuse the kit class of the centred checkbox row (.gc-check / .gc-check__*)', () => {
      expect(kit).toMatch(/\.gc-check \{[^}]*align-items: center/);
      expect(classes.filter(name => name === 'gc-check' || name.startsWith('gc-check__'))).toEqual([]);
    });

    it('stretches its title and textarea to the card width, left-aligned, against the landing element rules', () => {
      const root = scss.match(/\.gc-textcheck \{([^}]*)\}/)?.[1] ?? '';
      expect(root).toContain('align-items: stretch');
      expect(root).toContain('text-align: left');
      expect(root).toContain('float: none');
      expect(fixture.nativeElement.querySelector('section')?.classList).toContain('gc-textcheck');
    });
  });
});
