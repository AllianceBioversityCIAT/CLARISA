import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ContentEditingState, ManageApiService } from '../../services/manage-api.service';

/**
 * Parameters of the platform an administrator changes without a deploy.
 * Today one: pause creating and editing glossary terms and taxonomy
 * concepts while adjustments are made (the API refuses those writes with a
 * message while it is on; reading never stops).
 */
@Component({
  selector: 'app-parameters',
  templateUrl: './parameters.component.html',
  styleUrls: ['./parameters.component.scss']
})
export class ParametersComponent implements OnInit {
  state: ContentEditingState | null = null;
  loading = true;
  saving = false;
  loadFailed = false;

  constructor(
    private api: ManageApiService,
    private messages: MessageService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadFailed = false;
    this.api.getContentEditing().subscribe({
      next: state => {
        this.state = state;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadFailed = true;
      }
    });
  }

  /** Switch moved: saved at once; a refusal puts the switch back. */
  onToggle(locked: boolean): void {
    if (this.saving || !this.state) return;
    const previous = this.state.locked;
    this.state = { ...this.state, locked };
    this.saving = true;
    this.api.setContentEditing(locked).subscribe({
      next: state => {
        this.state = state;
        this.saving = false;
        this.messages.add({
          severity: state.locked ? 'warn' : 'success',
          summary: state.locked ? 'Editing paused' : 'Editing resumed',
          detail: state.locked
            ? 'Nobody can create or edit glossary terms or taxonomy concepts until you turn this off.'
            : 'Glossary terms and taxonomy concepts can be created and edited again.'
        });
      },
      error: err => {
        this.state = this.state ? { ...this.state, locked: previous } : null;
        this.saving = false;
        this.messages.add({
          severity: 'error',
          summary: 'Not saved',
          detail: err?.error?.response?.message ?? err?.error?.message ?? err?.message ?? 'Request failed'
        });
      }
    });
  }
}
