(function ($) {
  'use strict';

  /**
   * 🛑 Guardado a propósito. El tema construía estos PerfectScrollbar al cargar
   * la página, contando con un layout que el panel ya no tiene: `.app-sidebar`
   * solo existe dentro de una ruta perezosa (la de partner-request) y las otras
   * tres —`.header-dropdown-list`, `.notifications-menu`,
   * `.message-menu-scroll`— no existen en ninguna parte desde el revamp.
   * Sin guarda, cada carga del panel lanzaba
   * «no element is specified to initialize PerfectScrollbar», que no rompe
   * Angular pero llena la consola de rojo y esconde los errores de verdad.
   */
  const attach = selector => {
    if (!document.querySelector(selector)) return null;
    return new PerfectScrollbar(selector, {
      useBothWheelAxes: true,
      suppressScrollX: true,
      suppressScrollY: false,
    });
  };

  attach('.app-sidebar');
  attach('.header-dropdown-list');
  attach('.notifications-menu');
  attach('.message-menu-scroll');
})(jQuery);
