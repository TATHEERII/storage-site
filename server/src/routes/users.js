import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import authenticate, { requireAdmin } from '../middleware/auth.js';
import supabase from '../config/supabase.js';

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .neq('role', 'admin')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    const { data, error } = await supabase
      .from('users')
      .insert([{ id: userId, email, password_hash: passwordHash, role: role || 'subuser' }])
      .select('id, email, role, created_at')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message || 'User already exists' });
    }

    res.json({ user: data });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
