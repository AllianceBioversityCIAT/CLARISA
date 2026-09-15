# DESIGN — sistema visual de CLARISA

Cómo se maneja el color, la tipografía y los componentes en `clarisa-front`. Este documento es la
fuente de verdad del diseño y está escrito para poder **dárselo tal cual a quien vaya a implementar**
—persona o agente— sin que tenga que adivinar nada.

Última revisión: 2026-09-15.

---

## 0. Lo decidido

| Decisión | Elegido | Fecha |
|---|---|---|
| Paleta | **Menta** — acento `#0f8a63`, fuerte `#0b7554`, **barra de marca `#0a6449`** | 2026-09-15 |
| Barra de navegación | ~~N2 · De marca~~ → **N4 · Blanca con costilla** (barra blanca, hairline, costilla de 6px en `--cl-brand-deep` pegada al borde izquierdo) | 2026-09-15 |
| Pantalla de acceso | **L1 · Panel partido** (panel de marca con la marca translúcida a la izquierda, formulario sobre blanco) | 2026-09-15 |
| Sidebar | **S3 · Agrupada por secciones** (`Administrar / Acceso / Sistema`) | 2026-09-15 |
| Campos | **I1 · Borde completo**, radio 8px | 2026-09-15 |
| Tabla | **T2 · Cebra** | 2026-09-15 |
| Tratamiento del activo | **Pastilla suave** — `--cl-brand-soft` con `--cl-brand-deeper` encima, 7,80 | 2026-09-15 |

🛑 **La decisión de «barra de marca» se cayó, y conviene saber por qué.** El 15-sep se eligió N2, la
barra entera en color. Cinco variantes de encendido del activo sobre esa barra no convencieron
(«muy planas, como institucional»), y al replantear el encabezado completo Yeck eligió **N4, la barra
blanca**. El menta sigue siendo la paleta; lo que cambió es que el encabezado ya no es su soporte.

🛑 **Y el motivo de fondo es el logo.** El CGIAR tiene **dos** verdes, los dos medidos muestreando los
píxeles de los archivos del repositorio: la marca suelta (`assets/cgiar_logo.png`) es verde bosque
`#387828` y la caja (`assets/images/CGIAR_Fondo_verde.png`) es lima `#78b800`.

| Par | Ratio | |
|---|---|---|
| marca verde sobre blanco | **5,40** | ✓ es el que se usa |
| marca verde sobre la barra menta `#0a6449` | **1,33** | ✕ desaparece |
| caja lima sobre la barra menta | **2,95** | ✕ |
| caja lima sobre tinta `#0d3d2e` | 5,02 | ✓ única salida de la caja |
| **blanco sobre el lima — el logo publicado hoy** | **2,43** | ✕ falla por dentro, sin importar el fondo |

Por eso el encabezado usa la **marca transparente sobre blanco**, no la caja lima colgante.

🛑 **El acento no puede ser el fondo de la barra.** `#0f8a63` con blanco encima da **4,34**, por debajo
del 4,5 exigido. La barra de marca va en `#0a6449` (**7,16**), que es el mismo verde dos pasos más
profundo. El acento claro se reserva para los estados activos sobre fondo blanco, donde sí funciona.

---

## 0b. Cómo se hace una propuesta de rediseño aquí

El formato que funcionó, para repetirlo tal cual en el siguiente componente:

1. **Medir antes de dibujar.** Contraste con la fórmula WCAG y `getComputedStyle` sobre lo que ya
   existe. Un número estimado invalida la propuesta entera.
2. **Una página HTML local** (`output/*.html`), no capturas sueltas: se abre con doble clic, se manda
   por correo y se compara de un vistazo.
3. **Cinco variantes, cinco ideas distintas** — no cinco matices del mismo gesto. Si dos se pueden
   describir con la misma frase, sobra una.
4. **Cada variante sobre la superficie real**, con contenido real de CLARISA (los cinco ítems del
   menú, términos del glosario, los chips P22/P25), nunca con texto de relleno.
5. **Cada variante dice su costo, no solo su virtud.** «A cambio, con cinco secciones el menú se
   llena de color» vale más que tres adjetivos.
6. **El contraste medido se muestra en la propia tarjeta**, para que la elección sea por gusto y no
   por riesgo.
