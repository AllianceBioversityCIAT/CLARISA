import { Component, HostBinding, NgZone, OnDestroy, OnInit } from '@angular/core';

/**
 * Barra pública «N4 · blanca con costilla», con dos comportamientos añadidos
 * para que conviva con el recorrido de la home.
 *
 * 1. **Se aparta al bajar y vuelve al subir.** Sobre un hero que ocupa la
 *    pantalla entera, una barra fija le roba 73px al vídeo todo el rato; y sin
 *    barra no hay forma de salirse del recorrido. El gesto de subir un poco es
 *    el que la gente ya usa para «quiero el menú».
 * 2. **Se oscurece mientras está sobre el recorrido.** La barra es blanca, y
 *    blanco sólido sobre un vídeo oscuro es un tajo. Mientras hay escenario
 *    detrás se vuelve tinta translúcida con desenfoque; al salir del recorrido
 *    recupera su blanco de siempre. El cambio va con transición, no de golpe
 *    (Yeck, 16-sep-2026: «que no le cambie el color tan fuerte»).
 *
 * 🛑 La barra no sabe nada del componente del hero: pregunta por `.cl-page` en
 * el documento. Si esa sección no existe —cualquier otra página del landing— se
 * queda blanca y fija, exactamente como antes.
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

  private lastY = 0;
  private ticking = false;

  /** Por debajo de esto no se esconde nunca: arriba del todo siempre está. */
  private readonly KEEP = 90;

  /** Un temblor de rueda no cuenta como intención de ver el menú. */
  private readonly NOISE = 6;

  private readonly onScroll = () => {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => this.update());
  };

  constructor(private zone: NgZone) {}

  ngOnInit(): void {
    this.lastY = window.scrollY;
    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onScroll, { passive: true });
    });
    this.update();

    // 🛑 En el primer `update` la barra ya existe pero el hero todavía no: se
    // construye después, y `.cl-page` devuelve null. Sin este segundo pase la
    // barra arrancaba blanca sobre el vídeo hasta el primer scroll.
    requestAnimationFrame(() => this.update());
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onScroll);
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
