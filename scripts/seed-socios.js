/**
 * Seed de 100 socios realistas.
 * Genera nombres + disciplinas respetando reglas edad/genero del club:
 *   - Cestoball:       4-80 años, F
 *   - Baby Futbol:     4-13 años, M
 *   - Futsal:          7-80 años, M
 *   - Futbol Femenino: 4-80 años, F
 *   - Newcom:          50+ años, M/F
 */

require('dotenv').config();
const { supabase } = require('../db');

const NOMBRES_F = [
  'Maria','Laura','Sofia','Lucia','Martina','Valentina','Camila','Julieta','Mia','Emilia',
  'Rocio','Paula','Antonella','Florencia','Carolina','Victoria','Daniela','Romina','Silvina','Melanie',
  'Brenda','Micaela','Ayelen','Guadalupe','Luciana','Elena','Belen','Agostina','Nadia','Magali',
  'Natalia','Evelyn','Solange','Gisela','Barbara','Monica','Vanesa','Tatiana','Yanina','Celeste',
  'Ivana','Analia','Marina','Patricia','Mercedes','Catalina','Mariana','Constanza','Giuliana','Rosario',
  'Pilar','Bianca','Delfina','Josefina','Morena','Antonia','Ana','Sabrina','Noelia','Gabriela',
];

const NOMBRES_M = [
  'Juan','Carlos','Diego','Pablo','Mateo','Lucas','Tomas','Nicolas','Agustin','Bruno',
  'Gabriel','Federico','Sebastian','Manuel','Javier','Alejandro','Mariano','Joaquin','Francisco','Esteban',
  'Gonzalo','Ignacio','Leonardo','Marcos','Ezequiel','Rodrigo','Santiago','Andres','Fernando','Cristian',
  'Adrian','Hernan','Facundo','Walter','Ariel','Matias','Ramiro','Gustavo','Dario','Martin',
  'Ruben','Emiliano','Lautaro','Alan','Franco','Benjamin','Ivan','Damian','Alejo','Thiago',
  'Enzo','Ramon','Axel','Pedro','Leon','Simon','Nahuel','Maximiliano','Luciano','Leandro',
];

const APELLIDOS = [
  'Gonzalez','Rodriguez','Fernandez','Lopez','Martinez','Garcia','Perez','Sanchez','Romero','Alvarez',
  'Torres','Ruiz','Diaz','Silva','Vargas','Flores','Benitez','Ramos','Molina','Castro',
  'Ortiz','Herrera','Medina','Aguirre','Rojas','Paredes','Acosta','Suarez','Ibanez','Cabrera',
  'Vega','Bravo','Cardozo','Leiva','Rios','Quiroga','Reyes','Sosa','Arias','Gomez',
  'Jimenez','Mendez','Valdez','Carrizo','Soria','Villarreal','Montenegro','Delgado','Mansilla','Caceres',
  'Barrios','Luna','Nunez','Figueroa','Villalba','Mendoza','Espinoza','Varela','Ojeda','Godoy',
  'Maldonado','Escobar','Juarez','Bustos','Farias','Pereyra','Ledesma','Pintos','Tapia','Salinas',
];

// Helpers
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = arr => arr.map(v => [Math.random(), v]).sort((a,b)=>a[0]-b[0]).map(([,v])=>v);

function fechaHaceAnios(minAnios, maxAnios) {
  const hoy = new Date();
  const anios = randInt(minAnios, maxAnios);
  const d = new Date(hoy.getFullYear() - anios, randInt(0, 11), randInt(1, 28));
  return d.toISOString().split('T')[0];
}

function disciplinasPara(edad, genero) {
  const pool = [];
  // Cestoball: 4-80 F
  if (genero === 'F' && edad >= 4 && edad <= 80) pool.push('Cestoball');
  // Baby Futbol: 4-13 M
  if (genero === 'M' && edad >= 4 && edad <= 13) pool.push('Baby Futbol');
  // Futsal: 7-80 M
  if (genero === 'M' && edad >= 7 && edad <= 80) pool.push('Futsal');
  // Futbol Femenino: 4-80 F
  if (genero === 'F' && edad >= 4 && edad <= 80) pool.push('Futbol Femenino');
  // Newcom: 50+ M/F
  if (edad >= 50) pool.push('Newcom');

  if (pool.length === 0) return [];
  const cant = Math.min(pool.length, randInt(1, 2));
  return shuffle(pool).slice(0, cant);
}

