/**
 * Aplica el tema guardado antes del primer pintado, para que quien vuelve en
 * modo oscuro no vea un destello del claro.
 *
 * Vive en un archivo aparte y no en línea porque la Content-Security-Policy del
 * despliegue usa `script-src 'self'`: permitir scripts en línea para esto
 * abriría la puerta a cualquier otro que alguien lograse inyectar.
 */
;(function () {
  try {
    var stored = localStorage.getItem('theme')
    var dark = stored
      ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches
    if (dark) document.documentElement.classList.add('dark')
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  } catch (e) {
    /* almacenamiento no disponible: se queda en claro */
  }
})()
