import { useEffect, useMemo, useState } from 'react';
import { FormModal } from '../../components/common/FormModal.jsx';
import { apiRequest } from '../../lib/api.js';
import { useToast } from '../../hooks/useToast.js';

const defaultForm = {
  number: ''
};

export function TablesPage() {
  const { showToast } = useToast();
  const [tables, setTables] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editingTableId, setEditingTableId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    setForm(defaultForm);
    setEditingTableId(null);
    setErrorMessage('');
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

  const handleDelete = async (tableId) => {
    const confirmed = window.confirm('Delete this table?');

    if (!confirmed) {
      return;
    }

    try {
      const deletedTable = tables.find((table) => table._id === tableId);
      await apiRequest(`/tables/${tableId}`, {
        method: 'DELETE'
      });
      await loadTables();
      showToast({
        title: 'Table deleted',
        message: deletedTable ? `Table ${deletedTable.number} has been removed.` : 'The table has been removed.',
        type: 'success'
      });
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: 'Table delete failed',
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
          <h2>Manage Tables</h2>
        </div>
        <div className="header-actions">
          <p className="muted">Set up the physical tables before cashiers start opening bills.</p>
          <button className="primary-button" onClick={handleOpenCreate} type="button">
            Add Table
          </button>
        </div>
      </div>

      {errorMessage && !isModalOpen ? <p className="form-error">{errorMessage}</p> : null}

      <div className="panel">
        <div className="panel-heading">
          <h3>Current Tables</h3>
          <span className="panel-count">{tables.length} total</span>
        </div>
        {isLoading ? <p>Loading tables...</p> : null}
        {!isLoading && tables.length === 0 ? <p>No tables yet.</p> : null}
        <div className="simple-list">
          {tables.map((table) => (
            <article key={table._id} className="list-row list-row-stack">
              <div>
                <strong>Table {table.number}</strong>
                <p className="muted compact-text">{table.activeOrder?.customerName ?? 'No active bill'}</p>
              </div>
              <div className="row-actions">
                <span className={`pill pill-${table.status}`}>{table.status}</span>
                <button className="secondary-button small-button" onClick={() => handleEdit(table)} type="button">
                  Edit
                </button>
                <button className="ghost-button small-button" onClick={() => handleDelete(table._id)} type="button">
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
    </section>
  );
}
