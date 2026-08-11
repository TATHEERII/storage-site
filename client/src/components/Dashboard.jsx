import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';
import DropZone from './DropZone';
import FileList from './FileList';
import FolderTree from './FolderTree';
import AdminPanel from './AdminPanel';
import SharedFiles from './SharedFiles';

export default function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderPath, setFolderPath] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const { user, logout, loading } = useAuth();

  if (loading) return <p style={{ padding: '40px', color: '#6b7280' }}>Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;

  const handleUploadComplete = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleNavigateFolder = async (folder) => {
    if (!folder) {
      setCurrentFolder(null);
      setFolderPath('');
    } else {
      setCurrentFolder(folder);
      try {
        const { path } = await api.getFolderPath(folder.id);
        const pathStr = path.map((p) => p.name).join('/');
        setFolderPath(pathStr);
      } catch (err) {
        console.error(err);
        setFolderPath(folder.name);
      }
    }
  };

  const handleBack = () => {
    if (breadcrumbs.length > 1) {
      const parentCrumb = breadcrumbs[breadcrumbs.length - 2];
      handleNavigateFolder(parentCrumb);
    } else if (breadcrumbs.length === 1) {
      handleNavigateFolder(null);
    }
  };

  const handleCreateFolder = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleBreadcrumbsChange = (crumbs) => {
    setBreadcrumbs(crumbs);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>WebSale Storage</h1>
          <p style={styles.welcome}>
            Welcome, {user.email} ({user.role})
          </p>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>Logout</button>
      </header>

      <main style={styles.main}>
        <div style={styles.layout}>
          <aside style={styles.sidebar}>
            <FolderTree
              currentFolderId={currentFolder?.id}
              onSelectFolder={handleNavigateFolder}
              onCreateFolder={handleCreateFolder}
              onBreadcrumbsChange={handleBreadcrumbsChange}
            />
          </aside>

          <div style={styles.content}>
            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>
                  {currentFolder ? `Upload to ${currentFolder.name}` : 'Upload Files'}
                </h2>
              </div>
              <DropZone onUpload={handleUploadComplete} folderPath={folderPath} />
            </section>

            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>
                  {currentFolder ? currentFolder.name : 'My Files'}
                </h2>
                {currentFolder && (
                  <button onClick={handleBack} style={styles.backBtn}>
                    ← Back
                  </button>
                )}
              </div>
              <FileList
                key={refreshKey}
                folderPath={folderPath}
                currentFolderId={currentFolder?.id}
                onNavigateFolder={handleNavigateFolder}
                onUploadComplete={handleUploadComplete}
              />
            </section>

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Shared Files</h2>
              <SharedFiles />
            </section>

            {user.role === 'admin' && <AdminPanel />}
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    margin: '0 0 4px 0',
    fontSize: '20px',
    fontWeight: '700',
    color: '#111827',
  },
  welcome: {
    margin: 0,
    fontSize: '13px',
    color: '#6b7280',
  },
  logoutBtn: {
    padding: '8px 16px',
    backgroundColor: '#374151',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 20px',
  },
  layout: {
    display: 'flex',
    gap: '24px',
  },
  sidebar: {
    width: '260px',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  section: {
    marginBottom: '32px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: '#111827',
  },
  backBtn: {
    padding: '6px 12px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
