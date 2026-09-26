import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { GlobalConceptsApiService } from '../../../../../shared/services/global-concepts/global-concepts-api.service';
import { GC_BASE, accessKey, humanError, readSession, verifiedKey, writeSession } from '../../global-concepts.utils';

/**
 * Step 2 of the public form: the link from the email. The token is single
 * use, so it is sent once and the answer is remembered for this tab — a reload
 * shows the same confirmation instead of "this link has expired".
 */
@Component({
  selector: 'app-gc-request-verify',
  templateUrl: './request-verify.component.html',
  styleUrls: ['./request-verify.component.scss'],
  // The shared Global Concepts kit is declared once, globally (src/styles/_global-concepts.scss).
  host: { class: 'gc-kit' }
})
export class RequestVerifyComponent implements OnInit {
  readonly base = GC_BASE;

  loading = true;
  requestId: number | null = null;
  error: string | null = null;
  private started = false;

  constructor(
    private _api: GlobalConceptsApiService,
    private _route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.verify();
  }

  verify(): void {
    if (this.started) return;
    const token = (this._route.snapshot.queryParamMap.get('token') ?? '').trim();
    if (!token) {
      this.loading = false;
      this.error = 'This page needs the confirmation link we emailed you. Open the link from the email, or send your request again.';
      return;
    }

    const known = Number(readSession(verifiedKey(token)));
    if (Number.isInteger(known) && known > 0) {
      this.requestId = known;
      this.loading = false;
      return;
    }

    this.started = true;
    this._api.verifyRequest(token).subscribe({
      next: result => {
        this.requestId = Number(result.id);
        if (result.access_token) writeSession(accessKey(result.id), result.access_token);
        writeSession(verifiedKey(token), String(result.id));
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.error = humanError(error, {
          fallback400: 'This link is invalid or has expired. Links last 24 hours and work once: send your request again to get a new one.'
        });
      }
    });
  }
}
