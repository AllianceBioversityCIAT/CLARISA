import { Component, HostBinding, NgZone, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { AuthService } from '../../../shared/services/auth.service';

/**
 * 🛑 Lo que de verdad hay en `localStorage.user`, que NO es lo que declara
 * `UserBasicInfo` (`id`, `user_name`, `email`). El objeto real guardado al
 * iniciar sesión trae `name`, `username`, `email`, `id` y `permissions` — sin
 * `user_name` por ninguna parte, así que leerlo daba `undefined` y la barra
 * mostraba un usuario sin nombre. La interfaz compartida no se toca desde aquí:
 * la usan otras pantallas y corregirla es un cambio aparte.
 */
interface StoredUser {
  id?: number;
  name?: string;
  username?: string;
  email?: string;
}

/**
 * Barra pública «N4 · blanca con costilla», con tres comportamientos añadidos
 * para que conviva con el recorrido de la home.
 *
 * 1. **Se aparta al bajar y vuelve al subir.** Sobre un hero que ocupa la
 *    pantalla entera, una barra fija le roba 73px al vídeo todo el rato; y sin
 *    barra no hay forma de salirse del recorrido. El gesto de subir un poco es
 *    el que la gente ya usa para «quiero el menú».
 * 2. **Se oscurece SOLO mientras está sobre el recorrido.** Blanco sólido sobre
 *    un vídeo oscuro es un tajo; ahí se vuelve tinta translúcida. En el login y
 *    en el resto del landing es blanca, como siempre.
 * 3. **Dice quién eres si hay sesión.** Con el token puesto, en lugar de «Sign
 *    in» aparece el usuario y un menú con el panel y la salida.
 *
 * 🛑 La barra no sabe nada del componente del hero: pregunta por `.cl-page` en
 * el documento. Si esa sección no existe se queda blanca y fija.
 *
 * 🛑 Y lo recalcula TAMBIÉN al cambiar de ruta, no solo al hacer scroll: yendo
 * de la home al login sin tocar la rueda, la barra se quedaba translúcida sobre
 * el formulario blanco (Yeck, 16-sep-2026).
 */
@Component({
  selector: 'app-navigation-bar',
  templateUrl: './navigation-bar.component.html',
  styleUrls: ['./navigation-bar.component.scss']
})
export class NavigationBarComponent implements OnInit, OnDestroy {
  /** Escondida: se ha bajado lo suficiente y no se ha vuelto a subir. */
  @HostBinding('class.is-away') away = false;

  /** Sobre el recorrido: fondo tinta en vez de blanco. */
  @HostBinding('class.is-over') over = false;

  /** Menú de la cuenta desplegado. */
  accountOpen = false;

  private lastY = 0;
  private ticking = false;
  private routerSub?: Subscription;

  /** Por debajo de esto no se esconde nunca: arriba del todo siempre está. */
  private readonly KEEP = 90;

  /** Un temblor de rueda no cuenta como intención de ver el menú. */
  private readonly NOISE = 6;

  private readonly onScroll = () => {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => this.update());
  };

  constructor(
    private zone: NgZone,
    private router: Router,
    private authService: AuthService
  ) {}

  /** El usuario de la sesión, o `null` si no hay ninguna utilizable. */
  get user(): StoredUser | null {
    // Los tres tienen que cumplirse: sin token no hay sesión, con el token
    // vencido tampoco, y sin el usuario guardado no habría qué mostrar.
    if (!this.authService.localStorageToken || this.authService.isSessionExpired()) {
      return null;
    }

    try {
      const stored = this.authService.localStorageUser as unknown as StoredUser | null;
      return stored?.name || stored?.username || stored?.email ? stored : null;
    } catch {
      // Un `localStorage.user` corrupto no debe tumbar la barra entera.
      return null;
    }
  }

  /** Lo que se escribe al lado del disco. */
  get displayName(): string {
    const u = this.user;
    return u?.name || u?.username || u?.email || '';
  }

  /** Iniciales para el disco de la cuenta. */
  get initials(): string {
    const name = this.displayName;
    return (
      name
        .split(/[.\s_-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase() ?? '')
        .join('') || '?'
    );
  }

  ngOnInit(): void {
    this.lastY = window.scrollY;
    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onScroll, { passive: true });
    });

    // Cada navegación cambia si hay recorrido detrás o no.
    this.routerSub = this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.accountOpen = false;
      this.away = false;
      this.lastY = window.scrollY;
      // Dos pases: en el inmediato la vista nueva aún no está en el documento.
      this.update();
      requestAnimationFrame(() => this.update());
    });

    this.update();
    requestAnimationFrame(() => this.update());
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
    this.routerSub?.unsubscribe();
  }

  toggleAccount(): void {
    this.accountOpen = !this.accountOpen;
  }

  signOut(): void {
    this.accountOpen = false;
    this.authService.logout();
  }

  private update(): void {
    this.ticking = false;

    const y = Math.max(0, window.scrollY);
    const dy = y - this.lastY;

    let away = this.away;
    if (y <= this.KEEP) {
      away = false;
    } else if (Math.abs(dy) > this.NOISE) {
      away = dy > 0;
    }
    this.lastY = y;

    // El recorrido es la única zona con escenario detrás. `bottom > 0` significa
    // que todavía queda parte de él bajo la barra.
    const page = document.querySelector('.cl-page');
    const over = page ? page.getBoundingClientRect().bottom > 0 : false;

    if (away !== this.away || over !== this.over) {
      this.zone.run(() => {
        this.away = away;
        this.over = over;
      });
    }
  }
}
