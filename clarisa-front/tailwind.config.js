/**
 * Tailwind para la documentación pública de API (`src/assets/api-reference/`).
 *
 * 🛑 Esa página es un HTML suelto que vive dentro de un IFRAME, aislada del
 * resto de la aplicación Angular. Por eso aquí Tailwind puede traer su
 * `preflight` sin miedo: no alcanza a `styles.scss` ni a las hojas del tema.
 *
 * 🛑 Y por eso ESTE archivo NO habilita Tailwind en la app Angular. Hacerlo
 * exige apagar `preflight` (`corePlugins: { preflight: false }`) y añadir
 * `src/**\/*.{html,ts}` al `content`: el reset de Tailwind arrasaría con
 * `assets/css/style.css` y `style-landing.css`, que son el tema comprado del
 * que todavía cuelga media plataforma. Cuando se quiera dar ese paso, es esa
 * línea y una revisión pantalla por pantalla, no un cambio de config a ciegas.
 *
 * Se regenera con `npm run build:api-reference-css`, que llama a Tailwind por
 * `npx` en vez de tenerlo como dependencia. 🛑 Y eso NO es pereza:
 * `package.json` y `package-lock.json` tienen que ir sincronizados porque el
 * pipeline instala con `npm ci`, que falla en seco si no lo están. Añadir
 * `tailwindcss` a `devDependencies` arrastra ~25 paquetes nuevos y sube cuatro
 * transitivas que el propio Angular usa (`chokidar`, `fast-glob`, `micromatch`,
 * `picocolors`), y ese lock **no se puede verificar en esta máquina** sin correr
 * un `npm ci` que borraría el `node_modules` que comparten los demás worktrees.
 * Un lock sin verificar no se sube a una rama compartida. La hoja compilada está
 * en el repo, así que nadie necesita la dependencia para que la página funcione;
 * solo hace falta para regenerarla, y `npx` la trae fijada a esa versión.
 *
 * Cuando alguien pueda correr un `npm ci` de verdad, entra a `devDependencies`
 * y el script pierde el `npx`. Eso es un turno de otro día, no un descuido.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./src/assets/api-reference/index.html'],
  theme: {
    extend: {
      // La paleta del revamp (DESIGN.md § 2), no la lima `#7ab800` de antes: la
      // doc era la última pantalla que seguía pintada con el verde viejo, y al
      // lado de la barra y el panel nuevos se leía como otra aplicación
      // (Yeck, 24-sep-2026). Los valores son los mismos tokens `--cl-*` de
      // `styles.scss`, copiados aquí porque esta hoja se compila aparte y no
      // alcanza a leer variables de la app.
      colors: {
        brand: {
          50: '#e3f3ed', // --cl-brand-soft
          100: '#cbe9dc',
          200: '#bde3d4', // --cl-brand-ring
          300: '#7fcbb0',
          400: '#3eaa87',
          500: '#0f8a63', // --cl-brand (4,34 sobre blanco: solo texto grande o iconos)
          600: '#0b7554', // --cl-brand-strong (5,70 con blanco encima)
          700: '#0a6449', // --cl-brand-deep (7,16)
          800: '#08543e', // --cl-brand-deeper (7,80 sobre brand-50)
          900: '#0d3d2e'
        },
        // El armazón de la doc: verde bosque, el color «de familia» que
        // cgiar.org usa como bloque profundo (#033529 medido), y no el carbón
        // del panel de administración, que Yeck pidió reservar para el panel
        // («con otro color para que el sidebar quede más bonito»). Contrastes
        // medidos sobre #0e3328: ink 13,21 · muted 6,99 · dim 5,11 · mint 8,62.
        forest: {
          DEFAULT: '#0e3328',
          2: '#143d31',
          3: '#1a4a3b',
          line: '#1f4a3d',
          ink: '#f4faf7',
          muted: '#a9bdb6',
          dim: '#8aa39a',
          accent: '#5fe3b4'
        },
        ink: {
          DEFAULT: '#10241c', // --cl-ink
          2: '#46524c', // --cl-ink-2 (8,17)
          3: '#79847c' // --cl-ink-3 (3,89: apoyo, nunca texto importante)
        },
        surface: {
          DEFAULT: '#ffffff',
          2: '#f7f9f6'
        },
        line: '#d9e0da',
        state: {
          ok: '#2c6b3c',
          warn: '#9a6b00',
          error: '#b42318'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      borderRadius: {
        card: '14px', // --cl-radius-card
        control: '8px' // --cl-radius-control
      },
      boxShadow: {
        // Un píxel: la tarjeta se despega del fondo lo justo, sin el halo de
        // plantilla que traía la sombra anterior.
        card: '0 1px 2px rgba(16,36,28,.05)',
        pop: '0 12px 32px rgba(16,36,28,.16), 0 2px 8px rgba(16,36,28,.08)'
      }
    }
  }
};
