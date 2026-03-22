import { useEffect, useMemo, useState } from 'react';
import { FormModal } from '../../components/common/FormModal.jsx';
import { apiRequest } from '../../lib/api.js';
import { useToast } from '../../hooks/useToast.js';

const defaultForm = {
  fullName: '',
  username: '',
  password: '',
  role: 'cashier',
  isActive: true
};

export function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editingUserId, setEditingUserId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const formTitle = useMemo(() => (editingUserId ? 'Edit User' : 'Add User'), [editingUserId]);

  const loadUsers = async () => {
    setIsLoading(true);

    try {
      const response = await apiRequest('/users');
      setUsers(response.users);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const closeModal = () => {
    setForm(defaultForm);
    setEditingUserId(null);
    setIsModalOpen(false);
    setErrorMessage('');
  };

  const handleOpenCreate = () => {
    setForm(defaultForm);
    setEditingUserId(null);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEdit = (user) => {
    setEditingUserId(user.id);
    setForm({
      fullName: user.fullName,
      username: user.username,
      password: '',
      role: user.role,
      isActive: user.isActive
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        fullName: form.fullName,
        username: form.username,
        role: form.role,
        isActive: form.isActive
      };

      if (form.password.trim()) {
        payload.password = form.password;
      }

      if (editingUserId) {
        await apiRequest(`/users/${editingUserId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        showToast({
          title: 'User updated',
          message: `${payload.fullName} has been updated.`,
          type: 'success'
        });
      } else {
        await apiRequest('/users', {
          method: 'POST',
          body: JSON.stringify({
            ...payload,
            password: form.password
          })
        });
        showToast({
          title: 'User created',
          message: `${payload.fullName} is ready to sign in.`,
          type: 'success'
        });
      }

      closeModal();
      await loadUsers();
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: 'User save failed',
        message: error.message,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (userId) => {
    const confirmed = window.confirm('Delete this user?');

    if (!confirmed) {
      return;
    }

    try {
      const deletedUser = users.find((user) => user.id === userId);
      await apiRequest(`/users/${userId}`, {
        method: 'DELETE'
      });
      await loadUsers();
      showToast({
        title: 'User deleted',
        message: `${deletedUser?.fullName ?? 'The user'} has been removed.`,
        type: 'success'
      });
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: 'User delete failed',
        message: error.message,
        type: 'error'
      });
    }
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>User Management</h2>
        </div>
        <div className="header-actions">
          <p className="muted">Admin creates and maintains cashier and admin accounts from one place.</p>
          <button className="primary-button" onClick={handleOpenCreate} type="button">
            Add User
          </button>
        </div>
      </div>

      {errorMessage && !isModalOpen ? <p className="form-error">{errorMessage}</p> : null}

      <div className="panel">
        <div className="panel-heading">
          <h3>User List</h3>
          <span className="panel-count">{users.length} total</span>
        </div>
        {isLoading ? <p>Loading users...</p> : null}
        {!isLoading && users.length === 0 ? <p>No users yet.</p> : null}
        <div className="simple-list">
          {users.map((user) => (
            <article key={user.id} className="list-row list-row-stack">
              <div>
                <strong>{user.fullName}</strong>
                <p className="muted compact-text">
                  @{user.username} · {user.role} · {user.isActive ? 'active' : 'inactive'}
                </p>
              </div>
              <div className="row-actions">
                <button className="secondary-button small-button" onClick={() => handleEdit(user)} type="button">
                  Edit
                </button>
                <button className="ghost-button small-button" onClick={() => handleDelete(user.id)} type="button">
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <FormModal
        footer={
          <>
            <button className="secondary-button" onClick={closeModal} type="button">
              Cancel
            </button>
            <button className="primary-button" disabled={isSubmitting} form="user-form" type="submit">
              {isSubmitting ? 'Saving...' : editingUserId ? 'Update User' : 'Create User'}
            </button>
          </>
        }
        isOpen={isModalOpen}
        onClose={closeModal}
        title={formTitle}
      >
        <form className="form-grid" id="user-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Full Name</span>
            <input name="fullName" onChange={handleChange} required value={form.fullName} />
          </label>
          <label className="field">
            <span>Username</span>
            <input name="username" onChange={handleChange} required value={form.username} />
          </label>
          <label className="field">
            <span>{editingUserId ? 'New Password (optional)' : 'Password'}</span>
            <input
              name="password"
              onChange={handleChange}
              required={!editingUserId}
              type="password"
              value={form.password}
            />
          </label>
          <label className="field">
            <span>Role</span>
            <select name="role" onChange={handleChange} value={form.role}>
              <option value="admin">Admin</option>
              <option value="cashier">Cashier</option>
            </select>
          </label>
          <label className="checkbox-field">
            <input checked={form.isActive} name="isActive" onChange={handleChange} type="checkbox" />
            <span>Active account</span>
          </label>
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        </form>
      </FormModal>
    </section>
  );
}
