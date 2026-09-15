# DESIGN — pantalla de acceso

Decisiones visuales del login (`src/app/landing-page/pages/login/`), 15-sep-2026.

## El problema

La fotografía corría a plena fuerza detrás del formulario —cada tallo enfocado, saturación
completa— y encima se apoyaba un rectángulo blanco plano, sin sombra ni radio. El ojo no tenía
dónde descansar y el formulario no se leía como el sujeto de la pantalla. El título, además, era
`#7ab800` sobre blanco: **2,3:1** de contraste, el elemento más grande y el menos legible.

Leía como *landing de organización agrícola con un formulario encima*. Debe leer como **pantalla de
acceso de una herramienta institucional**.

## Decisiones

| Qué | Cómo | Por qué |
|---|---|---|
| Fotografía | `saturate(.82) brightness(.74)` + lavado radial + `box-shadow` interior de 170px | Queda como atmósfera. Se reconoce el cultivo, pero deja de competir |
| Tarjeta | radio 14px, `box-shadow` profunda, **sin borde** | Una cosa o la otra, nunca sombra difusa + borde de 1px |
| Verde de marca | Acento: línea "CLARISA", foco y fondo del botón | Sobre blanco no llega a 3:1; como fondo con tinta encima llega a 7,2:1 |
| Botón | Verde `#7ab800` a ancho completo con tinta `#12200a` | Blanco sobre ese verde da 2,4:1 y falla. Es la decisión visual comprometida de la pantalla |
| Inputs | radio 8px, borde `#ccd5cd`, foco con halo verde | La píldora en un campo de texto es el tic que databa la pantalla |
| Tipografía | **Poppins**, la que la app ya carga (`styles.scss:3`) | Cero fuentes nuevas: nada que verificar, nada que descargar de más |
| Jerarquía | `CLARISA` (línea de marca) → `Sign in` (h1) → subtítulo | El `h2` de dos líneas se comía el ancho y no decía qué hacer |

## Trampa encontrada

🛑 El tema Bootstrap 3 que vive en `assets/` declara el clearfix `.container:before { display: table }`.
Un pseudo-elemento absoluto que herede ese `display` **colapsa a cero** y no se pinta nunca. Por eso
las capas de la fotografía llevan `display: block` explícito. Sin eso, el fondo se ve negro plano y
parece que el overlay está mal calibrado.

## Pendiente

⚠️ `assets/images/login-fon.jpg` pesa **7,16 MB** (4608×3456). Es lo primero que descarga quien entra
a la plataforma. Redimensionar a ~1920px y convertir a WebP la dejaría bajo 300 KB sin diferencia
visible a este tamaño. No se tocó: es un binario del repo y no era lo pedido.
