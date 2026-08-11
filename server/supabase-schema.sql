-- Folders table for nested folder structure
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shared files table for sharing files with all users or specific users
CREATE TABLE IF NOT EXISTS shared_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_shared_files_file_key ON shared_files(file_key);
CREATE INDEX IF NOT EXISTS idx_shared_files_shared_by ON shared_files(shared_by);
