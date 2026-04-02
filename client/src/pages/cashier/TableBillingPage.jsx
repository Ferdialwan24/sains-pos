import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoleEyebrow } from '../../hooks/useRoleEyebrow.js';
import { apiRequest } from '../../lib/api.js';
import { formatCurrency } from '../../lib/format.js';

export function TableBillingPage() {
  const eyebrow = useRoleEyebrow('Cashier');
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const getActiveOrderSnapshot = (table) => {
    if (table?.activeOrderId && typeof table.activeOrderId === 'object') {
      return table.activeOrderId;
    }

    if (table?.activeOrder) {
      return {
        _id: null,
        customerName: table.activeOrder.customerName,
        items: table.activeOrder.items,
        subtotal: table.activeOrder.subtotal
      };
    }

    return null;
  };

  const loadTables = async () => {
    setIsLoading(true);

    try {
      const response = await apiRequest('/tables');
      setTables(response.tables);
      setErrorMessage('');
      if (!selectedTableId && response.tables[0]) {
        const firstActiveTable = response.tables.find((table) => getActiveOrderSnapshot(table));
        setSelectedTableId((firstActiveTable ?? response.tables[0])._id);
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
    tables.find((table) => getActiveOrderSnapshot(table)) ??
    tables[0];
  const selectedActiveOrder = getActiveOrderSnapshot(selectedTable);

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>Table Billing</h2>
        </div>
        <p className="muted">Only saved dine-in bills appear here. Load the table first, then continue all actions from POS.</p>
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
              <p>{getActiveOrderSnapshot(table)?.customerName ?? 'No active bill'}</p>
            </button>
          ))}
        </div>

        <aside className="summary-card">
          <h3>{selectedTable ? `Table ${selectedTable.number}` : 'Select a table'}</h3>
          {!selectedTable ? <p className="muted">Choose a table to inspect its current dine-in bill.</p> : null}
          {!selectedActiveOrder && selectedTable ? <p className="muted">This table does not have any saved dine-in bill yet.</p> : null}
          {selectedActiveOrder ? (
            <>
              <p className="muted">Customer: {selectedActiveOrder.customerName}</p>
              <div className="simple-list">
                {selectedActiveOrder.items.map((item) => (
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
                <strong>{formatCurrency(selectedActiveOrder.subtotal)}</strong>
              </div>
              <button
                className="primary-button"
                onClick={() =>
                  navigate(
                    selectedActiveOrder._id
                      ? `/cashier/pos?activeOrderId=${selectedActiveOrder._id}`
                      : `/cashier/pos?tableId=${selectedTable._id}`
                  )
                }
                type="button"
              >
                Load Order
              </button>
            </>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
