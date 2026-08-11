import { useState, useEffect } from 'react';
import { api } from '../api';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', role: 'subuser' });
  const [error, setError] = useState('');

  const loadUsers = async () => {
    try {
      const { users } = await api.listUsers();
      setUsers(users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.createUser(formData.email, formData.password, formData.role);
      setFormData({ email: '', password: '', role: 'subuser' });
      setShowForm(false);
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await api.deleteUser(id);
      setUsers(users.filter((u) => u.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <p style={{ color: '#6b7280' }}>Loading users...</p>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.heading}>Sub Users</h2>
        <button onClick={() => setShowForm(!showForm)} style={styles.addBtn}>
          {showForm ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            style={styles.input}
            required
          />
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            style={styles.input}
          >
            <option value="subuser">Sub User</option>
          </select>
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.submitBtn}>Create User</button>
        </form>
      )}

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Created</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={styles.tr}>
                <td style={styles.td}>{u.email}</td>
                <td style={styles.td}>{u.role}</td>
                <td style={styles.td}>{new Date(u.created_at).toLocaleDateString()}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>
                  <button onClick={() => handleDelete(u.id)} style={styles.deleteBtn}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: {
    marginTop: '32px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  heading: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#111827',
  },
  addBtn: {
    padding: '8px 16px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    flex: '1 1 150px',
  },
  submitBtn: {
    padding: '10px 16px',
    backgroundColor: '#16a34a',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  error: {
    color: '#dc2626',
    fontSize: '13px',
    margin: 0,
    width: '100%',
  },
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
