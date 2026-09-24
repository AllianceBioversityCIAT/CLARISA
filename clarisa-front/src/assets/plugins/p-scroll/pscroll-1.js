(function ($) {
  'use strict';

  // 🛑 Misma guarda que en `pscroll.js`: `.sidebar-right` no existe en el panel
  // desde el revamp, y sin comprobarlo PerfectScrollbar tira un error en cada
  // carga. Ver la nota larga en ese archivo.
  if (!document.querySelector('.sidebar-right')) return;

  return new PerfectScrollbar('.sidebar-right', {
    useBothWheelAxes: true,
    suppressScrollX: true,
  });
})(jQuery);
