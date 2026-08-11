export const config = {
  runtime: 'nodejs',
};

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const s3 = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: process.env.R2_REGION,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const R2_BUCKET = process.env.R2_BUCKET;

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

async function authenticate(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

async function generateUploadUrl(key, contentType) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

async function generateDownloadUrl(key) {
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

async function listFiles(prefix = '') {
  const command = new ListObjectsV2Command({
    Bucket: R2_BUCKET,
    Prefix: prefix,
  });
  const response = await s3.send(command);
  return response.Contents || [];
}

async function deleteFile(key) {
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  await s3.send(command);
}

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, role')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Login DB error:', error);
      return res.status(500).json({ error: 'Database error: ' + error.message });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });

    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({ user });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/api/users', authenticate, requireAdmin, async (req, res) => {
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

app.post('/api/users', authenticate, requireAdmin, async (req, res) => {
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

app.delete('/api/users/:id', authenticate, requireAdmin, async (req, res) => {
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

app.get('/api/files', authenticate, async (req, res) => {
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

app.post('/api/files/upload-url', authenticate, async (req, res) => {
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

app.get('/api/files/:key/download', authenticate, async (req, res) => {
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

app.delete('/api/files/:key', authenticate, requireAdmin, async (req, res) => {
  try {
    const key = req.params.key;
    await deleteFile(key);
    res.json({ message: 'File deleted' });
  } catch (err) {
    console.error('deleteFile error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete file' });
  }
});

app.get('/api/folders', authenticate, async (req, res) => {
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

app.post('/api/folders', authenticate, async (req, res) => {
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

app.get('/api/folders/:id/path', authenticate, async (req, res) => {
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

app.get('/api/folders/:id', authenticate, async (req, res) => {
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

app.put('/api/folders/:id', authenticate, async (req, res) => {
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

app.delete('/api/folders/:id', authenticate, async (req, res) => {
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

app.get('/api/shared', authenticate, async (req, res) => {
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

app.post('/api/shared', authenticate, async (req, res) => {
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

app.delete('/api/shared/:id', authenticate, async (req, res) => {
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
