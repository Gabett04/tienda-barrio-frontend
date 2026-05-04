// =============================================
// GENERADOR DE ICONOS PARA PWA
// =============================================

const fs = require('fs');

// Crear un SVG simple que luego podemos usar
const svgIcono = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4CAF50;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#45a049;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="80" fill="url(#grad)"/>
  <text x="256" y="280" font-size="200" text-anchor="middle" fill="white">🏪</text>
</svg>`;

// Guardar el SVG
fs.writeFileSync('img/icon.svg', svgIcono);
console.log('✅ Icono SVG creado en img/icon.svg');
console.log('');
console.log('Para generar PNG:');
console.log('1. Abre img/icon.svg en Chrome');
console.log('2. Haz clic derecho > Guardar como imagen');
console.log('3. O usa un conversor online: https://svgtopng.com');