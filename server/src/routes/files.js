import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { generateUploadUrl, generateDownloadUrl, listFiles, deleteFile } from '../config/b2.js';
import supabase from '../config/supabase.js';

const router = express.Router();

function getUserFolder(email) {
  return email.replace(/[@.]/g, '_').toLowerCase();
}

async function isFileShared(key, userId) {
  const { data, error } = await supabase
    .from('shared_files')
    .select('id')
    .eq('file_key', key)
    .or(`shared_with.is.null,shared_with.eq.${userId}`)
    .maybeSingle();

  return !!data && !error;
}

router.get('/', authenticate, async (req, res) => {
  try {
    const prefix = req.user.role === 'admin' ? '' : `${getUserFolder(req.user.email)}/`;
    const folderPath = req.query.folderPath || '';
    const fullPrefix = prefix + folderPath;

    const files = await listFiles(fullPrefix);

    const items = files.map((file) => {
      let name, key;
      if (req.user.role === 'admin') {
        key = file.Key;
        name = file.Key;
      } else {
        key = file.Key;
        name = file.Key.replace(prefix, '');
        if (folderPath) {
          name = name.replace(folderPath + '/', '');
        }
      }
      return {
        name,
        size: file.Size,
        lastModified: file.LastModified,
        key,
        isFolder: false,
      };
    }).filter((item) => {
      if (req.user.role !== 'admin') {
        return !item.name.includes('/');
      }
      return true;
    });

    res.json({ files: items });
  } catch (err) {
    console.error('listFiles error:', err);
    res.status(500).json({ error: err.message || 'Failed to list files' });
  }
});

router.post('/upload-url', authenticate, async (req, res) => {
  try {
    const { filename, contentType, folderPath } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const userFolder = getUserFolder(req.user.email);
    const path = folderPath ? `${userFolder}/${folderPath}` : userFolder;
    const key = `${path}/${filename}`;
    const url = await generateUploadUrl(key, contentType || 'application/octet-stream');

    res.json({ url, key });
  } catch (err) {
    console.error('generateUploadUrl error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate upload URL' });
  }
});

router.get('/:key/download', authenticate, async (req, res) => {
  try {
    let key = req.params.key;
    if (req.user.role !== 'admin') {
      const folder = getUserFolder(req.user.email);
      const isOwner = key.startsWith(folder + '/');
      const shared = await isFileShared(key, req.user.id);

      if (!isOwner && !shared) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    const url = await generateDownloadUrl(key);
    res.json({ url });
  } catch (err) {
    console.error('generateDownloadUrl error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate download URL' });
  }
});

router.delete('/:key', authenticate, requireAdmin, async (req, res) => {
  try {
    const key = req.params.key;
    await deleteFile(key);
    res.json({ message: 'File deleted' });
  } catch (err) {
    console.error('deleteFile error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete file' });
  }
});

export default router;
