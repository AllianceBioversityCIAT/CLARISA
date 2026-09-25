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
      // La paleta de la marca, la misma que declaraba el `tailwind.config` en
      // línea que había dentro del HTML cuando esto se servía por CDN.
      colors: {
        leaf: {
          50: '#f7fbe9',
          100: '#ebf4d9',
          200: '#d8eaae',
          300: '#bcdb78',
          400: '#a0c94a',
          500: '#7ab800',
          600: '#669a00',
          700: '#4e7600',
          800: '#405e06',
          900: '#37500a'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      boxShadow: {
        card: '0 1px 2px rgba(7,39,74,.06), 0 4px 16px rgba(7,39,74,.07)',
        pop: '0 8px 30px rgba(7,39,74,.14)'
      }
    }
  }
};
