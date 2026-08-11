import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';

export default function DropZone({ onUpload, folderPath }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { user } = useAuth();

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!user) return;
    setUploading(true);
    setProgress(0);

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      try {
        const { url, key } = await api.getUploadUrl(file.name, file.type, folderPath);

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', url);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              setProgress(Math.round((event.loaded / event.total) * 100));
            }
          };
          xhr.onload = () => {
            if (xhr.status === 200) resolve();
            else reject(new Error('Upload failed'));
          };
          xhr.onerror = () => reject(new Error('Upload failed'));
          xhr.send(file);
        });

        onUpload?.();
      } catch (err) {
        console.error('Upload error:', err);
      }
    }

    setUploading(false);
    setProgress(0);
  }, [user, onUpload, folderPath]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div
      {...getRootProps()}
      style={{
        border: '2px dashed #d1d5db',
        borderRadius: '12px',
        padding: '40px 20px',
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: isDragActive ? '#eff6ff' : '#f9fafb',
        transition: 'all 0.2s',
      }}
    >
      <input {...getInputProps()} />
      {uploading ? (
        <div>
          <p style={{ margin: '0 0 8px 0', color: '#374151' }}>Uploading... {progress}%</p>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
        </div>
      ) : isDragActive ? (
        <p style={{ margin: 0, color: '#2563eb', fontWeight: '600' }}>Drop files here...</p>
      ) : (
        <div>
          <p style={{ margin: '0 0 8px 0', color: '#374151', fontWeight: '600' }}>
            Drag & drop files here
          </p>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: '13px' }}>
            or click to browse
          </p>
        </div>
      )}
    </div>
  );
}

const styles = {
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    transition: 'width 0.2s',
  },
};
