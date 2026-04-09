import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormModal } from '../../components/common/FormModal.jsx';
import { useRoleEyebrow } from '../../hooks/useRoleEyebrow.js';
import { apiRequest } from '../../lib/api.js';
import styles from './TableBilling.module.css';

export function TableBillingPageComponent() {
  const eyebrow = useRoleEyebrow('Cashier');
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [dialogTable, setDialogTable] = useState(null);
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
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  const openLoadOrderDialog = (table) => {
    if (!getActiveOrderSnapshot(table)) {
      return;
    }

    setDialogTable(table);
  };

  const handleLoadOrder = () => {
    if (!dialogTable) {
      return;
    }

    const activeOrder = getActiveOrderSnapshot(dialogTable);

    navigate(
      activeOrder?._id ? `/cashier/pos?activeOrderId=${activeOrder._id}` : `/cashier/pos?tableId=${dialogTable._id}`
    );
  };

  const dialogActiveOrder = dialogTable ? getActiveOrderSnapshot(dialogTable) : null;

  return (
    <section className="page">
      <div className={`page-header ${styles.pageHeader}`}>
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>Tables</h2>
          </div>
        <p className={`muted ${styles.headerNote}`}>
          Only saved dine-in bills appear here. Load the table first, then continue all actions from POS.
        </p>
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      <div className={styles.layout}>
        <div className={`panel ${styles.listPanel}`}>
          <div className="panel-heading user-list-heading">
            <h3>Table List</h3>
          </div>
          {isLoading ? <p>Loading tables...</p> : null}
          {!isLoading && tables.length === 0 ? (
            <p>No tables found. Create them from the admin tables page first.</p>
          ) : null}
          <div className={styles.grid}>
            {tables.map((table) => {
              const activeOrder = getActiveOrderSnapshot(table);

              return (
                <button
                  key={table._id}
                  className={`${styles.card}${activeOrder ? ` ${styles.cardActive}` : ''}`}
                  disabled={!activeOrder}
                  onClick={() => openLoadOrderDialog(table)}
                  type="button"
                >
                  <div className={styles.cardTop}>
                    <span className={styles.label}>Table</span>
                    <span className={`pill pill-${table.status}`}>{table.status}</span>
                  </div>
                  <strong className={styles.number}>{table.number}</strong>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <FormModal
        footer={
          <>
            <button className="secondary-button" onClick={() => setDialogTable(null)} type="button">
              Close
            </button>
            <button className="primary-button" onClick={handleLoadOrder} type="button">
              Load Order
            </button>
          </>
        }
        isOpen={Boolean(dialogTable)}
        onClose={() => setDialogTable(null)}
        title={dialogTable ? `Table ${dialogTable.number}` : 'Table'}
      >
        {dialogActiveOrder ? (
          <div className={styles.dialogBody}>
            <div className={styles.dialogMeta}>
              <span className="muted">Customer</span>
              <strong>{dialogActiveOrder.customerName}</strong>
            </div>
            <div className={styles.dialogItems}>
              {dialogActiveOrder.items.map((item, index) => (
                <div
                  key={`${item.product ?? item.name ?? 'item'}-${index}`}
                  className={styles.dialogItemRow}
                >
                  <span>{item.name}</span>
                  <strong>x{item.quantity}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="muted">This table does not have any saved dine-in bill yet.</p>
        )}
      </FormModal>
    </section>
  );
}
