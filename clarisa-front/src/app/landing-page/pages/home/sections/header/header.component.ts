import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';

/**
 * Hero cuyos vídeos avanzan con el scroll en lugar de reproducirse solos.
 *
 * El cálculo es una regla de tres: cuánto del carril (`.cl-hero`) ha pasado ya
 * por la pantalla. Ese 0..1 se reparte entre los dos clips —la primera mitad
 * hace crecer la yuca, la segunda baja a la raíz— y dentro de cada mitad se
 * multiplica por la duración del clip y se escribe en `currentTime`. Al llegar a
 * 1 el carril se acaba, el `sticky` se suelta y la página sigue.
 *
 * Tres cosas que no son adorno:
 *
 * 1. El listener va fuera de la zona de Angular. Un `scroll` dispara decenas de
 *    veces por segundo y cada entrada en la zona lanza un ciclo de detección de
 *    cambios sobre la home entera.
 * 2. `step` sí se escribe dentro de la zona, pero solo cuando cambia de tramo:
 *    cinco veces en todo el recorrido, no en cada píxel.
 * 3. Sin `loadedmetadata` no hay `duration`, y asignar `currentTime` antes de que
 *    el vídeo tenga metadatos se pierde en silencio.
 */
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements AfterViewInit, OnDestroy {
  @ViewChild('rail') rail!: ElementRef<HTMLElement>;
  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;
  @ViewChild('descent') descent!: ElementRef<HTMLVideoElement>;

  /**
   * Tramo visible del relato. 0-2 ocurren sobre la tierra mientras la yuca
   * crece; del 3 al 7 ya es bajo tierra, y son los bloques que la home cuenta
   * hoy más abajo. La plantilla usa `step >= 3` para decidir cuál de los dos
   * vídeos se ve.
   */
  step = 0;

  /**
   * Dónde empieza cada tramo, en fracción del carril. Los tres primeros caben
   * dentro del crecimiento (hasta SPLIT) y los cinco restantes se reparten el
   * descenso, que es el doble de largo.
   */
  private readonly CUTS = [0, 0.14, 0.25, 0.36, 0.49, 0.62, 0.75, 0.88];

  /**
   * Punto del recorrido donde termina el crecimiento y empieza el descenso.
   * No es la mitad: el clip de arriba dura 10 s y el de abajo 20 s, así que el
   * reparto sigue esa proporción y ninguno de los dos va al doble de velocidad
   * que el otro.
   */
  private readonly SPLIT = 0.36;

  private ticking = false;
  /**
   * 🛑 `matchMedia` se comprueba, no se da por hecho: jsdom —donde corre Jest— no
   * lo implementa, y el componente reventaba al instanciarse en el test. Lo mismo
   * vale para cualquier render fuera de un navegador real.
   */
  private readonly reduceMotion =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  private readonly onScroll = () => {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => this.update());
  };

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    // Con `reduce`, el carril mide `auto` y el escenario no se fija: se dejan
    // los vídeos quietos en su primer fotograma y no se engancha nada al scroll.
    if (this.reduceMotion) return;

    for (const ref of [this.video, this.descent]) {
      ref?.nativeElement?.addEventListener('loadedmetadata', () => this.update());
    }

    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onScroll, { passive: true });
    });

    this.update();
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
  }

  private update(): void {
    this.ticking = false;

    const rail = this.rail?.nativeElement;
    if (!rail) return;

    const travel = rail.offsetHeight - window.innerHeight;
    if (travel <= 0) return;

    const p = Math.min(1, Math.max(0, -rail.getBoundingClientRect().top / travel));

    // Cada clip recorre su mitad del carril de principio a fin. El segundo se
    // deja ya en su primer fotograma mientras aún se ve el primero, para que al
    // aparecer no haya un parpadeo en negro.
    this.seek(this.video, Math.min(1, p / this.SPLIT));
    this.seek(this.descent, Math.max(0, (p - this.SPLIT) / (1 - this.SPLIT)));

    // El tramo es el último corte que ya hemos pasado.
    let next = 0;
    for (let i = this.CUTS.length - 1; i >= 0; i--) {
      if (p >= this.CUTS[i]) {
        next = i;
        break;
      }
    }
    if (next !== this.step) {
      this.zone.run(() => (this.step = next));
    }
  }

  /** Lleva un vídeo al punto `t` (0..1) de su propia duración. */
  private seek(ref: ElementRef<HTMLVideoElement> | undefined, t: number): void {
    const video = ref?.nativeElement;
    // `readyState >= 1` es HAVE_METADATA: antes de eso `duration` es NaN y
    // asignar `currentTime` no hace nada.
    if (!video || video.readyState < 1 || !video.duration) return;

    // Se deja un pelo antes del final: exactamente en `duration` algunos
    // navegadores devuelven el fotograma en negro del cierre.
    video.currentTime = Math.min(1, Math.max(0, t)) * (video.duration - 0.05);
  }
}
