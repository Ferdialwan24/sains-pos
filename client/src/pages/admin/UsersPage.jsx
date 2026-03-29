import { useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { FormModal } from '../../components/common/FormModal.jsx';
import { IconButton } from '../../components/common/IconButton.jsx';
import { useRoleEyebrow } from '../../hooks/useRoleEyebrow.js';
import { useToast } from '../../hooks/useToast.js';
import { apiRequest } from '../../lib/api.js';

const defaultForm = {
  fullName: '',
  username: '',
  password: '',
  role: 'cashier',
  isActive: true
};

export function UsersPage() {
  const eyebrow = useRoleEyebrow('Admin');
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editingUserId, setEditingUserId] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
    closeModal();
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

  const handleDelete = async () => {
    if (!deletingUser) {
      return;
    }

    setIsDeleting(true);

    try {
      await apiRequest(`/users/${deletingUser.id}`, {
        method: 'DELETE'
      });
      await loadUsers();
      showToast({
        title: 'User deleted',
        message: `${deletingUser.fullName} has been removed.`,
        type: 'success'
      });
      setDeletingUser(null);
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: 'User delete failed',
        message: error.message,
        type: 'error'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>User Management</h2>
        </div>
        <p className="muted">Admin creates and maintains cashier and admin accounts from one place.</p>
      </div>

      {errorMessage && !isModalOpen ? <p className="form-error">{errorMessage}</p> : null}

      <div className="user-list-section">
        <button className="primary-button section-action-button" onClick={handleOpenCreate} type="button">
          Add User
        </button>

        <div className="panel user-list-panel">
          <div className="panel-heading user-list-heading">
            <h3>User List</h3>
          </div>
          {isLoading ? <p>Loading users...</p> : null}
          {!isLoading && users.length === 0 ? <p>No users yet.</p> : null}
          <div className="report-table user-table">
            {users.length > 0 ? (
              <article className="report-row report-row-header user-row user-row-header">
                <strong>Name</strong>
                <strong>Username</strong>
                <strong>Role</strong>
                <strong>Status</strong>
                <strong>Action</strong>
              </article>
            ) : null}
            {users.map((user) => (
              <article key={user.id} className="report-row user-row">
                <strong>{user.fullName}</strong>
                <span>@{user.username}</span>
                <span className="capitalize-text">{user.role}</span>
                <span className={`pill ${user.isActive ? 'pill-success' : 'pill-cancel'}`}>
                  {user.isActive ? 'active' : 'inactive'}
                </span>
                <div className="row-actions user-row-actions">
                  <IconButton icon="edit" label="Edit user" onClick={() => handleEdit(user)} />
                  <IconButton
                    icon="delete"
                    label="Delete user"
                    onClick={() => setDeletingUser(user)}
                    variant="danger"
                  />
                </div>
              </article>
            ))}
          </div>
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
          <label className="toggle-field">
            <span>Active account</span>
            <button
              aria-pressed={form.isActive}
              className={`toggle-switch${form.isActive ? ' toggle-switch-active' : ''}`}
              onClick={() => setForm((current) => ({ ...current, isActive: !current.isActive }))}
              type="button"
            >
              <span />
            </button>
          </label>
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        </form>
      </FormModal>

      <ConfirmDialog
        confirmLabel="Yes"
        isConfirming={isDeleting}
        isOpen={Boolean(deletingUser)}
        message={`Delete ${deletingUser?.fullName ?? 'this user'}?`}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDelete}
        title="Delete User"
      />
    </section>
  );
}

