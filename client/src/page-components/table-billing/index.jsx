import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormModal } from '../../components/common/FormModal.jsx';
import { useRoleEyebrow } from '../../hooks/useRoleEyebrow.js';
import { useToast } from '../../hooks/useToast.js';
import { apiRequest } from '../../lib/api.js';
import { formatCurrency } from '../../lib/format.js';
import styles from './TableBilling.module.css';

export function TableBillingPageComponent() {
  const eyebrow = useRoleEyebrow('Cashier');
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [tables, setTables] = useState([]);
  const [dialogTable, setDialogTable] = useState(null);
  const [moveSourceTable, setMoveSourceTable] = useState(null);
  const [moveTargetTableId, setMoveTargetTableId] = useState('');
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isMovingTable, setIsMovingTable] = useState(false);
  const [moveErrorMessage, setMoveErrorMessage] = useState('');
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

  const openMoveTableDialog = () => {
    if (!dialogTable || !dialogActiveOrder?._id) {
      return;
    }

    setMoveSourceTable(dialogTable);
    setMoveTargetTableId('');
    setMoveErrorMessage('');
    setDialogTable(null);
    setIsMoveModalOpen(true);
  };

  const closeMoveTableDialog = () => {
    if (isMovingTable) {
      return;
    }

    setIsMoveModalOpen(false);
    setMoveSourceTable(null);
    setMoveTargetTableId('');
    setMoveErrorMessage('');
  };

  const handleMoveTable = async () => {
    const sourceActiveOrder = moveSourceTable ? getActiveOrderSnapshot(moveSourceTable) : null;

    if (!sourceActiveOrder?._id) {
      setMoveErrorMessage('Active order is not available for moving.');
      return;
    }

    if (!moveTargetTableId) {
      setMoveErrorMessage('Select an available table first.');
      return;
    }

    try {
      setIsMovingTable(true);
      setMoveErrorMessage('');

      await apiRequest(`/active-orders/${sourceActiveOrder._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          tableId: moveTargetTableId
        })
      });

      const targetTable = tables.find((table) => table._id === moveTargetTableId);

      showToast({
        title: 'Table moved',
        message: `Order has been moved to Table ${targetTable?.number ?? '-'}.`,
        type: 'success'
      });

      await loadTables();
      closeMoveTableDialog();
    } catch (error) {
      setMoveErrorMessage(error.message);
      showToast({
        title: 'Move table failed',
        message: error.message,
        type: 'error'
      });
    } finally {
      setIsMovingTable(false);
    }
  };

  const dialogActiveOrder = dialogTable ? getActiveOrderSnapshot(dialogTable) : null;
  const availableTables = tables.filter((table) => table.status === 'available');
  const moveTargetTable = availableTables.find((table) => table._id === moveTargetTableId) ?? null;

  return (
    <section className="page">
      <div className={`page-header ${styles.pageHeader}`}>
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>Tables</h2>
          </div>
      </div>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      <div className={`panel ${styles.listPanel}`}>
        <div className="panel-heading user-list-heading">
          <h3>Table List</h3>
        </div>
        {isLoading ? <p>Loading tables...</p> : null}
        {!isLoading && tables.length === 0 ? <p>No tables found.</p> : null}
        <div className={styles.grid}>
          {tables.map((table) => {
            const activeOrder = getActiveOrderSnapshot(table);

            return (
              <button
                key={table._id}
                className={`${styles.card}${activeOrder ? ` ${styles.cardActive}` : ''}`}
                onClick={() => {
                  if (activeOrder) {
                    openLoadOrderDialog(table);
                  } else {
                    navigate(`/cashier/pos?tableId=${table._id}`);
                  }
                }}
                type="button"
              >
                <div className={styles.cardTop}>
                  <span className={styles.label}>Table</span>
                  <span className={`pill pill-${table.status}`}>{table.status}</span>
                </div>
                <strong className={styles.number}>{table.number}</strong>
                {activeOrder ? (
                  <div className={styles.cardOccupiedInfo}>
                    <span className={styles.cardCustomerName}>{activeOrder.customerName || 'No Name'}</span>
                    <span className={styles.cardTotalAmount}>{formatCurrency(activeOrder.subtotal ?? 0)}</span>
                  </div>
                ) : (
                  <div className={styles.cardAvailableInfo}>
                    <span>Available</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <FormModal
        footer={
          <>
            <button className="secondary-button" onClick={() => setDialogTable(null)} type="button">
              Close
            </button>
            <button className="secondary-button" disabled={!dialogActiveOrder?._id} onClick={openMoveTableDialog} type="button">
              Move Table
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
              <strong>Customer: {dialogActiveOrder.customerName}</strong>
            </div>
            <div className={styles.dialogItems}>
              <strong className={styles.dialogItemsTitle}>Order Items</strong>
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
        ) : null}
      </FormModal>

      <FormModal
        footer={
          <>
            <button className="secondary-button" onClick={closeMoveTableDialog} type="button">
              Cancel
            </button>
            <button className="primary-button" disabled={!moveTargetTableId || isMovingTable} onClick={handleMoveTable} type="button">
              {isMovingTable ? 'Moving...' : 'Move Here'}
            </button>
          </>
        }
        isOpen={isMoveModalOpen}
        onClose={closeMoveTableDialog}
        title={moveSourceTable ? `Move Table ${moveSourceTable.number}` : 'Move Table'}
      >
        <div className={styles.moveModalBody}>
          {availableTables.length === 0 ? <p>No available tables right now.</p> : null}
          <div className={styles.moveGrid}>
            {availableTables.map((table) => (
              <button
                key={table._id}
                className={`${styles.moveCard}${moveTargetTableId === table._id ? ` ${styles.moveCardSelected}` : ''}`}
                onClick={() => setMoveTargetTableId(table._id)}
                type="button"
              >
                <span className={styles.label}>Table</span>
                <strong className={styles.moveCardNumber}>{table.number}</strong>
              </button>
            ))}
          </div>
          {moveTargetTable ? (
            <p className={styles.moveSelectionText}>
              Selected destination: <strong>Table {moveTargetTable.number}</strong>
            </p>
          ) : null}
          {moveErrorMessage ? <p className="form-error">{moveErrorMessage}</p> : null}
        </div>
      </FormModal>
    </section>
  );
}
