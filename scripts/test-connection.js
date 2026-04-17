require('dotenv').config();
const { supabase } = require('../db');

async function main() {
  console.log('→ Probando conexión a Supabase…\n');

  const tablas = ['socios', 'cuotas', 'accesos', 'puertas', 'gastos', 'ingresos', 'alquileres'];
  let ok = true;

  for (const t of tablas) {
    const { count, error } = await supabase
      .from(t)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`  ✗ ${t.padEnd(12)} ERROR: ${error.message}`);
      ok = false;
    } else {
      console.log(`  ✓ ${t.padEnd(12)} ${count} registros`);
    }
  }

  console.log(ok ? '\n✅ Todo OK — conexión y schema funcionando' : '\n❌ Hay errores arriba');
  process.exit(ok ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
