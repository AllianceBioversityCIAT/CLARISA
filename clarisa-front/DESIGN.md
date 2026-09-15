# DESIGN — sistema visual de CLARISA

Cómo se maneja el color, la tipografía y los componentes en `clarisa-front`. Este documento es la
fuente de verdad del diseño y está escrito para poder **dárselo tal cual a quien vaya a implementar**
—persona o agente— sin que tenga que adivinar nada.

Última revisión: 2026-09-15.

---

## 1. Lo que hay hoy, medido

No son impresiones. Cada línea se verificó en el código o en el navegador.

| Hecho | Dónde | Consecuencia |
|---|---|---|
| PrimeNG carga el tema **`lara-light-blue`** | `angular.json:35` | `--primary-color` es **`#3B82F6`, azul**. Toda la librería es azul por dentro |
| El verde se pega componente por componente | `login.component.html`, `horizontal-menu.component.scss:2`, decenas de `style="color:#7ab800"` | Cada pantalla contradice al tema a mano. No hay una sola fuente de color |
| **`1rem = 10px`** | el tema pone `html { font-size: 62.5% }` | Una escala escrita en `rem` aterriza **a la mitad**. Ya pasó: el login salió con inputs de 10px |
| Bootstrap 3 declara `.container:before { display: table }` | `assets/bootstrap/css/bootstrap.css:6465` | Un pseudo-elemento absoluto que herede ese `display` **colapsa a cero** y no se pinta |
| `#7ab800` sobre blanco da **2,42 : 1** | calculado con la fórmula WCAG | No sirve para texto (4,5) ni para texto grande (3,0). Hoy es el color de los enlaces |
| **No hay Tailwind** | no existe `tailwind.config.*`, no está en `package.json` | Meterlo es una decisión nueva, no una continuación. Ver § 5 |
| **No hay linter** en el front | sin script, sin config, sin binario | La verificación real son los tests de Jest y el build |
| La foto del login pesa **7,16 MB** | `assets/images/login-fon.jpg`, 4608×3456 | Es lo primero que descarga quien entra. A 1920px en WebP bajaría de 300 KB |

**Diagnóstico en una frase:** el problema no es que el verde sea feo — es que **no existe un sistema**,
así que cada pantalla repite el color a mano y nadie puede cambiarlo en un solo sitio.

---

## 2. Los tokens: una sola fuente de verdad

Todo el color vive en variables CSS declaradas **una vez** en `src/styles.scss`, en `:root`. Ningún
componente vuelve a escribir un hex.

```scss
:root {
  /* Marca */
  --cl-brand:        #2f6b3f;  /* acento: enlaces, ítem activo, foco */
  --cl-brand-strong: #245732;  /* fondo de botón primario */
  --cl-brand-soft:   #e0eae2;  /* fondo del ítem activo y de los chips */
  --cl-brand-ring:   #bcd2c2;  /* anillo de foco */

  /* Tinta y superficies */
  --cl-ink:      #16241a;      /* títulos */
  --cl-ink-2:    #46514a;      /* cuerpo */
  --cl-ink-3:    #79847c;      /* apoyo, nunca texto importante */
  --cl-surface:  #ffffff;
  --cl-surface-2:#f7f9f6;
  --cl-line:     #d9e0da;

  /* Estado (independiente de la marca) */
  --cl-ok:    #2c6b3c;
  --cl-warn:  #9a6b00;
  --cl-error: #b42318;

  /* Forma */
  --cl-radius-card:    14px;
  --cl-radius-control:  8px;
  --cl-shadow-card: 0 28px 60px -14px rgba(0, 0, 0, 0.62), 0 4px 14px rgba(0, 0, 0, 0.28);
}
```

🛑 **Regla dura:** un hex literal fuera de este bloque es un error de revisión. Si un componente
necesita un color que no está aquí, se agrega aquí primero.

---

## 3. PrimeNG: se recolorea por variables, no componente por componente

Éste es el cambio de fondo. PrimeNG 14 **ya expone sus propias variables CSS** (`--primary-color`,
`--primary-color-text`, `--surface-*`, `--text-color`…), y el tema `lara-light-blue` las define en
azul. Redefinirlas en `styles.scss`, **después** de que el tema cargue, recolorea **toda la librería
de un golpe**: botones, checkboxes, radios, dropdowns, paginadores, pestañas, tablas, calendarios y
todos los estados de foco.

```scss
/* styles.scss — después de los imports del tema */
:root {
  --primary-color:      var(--cl-brand-strong);
  --primary-color-text: #ffffff;
  --text-color:         var(--cl-ink-2);
  --text-color-secondary: var(--cl-ink-3);
  --font-family: 'Poppins', sans-serif;
}
```

