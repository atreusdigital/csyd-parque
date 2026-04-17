require('dotenv').config();
const { supabase } = require('../db');

async function main() {
  const { data, error } = await supabase
    .from('puertas')
    .delete()
    .in('nombre', ['Puerta Pileta', 'Barrera Estacionamiento'])
    .select();

  if (error) { console.error(error); process.exit(1); }
  console.log(`✔ Eliminadas ${data.length} puertas: ${data.map(p => p.nombre).join(', ')}`);

  const { data: restantes } = await supabase.from('puertas').select('*');
  console.log('\nPuertas activas:');
  restantes.forEach(p => console.log(`  • ${p.nombre} (${p.tipo}) — ${p.ubicacion}`));
}

main().catch(e => { console.error(e); process.exit(1); });
