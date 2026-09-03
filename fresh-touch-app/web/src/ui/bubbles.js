// Animación de burbujas de fondo — puerto directo de la IIFE de app.js de
// HX01 (misma paleta de colores, mismo comportamiento), no importada de
// ahí, reescrita como función exportada para encajar en el módulo de UI.

function initBubbles(containerId = 'bbl') {
  const container = document.getElementById(containerId);
  if (!container) return;
  const cols = ['#5BA3C9', '#1B2A4A', '#3D5166', '#C0571A'];
  for (let i = 0; i < 14; i++) {
    const b = document.createElement('div');
    b.className = 'bbl';
    const sz = 20 + Math.random() * 90;
    b.style.cssText =
      `width:${sz}px;height:${sz}px;left:${Math.random() * 100}%;` +
      `background:${cols[i % 4]};animation-duration:${14 + Math.random() * 18}s;` +
      `animation-delay:-${Math.random() * 20}s;`;
    container.appendChild(b);
  }
}

export { initBubbles };
