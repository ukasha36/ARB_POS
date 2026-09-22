const { getDb } = require('../database');
const ledgerRepository = require('../repositories/ledgerRepository');
const itemRepository = require('../repositories/itemRepository');

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function validateLedgerBalance(debitLines, creditLines) {
  const totalDebit = roundMoney(debitLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0));
  const totalCredit = roundMoney(creditLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0));

  if (totalDebit !== totalCredit) {
    throw new Error(
      `Unbalanced double-entry transaction! Total Debits (Rs. ${totalDebit.toFixed(2)}) does not equal Total Credits (Rs. ${totalCredit.toFixed(2)}).`
    );
  }
}

function validateLedgerLines(lines, type) {
  for (const line of lines) {
    if (!line.account_id || !Number.isFinite(Number(line.amount)) || Number(line.amount) <= 0) {
      throw new Error(`Invalid ${type} ledger line: account_id and positive amount required`);
    }
  }
}

function ensureSystemAccount(db, code, title, accountType) {
  const existing = db.prepare('SELECT id FROM accounts WHERE code = ?').get(code);
  if (existing) {
    return existing;
  }

  const info = db.prepare(`
    INSERT INTO accounts (code, title, account_type, status, created_at, updated_at)
    VALUES (?, ?, ?, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(code, title, accountType);

  return { id: info.lastInsertRowid };
}

function getCustomerReceivableBalance(db, customerId) {
  const account = db.prepare(`
    SELECT opening_balance, opening_balance_type
    FROM accounts
    WHERE id = ? AND account_type = 'CUSTOMER'
  `).get(customerId);

  if (!account) {
    return null;
  }

  const openingBalance = Number(account.opening_balance_type) === 'Cr'
    ? -Number(account.opening_balance || 0)
    : Number(account.opening_balance || 0);

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN ll.type = 'debit' THEN ll.amount ELSE 0 END), 0) AS total_debit,
      COALESCE(SUM(CASE WHEN ll.type = 'credit' THEN ll.amount ELSE 0 END), 0) AS total_credit
    FROM ledger_lines ll
    INNER JOIN master_entries me ON me.id = ll.entry_id AND me.status = 'POSTED'
    WHERE ll.account_id = ?
  `).get(customerId);

  return roundMoney(
    openingBalance + Number(totals.total_debit || 0) - Number(totals.total_credit || 0)
  );
}

