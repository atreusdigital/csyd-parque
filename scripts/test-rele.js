// Explorador del rele Chillemi via USB-serie.
// Uso:  node scripts/test-rele.js
//
// Comandos interactivos (escribi y Enter):
//   1            -> envia 0x01
//   0            -> envia 0x00
//   on / off     -> envia "ON\r\n" / "OFF\r\n"
//   abre         -> envia "ABRE\r\n"
//   pulso        -> envia 0xA0 0x01 0x01 0xA2 (Songle/Sainsmart 1ch)
//   pulso2       -> envia 0xA0 0x01 0x00 0xA1 (apagar)
//   text:XXX     -> envia el string XXX + \r\n
//   hex:01 02 FF -> envia bytes en hex
//   baud:19200   -> reabre el puerto a otro baudrate (9600,19200,38400,57600,115200)
//   barrage      -> dispara una bateria de comandos comunes con 1s entre cada uno;
//                   miralo/escuchalo y deci cual hizo clic
//   q            -> salir
//
// Lo que llegue desde el rele se imprime en hex y ascii.

const { SerialPort } = require('serialport');
const readline = require('readline');

const PATH = process.env.RELE_PORT || '/dev/cu.usbserial-1130';
let baud = Number(process.env.RELE_BAUD || 9600);
let port;

function openPort(b) {
  if (port && port.isOpen) {
    port.close(() => openPort(b));
    return;
  }
  baud = b;
  port = new SerialPort({ path: PATH, baudRate: b, autoOpen: false });
  port.open((err) => {
    if (err) {
      console.error(`[ERROR] No se pudo abrir ${PATH} @ ${b}: ${err.message}`);
      return;
    }
    console.log(`[OK] Abierto ${PATH} @ ${b} baud`);
  });
  port.on('data', (buf) => {
    const hex = [...buf].map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const ascii = [...buf].map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('');
    console.log(`[RX] hex=${hex}  ascii=${ascii}`);
  });
  port.on('error', (e) => console.error(`[ERROR] ${e.message}`));
}

function send(bytes, label) {
  if (!port || !port.isOpen) {
    console.error('[ERROR] Puerto no abierto');
    return;
  }
  const buf = Buffer.from(bytes);
  port.write(buf, (err) => {
    if (err) console.error(`[ERROR] write: ${err.message}`);
    else {
      const hex = [...buf].map((b) => b.toString(16).padStart(2, '0')).join(' ');
      console.log(`[TX${label ? ' ' + label : ''}] hex=${hex}  (${buf.length} bytes)`);
    }
  });
}

function barrage() {
  const seq = [
    { label: '0x01',        bytes: [0x01] },
    { label: '0x00',        bytes: [0x00] },
    { label: '0xFF',        bytes: [0xFF] },
    { label: 'ON\\r\\n',    bytes: Buffer.from('ON\r\n') },
    { label: '1\\r\\n',     bytes: Buffer.from('1\r\n') },
    { label: 'ABRE\\r\\n',  bytes: Buffer.from('ABRE\r\n') },
    { label: 'A',           bytes: Buffer.from('A') },
    { label: 'R',           bytes: Buffer.from('R') },
    { label: 'Songle ON',   bytes: [0xA0, 0x01, 0x01, 0xA2] },
    { label: 'Songle OFF',  bytes: [0xA0, 0x01, 0x00, 0xA1] },
    { label: 'AT+CH1=1\\r\\n', bytes: Buffer.from('AT+CH1=1\r\n') },
  ];
  console.log('\n--- BARRAGE: 1 comando por segundo, escucha el rele ---');
  seq.forEach((s, i) => {
    setTimeout(() => {
      console.log(`\n[#${i + 1}] Probando: ${s.label}`);
      send(s.bytes);
    }, i * 1500);
  });
  setTimeout(() => console.log('\n--- BARRAGE terminado ---'), seq.length * 1500 + 500);
}

openPort(baud);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
console.log('\nEscribi comandos (ver header del archivo). Empezamos en 9600 baud.');
console.log('Tip: empeza con "barrage" para ver si algun comando comun lo activa.\n');

rl.on('line', (raw) => {
  const line = raw.trim();
  if (!line) return;
  if (line === 'q' || line === 'quit' || line === 'exit') { rl.close(); port?.close(); process.exit(0); }
  if (line === '1') return send([0x01], '0x01');
  if (line === '0') return send([0x00], '0x00');
  if (line === 'on')   return send(Buffer.from('ON\r\n'), 'ON');
  if (line === 'off')  return send(Buffer.from('OFF\r\n'), 'OFF');
  if (line === 'abre') return send(Buffer.from('ABRE\r\n'), 'ABRE');
  if (line === 'pulso')  return send([0xA0, 0x01, 0x01, 0xA2], 'Songle ON');
  if (line === 'pulso2') return send([0xA0, 0x01, 0x00, 0xA1], 'Songle OFF');
  if (line === 'barrage') return barrage();
  if (line.startsWith('text:')) return send(Buffer.from(line.slice(5) + '\r\n'), 'text');
  if (line.startsWith('hex:')) {
    const bytes = line.slice(4).trim().split(/\s+/).map((h) => parseInt(h, 16));
    if (bytes.some(isNaN)) return console.error('[ERROR] hex invalido');
    return send(bytes, 'hex');
  }
  if (line.startsWith('baud:')) {
    const b = Number(line.slice(5));
    if (!b) return console.error('[ERROR] baudrate invalido');
    return openPort(b);
  }
  console.log('Comando desconocido. Probá: 1, 0, on, off, abre, pulso, pulso2, barrage, text:XXX, hex:01 02, baud:19200, q');
});
