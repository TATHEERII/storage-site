import express from 'express';
import { authenticate } from '../middleware/auth.js';
import supabase from '../config/supabase.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { data: sharedFiles, error } = await supabase
      .from('shared_files')
      .select('*')
      .or(`shared_with.is.null,shared_with.eq.${req.user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const enriched = await Promise.all(
      sharedFiles.map(async (sf) => {
        const { data: sharer } = await supabase
          .from('users')
          .select('email')
          .eq('id', sf.shared_by)
          .single();
        return { ...sf, shared_by_email: sharer?.email || 'Unknown' };
      })
    );

    res.json({ sharedFiles: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { file_key, file_name, shared_with } = req.body;

    if (!file_key || !file_name) {
      return res.status(400).json({ error: 'File key and name are required' });
    }

    const { data: sharedFile, error } = await supabase
      .from('shared_files')
      .insert([{
        file_key,
        file_name,
        shared_by: req.user.id,
        shared_with: shared_with || null,
        is_public: !shared_with
      }])
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ sharedFile });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('shared_files')
      .delete()
      .eq('id', id)
      .eq('shared_by', req.user.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Share removed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