**Lo que eso reemplaza:** las decenas de `style="background-color:#7ab800"` y
`style="color:#7ab800"` repartidas por las plantillas. Se borran a medida que se tocan las pantallas;
no hace falta una cacería.

### Reglas para tocar un componente de PrimeNG

1. **Primero se intenta con las variables.** Si el cambio se puede lograr redefiniendo una variable
   del tema, se hace ahí y sirve para toda la aplicación.
2. **Si hay que llegar al interior, se usa `:host ::ng-deep`, nunca `::ng-deep` suelto.** Sin el
   `:host`, la regla se escapa del componente y pisa la aplicación entera.
   ```scss
   :host ::ng-deep .login-card input.p-inputtext { … }   /* bien */
   ::ng-deep .p-inputtext { … }                          /* mal: global disfrazado de local */
   ```
3. **Se acota con una clase propia** (`.login-card`, `.glossary-admin`), no con el selector de
   PrimeNG a secas.
4. **Cero `!important`.** Si hace falta, es que el selector está mal acotado.
5. **El chrome que PrimeNG dibuja y no usamos se oculta, no se rellena.** Ejemplo verificado: el
   `p-panel` del login pintaba una franja gris que era su header vacío — `display: none`, no un
   título de mentira.

### Componentes en uso y su tratamiento

| Componente | Dónde | Tratamiento |
|---|---|---|
| `p-table` | glosario, instituciones, usuarios, roles | Cabecera en `--cl-ink-3` y mayúsculas discretas; filas con línea de 1px, sin cebra; fila expandible para las versiones de un concepto |
| `p-dialog` | formularios y confirmaciones | Radio de tarjeta, cabecera sin fondo de color, pie con el primario a la derecha |
| `p-dropdown` / `p-multiSelect` | filtros y formularios | `[filter]` cuando pasa de 15 opciones; **`[virtualScroll]` cuando pasa de 100** |
| `p-button` | todo | Primario: `--cl-brand-strong` con texto blanco. Secundario: texto con borde. Nunca dos primarios en la misma fila |
| `p-tag` / chips | estados y portafolios | Fondo `--cl-brand-soft`, texto `--cl-ink`. El color de estado sale de `--cl-ok/warn/error`, no de la marca |
| `p-toast` / `ConfirmationService` | avisos | Mensajes en la voz del producto: qué pasó y qué hacer, sin disculpas |

---

## 4. Tipografía

**Poppins**, que la aplicación ya carga (`styles.scss:3`). No se agregan familias sin una razón
escrita: cada una es una descarga más en una pantalla que ya arrastra 7 MB de foto.

Escala **en píxeles, no en `rem`** (ver la trampa del § 1):

| Rol | Tamaño | Peso |
|---|---|---|
| Título de pantalla | 32px | 700 |
| Título de sección | 20px | 600 |
| Cuerpo | 15px | 400 |
| Etiqueta de campo | 14px | 600 |
| **Campo de formulario** | **16px** | 400 |
| Apoyo / metadatos | 13px | 400 |

🛑 **Los 16px del campo son un piso, no un gusto:** por debajo, iOS Safari hace zoom al enfocar y la
pantalla salta bajo el dedo.

---

## 5. Tailwind — decisión pendiente, y cómo entraría sin romper nada

Hoy **no está**. Si se decide meterlo, estas son las condiciones; no son opcionales, porque la
aplicación ya carga Bootstrap 3, CoreUI y PrimeNG, y los tres pelean por los mismos selectores.

```js
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  prefix: 'tw-',              // sin prefijo, `.container` y `.btn` chocan con Bootstrap
  corePlugins: { preflight: false },  // el reset de Tailwind desarma el tema entero
  important: false,           // pelear con !important es perder
  theme: {
    extend: {
      colors: {               // Tailwind consume los tokens, no los duplica
        brand:      'var(--cl-brand)',
        'brand-strong': 'var(--cl-brand-strong)',
        ink:        'var(--cl-ink)'
      }
    }
  }
};
```

- 🛑 **`preflight: false` es obligatorio.** El reset de Tailwind normaliza etiquetas que Bootstrap y
  el tema ya estilan; encendido, desarma la aplicación entera de una.
- 🛑 **`prefix: 'tw-'` es obligatorio.** Sin él, `.container`, `.btn`, `.card` y `.table` de Tailwind
  colisionan con las de Bootstrap 3, que están cargadas globalmente.
- ⚠️ **Tailwind no reemplaza el `::ng-deep`**: el interior de un componente de PrimeNG no se puede
  estilar con clases de utilidad, porque ese marcado no es nuestro. Tailwind sirve para el layout de
  nuestras plantillas; PrimeNG se sigue atendiendo por variables.