function generarSocios(cant = 100) {
  const usedDni = new Set();
  const socios = [];

  for (let i = 0; i < cant; i++) {
    let dni;
    do { dni = String(randInt(25_000_000, 48_000_000)); } while (usedDni.has(dni));
    usedDni.add(dni);

    const rfid = String(10_050_001 + i).padStart(10, '0');

    const genero = Math.random() < 0.5 ? 'F' : 'M';
    const firstName = pick(genero === 'F' ? NOMBRES_F : NOMBRES_M);
    const lastName = pick(APELLIDOS);
    const nombre = `${firstName} ${lastName}`;

    const edad = randInt(4, 85);
    const fecha_nacimiento = fechaHaceAnios(edad, edad);

    let categoria;
    if (edad < 18) categoria = 'Cadete';
    else if (edad >= 65 && Math.random() < 0.25) categoria = 'Vitalicio';
    else if (Math.random() < 0.08) categoria = 'Familiar';
    else categoria = 'Activo';

    let estado_cuota = 'Al dia';
    let saldo = 0;
    if (categoria !== 'Vitalicio' && Math.random() < 0.15) {
      estado_cuota = 'Moroso';
      saldo = -randInt(1, 4) * 18000;
    }

    const disciplinas = disciplinasPara(edad, genero);

    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i+1}@mail.com`;
    const telefono = `11-${randInt(3000, 9999)}-${randInt(1000, 9999)}`;

    const maxAntig = Math.min(15, Math.max(0, edad - 4));
    const fecha_alta = fechaHaceAnios(0, maxAntig);

    socios.push({
      nombre, dni, rfid, categoria, estado_cuota, saldo,
      disciplinas, telefono, email, genero,
      fecha_nacimiento, fecha_alta,
      activo: true,
    });
  }
  return socios;
}

async function main() {
  console.log('→ Borrando socios existentes…');
  const { error: delErr } = await supabase.from('socios').delete().gte('id', 0);
  if (delErr) { console.error(delErr); process.exit(1); }

  console.log('→ Generando 100 socios con reglas edad/genero…');
  const socios = generarSocios(100);

  console.log('→ Insertando en Supabase…');
  const { data, error } = await supabase.from('socios').insert(socios).select('id');
  if (error) { console.error(error); process.exit(1); }
  console.log(`✔ ${data.length} socios creados`);

  const [total, alDia, morosos, vitalicios, cadetes, femenino, masculino] = await Promise.all([
    supabase.from('socios').select('*', { count: 'exact', head: true }),
    supabase.from('socios').select('*', { count: 'exact', head: true }).eq('estado_cuota', 'Al dia'),
    supabase.from('socios').select('*', { count: 'exact', head: true }).eq('estado_cuota', 'Moroso'),
    supabase.from('socios').select('*', { count: 'exact', head: true }).eq('categoria', 'Vitalicio'),
    supabase.from('socios').select('*', { count: 'exact', head: true }).eq('categoria', 'Cadete'),
    supabase.from('socios').select('*', { count: 'exact', head: true }).eq('genero', 'F'),
    supabase.from('socios').select('*', { count: 'exact', head: true }).eq('genero', 'M'),
  ]);

  console.log('\nResumen:');
  console.log(`  Total:       ${total.count}`);
  console.log(`  Al dia:      ${alDia.count}`);
  console.log(`  Morosos:     ${morosos.count}`);
  console.log(`  Vitalicios:  ${vitalicios.count}`);
  console.log(`  Cadetes:     ${cadetes.count}`);
  console.log(`  Femenino:    ${femenino.count}`);
  console.log(`  Masculino:   ${masculino.count}`);
  console.log(`  RFID range:  0010050001 — ${String(10_050_000 + data.length).padStart(10,'0')}`);
}

main().catch(e => { console.error(e); process.exit(1); });
