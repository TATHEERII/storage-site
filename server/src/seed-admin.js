import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const passwordHash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('users')
    .upsert([{ email, password_hash: passwordHash, role: 'admin' }], { onConflict: ['email'] })
    .select('id, email, role')
    .single();

  if (error) {
    console.error('Error seeding admin:', error.message);
    process.exit(1);
  }

  console.log('Admin user created:', data);
}

seedAdmin();