7. **Mirar el resultado renderizado y criticarlo** antes de entregarlo. Dos rondas mínimo.

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
| El tema **no lee sus propias variables**: `var(--primary-color)` aparece **0 veces** en `theme.css` y en `primeng.min.css` | medido sobre `lara-light-blue` | El acento está escrito como hex literal **335 veces**. Redefinir `--primary-color` no recolorea nada |
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
  --cl-brand:        #0f8a63;  /* acento: enlaces y foco sobre blanco */
  --cl-brand-strong: #0b7554;  /* fondo de botón primario */
  --cl-brand-deep:   #0a6449;  /* barra de marca y hover: 7,16 con blanco encima */
  --cl-brand-deeper: #08543e;  /* texto de resalte sobre --cl-brand-soft: 7,80 */
  --cl-brand-soft:   #e3f3ed;  /* fondo del ítem activo y de los chips */
  --cl-brand-ring:   #bde3d4;  /* anillo de foco */

  /* Tinta y superficies */
  --cl-ink:      #10241c;      /* títulos */
  --cl-ink-2:    #46524c;      /* cuerpo */
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

## 3. PrimeNG: se recolorea en el tema, no por variables

🛑 **Este apartado decía lo contrario y estaba equivocado.** La versión anterior daba por hecho que
redefinir `--primary-color` en `styles.scss` recolorearía la librería entera de un golpe. Se midió y
es falso para PrimeNG 14:

```
grep -c 'var(--primary-color)' node_modules/primeng/resources/themes/lara-light-blue/theme.css  -> 0
grep -c 'var(--primary-color)' node_modules/primeng/resources/primeng.min.css                   -> 0
grep -oiE '#3B82F6|#2563EB|#1D4ED8|#BFDBFE|#EFF6FF' theme.css | wc -l                           -> 335
```

El tema **declara** esas variables en su `:root` para que las consuma quien quiera, pero **él no las
usa**: escribe el azul como hex literal 335 veces. Redefinirlas habría dejado la aplicación azul y
la Fase 1 habría parecido hecha sin haber cambiado un pixel.

**Lo que sí funciona:** el azul del tema son exactamente **cinco tonos** de una rampa, y cada uno
tiene un papel único. Se remapean a la rampa Menta y con eso cambia toda la librería —botones,
checkboxes, radios, dropdowns, paginadores, pestañas, tablas, calendarios y todos los estados de
foco—, de forma verificable por conteo.

| Azul | Papel en el tema | Menta | Contraste medido |
|---|---|---|---|
| `#3B82F6` ×108 | superficie primaria y texto de marca | `--cl-brand-strong` `#0b7554` | **5,70** con blanco encima (el azul daba **3,68**, que no pasaba) |
| `#2563EB` ×26 | superficie de *hover* | `--cl-brand-deep` `#0a6449` | 7,16 con blanco encima |
| `#1D4ED8` ×78 | texto de resalte sobre la superficie suave | `--cl-brand-deeper` `#08543e` | **7,80** sobre `#e3f3ed` (el azul daba 6,16) |
| `#BFDBFE` ×80 | anillo de foco | `--cl-brand-ring` `#bde3d4` | — |
| `#EFF6FF` ×43 | superficie de resalte | `--cl-brand-soft` `#e3f3ed` | — |

El remapeo lo hace `scripts/generate-primeng-theme.js`, que escribe
`src/themes/clarisa-light-mint/theme.css`; `angular.json` carga ese archivo en lugar del del paquete.
El resultado se versiona.

🛑 **Actualizar PrimeNG devuelve el azul en silencio**, porque nada más en el build define el acento.
Por eso el archivo generado tiene un test que lo regenera y lo compara
(`src/themes/clarisa-light-mint/theme.spec.ts`): tras un `npm update`, el paso es
`npm run theme:build` y la suite vuelve a verde.

⚠️ **`--primary-color` sigue importando**, pero para *nuestro* código: el tema generado la exporta ya
en menta (`--primary-color:#0b7554`), así que cualquier SCSS propio que la lea recibe la marca.

### Reglas para tocar un componente de PrimeNG

1. **Primero se mira si ya lo resuelve el tema generado.** El acento, el hover, el resalte y el
   anillo de foco ya salen en menta de `src/themes/clarisa-light-mint/`. Si lo que falta es otro tono
   de la rampa, se agrega al mapa de `scripts/generate-primeng-theme.js` — nunca componente por
   componente.
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

### Lo que decide la pregunta, medido (15-sep-2026)

Se preguntó otra vez si no sería más fácil con Tailwind. Se midió sobre este repositorio:

