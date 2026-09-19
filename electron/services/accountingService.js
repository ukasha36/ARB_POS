const { getDb } = require('../database');
const ledgerRepository = require('../repositories/ledgerRepository');
const itemRepository = require('../repositories/itemRepository');

class AccountingService {
  postTransaction(params) {
    const {
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

    // 2. Perform Atomic Transaction
    const executePost = db.transaction(() => {
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

        let recordedCostPrice = 0.00;
        let recordedTotalCost = 0.00;

        if (txType === 'PURCHASE') {
          // PURCHASE:
          // New WAC = (Existing Qty * Current WAC + New Qty * Purchase Price) / (Existing Qty + New Qty)
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

          // Update stock qty, latest purchase price, and authoritative new WAC
          itemRepository.updateWacAndStock(inv.item_id, txQty, newWac, txUnitPrice, db);

        } else if (txType === 'SALE') {
          // SALE:
          // Authoritative Cost is the item's current WAC
          recordedCostPrice = currentWac;
          recordedTotalCost = Math.round(txQty * currentWac * 100) / 100;

          // Stock decreases by txQty; WAC of remaining inventory remains unchanged
          itemRepository.updateStockQty(inv.item_id, -txQty, db);

        } else if (txType === 'SALES_RETURN') {
          // SALES RETURN:
          // Stock restored at original authoritative WAC cost (reversing COGS)
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

          // Stock restored (+txQty); WAC remains unchanged
          itemRepository.updateStockQty(inv.item_id, txQty, db);

        } else if (txType === 'PURCHASE_RETURN') {
          // PURCHASE RETURN:
          // Stock returned to supplier at purchase unit cost; recalculate WAC
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
          // Other inventory adjustments
          recordedCostPrice = currentWac;
          recordedTotalCost = Math.round(txQty * currentWac * 100) / 100;
          itemRepository.updateStockQty(inv.item_id, txQty, db);
        }

        // Record immutable inventory audit transaction
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

      return {
        success: true,
        entryId,
        totalAmount: roundedDebit,
        message: `Transaction [${entry_type}] posted successfully.`,
      };
    });

    return executePost();
  }
}

module.exports = new AccountingService();
