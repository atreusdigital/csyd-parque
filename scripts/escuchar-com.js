// Escucha un puerto COM e imprime TODO lo que llega (hex + ascii).
// Sirve para descubrir si el lector del molinete manda los dígitos por serie.
//
// Uso (en la PC de la entrada, con el server FRENADO para no pelear por COM1):
//   node scripts/escuchar-com.js                 -> COM1 @ 9600
//   node scripts/escuchar-com.js 19200           -> COM1 @ 19200
//   node scripts/escuchar-com.js 9600 COM3       -> COM3 @ 9600
//
// Pasá un llavero por el lector del molinete y mirá qué aparece.
// Baudrates típicos de lectores: 9600, 19200, 38400, 57600, 115200.

const { SerialPort } = require('serialport');

const baud = Number(process.argv[2] || 9600);
const path = process.argv[3] || 'COM1';

const port = new SerialPort({ path, baudRate: baud, autoOpen: false });

port.open((err) => {
  if (err) {
    console.error(`[ERROR] No se pudo abrir ${path} @ ${baud}: ${err.message}`);
    console.error('Tip: cerrá el server (Ctrl+C) y cualquier otro programa que use el puerto.');
    process.exit(1);
  }
  console.log(`[OK] Escuchando ${path} @ ${baud} baud.`);
  console.log('Pasá un llavero por el lector del molinete... (Ctrl+C para salir)\n');
});

let buffer = [];
let timer = null;

port.on('data', (data) => {
  for (const b of data) buffer.push(b);
  // Agrupa los bytes que llegan juntos (una lectura) y los imprime tras 150ms de silencio.
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    const hex = buffer.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    const ascii = buffer.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '·')).join('');
    console.log(`>> ${buffer.length} bytes`);
    console.log(`   HEX:   ${hex}`);
    console.log(`   ASCII: ${ascii}\n`);
    buffer = [];
  }, 150);
});

port.on('error', (e) => console.error('[ERROR]', e.message));