| Hecho | Número | Consecuencia |
|---|---|---|
| Selectores de **2 o más niveles** en las hojas globales | **468** en `style-landing.css` (de 609 bloques, el **77 %**) y **461** en `bootstrap.css` | Una utilidad de Tailwind es **una sola clase: 0,1,0**. Contra `.navbar-default .navbar-nav > li > a` (0,2,2) **pierde siempre** |
| Clases de Bootstrap 3 que Tailwind reutiliza con el mismo nombre | `.container`, `.hidden`, `.table` | `prefix: 'tw-'` deja de ser recomendación y pasa a ser obligatorio |
| Angular / builder | 14 con `@angular-devkit/build-angular` 14 | Tailwind **v3** sí; **v4 no**, pide un pipeline más nuevo que este builder |
| `postcss` y `autoprefixer` | no están en `package.json` | Entran como dependencias nuevas junto a Tailwind |

**Y la barra pública es el caso de prueba:** lo que costó trabajo no fue escribir color, fue **ganarle
a reglas globales de 2 y 3 niveles** y esquivar un `display: block !important` de Bootstrap. Tailwind
no resuelve ninguna de las dos: para la primera haría falta `important: true` —que es peor que lo que
hay— y contra la segunda pierde igual.

**Recomendación:** entrar solo si se va a usar de verdad en varias pantallas. Para el login, el
glosario y la barra, el SCSS por componente con los tokens hizo el trabajo sin sumar una dependencia.
Lo que sí haría fácil el revamp es **sacar Bootstrap 3 del landing**, que es quien pone los `!important`
y los selectores de tres niveles — pero eso es un proyecto aparte, no un `npm install`.

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

**Tema de PrimeNG en menta** (Fase 1 del apartado 8), 15-sep-2026:

- `src/themes/clarisa-light-mint/theme.css`, generado desde el del paquete con
  `npm run theme:build`. `angular.json:35` ya no apunta a `lara-light-blue`.
- Tokens `--cl-*` declarados en `styles.scss`. El bundle compilado tiene **0** tonos del azul de
  PrimeNG y 340 del menta.
- El login pasó del lima `#7ab800` a la paleta decidida: fondo `--cl-brand-strong` con blanco encima
  (5,70, donde el lima obligaba a poner tinta oscura porque el blanco daba 2,4), borde de foco
  `--cl-brand` y anillo `--cl-brand-ring`. El componente ya no declara **ningún** hex de marca.
- Verificado en el navegador con `getComputedStyle`, no solo por captura: botón `#0b7554` sobre
  blanco a 52px de alto y 16px de texto, anillo `rgb(189,227,212)`, `html` en 10px (la trampa del
  `62.5%` sigue viva).

**Barra pública** (`landing-page/components/navigation-bar/`), 15-sep-2026 — «N4 · blanca con costilla»:

- Barra blanca de 73px con hairline y una costilla de 6px en `--cl-brand-deep` pegada al borde izquierdo.
- La caja lima colgante de 120px se retiró: ahora van la marca transparente a 36px y el wordmark
  **CLARISA** en tinta. El logo dejó de colgar por debajo de la barra.
- Enlaces en `--cl-ink-2` sobre blanco (**8,17**, donde el lima daba 2,42) y en caja baja: las
  mayúsculas venían del tema viejo y costaban ancho sin aportar jerarquía.
- La sección actual se marca con la **pastilla suave** (`--cl-brand-soft` + `--cl-brand-deeper`,
  **7,80**), resuelta con `routerLinkActive` sobre el `<li>` para que el padre se encienda cuando la
  ruta activa está dentro de su submenú.
- **Sign in** nuevo: botón sólido `--cl-brand-strong` con blanco (**5,70**) al extremo derecho.
- Submenús con radio de tarjeta, sombra y pastilla suave al pasar; se apagaron las reglas lima y la
  barra blanca deslizante que dibujaba el tema global.
- 🛑 **El botón vive fuera de `.navbar-collapse` a propósito.** A ≥768px Bootstrap fuerza
  `.navbar-collapse.collapse { display: block !important }`, así que nada dentro puede participar de
  una fila flex: en el primer render el botón se cayó a una segunda línea. Como hijo directo de la
  barra queda anclado a la derecha y en celular sigue visible junto al hamburguesa.
- Todo el trabajo se hace desde el SCSS del componente con `:host`, sin tocar
  `assets/css/style-landing.css` (global y compartido) y **sin un solo `!important`**.

⚠️ **Lo que quedó fuera a propósito:** el `.container` de Bootstrap deja 174px de margen a cada lado
en 1440px. Ensancharlo mejoraría el aprovechamiento, pero afecta a todas las secciones de la página,
no solo al encabezado.

🛑 **Lo que sigue en el lima viejo:** la barra pública y todo lo que arrastra `style="color:#7ab800"`
en las plantillas. En la pantalla de acceso se ve el choque de los dos verdes en la misma captura.
Es la Fase 2 del apartado 8 y está esperando la decisión de la barra.