- ⚠️ **Y no resuelve el `1rem = 10px`**: la escala de espaciado de Tailwind está en `rem`, así que
  `tw-p-4` daría 10px en vez de 16px. O se configura `spacing` en px, o se acepta que toda la escala
  vale 62,5%.

**Recomendación:** entrar solo si se va a usar de verdad en varias pantallas. Para el login y el
glosario, el SCSS por componente con los tokens hizo el trabajo sin sumar una dependencia.

---

## 6. Reglas duras

1. **Contraste medido, no estimado.** Cuerpo ≥ 4,5 : 1, texto grande ≥ 3,0 : 1, incluidos los
   placeholders y los estados deshabilitados.
2. **El verde de marca no se usa como texto sobre blanco.** Da 2,42. Va como fondo con tinta encima,
   o en un tono profundo.
3. **Píxeles, no `rem`**, mientras el tema mantenga el `62.5%`.
4. **`display: block` explícito en cualquier `::before` / `::after` de un `.container`**, por el
   clearfix de Bootstrap.
5. **Sombra o borde, no los dos** en el mismo elemento.
6. **Radio máximo 16px** en tarjetas; la píldora se reserva para chips y etiquetas, nunca para un
   campo de texto.
7. **Nada se da por bueno sin mirarlo renderizado**, y mirar significa leer el `getComputedStyle`
   cuando hay números de por medio. La captura sola no detecta que 32px salieron en 20.
8. **Móvil a 390px sin scroll horizontal**, siempre.

---

## 7. Prompt para implementar

> Trabajas en `clarisa-front` (Angular 14, PrimeNG 14 con el tema `lara-light-blue`, CoreUI y
> Bootstrap 3 cargados globalmente). Vas a aplicar el sistema visual descrito en `DESIGN.md`.
>
> **Antes de escribir una línea:**
> 1. Lee `DESIGN.md` entero, sobre todo § 1 (las trampas medidas) y § 3 (PrimeNG por variables).
> 2. Levanta el proyecto (`ng serve --port 4400`) y **mira la pantalla que vas a tocar** antes y
>    después. Sin captura mirada no hay "listo".
>
> **Reglas que no se negocian:**
> - Todo color sale de las variables `--cl-*` de `styles.scss`. Un hex literal en un componente es
>   un error.
> - Para recolorear PrimeNG, redefine sus variables (`--primary-color`, `--text-color`…). Solo baja a
>   `:host ::ng-deep .mi-clase .p-componente` cuando la variable no alcance. Nunca `::ng-deep` suelto,
>   nunca `!important`.
> - Tamaños en **píxeles**: en este proyecto `1rem = 10px` y una escala en `rem` sale a la mitad.
> - Los campos de formulario van a **16px** como mínimo.
> - Cualquier `::before` / `::after` sobre un `.container` lleva `display: block` explícito.
> - Contraste: calcula el ratio, no lo estimes. Cuerpo 4,5 : 1.
>
> **Al terminar cada pantalla:**
> - `npx jest --maxWorkers=2` y `npx ng build --configuration development`, ambos verdes con salida
>   real pegada en el reporte.
> - Capturas a 1440px y a 390px, miradas por ti, y una autocrítica de lo que quedó mal antes de
>   decir que quedó bien.
> - Si tocaste texto visible, dilo explícitamente: el texto del producto es decisión de Yeck.

---

## 8. Orden de trabajo sugerido

1. **Tokens en `styles.scss`** y redefinición de las variables de PrimeNG. Cambia toda la aplicación
   de golpe, sin tocar una sola plantilla. Máximo retorno, mínimo riesgo.
2. **Barra pública y sidebar del panel**: son lo que más superficie de color tienen.
3. **Tablas y chips** del panel: es donde se pasan las horas.
4. **Formularios y diálogos**.
5. **Limpieza**: ir borrando los `style="color:#7ab800"` de las plantillas a medida que cada pantalla
   queda cubierta por los tokens.

---

## 9. Lo ya aplicado

**Pantalla de acceso** (`landing-page/pages/login/`), 15-sep-2026:

- La fotografía pasó a atmósfera: `saturate(.82) brightness(.74)`, lavado radial y sombra interior de
  170px. La tarjeta es el único objeto con luz.
- Tarjeta con radio 14px y una sola sombra profunda, sin borde. Oculto el header vacío del `p-panel`.
- El verde salió del texto: la marca, el anillo de foco y el fondo del botón, con tinta encima.
- Inputs sin píldora (8px), con estado de foco real y etiquetas propias.
- Escala corregida a 32/15/14/16/16 px tras descubrir el `1rem = 10px`.

**Pendiente de decisión de Yeck:** la paleta y la línea gráfica definitivas — ver el comparador en
`~/Desktop/clarisa/output/paletas-clarisa.html` (ocho paletas y tres líneas gráficas sobre las tres
superficies reales de la plataforma).
