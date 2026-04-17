const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en .env');
}

const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false }
});

module.exports = { supabase };
