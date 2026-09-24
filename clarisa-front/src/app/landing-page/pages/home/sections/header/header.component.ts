import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';

import { ClarisaMetrics, MetricsService } from '../../../../../shared/services/metrics.service';

/**
 * Hero cuyos vídeos avanzan con el scroll en lugar de reproducirse solos.
 *
 * El cálculo es una regla de tres: cuánto del carril (`.cl-rail`) ha pasado ya
 * por la pantalla. Ese 0..1 se reparte entre los dos clips —la primera mitad
 * hace crecer la yuca, la segunda baja a la raíz— y dentro de cada mitad se
 * multiplica por la duración del clip y se escribe en `currentTime`. Al llegar a
 * 1 el carril se acaba, el `sticky` se suelta y la página sigue.
 *
 * Cinco cosas que no son adorno:
 *
 * 1. El listener va fuera de la zona de Angular. Un `scroll` dispara decenas de
 *    veces por segundo y cada entrada en la zona lanza un ciclo de detección de
 *    cambios sobre la home entera.
 * 2. `step` sí se escribe dentro de la zona, pero solo cuando cambia de tramo:
 *    cinco veces en todo el recorrido, no en cada píxel.
 * 3. Sin `loadedmetadata` no hay `duration`, y asignar `currentTime` antes de que
 *    el vídeo tenga metadatos se pierde en silencio.
 * 4. 🛑 **La altura de referencia es la del escenario, no `window.innerHeight`.**
 *    En Safari de iOS la barra de direcciones se encoge al bajar y `innerHeight`
 *    cambia A MITAD del recorrido: el mismo scroll daba dos progresos distintos
 *    y el vídeo pegaba un salto. El escenario mide `100svh`, que es un valor que
 *    no se mueve, así que CSS y JS hablan de lo mismo por construcción.
 * 5. 🛑 **Safari no carga el vídeo hasta que se reproduce.** `preload="auto"` se
 *    ignora en iOS: el elemento se queda en `HAVE_METADATA` y escribir
 *    `currentTime` no pinta nada — vídeo congelado en negro, que es justo lo que
 *    se veía. Se fuerza con un `play()` + `pause()` inmediato (permitido sin
 *    gesto porque es `muted` + `playsinline`) y, si la política lo rechaza, se
 *    reintenta al primer toque. Ver `prime()`.
 */
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('rail') rail!: ElementRef<HTMLElement>;
  @ViewChild('stage') stage!: ElementRef<HTMLElement>;
  @ViewChild('story') story!: ElementRef<HTMLElement>;
  @ViewChild('bars') bars!: ElementRef<HTMLElement>;
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

  /**
   * true cuando el clip del descenso ya tiene fotogramas que enseñar.
   *
   * 🛑 El relevo NO se hace solo con `underground`. El descenso ahora se
   * descarga tarde (ver `primeDescent`), así que puede llegar el momento del
   * relevo con el clip todavía vacío: mostrarlo sería un rectángulo negro donde
   * estaba la planta. Mientras no tenga datos se deja el último fotograma del
   * clip de arriba, que ES el primero de este — la costura no se ve igual.
   */
  descentReady = false;

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
   * Los seis catálogos, con su cifra VIVA.
   *
   * 🛑 Antes estaban escritas a mano y envejecieron a la vista de todos: decían
   * 32 iniciativas cuando hay 43, y 7.060 instituciones cuando hay 10.630. Un
   * producto que ES un API no puede presentarse con números pegados, así que
   * ahora salen de `GET api/metrics` (ver `MetricsService`).
   *
   * `share` es la proporción contra el mayor y es lo que dibuja la barra: sin
   * eso son seis cajas idénticas que no cuentan que hay ~250 instituciones por
   * cada lista de control.
   *
   * `display` es lo que se pinta, y sube contando desde cero cuando el bloque
   * asoma. Mientras no haya dato es `null`, y la plantilla enseña el hueco en
   * vez de inventarse un número.
   */
  indicators: {
    key: keyof Omit<ClarisaMetrics, 'generatedAt'>;
    label: string;
    note?: string;
    value: number | null;
    display: string | null;
    share: number;
  }[] = [
    { key: 'institutions', label: 'Institutions', note: 'every organisation the CGIAR reports with', value: null, display: null, share: 0 },
    { key: 'projects', label: 'Projects', note: 'bilateral and portfolio', value: null, display: null, share: 0 },
    { key: 'workPackages', label: 'Work packages', value: null, display: null, share: 0 },
    { key: 'countries', label: 'Countries', value: null, display: null, share: 0 },
    { key: 'initiatives', label: 'Initiatives', value: null, display: null, share: 0 },
    { key: 'controlLists', label: 'Control lists', value: null, display: null, share: 0 }
  ];

  /**
   * En qué punto está la petición de las cifras.
   *
   * 🛑 `unavailable` NO es un estado de error que haya que disimular: es la
   * verdad. Si el API no responde se enseñan las seis etiquetas sin número y
   * una línea que lo dice, porque las etiquetas siguen siendo información
   * cierta —esos catálogos existen— y un número viejo de reserva sería mentir.
   */
  metricsState: 'loading' | 'ready' | 'unavailable' = 'loading';

  /** Se cuenta una sola vez, la primera que el bloque entra en pantalla. */
  private counted = false;

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
   * El último instante pedido para cada vídeo que Safari dejó sin atender.
   * Safari descarta un `currentTime` nuevo si llega mientras hay una búsqueda en
   * curso: el clip se queda clavado en el fotograma anterior aunque el scroll
   * siga. Se guarda el objetivo y se aplica al terminar (`seeked`).
   */
  private readonly queued = new Map<HTMLVideoElement, number>();

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

  /** Vídeos ya arrancados. `play()`/`pause()` se pide una vez, no en cada evento. */
  private readonly primed = new Set<HTMLVideoElement>();

  /**
   * Arranca el clip del descenso, y no antes de tiempo.
   *
   * 🛑 Los dos clips pesan 8 MB juntos (3,0 + 5,0) y antes se bajaban los dos al
   * abrir la página, hubiera o no intención de bajar. Ahora el descenso espera
   * al PRIMER SCROLL: quien abre la home y no se mueve —o la abre para pinchar
   * «Sign in»— se ahorra los 5,0 MB enteros, y quien sí baja todavía tiene ~600px
   * de recorrido por delante antes de que haga falta. Por eso su `preload` es
   * `none` en la plantilla: hasta aquí no se baja ni un byte.
   *
   * 🛑 Y NO se ata a `canplaythrough` del clip de arriba: eso se cumple solo en
   * cualquier conexión decente, así que el descenso se bajaba igual y el ahorro
   * era cero. Medido, 16-sep-2026.
   */
  private readonly primeDescent = () => {
    const video = this.descent?.nativeElement;
    if (!video || this.primed.has(video)) return;
    video.preload = 'auto';
    this.prime(video);
  };

  /** Reintento del arranque de los vídeos si la política del navegador lo pidió. */
  private readonly onFirstTouch = () => {
    this.primeAll();
    window.removeEventListener('touchstart', this.onFirstTouch);
    window.removeEventListener('pointerdown', this.onFirstTouch);
  };

  constructor(
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    private metrics: MetricsService
  ) {}

  ngOnInit(): void {
    // Las cifras se piden ya, aunque el bloque esté tres pantallas más abajo:
    // así están listas cuando el lector llegue y el contador arranca al
    // instante en vez de quedarse en cero esperando la red.
    this.metrics.find().subscribe({
      next: m => this.applyMetrics(m),
      error: () => (this.metricsState = 'unavailable')
    });
  }

  /** Reparte la respuesta del API entre los seis indicadores. */
  private applyMetrics(m: ClarisaMetrics): void {
    const mayor = Math.max(...this.indicators.map(i => m[i.key] ?? 0), 1);

    this.indicators = this.indicators.map(i => ({
      ...i,
      value: m[i.key],
      share: (m[i.key] ?? 0) / mayor
    }));

    this.metricsState = 'ready';

    // Si el bloque ya está a la vista cuando llega el dato, se cuenta ahora.
    if (this.barsVisible()) this.countUp();
  }

  /** ¿El bloque de cifras está dentro de la pantalla? */
  private barsVisible(): boolean {
    const bars = this.bars?.nativeElement;
    if (!bars) return false;
    const rect = bars.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }

  /**
   * Sube las seis cifras desde cero.
   *
   * No es adorno: una cifra que aparece ya escrita se lee como un número pegado,
   * que es justo lo que esto vino a sustituir. Verla contar dice «esto lo
   * acabamos de preguntar».
   *
   * 🛑 Corre FUERA de la zona de Angular y refresca solo esta vista con
   * `detectChanges()`. Sesenta ciclos de detección sobre la home entera para
   * animar un número sería exactamente el tipo de cosa que hace que una página
   * se sienta pesada.
   */
  private countUp(): void {
    if (this.counted || this.metricsState !== 'ready') return;
    this.counted = true;

    const destino = this.indicators.map(i => i.value ?? 0);

    if (this.reduceMotion) {
      this.escribir(destino);
      return;
    }

    const DURACION = 950;
    const inicio = performance.now();

    this.zone.runOutsideAngular(() => {
      const paso = (ahora: number) => {
        const t = Math.min(1, (ahora - inicio) / DURACION);
        // Desacelera al final: los últimos dígitos se leen, no se adivinan.
        const suave = 1 - Math.pow(1 - t, 3);
        this.escribir(destino.map(v => Math.round(v * suave)));
        this.cdr.detectChanges();
        if (t < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    });
  }

  private escribir(valores: number[]): void {
    this.indicators = this.indicators.map((i, n) => ({
      ...i,
      display: valores[n].toLocaleString('en-US')
    }));
  }

  ngAfterViewInit(): void {
    // Con `reduce`, el escenario no se fija y el carril desaparece: se dejan los
    // vídeos quietos en su primer fotograma y no se engancha nada al scroll.
    if (this.reduceMotion) return;

    for (const ref of [this.video, this.descent]) {
      const video = ref?.nativeElement;
      if (!video) continue;

      video.addEventListener('loadedmetadata', () => this.update());

      // Safari: al acabar una búsqueda se atiende el último objetivo pedido
      // mientras estaba ocupado. Sin esto el vídeo se queda un fotograma atrás
      // de forma permanente en cuanto el dedo va rápido.
      video.addEventListener('seeked', () => {
        const target = this.queued.get(video);
        if (target === undefined) return;
        this.queued.delete(video);
        if (Math.abs(target - video.currentTime) > 0.02) {
          video.currentTime = target;
        }
      });
    }

    const sprout = this.video?.nativeElement;
    if (sprout) {
      // El de arriba, ya: es el que se ve en el primer fotograma de la página.
      this.prime(sprout);
    }

    const descent = this.descent?.nativeElement;
    if (descent) {
      // El relevo solo se permite cuando hay algo que enseñar.
      descent.addEventListener('loadeddata', () => {
        if (!this.descentReady) this.zone.run(() => (this.descentReady = true));
      });
    }

    this.zone.runOutsideAngular(() => {
      // El primer gesto de bajar es lo que lo arranca.
      window.addEventListener('scroll', this.primeDescent, { passive: true, once: true });
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onScroll, { passive: true });
      window.addEventListener('orientationchange', this.onScroll, { passive: true });
      window.addEventListener('touchstart', this.onFirstTouch, { passive: true, once: true });
      window.addEventListener('pointerdown', this.onFirstTouch, { passive: true, once: true });
    });

    // 🛑 El primer cálculo va en el siguiente fotograma, no aquí. `update()`
    // escribe `step`, `heroOff` y `underground`, y hacerlo dentro de
    // `ngAfterViewInit` es escribir sobre una vista que Angular acaba de
    // comprobar: `NG0100 ExpressionChangedAfterItHasBeenChecked`. Antes no
    // saltaba solo porque la salida temprana por recorrido negativo lo tapaba.
    requestAnimationFrame(() => this.update());
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
    window.removeEventListener('orientationchange', this.onScroll);
    window.removeEventListener('touchstart', this.onFirstTouch);
    window.removeEventListener('pointerdown', this.onFirstTouch);
    window.removeEventListener('scroll', this.primeDescent);
    this.queued.clear();
    this.primed.clear();
  }

  /**
   * Obliga al navegador a decodificar y bufferear el clip.
   *
   * 🛑 Es lo que hace que el scroll del vídeo funcione en Safari. iOS ignora
   * `preload="auto"` y solo baja los metadatos; `readyState` se queda en 1, y
   * `currentTime` sobre un vídeo sin datos no pinta un solo fotograma. Con
   * `muted` + `playsinline` la reproducción está permitida sin gesto, así que un
   * `play()` seguido de `pause()` arranca la descarga y deja el primer fotograma
   * en pantalla. Si la política lo rechaza igualmente, queda el reintento al
   * primer toque (`onFirstTouch`).
   */
  private prime(video: HTMLVideoElement): void {
    // Sin soporte declarado para el formato no hay nada que precargar — y es
    // además lo que distingue un navegador de verdad de jsdom, donde `play()`
    // no está implementado y solo ensucia la salida de los tests.
    if (this.primed.has(video)) return;
    if (typeof video.canPlayType !== 'function' || !video.canPlayType('video/mp4')) return;
    this.primed.add(video);

    try {
      const started = video.play();
      if (started !== undefined && typeof started.then === 'function') {
        started.then(() => video.pause()).catch(() => undefined);
      } else {
        video.pause();
      }
    } catch {
      // Un navegador que no deja ni intentarlo no debe tumbar el hero.
    }
  }

  private primeAll(): void {
    for (const ref of [this.video, this.descent]) {
      const video = ref?.nativeElement;
      if (video) this.prime(video);
    }
  }

  private update(): void {
    this.ticking = false;

    const rail = this.rail?.nativeElement;
    if (!rail) return;

    // Alto de referencia: el del ESCENARIO, no `window.innerHeight`. Ver nota 4.
    // 🛑 Y se lee en cada pasada, no se cachea. Cachearlo y refrescarlo solo en
    // `resize` deja el valor viejo en cuanto la altura cambia sin ese evento, y
    // entonces el progreso sale disparado: medido, un alto viejo de ~1020 contra
    // una pantalla de 664 daba el crecimiento por terminado a un tercio del
    // recorrido. No cuesta nada: ya se fuerza el cálculo de estilo dos líneas más
    // abajo con `getBoundingClientRect()`.
    const vh = this.stage?.nativeElement?.offsetHeight || window.innerHeight;

    // ---------------------------------------------------------- crecimiento
    // 🛑 Un carril más corto que la pantalla da recorrido negativo. Antes eso
    // hacía `return` aquí mismo y con ello se apagaba TODO lo de abajo: el
    // descenso no arrancaba, `step` no pasaba de 0 y el texto del hero se
    // quedaba encima de la página entera. Pasó en el teléfono, donde el carril
    // medía 65vh contra 100vh de pantalla (JC, 16-sep-2026). Ahora el tramo sin
    // recorrido se resuelve a 0 ó 1 y la función sigue.
    const railTop = rail.getBoundingClientRect().top;
    const travel = rail.offsetHeight - vh;
    const p = travel > 0 ? Math.min(1, Math.max(0, -railTop / travel)) : railTop <= 0 ? 1 : 0;
    this.seek(this.video, p);

    // ------------------------------------------------------------- descenso
    // Bajo tierra el escenario es el mismo; lo único que cambia es qué vídeo se
    // ve y que el scroll vuelve a ser el normal: nada se queda atrapado
    // esperando a que termine el clip.
    const story = this.story?.nativeElement;
    let below = false;
    if (story) {
      const rect = story.getBoundingClientRect();
      const run = story.offsetHeight - vh;
      // El relevo ocurre cuando el contenido de abajo toca el borde superior,
      // que es exactamente el momento en que el crecimiento ya terminó.
      // 🛑 El descenso arranca cuando el contenido ASOMA, no cuando toca arriba.
      // Midiendo desde `-rect.top` el vídeo se quedaba congelado en su primer
      // fotograma toda la subida del bloque: la planta quieta y un hueco donde
      // no pasaba nada (Yeck, 16-sep-2026).
      below = rect.top < vh * 0.88;
      if (run > 0) {
        const q = Math.min(1, Math.max(0, (vh - rect.top) / (vh + run)));
        this.seek(this.descent, q);
      }
    }

    // Las cifras empiezan a contar cuando su bloque asoma, no al cargar: si
    // contaran tres pantallas más arriba, nadie las vería moverse.
    if (!this.counted && this.barsVisible()) {
      this.zone.run(() => this.countUp());
    }

    // El tramo del hero es el último corte que ya hemos pasado.
    let next = 0;
    for (let i = this.CUTS.length - 1; i >= 0; i--) {
      if (p >= this.CUTS[i]) {
        next = i;
        break;
      }
    }

    // Una sola entrada en la zona para los tres estados: el relevo es un
    // instante, no tres ciclos de detección de cambios seguidos.
    if (below !== this.underground || next !== this.step) {
      this.zone.run(() => {
        this.underground = below;
        this.heroOff = below;
        this.step = next;
      });
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
    const target = Math.min(1, Math.max(0, t)) * (video.duration - 0.05);

    // Safari ignora un `currentTime` que llegue con una búsqueda en curso. Se
    // apunta el último y se atiende en `seeked`.
    if (video.seeking) {
      this.queued.set(video, target);
      return;
    }

    this.queued.delete(video);
    video.currentTime = target;
  }
}
