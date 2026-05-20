// Test del rele Chillemi CP30 por LINEAS DE CONTROL (DTR/RTS), no por datos.
// Hipotesis: el relé se dispara toggleando DTR o RTS, no mandando bytes.
//
// Uso:  node scripts/test-rele-dtr.js
//
// Comandos (escribi y Enter):
//   dtr1 / dtr0   -> pone DTR en alto / bajo
//   rts1 / rts0   -> pone RTS en alto / bajo
//   pdtr          -> pulso DTR (alto 800ms, luego bajo)  ← simula "abrir puerta"
//   prts          -> pulso RTS (alto 800ms, luego bajo)
//   pdtr0         -> pulso DTR invertido (bajo 800ms, luego alto)  ← por si es activo-bajo
//   prts0         -> pulso RTS invertido
//   pbreak        -> pulso de BREAK en TX (800ms)  ← imita "lo que pasa al conectar el USB"
//   pboth         -> pulso DTR+RTS juntos (800ms)  ← por si necesita las dos lineas
//   barrage       -> prueba las 4 combinaciones con pausas; escucha cual hace clic
//   q             -> salir

const { SerialPort } = require('serialport');
const readline = require('readline');

const PATH = process.env.RELE_PORT || '/dev/cu.usbserial-1130';
const port = new SerialPort({ path: PATH, baudRate: 9600, autoOpen: false });

function setLines(opts, label) {
  port.set(opts, (err) => {
    if (err) console.error('[ERROR]', err.message);
    else console.log(`[SET] ${JSON.stringify(opts)} ${label ? '— ' + label : ''}`);
  });
}

function pulse(line, activeHigh, ms, label) {
  const on = { [line]: activeHigh };
  const off = { [line]: !activeHigh };
  console.log(`\n[PULSO ${label}] ${line}=${activeHigh} por ${ms}ms`);
  port.set(on, (e1) => {
    if (e1) return console.error('[ERROR]', e1.message);
    setTimeout(() => port.set(off, () => console.log(`[PULSO ${label}] fin (${line}=${!activeHigh})`)), ms);
  });
}

function pulseBreak(ms) {
  console.log(`\n[PULSO BREAK] TX en break por ${ms}ms`);
  port.set({ brk: true }, (e1) => {
    if (e1) return console.error('[ERROR]', e1.message);
    setTimeout(() => port.set({ brk: false }, () => console.log('[PULSO BREAK] fin')), ms);
  });
}

function pulseBoth(ms) {
  console.log(`\n[PULSO DTR+RTS] ambas altas por ${ms}ms`);
  port.set({ dtr: true, rts: true }, (e1) => {
    if (e1) return console.error('[ERROR]', e1.message);
    setTimeout(() => port.set({ dtr: false, rts: false }, () => console.log('[PULSO DTR+RTS] fin')), ms);
  });
}

function barrage() {
  console.log('\n=== BARRAGE — escucha PITIDO y CLIC en cada paso (1.8s c/u) ===');
  const steps = [
    () => pulse('dtr', true, 800, 'DTR alto'),
    () => pulse('dtr', false, 800, 'DTR bajo'),
    () => pulse('rts', true, 800, 'RTS alto'),
    () => pulse('rts', false, 800, 'RTS bajo'),
    () => pulseBoth(800),
    () => pulseBreak(800),
  ];
  steps.forEach((fn, i) => setTimeout(fn, i * 1800));
  setTimeout(() => console.log('\n=== BARRAGE terminado ===\n'), steps.length * 1800 + 400);
}

port.open((err) => {
  if (err) { console.error(`[ERROR] No se pudo abrir ${PATH}: ${err.message}`); process.exit(1); }
  console.log(`[OK] Abierto ${PATH} @ 9600`);
  console.log('Empezá con "barrage". Comandos: dtr1 dtr0 rts1 rts0 pdtr prts pdtr0 prts0 barrage q\n');
});
port.on('error', (e) => console.error('[ERROR]', e.message));

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
rl.on('line', (raw) => {
  const c = raw.trim().toLowerCase();
  if (!c) return;
  switch (c) {
    case 'q': case 'quit': case 'exit': port.close(); process.exit(0); break;
    case 'dtr1': setLines({ dtr: true },  'DTR alto'); break;
    case 'dtr0': setLines({ dtr: false }, 'DTR bajo'); break;
    case 'rts1': setLines({ rts: true },  'RTS alto'); break;
    case 'rts0': setLines({ rts: false }, 'RTS bajo'); break;
    case 'pdtr':  pulse('dtr', true,  800, 'DTR'); break;
    case 'prts':  pulse('rts', true,  800, 'RTS'); break;
    case 'pdtr0': pulse('dtr', false, 800, 'DTR inv'); break;
    case 'prts0': pulse('rts', false, 800, 'RTS inv'); break;
    case 'pbreak': pulseBreak(800); break;
    case 'pboth': pulseBoth(800); break;
    case 'barrage': barrage(); break;
    default: console.log('Comando desconocido. Probá: barrage, pdtr, prts, pbreak, pboth, dtr1, dtr0, rts1, rts0, q');
  }
});
