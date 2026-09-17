/**
 * Lo que publica `GET api/metrics`.
 *
 * 🛑 ESTE OBJETO ES UN CONTRATO PÚBLICO, no una respuesta interna.
 *
 * CLARISA no es una web con un API detrás: es un API que además tiene una web.
 * Lo consumen PRMS, MEL, MARLO, E-Contracts, Foresight y la integración de ToC,
 * y ninguno de ellos avisa antes de leer una clave. De ahí tres reglas que hay
 * que respetar cada vez que se toque este archivo:
 *
 * 1. **Las claves no se renombran ni se quitan.** Añadir una nueva es gratis;
 *    cambiarle el nombre a una existente rompe al que ya la leía, y se entera
 *    en producción. Si una métrica deja de tener sentido, se deja publicada y se
 *    documenta, no se borra.
 *
 * 2. **Ningún conteo es `null` ni falta.** Siempre los seis, siempre `number`.
 *    Hay consumidores en lenguajes sin null-safety —y en TypeScript sin
 *    `strictNullChecks`— donde un `null` inesperado no da un error claro sino un
 *    `NaN` que viaja hasta una pantalla. Si un conteo no se puede calcular, el
 *    endpoint falla ENTERO (o devuelve el último bueno de la caché); lo que no
 *    hace nunca es publicar un cero inventado.
 *
 * 3. **Es aditivo.** Este módulo no toca ni una línea de lo que ya existía: es
 *    una ruta nueva. Ningún endpoint anterior cambia de forma por su culpa.
 */
export class MetricsDto {
  /** Organizaciones del catálogo de instituciones, solo las activas. */
  institutions: number;

  /** Proyectos registrados, bilaterales y de portafolio. */
  projects: number;

  /** Paquetes de trabajo de la herramienta de envío. */
  workPackages: number;

  /** Países del catálogo. */
  countries: number;

  /** Iniciativas registradas. */
  initiatives: number;

  /**
   * Listas de control que CLARISA publica, contadas como los endpoints que
   * aparecen en la documentación pública del API.
   */
  controlLists: number;

  /**
   * Cuándo se calcularon estas cifras, en ISO-8601 UTC.
   *
   * No es adorno: la respuesta se cachea, así que quien la lea puede saber si
   * está viendo un número de hace un minuto o de hace una hora. Y si alguna vez
   * la base de datos falla, la caché sirve el último bueno — esta fecha es la
   * única forma de notarlo desde fuera.
   */
  generatedAt: string;
}
