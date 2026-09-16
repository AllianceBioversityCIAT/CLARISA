import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';

import { AuthService } from '../../../../shared/services/auth.service';
import { ADMIN_GROUPS, AdminGroup } from '../../admin-nav';

/**
 * Lo que de verdad guarda `localStorage.user`, que no es lo que declara
 * `UserBasicInfo`: el objeto escrito al iniciar sesión trae `name`, `username`,
 * `email`, `id` y `permissions`. Mismo criterio que la barra pública.
 */
interface StoredUser {
  name?: string;
  username?: string;
  email?: string;
}

/**
 * Left-hand navigation for the administration panel.
 *
 * The admin modules used to live inside the public «Services» dropdown, next to
 * the API documentation, so signing in left you on one module with no way to
 * reach the others, and a visitor who had no account found them anyway and hit
 * the login screen. They belong here, where everything behind the session lives
 * together.
 *
 * La forma es la del panel que pidió Yeck (16-sep-2026): columna negra, buscador
 * arriba, grupos que se pliegan, la entrada abierta en menta y la cuenta al pie.
 * La lista en sí vive en `admin-nav.ts` porque la barra de arriba la lee para
 * titular la sección actual.
 */
@Component({
  selector: 'app-admin-sidebar',
  templateUrl: './admin-sidebar.component.html',
  styleUrls: ['./admin-sidebar.component.scss']
})
export class AdminSidebarComponent {
  /** Lo escrito en el buscador. Filtra la navegación, no llama a nadie. */
  query = '';

  @ViewChild('search') private searchBox?: ElementRef<HTMLInputElement>;

  private readonly collapsed = new Set<string>();

  constructor(private authService: AuthService) {}

  /**
   * Los grupos que quedan tras el filtro. Un grupo sin entradas que coincidan
   * desaparece entero: dejar el encabezado solo se lee como un grupo vacío.
   */
  get groups(): AdminGroup[] {
    const needle = this.query.trim().toLowerCase();

    if (!needle) {
      return ADMIN_GROUPS;
    }

    return ADMIN_GROUPS.map(group => ({
      ...group,
      links: group.links.filter(link => link.label.toLowerCase().includes(needle))
    })).filter(group => group.links.length > 0);
  }

  /** Nada coincide: se dice, en vez de dejar la columna en blanco. */
  get isEmpty(): boolean {
    return this.groups.length === 0;
  }

  /**
   * Buscando, los grupos se abren todos: esconder una coincidencia dentro de un
   * grupo plegado es responder «no hay nada» a una pregunta que sí tenía
   * respuesta.
   */
  isCollapsed(group: AdminGroup): boolean {
    return !this.query.trim() && this.collapsed.has(group.title);
  }

  /** Lo que se dibuja en la tecla: en un Mac es ⌘, en el resto Ctrl. */
  get shortcutHint(): string {
    const mac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || navigator.userAgent || '');
    return mac ? '⌘K' : 'Ctrl K';
  }

  /**
   * ⌘K / Ctrl+K lleva el foco al buscador desde cualquier punto del panel. Se
   * anuncia en la propia caja, así que tiene que existir de verdad: una tecla
   * dibujada que no hace nada es peor que no dibujarla.
   */
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key?.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) {
      return;
    }

    event.preventDefault();
    this.searchBox?.nativeElement.focus();
    this.searchBox?.nativeElement.select();
  }

  clear(): void {
    this.query = '';
    this.searchBox?.nativeElement.focus();
  }

  toggle(group: AdminGroup): void {
    if (this.collapsed.has(group.title)) {
      this.collapsed.delete(group.title);
    } else {
      this.collapsed.add(group.title);
    }
  }

  /** La sesión, o `null` si no hay ninguna utilizable. */
  get user(): StoredUser | null {
    if (!this.authService.localStorageToken || this.authService.isSessionExpired()) {
      return null;
    }

    try {
      const stored = this.authService.localStorageUser as unknown as StoredUser | null;
      return stored?.name || stored?.username || stored?.email ? stored : null;
    } catch {
      // Un `localStorage.user` corrupto no puede tumbar la navegación entera.
      return null;
    }
  }

  get displayName(): string {
    const user = this.user;
    return user?.name || user?.username || user?.email || '';
  }

  get email(): string {
    return this.user?.email ?? '';
  }

  get initials(): string {
    return (
      this.displayName
        .split(/[.\s_-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase() ?? '')
        .join('') || '?'
    );
  }
}