class AccountingService {
  postTransaction(params) {
    let {
      entry_type,
      date = new Date().toISOString().split('T')[0],
      description = '',
      reference_no = '',
      debit_lines = [],
      credit_lines = [],
      inventory_lines = [],
      status = 'POSTED',
    } = params;

    if (!entry_type) {
      throw new Error('Transaction entry_type is required');
    }

    if (!debit_lines.length || !credit_lines.length) {
      throw new Error('Accounting transaction must contain at least one debit line and one credit line');
    }

    // 1. Calculate and validate total debits vs total credits with 2-decimal rounded precision
    const totalDebit = debit_lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
    const totalCredit = credit_lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

    const roundedDebit = Math.round(totalDebit * 100) / 100;
    const roundedCredit = Math.round(totalCredit * 100) / 100;

    if (roundedDebit !== roundedCredit) {
      throw new Error(
        `Unbalanced double-entry transaction! Total Debits (Rs. ${roundedDebit.toFixed(2)}) does not equal Total Credits (Rs. ${roundedCredit.toFixed(2)}).`
      );
    }

    const db = getDb();

// Generate unique sequential reference if missing or client-side placeholder
    if (!reference_no || reference_no.startsWith('INV-') || reference_no === 'AUTO') {
      const prefix = entry_type === 'SALE' ? 'SL-' : 
                       entry_type === 'SALES_RETURN' ? 'SR-' : 
                       entry_type === 'PURCHASE' ? 'PR-' : 
                       entry_type === 'PURCHASE_RETURN' ? 'PRR-' :
                       entry_type === 'CAPITAL' ? 'CAP-' :
                       entry_type === 'CAPITAL_WITHDRAWAL' ? 'CW-' : 'TX-';
      
      // We will generate this inside the transaction to ensure thread safety with SQLite
    }

    // 2. Perform Atomic Transaction
    const executePost = db.transaction(() => {
      // Re-evaluate reference_no safely inside lock
      if (!reference_no || reference_no.startsWith('INV-') || reference_no === 'AUTO') {
        const prefix = entry_type === 'SALE' ? 'SL-' : 
                       entry_type === 'SALES_RETURN' ? 'SR-' : 
                       entry_type === 'PURCHASE' ? 'PR-' : 
                       entry_type === 'PURCHASE_RETURN' ? 'PRR-' :
                       entry_type === 'CAPITAL' ? 'CAP-' :
                       entry_type === 'CAPITAL_WITHDRAWAL' ? 'CW-' : 'TX-';
        const lastEntry = db.prepare(`SELECT seq FROM sqlite_sequence WHERE name = 'master_entries'`).get();
        const nextId = (lastEntry ? lastEntry.seq : 0) + 1;
        reference_no = `${prefix}${String(nextId).padStart(6, '0')}`;
      }

      // Create Header Master Entry
      const entryId = ledgerRepository.createMasterEntry({
        entry_type,
        date,
        description,
        reference_no,
        status: status || 'POSTED',
      }, db);

      // Insert Debit Ledger Lines
      for (const dLine of debit_lines) {
        if (!dLine.account_id || Number(dLine.amount) <= 0) {
          throw new Error('Invalid debit ledger line: account_id and positive amount required');
        }
        ledgerRepository.insertLedgerLine({
          entry_id: entryId,
          account_id: dLine.account_id,
          type: 'debit',
          amount: Number(dLine.amount),
        }, db);
      }

      // Insert Credit Ledger Lines
      for (const cLine of credit_lines) {
        if (!cLine.account_id || Number(cLine.amount) <= 0) {
          throw new Error('Invalid credit ledger line: account_id and positive amount required');
        }
        ledgerRepository.insertLedgerLine({
          entry_id: entryId,
          account_id: cLine.account_id,
          type: 'credit',
          amount: Number(cLine.amount),
        }, db);
      }

      let totalSaleCogs = 0;
      let totalReturnCogs = 0;

      // Process Inventory Transactions & Authoritative WAC Calculations
      for (const inv of inventory_lines) {
        if (!inv.item_id || !inv.qty) continue;

        const currentItem = itemRepository.findById(inv.item_id, db);
        if (!currentItem) {
          throw new Error(`Inventory item with ID ${inv.item_id} does not exist`);
        }

        const currentQty = Number(currentItem.stock_qty) || 0;
        const currentWac = Number(currentItem.current_wac) > 0
          ? Number(currentItem.current_wac)
          : (Number(currentItem.purchase_price) || 0);

        const txQty = Number(inv.qty);
        const txUnitPrice = Math.round(Number(inv.unit_price || 0) * 100) / 100;
        const txTotalPrice = Math.round((Number(inv.total_price) || (txQty * txUnitPrice)) * 100) / 100;
        const txType = inv.transaction_type || entry_type;

        // Block negative stock
        if (txType === 'SALE' || txType === 'PURCHASE_RETURN') {
          if (currentQty < txQty) {
            throw new Error(`Insufficient stock for item: ${currentItem.name}. Available: ${currentQty}, Requested: ${txQty}`);
          }
        }

        let recordedCostPrice = 0.00;
        let recordedTotalCost = 0.00;

        if (txType === 'PURCHASE') {
          const validExistingQty = Math.max(0, currentQty);
          const totalExistingCost = validExistingQty * currentWac;
          const totalNewPurchaseCost = txQty * txUnitPrice;
          const totalNewQty = validExistingQty + txQty;
          
          let newWac = totalNewQty > 0
            ? (totalExistingCost + totalNewPurchaseCost) / totalNewQty
            : txUnitPrice;
          newWac = Math.round(newWac * 100) / 100;

          recordedCostPrice = txUnitPrice;
          recordedTotalCost = Math.round(txQty * txUnitPrice * 100) / 100;

          itemRepository.updateWacAndStock(inv.item_id, txQty, newWac, txUnitPrice, db);

        } else if (txType === 'SALE') {
          recordedCostPrice = currentWac;
          recordedTotalCost = Math.round(txQty * currentWac * 100) / 100;
          totalSaleCogs += recordedTotalCost;

          itemRepository.updateStockQty(inv.item_id, -txQty, db);

        } else if (txType === 'SALES_RETURN') {
          let returnCost = Number(inv.cost_price);
          if (!returnCost || returnCost <= 0) {
            const lastSale = db.prepare(`
              SELECT cost_price FROM inventory_transactions
              WHERE item_id = ? AND transaction_type = 'SALE'
              ORDER BY id DESC LIMIT 1
            `).get(inv.item_id);
            returnCost = lastSale?.cost_price || currentWac || Number(currentItem.purchase_price) || 0;
          }
          returnCost = Math.round(Number(returnCost) * 100) / 100;

          recordedCostPrice = returnCost;
          recordedTotalCost = Math.round(txQty * returnCost * 100) / 100;
          totalReturnCogs += recordedTotalCost;

          itemRepository.updateStockQty(inv.item_id, txQty, db);

        } else if (txType === 'PURCHASE_RETURN') {
          recordedCostPrice = txUnitPrice;
          recordedTotalCost = Math.round(txQty * txUnitPrice * 100) / 100;

          let newWac = currentWac;
          if (currentQty > txQty) {
            const remainingCost = (currentQty * currentWac) - (txQty * txUnitPrice);
            const remainingQty = currentQty - txQty;
            if (remainingCost > 0 && remainingQty > 0) {
              newWac = Math.round((remainingCost / remainingQty) * 100) / 100;
            }
          }

          itemRepository.updateWacAndStock(inv.item_id, -txQty, newWac, null, db);

        } else {
          recordedCostPrice = currentWac;
          recordedTotalCost = Math.round(txQty * currentWac * 100) / 100;
          itemRepository.updateStockQty(inv.item_id, txQty, db);
        }

        ledgerRepository.insertInventoryTransaction({
          entry_id: entryId,
          item_id: inv.item_id,
          transaction_type: txType,
          qty: txQty,
          unit_price: txUnitPrice,
          total_price: txTotalPrice,
          cost_price: recordedCostPrice,
          total_cost: recordedTotalCost,
        }, db);
      }

      // Record Missing COGS Entries automatically
      totalSaleCogs = Math.round(totalSaleCogs * 100) / 100;
      totalReturnCogs = Math.round(totalReturnCogs * 100) / 100;

      if (totalSaleCogs > 0 || totalReturnCogs > 0) {
        const invAccount = db.prepare("SELECT id FROM accounts WHERE code = '5001'").get();
        const cogsAccount = db.prepare("SELECT id FROM accounts WHERE code = '5003'").get();
        
        if (!invAccount || !cogsAccount) {
          throw new Error("Cannot post COGS entries. System accounts 5001 (Inventory) or 5003 (COGS) are missing.");
        }
        
        if (totalSaleCogs > 0) {
          // SALE: Debit COGS, Credit INVENTORY
          ledgerRepository.insertLedgerLine({ entry_id: entryId, account_id: cogsAccount.id, type: 'debit', amount: totalSaleCogs }, db);
          ledgerRepository.insertLedgerLine({ entry_id: entryId, account_id: invAccount.id, type: 'credit', amount: totalSaleCogs }, db);
        }
        
        if (totalReturnCogs > 0) {
          // SALES RETURN: Debit INVENTORY, Credit COGS
          ledgerRepository.insertLedgerLine({ entry_id: entryId, account_id: invAccount.id, type: 'debit', amount: totalReturnCogs }, db);
          ledgerRepository.insertLedgerLine({ entry_id: entryId, account_id: cogsAccount.id, type: 'credit', amount: totalReturnCogs }, db);
        }
      }

      return {
        success: true,
        entryId,
        referenceNo: reference_no,
        totalAmount: roundedDebit,
        message: `Transaction [${entry_type}] posted successfully.`,
      };
    });

    return executePost();
  }

