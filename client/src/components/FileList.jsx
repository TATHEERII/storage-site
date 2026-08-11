import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../hooks/useAuth';

export default function FileList({ folderPath, currentFolderId, onNavigateFolder, onUploadComplete }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadItems = async () => {
    try {
      const [filesRes, foldersRes] = await Promise.all([
        api.listFiles(folderPath || ''),
        currentFolderId ? api.listFolders(currentFolderId) : Promise.resolve({ folders: [] }),
      ]);

      const folders = (foldersRes.folders || []).map((f) => ({
        ...f,
        isFolder: true,
      }));

      const files = (filesRes.files || []).map((f) => ({
        ...f,
        isFolder: false,
      }));

      setItems([...folders, ...files]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [folderPath, currentFolderId]);

  const handleDownload = async (fileKey) => {
    try {
      const { url } = await api.getDownloadUrl(fileKey);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileKey.split('/').pop();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleDelete = async (fileKey) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      await api.deleteFile(fileKey);
      setItems(items.filter((f) => f.key !== fileKey));
      onUploadComplete?.();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleShare = async (file) => {
    try {
      await api.shareFile(file.key, file.name, null);
      alert('File shared successfully');
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  if (loading) return <p style={{ color: '#6b7280' }}>Loading...</p>;

  if (items.length === 0) {
    return <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0' }}>This folder is empty</p>;
  }

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Size</th>
            <th style={styles.th}>Modified</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.key || item.id}
              style={styles.tr}
              onDoubleClick={() => item.isFolder && onNavigateFolder?.(item)}
            >
              <td style={styles.td}>
                <span style={{ cursor: item.isFolder ? 'pointer' : 'default' }}>
                  {item.isFolder ? '📁 ' : '📄 '}
                  {item.isFolder ? item.name : item.name}
                </span>
              </td>
              <td style={styles.td}>{item.isFolder ? '-' : formatSize(item.size)}</td>
              <td style={styles.td}>{item.isFolder ? formatDate(item.created_at) : formatDate(item.lastModified)}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>
                {!item.isFolder && (
                  <>
                    <button onClick={() => handleDownload(item.key)} style={styles.downloadBtn}>
                      Download
                    </button>
                    <button onClick={() => handleShare(item)} style={styles.shareBtn}>
                      Share
                    </button>
                    {user?.role === 'admin' && (
                      <button onClick={() => handleDelete(item.key)} style={styles.deleteBtn}>
                        Delete
                      </button>
                    )}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  tableWrapper: {
    overflowX: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    color: '#6b7280',
    fontWeight: '600',
    fontSize: '12px',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '12px 16px',
    color: '#374151',
  },
  downloadBtn: {
    padding: '6px 12px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    marginRight: '8px',
  },
  shareBtn: {
    padding: '6px 12px',
    backgroundColor: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    marginRight: '8px',
  },
  deleteBtn: {
    padding: '6px 12px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
  },
};
