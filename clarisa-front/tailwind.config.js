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
 * Se regenera con `npm run build:api-reference-css`.
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