  // Phase 3: Get a full transaction (master + ledger lines + inventory)
  getTransaction(entryId) {
    const tx = ledgerRepository.getTransaction(entryId);
    if (!tx) {
      throw new Error(`Transaction with ID ${entryId} not found`);
    }
    return tx;
  }

  // Phase 3: List transactions with filters
  listTransactions(filters = {}) {
    return ledgerRepository.listEntries(filters);
  }

  // Phase 3: Reverse the inventory/WAC effects of a posted entry
  reverseTransactionEffects(entryId, db) {
    const { inventory_lines } = ledgerRepository.getTransaction(entryId);

    for (const inv of inventory_lines) {
      const currentItem = itemRepository.findById(inv.item_id, db);
      if (!currentItem) continue;

      const txType = inv.transaction_type;
      const txQty = Number(inv.qty);

      if (txType === 'PURCHASE') {
        // Undo qty increase and recalculate WAC by replaying
        itemRepository.updateStockQty(inv.item_id, -txQty, db);
        this.rebuildWacAfterVoid(inv.item_id, db);
      } else if (txType === 'SALE') {
        // Restore qty
        itemRepository.updateStockQty(inv.item_id, txQty, db);
        // COGS auto-lines were on the same entry; ledger reverse handles them
      } else if (txType === 'SALES_RETURN') {
        // Undo qty increase from sales return
        itemRepository.updateStockQty(inv.item_id, -txQty, db);
        this.rebuildWacAfterVoid(inv.item_id, db);
      } else if (txType === 'PURCHASE_RETURN') {
        // Undo qty decrease from purchase return
        itemRepository.updateStockQty(inv.item_id, txQty, db);
        this.rebuildWacAfterVoid(inv.item_id, db);
      } else {
        itemRepository.updateStockQty(inv.item_id, txQty, db);
        this.rebuildWacAfterVoid(inv.item_id, db);
      }
    }
  }

