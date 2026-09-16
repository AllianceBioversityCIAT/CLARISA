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
  @ViewChild('story') story!: ElementRef<HTMLElement>;
  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;
  @ViewChild('descent') descent!: ElementRef<HTMLVideoElement>;

  /**
   * Tramo visible del hero. Solo existen tres, y solo arriba: bajo tierra no hay
   * tramos porque el scroll vuelve a ser normal.
   */
  step = 0;

  /**
   * true en cuanto el crecimiento ha terminado. Cambia el vídeo que se ve, apaga
   * el texto del hero y oscurece el velo — todo a la vez, para que el relevo
   * ocurra en un solo instante y no en tres.
   */
  underground = false;

  /**
   * Alias de `underground` para la plantilla: el texto del hero y el relevo de
   * vídeo ocurren ahora en el MISMO instante, cuando el contenido de abajo
   * asoma. Separarlos dejaba a la planta congelada esperando.
   */
  heroOff = false;

  /** Dónde empieza cada tramo del hero, en fracción del carril. */
  private readonly CUTS = [0, 0.34, 0.68];

  /**
   * El contenido que antes vivía en `app-indicators`, `app-publications` y
   * `app-partners-collaborators`, traído aquí porque ahora se cuenta durante el
   * descenso. 🛑 Las cifras siguen escritas a mano, como estaban: sin un endpoint
   * de conteo no hay forma de tenerlas vivas, y eso es trabajo de back.
   */
  /** Los endpoints que se listan bajo tierra. */
  readonly endpoints = ['/institutions', '/projects', '/countries', '/workpackages', '/initiatives', '/glossary'];

  /**
   * Los mismos conteos, pero con la escala dentro: `share` es la proporción
   * contra el mayor, y es lo que dibuja la barra. Sin eso son seis cajas
   * idénticas que no dicen que hay 250 instituciones por cada lista de control.
   *
   * 🛑 Escrito a mano, como estaba. Sin endpoint de conteo no hay forma de
   * tenerlo vivo, y eso es trabajo de back.
   */
  readonly indicators = [
    { value: 10630, label: 'Institutions', note: 'every organisation the CGIAR reports with' },
    { value: 1210, label: 'Projects', note: 'bilateral and portfolio' },
    { value: 344, label: 'Work packages' },
    { value: 248, label: 'Countries' },
    { value: 43, label: 'Initiatives' },
    { value: 41, label: 'Control lists' }
  ].map((m, i, all) => ({ ...m, share: m.value / all[0].value, display: m.value.toLocaleString('en-US') }));

  readonly publications = [
    {
      date: 'April 2020',
      title: 'CGIAR Level Agricultural Results Interoperable System Architecture (CLARISA) factsheet',
      cover: 'assets/images/documentOne.png'
    },
    { date: 'February 2021', title: 'CLARISA Institution request protocol', cover: 'assets/images/documentTwo.png' },
    {
      date: 'March 2022',
      title: 'Exploring CGIAR Level Agricultural Results Interoperable System Architecture (CLARISA)',
      cover: 'assets/images/documentTree.png'
    }
  ];

  readonly partners = [
    { name: 'CGIAR', logo: 'assets/images/CGIAR.png', url: 'https://www.cgiar.org/' },
    { name: 'Alliance of Bioversity International and CIAT', logo: 'assets/images/logociat.png', url: 'https://alliancebioversityciat.org/' },
    { name: 'ICARDA', logo: 'assets/images/ICARDA.png', url: 'https://icarda.org' },
    { name: 'CIP', logo: 'assets/images/CIP.png', url: 'https://cipotato.org/' }
  ];

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
    this.seek(this.video, p);

    // Bajo tierra el escenario es el mismo; lo único que cambia es qué vídeo se
    // ve y que el scroll vuelve a ser el normal: nada se queda atrapado
    // esperando a que termine el clip.
    const story = this.story?.nativeElement;
    let below = false;
    if (story) {
      const rect = story.getBoundingClientRect();
      const run = story.offsetHeight - window.innerHeight;
      // El relevo ocurre cuando el contenido de abajo toca el borde superior,
      // que es exactamente el momento en que el crecimiento ya terminó.
      // 🛑 El descenso arranca cuando el contenido ASOMA, no cuando toca arriba.
      // Midiendo desde `-rect.top` el vídeo se quedaba congelado en su primer
      // fotograma toda la subida del bloque: la planta quieta y un hueco donde
      // no pasaba nada (Yeck, 16-sep-2026).
      const vh = window.innerHeight;
      below = rect.top < vh * 0.88;
      if (below !== this.heroOff) {
        this.zone.run(() => (this.heroOff = below));
      }
      if (run > 0) {
        const q = Math.min(1, Math.max(0, (vh - rect.top) / (vh + run)));
        this.seek(this.descent, q);
      }
    }

    if (below !== this.underground) {
      this.zone.run(() => (this.underground = below));
    }

    // El tramo del hero es el último corte que ya hemos pasado.
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
