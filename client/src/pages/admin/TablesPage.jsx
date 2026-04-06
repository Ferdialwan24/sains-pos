import { useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { FormModal } from '../../components/common/FormModal.jsx';
import { IconButton } from '../../components/common/IconButton.jsx';
import { useRoleEyebrow } from '../../hooks/useRoleEyebrow.js';
import { useToast } from '../../hooks/useToast.js';
import { apiRequest } from '../../lib/api.js';

const defaultForm = {
  number: ''
};

export function TablesPage() {
  const eyebrow = useRoleEyebrow('Admin');
  const { showToast } = useToast();
  const [tables, setTables] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editingTableId, setEditingTableId] = useState(null);
  const [deletingTable, setDeletingTable] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const formTitle = useMemo(() => (editingTableId ? 'Edit Table' : 'Add Table'), [editingTableId]);

  const loadTables = async () => {
    setIsLoading(true);

    try {
      const response = await apiRequest('/tables');
      setTables(response.tables);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  const closeModal = () => {
    setForm(defaultForm);
    setEditingTableId(null);
    setIsModalOpen(false);
    setErrorMessage('');
  };

  const handleOpenCreate = () => {
    closeModal();
    setIsModalOpen(true);
  };

  const handleEdit = (table) => {
    setEditingTableId(table._id);
    setForm({
      number: String(table.number)
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
        number: Number(form.number)
      };

      if (editingTableId) {
        await apiRequest(`/tables/${editingTableId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        showToast({
          title: 'Table updated',
          message: `Table ${payload.number} has been updated.`,
          type: 'success'
        });
      } else {
        await apiRequest('/tables', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showToast({
          title: 'Table created',
          message: `Table ${payload.number} is ready to use.`,
          type: 'success'
        });
      }

      closeModal();
      await loadTables();
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: 'Table save failed',
        message: error.message,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTable) {
      return;
    }

    setIsDeleting(true);

    try {
      await apiRequest(`/tables/${deletingTable._id}`, {
        method: 'DELETE'
      });
      await loadTables();
      showToast({
        title: 'Table deleted',
        message: `Table ${deletingTable.number} has been removed.`,
        type: 'success'
      });
      setDeletingTable(null);
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: 'Table delete failed',
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
          <h2>Tables Management</h2>
        </div>
        <p className="muted">Set up the physical tables before cashiers start opening bills.</p>
      </div>

      {errorMessage && !isModalOpen ? <p className="form-error">{errorMessage}</p> : null}

      <div className="user-list-section">
        <button className="primary-button section-action-button" onClick={handleOpenCreate} type="button">
          Add Table
        </button>

        <div className="panel table-list-panel">
          <div className="panel-heading user-list-heading">
            <h3>Table List</h3>
          </div>
          {isLoading ? <p>Loading tables...</p> : null}
          {!isLoading && tables.length === 0 ? <p>No tables yet.</p> : null}
          <div className="table-admin-grid">
            {tables.map((table) => (
              <article key={table._id} className={`table-admin-card table-admin-card-${table.status}`}>
                <div className="table-admin-card-top">
                  <span className="table-admin-label">Table</span>
                  <span className={`pill pill-${table.status}`}>{table.status}</span>
                </div>
                <strong className="table-admin-number">{table.number}</strong>
                <div className="row-actions table-row-actions">
                  <IconButton icon="edit" label="Edit table" onClick={() => handleEdit(table)} />
                  <IconButton
                    icon="delete"
                    label="Delete table"
                    onClick={() => setDeletingTable(table)}
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
            <button className="primary-button" disabled={isSubmitting} form="table-form" type="submit">
              {isSubmitting ? 'Saving...' : editingTableId ? 'Update Table' : 'Create Table'}
            </button>
          </>
        }
        isOpen={isModalOpen}
        onClose={closeModal}
        title={formTitle}
      >
        <form className="form-grid" id="table-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Table Number</span>
            <input
              min="1"
              onChange={(event) => setForm({ number: event.target.value })}
              placeholder="1"
              required
              type="number"
              value={form.number}
            />
          </label>
          {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        </form>
      </FormModal>

      <ConfirmDialog
        confirmLabel="Yes"
        isConfirming={isDeleting}
        isOpen={Boolean(deletingTable)}
        message={`Delete table ${deletingTable?.number ?? ''}?`}
        onClose={() => setDeletingTable(null)}
        onConfirm={handleDelete}
        title="Delete Table"
      />
    </section>
  );
}

