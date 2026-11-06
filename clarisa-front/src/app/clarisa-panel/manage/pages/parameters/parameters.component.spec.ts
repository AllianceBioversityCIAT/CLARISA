import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { ManageApiService } from '../../services/manage-api.service';
import { ParametersComponent } from './parameters.component';

describe('ParametersComponent (editing lock)', () => {
  let fixture: ComponentFixture<ParametersComponent>;
  let component: ParametersComponent;
  const api = {
    getContentEditing: jest.fn(),
    setContentEditing: jest.fn()
  };

  beforeEach(async () => {
    api.getContentEditing.mockReturnValue(of({ locked: false, updated_at: null, updated_by: null }));
    api.setContentEditing.mockReset();
    await TestBed.configureTestingModule({
      declarations: [ParametersComponent],
      imports: [FormsModule, InputSwitchModule, ToastModule, NoopAnimationsModule],
      providers: [{ provide: ManageApiService, useValue: api }, MessageService]
    }).compileComponents();
    fixture = TestBed.createComponent(ParametersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows the current value', () => {
    expect(fixture.nativeElement.querySelector('.parameter__state').textContent.trim()).toBe('Open');
  });

  it('turning it on saves at once and shows who changed it', () => {
    api.setContentEditing.mockReturnValue(of({ locked: true, updated_at: '2026-11-06T15:00:00.000Z', updated_by: 'admin@cgiar.org' }));
    component.onToggle(true);
    fixture.detectChanges();
    expect(api.setContentEditing).toHaveBeenCalledWith(true);
    expect(fixture.nativeElement.querySelector('.parameter__state').textContent.trim()).toBe('Paused');
    expect(fixture.nativeElement.textContent).toContain('admin@cgiar.org');
    expect(fixture.nativeElement.querySelector('.parameter--on')).not.toBeNull();
  });

  it('a refused save puts the switch back', () => {
    api.setContentEditing.mockReturnValue(throwError(() => ({ status: 403, error: { message: 'Forbidden' } })));
    component.onToggle(true);
    expect(component.state?.locked).toBe(false);
    expect(component.saving).toBe(false);
  });

  it('a second move while saving is ignored (no double write)', () => {
    api.setContentEditing.mockReturnValue(of({ locked: true, updated_at: null, updated_by: null }));
    component.saving = true;
    component.onToggle(true);
    expect(api.setContentEditing).not.toHaveBeenCalled();
  });

  it('a value that cannot be read disables the switch and offers a retry', () => {
    api.getContentEditing.mockReturnValue(throwError(() => ({ status: 500 })));
    component.load();
    fixture.detectChanges();
    expect(component.loadFailed).toBe(true);
    expect(fixture.nativeElement.querySelector('.parameter__retry')).not.toBeNull();
  });
});
