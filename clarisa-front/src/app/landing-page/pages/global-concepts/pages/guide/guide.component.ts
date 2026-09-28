import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RequestState } from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { GC_BASE, scrollToSection } from '../../global-concepts.utils';
import { STATES } from '../request-follow/request-follow.component';

export const GUIDE_SECTIONS = [
  { id: 'find', label: 'Find a concept' },
  { id: 'read', label: 'Read a concept page' },
  { id: 'check', label: 'Check a text' },
  { id: 'propose', label: 'Propose a concept or a change' },
  { id: 'follow', label: 'Follow and answer a request' },
  { id: 'statuses', label: 'What each status means' },
  { id: 'governance', label: 'Who approves' },
  { id: 'downloads', label: 'Downloads' }
];

/** Request states in the order a request lives them. */
const STATE_ORDER: RequestState[] = ['submitted', 'in_review', 'changes_requested', 'validation', 'approved', 'rejected'];

/**
 * "User guide": Global Concepts for business users, in plain English. Static
 * content; the request statuses are read from the follow page so the two
 * never say different things.
 */
@Component({
  selector: 'app-gc-guide',
  templateUrl: './guide.component.html',
  styleUrls: ['./guide.component.scss'],
  host: { class: 'gc-kit' }
})
export class GuideComponent implements OnInit, OnDestroy {
  readonly base = GC_BASE;
  readonly sections = GUIDE_SECTIONS;
  readonly states = STATE_ORDER.map(code => ({ code, ...STATES[code] }));
  active = GUIDE_SECTIONS[0].id;

  private readonly destroy$ = new Subject<void>();

  constructor(private _route: ActivatedRoute) {}

  ngOnInit(): void {
    this._route.fragment.pipe(takeUntil(this.destroy$)).subscribe({
      next: fragment => {
        if (fragment) {
          this.active = fragment;
          setTimeout(() => scrollToSection(fragment));
        }
      },
      error: () => undefined
    });
  }

  /** A second click on the same entry does not change the fragment, so the scroll is also done here. */
  goTo(id: string): void {
    this.active = id;
    setTimeout(() => scrollToSection(id));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
