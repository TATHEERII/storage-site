import { useState, useEffect } from 'react';
import { api } from '../api';

export default function FolderTree({ currentFolderId, onSelectFolder, onCreateFolder, onBreadcrumbsChange }) {
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const loadBreadcrumbs = async (folderId) => {
    if (!folderId) {
      setBreadcrumbs([]);
      return;
    }
    try {
      const { path } = await api.getFolderPath(folderId);
      setBreadcrumbs(path || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadFolders = async (parentId) => {
    try {
      const { folders } = await api.listFolders(parentId);
      setFolders(folders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentFolderId) {
      loadBreadcrumbs(currentFolderId);
      loadFolders(currentFolderId);
    } else {
      setBreadcrumbs([]);
      loadFolders(null);
    }
  }, [currentFolderId]);

  useEffect(() => {
    onBreadcrumbsChange?.(breadcrumbs);
  }, [breadcrumbs]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await api.createFolder(newFolderName.trim(), currentFolderId);
      setNewFolderName('');
      setShowForm(false);
      loadFolders(currentFolderId);
      onCreateFolder?.();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <p style={{ color: '#6b7280', padding: '12px' }}>Loading folders...</p>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Folders</h3>
        <button onClick={() => setShowForm(!showForm)} style={styles.addBtn}>
          {showForm ? 'Cancel' : '+ New'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={styles.form}>
          <input
            type="text"
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            style={styles.input}
            autoFocus
          />
          <button type="submit" style={styles.submitBtn}>Create</button>
        </form>
      )}

      <div style={styles.breadcrumbs}>
        <div
          style={{
            ...styles.crumb,
            fontWeight: !currentFolderId ? '600' : '400',
            color: !currentFolderId ? '#111827' : '#6b7280',
          }}
          onClick={() => onSelectFolder(null)}
        >
          🏠 My Files
        </div>
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.id} style={styles.crumb}>
            <span style={{ color: '#9ca3af' }}>/</span>
            <span
              style={{
                ...styles.crumb,
                fontWeight: index === breadcrumbs.length - 1 ? '600' : '400',
                color: index === breadcrumbs.length - 1 ? '#2563eb' : '#6b7280',
              }}
              onClick={() => {
                if (index < breadcrumbs.length - 1) {
                  onSelectFolder(crumb);
                }
              }}
            >
              {crumb.name}
            </span>
          </div>
        ))}
      </div>

      <div style={styles.list}>
        {folders.map((folder) => (
          <div
            key={folder.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: currentFolderId === folder.id ? '#eff6ff' : 'transparent',
              color: currentFolderId === folder.id ? '#2563eb' : '#374151',
              fontWeight: currentFolderId === folder.id ? '600' : '400',
            }}
            onClick={() => onSelectFolder(folder)}
          >
            <span style={{ marginRight: '8px' }}>📁</span>
            {folder.name}
          </div>
        ))}
        {folders.length === 0 && (
          <p style={{ color: '#9ca3af', padding: '12px', fontSize: '13px' }}>
            No subfolders
          </p>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
  },
  addBtn: {
    padding: '4px 12px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px',
  },
  input: {
    flex: '1 1 120px',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    outline: 'none',
    minWidth: 0,
  },
  submitBtn: {
    padding: '8px 12px',
    backgroundColor: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    flexShrink: 0,
  },
  breadcrumbs: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '4px',
    marginBottom: '12px',
    padding: '8px 12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
  },
  crumb: {
    cursor: 'pointer',
    fontSize: '13px',
    padding: '2px 4px',
    borderRadius: '4px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
};