  // Rebuild WAC for an item by replaying all POSTED inventory moves
  rebuildWacAfterVoid(itemId, db) {
    const item = itemRepository.findById(itemId, db);
    if (!item) return;

    const itemBaseCost = Number(item.purchase_price) || 0;
    const moves = db.prepare(`
      SELECT it.*
      FROM inventory_transactions it
      JOIN master_entries me ON it.entry_id = me.id
      WHERE it.item_id = ? AND me.status = 'POSTED'
      ORDER BY me.date ASC, me.id ASC, it.id ASC
    `).all(itemId);

    let qty = Number(item.opening_stock_qty) || 0;
    let totalCost = roundMoney(qty * (Number(item.opening_cost_price) || 0));
    let wac = qty > 0 ? Math.round((totalCost / qty) * 100) / 100 : (itemBaseCost > 0 ? itemBaseCost : 0);
    let latestPurchasePrice = item.purchase_price;

    for (const m of moves) {
      const mQty = Number(m.qty);
      const mUnitPrice = Math.round(Number(m.unit_price) * 100) / 100;
      const mTxType = m.transaction_type;

      if (mTxType === 'PURCHASE') {
        const totalExistingCost = qty * wac;
        const totalNewPurchaseCost = mQty * mUnitPrice;
        const totalNewQty = qty + mQty;
        wac = totalNewQty > 0
          ? Math.round(((totalExistingCost + totalNewPurchaseCost) / totalNewQty) * 100) / 100
          : mUnitPrice;
        qty = totalNewQty;
        latestPurchasePrice = mUnitPrice;
      } else if (mTxType === 'SALE') {
        if (qty >= mQty) {
          qty = roundMoney(qty - mQty);
        } else {
          qty = 0;
        }
      } else if (mTxType === 'SALES_RETURN') {
        qty = roundMoney(qty + mQty);
      } else if (mTxType === 'PURCHASE_RETURN') {
        if (qty >= mQty) {
          const remainingCost = (qty * wac) - (mQty * mUnitPrice);
          const remainingQty = qty - mQty;
          wac = remainingQty > 0 && remainingCost > 0
            ? Math.round((remainingCost / remainingQty) * 100) / 100
            : (itemBaseCost > 0 ? itemBaseCost : wac);
          qty = remainingQty;
        } else {
          qty = roundMoney(qty + mQty);
        }
      } else {
        qty = roundMoney(qty + mQty);
      }
    }

    itemRepository.updateWacAndStock(itemId, qty - (Number(item.stock_qty) || 0), wac, latestPurchasePrice, db);
  }

