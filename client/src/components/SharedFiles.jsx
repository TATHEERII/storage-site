import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../hooks/useAuth';

export default function SharedFiles() {
  const [sharedFiles, setSharedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadSharedFiles = async () => {
    try {
      const { sharedFiles } = await api.getSharedFiles();
      setSharedFiles(sharedFiles);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSharedFiles();
  }, []);

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

  const handleUnshare = async (id) => {
    if (!window.confirm('Remove this shared file?')) return;
    try {
      await api.unshareFile(id);
      setSharedFiles(sharedFiles.filter((f) => f.id !== id));
    } catch (err) {
      console.error('Unshare error:', err);
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  if (loading) return <p style={{ color: '#6b7280' }}>Loading shared files...</p>;

  if (sharedFiles.length === 0) {
    return <p style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0' }}>No shared files yet</p>;
  }

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Shared By</th>
            <th style={styles.th}>Date</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sharedFiles.map((file) => (
            <tr key={file.id} style={styles.tr}>
              <td style={styles.td}>📄 {file.file_name}</td>
              <td style={styles.td}>{file.shared_by_email}</td>
              <td style={styles.td}>{formatDate(file.created_at)}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>
                <button onClick={() => handleDownload(file.file_key)} style={styles.downloadBtn}>
                  Download
                </button>
                {file.shared_by === user?.id && (
                  <button onClick={() => handleUnshare(file.id)} style={styles.unshareBtn}>
                    Unshare
                  </button>
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
  unshareBtn: {
    padding: '6px 12px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
  },
};
