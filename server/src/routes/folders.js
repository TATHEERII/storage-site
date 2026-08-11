import express from 'express';
import { authenticate } from '../middleware/auth.js';
import supabase from '../config/supabase.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const parentId = req.query.parent_id || null;
    let query = supabase
      .from('folders')
      .select('*')
      .eq('user_id', req.user.id);

    if (parentId) {
      query = query.eq('parent_id', parentId);
    } else {
      query = query.is('parent_id', null);
    }

    const { data: folders, error } = await query.order('name', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ folders });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, parent_id } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const { data: folder, error } = await supabase
      .from('folders')
      .insert([{ name, user_id: req.user.id, parent_id: parent_id || null }])
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ folder });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: folder, error } = await supabase
      .from('folders')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    res.json({ folder });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/path', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const path = [];
    let currentId = id;

    while (currentId) {
      const { data: folder, error } = await supabase
        .from('folders')
        .select('id, name, parent_id')
        .eq('id', currentId)
        .eq('user_id', req.user.id)
        .single();

      if (error || !folder) {
        return res.status(404).json({ error: 'Folder not found' });
      }

      path.unshift({ id: folder.id, name: folder.name });
      currentId = folder.parent_id;
    }

    res.json({ path });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const { data: folder, error } = await supabase
      .from('folders')
      .update({ name, updated_at: new Date() })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select('*')
      .single();

    if (error || !folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    res.json({ folder });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Folder deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
