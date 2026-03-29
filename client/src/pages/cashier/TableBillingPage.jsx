import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoleEyebrow } from '../../hooks/useRoleEyebrow.js';
import { apiRequest } from '../../lib/api.js';
import { formatCurrency } from '../../lib/format.js';
import { useToast } from '../../hooks/useToast.js';

export function TableBillingPage() {
  const eyebrow = useRoleEyebrow('Cashier');
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckouting, setIsCheckouting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadTables = async () => {
    setIsLoading(true);

    try {
      const response = await apiRequest('/tables');
      setTables(response.tables);
      setErrorMessage('');
      if (!selectedTableId && response.tables[0]) {
        setSelectedTableId(response.tables[0]._id);
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  const selectedTable =
    tables.find((table) => table._id === selectedTableId) ??
    tables.find((table) => table.status === 'active') ??
    tables[0];

  const handleCheckout = async (status) => {
    if (!selectedTable) {
      return;
    }

    setIsCheckouting(true);
    setErrorMessage('');

    try {
      await apiRequest(`/tables/${selectedTable._id}/checkout`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          paymentMethod
        })
      });

      await loadTables();
      showToast({
        title: status === 'paid' ? 'Payment completed' : 'Bill canceled',
        message:
          status === 'paid'
            ? `Table ${selectedTable.number} has been checked out with ${paymentMethod}.`
            : `Active bill for table ${selectedTable.number} has been canceled.`,
        type: status === 'paid' ? 'success' : 'info'
      });
    } catch (error) {
      setErrorMessage(error.message);
      showToast({
        title: 'Checkout failed',
        message: error.message,
        type: 'error'
      });
    } finally {
      setIsCheckouting(false);
    }
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>Table Billing</h2>
        </div>
        <p className="muted">
          Active tables will lead to either add-order flow or direct checkout.
        </p>
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      <div className="two-column-grid table-layout">
        <div className="table-grid">
          {isLoading ? <div className="panel">Loading tables...</div> : null}
          {!isLoading && tables.length === 0 ? (
            <div className="panel">No tables found. Create them from the admin tables page first.</div>
          ) : null}
          {tables.map((table) => (
            <button
              key={table._id}
              className={`table-card button-card${table.status === 'active' ? ' table-card-active' : ''}${
                selectedTable?._id === table._id ? ' table-card-selected' : ''
              }`}
              onClick={() => setSelectedTableId(table._id)}
              type="button"
            >
              <span className="table-icon" />
              <strong>Table {table.number}</strong>
              <p>{table.activeOrder?.customerName ?? 'No active bill'}</p>
            </button>
          ))}
        </div>

        <aside className="summary-card">
          <h3>{selectedTable ? `Table ${selectedTable.number}` : 'Select a table'}</h3>
          {!selectedTable ? <p className="muted">Choose a table to open a bill or complete checkout.</p> : null}
          {selectedTable?.status === 'available' ? (
            <>
              <p className="muted">This table is empty and ready for a new bill.</p>
              <button
                className="primary-button"
                onClick={() => navigate(`/cashier/pos?tableId=${selectedTable._id}`)}
                type="button"
              >
                Open New Bill
              </button>
            </>
          ) : null}

          {selectedTable?.status === 'active' ? (
            <>
              <p className="muted">Customer: {selectedTable.activeOrder.customerName}</p>
              <div className="simple-list">
                {selectedTable.activeOrder.items.map((item) => (
                  <article key={item.product} className="list-row list-row-stack">
                    <div>
                      <strong>{item.name}</strong>
                      <p className="muted compact-text">Qty {item.quantity}</p>
                    </div>
                    <span>{formatCurrency(item.lineTotal)}</span>
                  </article>
                ))}
              </div>
              <div className="summary-total">
                <span>Subtotal</span>
                <strong>{formatCurrency(selectedTable.activeOrder.subtotal)}</strong>
              </div>
              <label className="field">
                <span>Payment Method</span>
                <select onChange={(event) => setPaymentMethod(event.target.value)} value={paymentMethod}>
                  <option value="cash">Cash</option>
                  <option value="qris">QRIS</option>
                  <option value="transfer">Transfer</option>
                </select>
              </label>
              <div className="button-row">
                <button
                  className="secondary-button"
                  onClick={() => navigate(`/cashier/pos?tableId=${selectedTable._id}`)}
                  type="button"
                >
                  Add Order
                </button>
                <button
                  className="primary-button"
                  disabled={isCheckouting}
                  onClick={() => handleCheckout('paid')}
                  type="button"
                >
                  {isCheckouting ? 'Processing...' : 'Pay'}
                </button>
              </div>
              <button
                className="ghost-button"
                disabled={isCheckouting}
                onClick={() => handleCheckout('cancel')}
                type="button"
              >
                Cancel Bill
              </button>
            </>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