  // Phase 3: Void a transaction (reverse effects, mark as VOID)
  voidTransaction(entryId) {
    const db = getDb();

    const executeVoid = db.transaction(() => {
      const master = ledgerRepository.getMasterEntryById(entryId, db);
      if (!master) {
        throw new Error(`Transaction with ID ${entryId} not found`);
      }

      if (master.status === 'VOID') {
        throw new Error('Transaction is already voided');
      }

      // Reverse inventory/WAC effects
      this.reverseTransactionEffects(entryId, db);

      // Set master entry status to VOID (ledger and inventory lines remain for audit)
      ledgerRepository.setMasterEntryStatus(entryId, 'VOID', db);

      return {
        success: true,
        entryId: parseInt(entryId, 10),
        reference_no: master.reference_no,
        entry_type: master.entry_type,
        message: `Transaction [${master.entry_type}] ${master.reference_no || `#${master.id}`} has been voided. Inventory and ledger effects reversed.`,
      };
    });

    return executeVoid();
  }

  // Phase 3: Edit a transaction (void original + post new in single transaction)
  editTransaction(entryId, newPayload) {
    const db = getDb();

    const executeEdit = db.transaction(() => {
      const master = ledgerRepository.getMasterEntryById(entryId, db);
      if (!master) {
        throw new Error(`Transaction with ID ${entryId} not found`);
      }

      if (master.status === 'VOID') {
        throw new Error('Cannot edit a voided transaction');
      }

      // Validate new payload balance
      const totalDebit = (newPayload.debit_lines || []).reduce(
        (sum, line) => sum + (Number(line.amount) || 0), 0);
      const totalCredit = (newPayload.credit_lines || []).reduce(
        (sum, line) => sum + (Number(line.amount) || 0), 0);

      const roundedDebit = Math.round(totalDebit * 100) / 100;
      const roundedCredit = Math.round(totalCredit * 100) / 100;

      if (roundedDebit !== roundedCredit) {
        throw new Error(
          `Unbalanced edit! Total Debits (Rs. ${roundedDebit.toFixed(2)}) does not equal Total Credits (Rs. ${roundedCredit.toFixed(2)}).`
        );
      }

      // Reverse old effects
      this.reverseTransactionEffects(entryId, db);

      // Delete old ledger lines and inventory (they will be replaced)
      ledgerRepository.deleteLedgerLinesByEntryId(entryId, db);
      ledgerRepository.deleteInventoryByEntryId(entryId, db);

      // Set original to VOID
      ledgerRepository.setMasterEntryStatus(entryId, 'VOID', db);

      // Post new transaction using existing postTransaction logic
      const newPayloadWithType = {
        ...newPayload,
        entry_type: newPayload.entry_type || master.entry_type,
        status: 'POSTED',
      };

      // Use postTransaction's internal logic via the same db transaction
      const result = this.postTransactionWithDb(newPayloadWithType, db);

      return {
        success: true,
        originalEntryId: parseInt(entryId, 10),
        newEntryId: result.entryId,
        newReferenceNo: result.referenceNo,
        message: `Transaction updated: original voided, new entry [${result.referenceNo}] posted.`,
      };
    });

    return executeEdit();
  }

  // Internal: post transaction using an existing db connection (used by editTransaction)
  postTransactionWithDb(params, db) {
    let {
      entry_type,
      date = new Date().toISOString().split('T')[0],
      description = '',
      reference_no = '',
      debit_lines = [],
      credit_lines = [],
      inventory_lines = [],
      status = 'POSTED',
    } = params;

    if (!entry_type) throw new Error('Transaction entry_type is required');
    if (!debit_lines.length || !credit_lines.length) {
      throw new Error('Accounting transaction must contain at least one debit line and one credit line');
    }

    const totalDebit = debit_lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
    const totalCredit = credit_lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
    const roundedDebit = Math.round(totalDebit * 100) / 100;
    const roundedCredit = Math.round(totalCredit * 100) / 100;

    if (roundedDebit !== roundedCredit) {
      throw new Error(
        `Unbalanced double-entry transaction! Total Debits (Rs. ${roundedDebit.toFixed(2)}) does not equal Total Credits (Rs. ${roundedCredit.toFixed(2)}).`
      );
    }

    // Generate reference if needed
    if (!reference_no || reference_no.startsWith('INV-') || reference_no === 'AUTO') {
      const prefix = entry_type === 'SALE' ? 'SL-' :
                     entry_type === 'SALES_RETURN' ? 'SR-' :
                     entry_type === 'PURCHASE' ? 'PR-' :
                     entry_type === 'PURCHASE_RETURN' ? 'PRR-' :
                     entry_type === 'CAPITAL' ? 'CAP-' :
                     entry_type === 'CAPITAL_WITHDRAWAL' ? 'CW-' : 'TX-';
      const lastEntry = db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'master_entries'").get();
      const nextId = (lastEntry ? lastEntry.seq : 0) + 1;
      reference_no = `${prefix}${String(nextId).padStart(6, '0')}`;
    }

    const entryId = ledgerRepository.createMasterEntry({
      entry_type,
      date,
      description,
      reference_no,
      status: status || 'POSTED',
    }, db);

    for (const dLine of debit_lines) {
      ledgerRepository.insertLedgerLine({
        entry_id: entryId,
        account_id: dLine.account_id,
        type: 'debit',
        amount: Number(dLine.amount),
      }, db);
    }

    for (const cLine of credit_lines) {
      ledgerRepository.insertLedgerLine({
        entry_id: entryId,
        account_id: cLine.account_id,
        type: 'credit',
        amount: Number(cLine.amount),
      }, db);
    }

    let totalSaleCogs = 0;
    let totalReturnCogs = 0;

    for (const inv of inventory_lines) {
      if (!inv.item_id || !inv.qty) continue;

      const currentItem = itemRepository.findById(inv.item_id, db);
      if (!currentItem) throw new Error(`Inventory item with ID ${inv.item_id} does not exist`);

      const currentQty = Number(currentItem.stock_qty) || 0;
      const currentWac = Number(currentItem.current_wac) > 0
        ? Number(currentItem.current_wac)
        : (Number(currentItem.purchase_price) || 0);

      const txQty = Number(inv.qty);
      const txUnitPrice = Math.round(Number(inv.unit_price || 0) * 100) / 100;
      const txType = inv.transaction_type || entry_type;

      if (txType === 'SALE' || txType === 'PURCHASE_RETURN') {
        if (currentQty < txQty) {
          throw new Error(`Insufficient stock for item: ${currentItem.name}. Available: ${currentQty}, Requested: ${txQty}`);
        }
      }

      let recordedCostPrice = 0.00;
      let recordedTotalCost = 0.00;

      if (txType === 'PURCHASE') {
        const validExistingQty = Math.max(0, currentQty);
        const totalExistingCost = validExistingQty * currentWac;
        const totalNewPurchaseCost = txQty * txUnitPrice;
        const totalNewQty = validExistingQty + txQty;
        let newWac = totalNewQty > 0
          ? (totalExistingCost + totalNewPurchaseCost) / totalNewQty
          : txUnitPrice;
        newWac = Math.round(newWac * 100) / 100;
        recordedCostPrice = txUnitPrice;
        recordedTotalCost = Math.round(txQty * txUnitPrice * 100) / 100;
        itemRepository.updateWacAndStock(inv.item_id, txQty, newWac, txUnitPrice, db);
      } else if (txType === 'SALE') {
        recordedCostPrice = currentWac;
        recordedTotalCost = Math.round(txQty * currentWac * 100) / 100;
        totalSaleCogs += recordedTotalCost;
        itemRepository.updateStockQty(inv.item_id, -txQty, db);
      } else if (txType === 'SALES_RETURN') {
        let returnCost = Number(inv.cost_price);
        if (!returnCost || returnCost <= 0) {
          const lastSale = db.prepare(`
            SELECT cost_price FROM inventory_transactions
            WHERE item_id = ? AND transaction_type = 'SALE'
            ORDER BY id DESC LIMIT 1
          `).get(inv.item_id);
          returnCost = lastSale?.cost_price || currentWac || Number(currentItem.purchase_price) || 0;
        }
        returnCost = Math.round(Number(returnCost) * 100) / 100;
        recordedCostPrice = returnCost;
        recordedTotalCost = Math.round(txQty * returnCost * 100) / 100;
        totalReturnCogs += recordedTotalCost;
        itemRepository.updateStockQty(inv.item_id, txQty, db);
      } else if (txType === 'PURCHASE_RETURN') {
        recordedCostPrice = txUnitPrice;
        recordedTotalCost = Math.round(txQty * txUnitPrice * 100) / 100;
        let newWac = currentWac;
        if (currentQty > txQty) {
          const remainingCost = (currentQty * currentWac) - (txQty * txUnitPrice);
          const remainingQty = currentQty - txQty;
          if (remainingCost > 0 && remainingQty > 0) {
            newWac = Math.round((remainingCost / remainingQty) * 100) / 100;
          }
        }
        itemRepository.updateWacAndStock(inv.item_id, -txQty, newWac, null, db);
      } else {
        recordedCostPrice = currentWac;
        recordedTotalCost = Math.round(txQty * currentWac * 100) / 100;
        itemRepository.updateStockQty(inv.item_id, txQty, db);
      }

      ledgerRepository.insertInventoryTransaction({
        entry_id: entryId,
        item_id: inv.item_id,
        transaction_type: txType,
        qty: txQty,
        unit_price: txUnitPrice,
        total_price: Math.round(Number(inv.total_price) || (txQty * txUnitPrice)) * 100 / 100,
        cost_price: recordedCostPrice,
        total_cost: recordedTotalCost,
      }, db);
    }

    totalSaleCogs = Math.round(totalSaleCogs * 100) / 100;
    totalReturnCogs = Math.round(totalReturnCogs * 100) / 100;

    if (totalSaleCogs > 0 || totalReturnCogs > 0) {
      const invAccount = db.prepare("SELECT id FROM accounts WHERE code = '5001'").get();
      const cogsAccount = db.prepare("SELECT id FROM accounts WHERE code = '5003'").get();
      if (!invAccount || !cogsAccount) {
        throw new Error("Cannot post COGS entries. System accounts 5001 (Inventory) or 5003 (COGS) are missing.");
      }
      if (totalSaleCogs > 0) {
        ledgerRepository.insertLedgerLine({ entry_id: entryId, account_id: cogsAccount.id, type: 'debit', amount: totalSaleCogs }, db);
        ledgerRepository.insertLedgerLine({ entry_id: entryId, account_id: invAccount.id, type: 'credit', amount: totalSaleCogs }, db);
      }
      if (totalReturnCogs > 0) {
        ledgerRepository.insertLedgerLine({ entry_id: entryId, account_id: invAccount.id, type: 'debit', amount: totalReturnCogs }, db);
        ledgerRepository.insertLedgerLine({ entry_id: entryId, account_id: cogsAccount.id, type: 'credit', amount: totalReturnCogs }, db);
      }
    }

    return {
      success: true,
      entryId,
      referenceNo: reference_no,
      totalAmount: roundedDebit,
      message: `Transaction [${entry_type}] posted successfully.`,
    };
  }
}

module.exports = new AccountingService();
