const COMPANY_NAME = 'ARB Communication';

const TRANSACTION_LABELS = {
  SALE: 'Sale',
  SALES_RETURN: 'Sales Return',
  PURCHASE: 'Purchase',
  PURCHASE_RETURN: 'Purchase Return',
  RECEIPT: 'Receipt',
  HO_INCOMING: 'Receipt',
  PAYMENT: 'Payment',
  HO_OUTGOING: 'Payment',
  CAPITAL: 'Capital Investment',
  CAPITAL_WITHDRAWAL: 'Capital Withdrawal',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function formatCurrency(value) {
  const amount = roundMoney(value);
  const sign = amount < 0 ? '-' : '';
  const formatted = Math.abs(amount).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `Rs. ${sign}${formatted}`;
}

function formatOptionalCurrency(value) {
  const amount = roundMoney(value);
  return amount === 0 ? '<span class="muted">—</span>' : formatCurrency(amount);
}

function formatDate(value) {
  return value ? String(value).slice(0, 10) : '—';
}

function transactionLabel(entryType) {
  return TRANSACTION_LABELS[String(entryType || '').toUpperCase()] || String(entryType || '').replace(/_/g, ' ');
}

function rowParticulars(record) {
  const label = transactionLabel(record.entry_type);
  const description = String(record.description || '').trim();
  return description ? `${label} — ${description}` : label;
}

function buildTransactionRows(records, kind) {
  return records.map((record) => {
    const debit = roundMoney(record.debit);
    const credit = roundMoney(record.credit);
    const balance = roundMoney(record.running_balance);
    const debitCell = kind === 'customer' ? formatOptionalCurrency(debit) : formatOptionalCurrency(credit);
    const creditCell = kind === 'customer' ? formatOptionalCurrency(credit) : formatOptionalCurrency(debit);
    return `
      <tr>
        <td>${escapeHtml(formatDate(record.date))}</td>
        <td class="reference">${escapeHtml(record.reference_no || '—')}</td>
        <td>${escapeHtml(rowParticulars(record))}</td>
        <td class="amount">${debitCell}</td>
        <td class="amount">${creditCell}</td>
        <td class="amount balance">${formatCurrency(balance)}</td>
      </tr>`;
  }).join('');
}

function buildStatementHtml({ kind, data, dateFrom, dateTo, generatedAt, statementNo }) {
  const isCustomer = kind === 'customer';
  const party = isCustomer ? data.customer : data.supplier;
  const records = Array.isArray(data.records) ? data.records : [];
  const openingBalance = roundMoney(data.openingBalance);
  const closingBalance = roundMoney(data.closingBalance);
  const totalDebit = roundMoney(records.reduce((sum, record) => sum + Number(record.debit || 0), 0));
  const totalCredit = roundMoney(records.reduce((sum, record) => sum + Number(record.credit || 0), 0));
  const period = dateFrom && dateTo
    ? `${formatDate(dateFrom)} to ${formatDate(dateTo)}`
    : dateFrom
      ? `From ${formatDate(dateFrom)}`
      : dateTo
        ? `To ${formatDate(dateTo)}`
        : 'All available dates';
  const title = isCustomer ? 'CUSTOMER STATEMENT' : 'SUPPLIER STATEMENT';
  const subtitle = isCustomer ? 'ACCOUNT RECEIVABLE STATEMENT' : 'ACCOUNT PAYABLE STATEMENT';
  const openingLabel = isCustomer ? 'Opening Receivable Balance' : 'Opening Payable Balance';
  const closingLabel = isCustomer ? 'Closing Receivable Balance' : 'Closing Payable Balance';
  const firstAmountLabel = isCustomer ? 'Debit (Sales)' : 'Credit (Purchases)';
  const secondAmountLabel = isCustomer ? 'Credit (Receipts)' : 'Debit (Payments)';
  const balanceLabel = isCustomer ? 'Outstanding Receivable' : 'Outstanding Payable';
  const summary = data.summary || {};
  const summaryItems = isCustomer
    ? [
        ['Period Sales', summary.sales],
        ['Period Receipts & Returns', (summary.receipts || 0) + (summary.returns || 0)],
      ]
    : [
        ['Period Purchases', summary.purchases],
        ['Period Payments & Returns', (summary.payments || 0) + (summary.returns || 0)],
      ];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 13mm 12mm 17mm 12mm;
      @bottom-center {
        content: "Page " counter(page) " of " counter(pages);
        color: #64748b;
        font-size: 8px;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #0f172a;
      background: #ffffff;
      font-family: Arial, "Segoe UI", sans-serif;
      font-size: 9px;
      line-height: 1.35;
    }
    .page { width: 100%; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1d4ed8;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .company { font-size: 15px; font-weight: 700; letter-spacing: 0.2px; }
    .document-title { font-size: 16px; font-weight: 700; margin-top: 3px; }
    .document-subtitle { color: #2563eb; font-size: 9px; font-weight: 700; letter-spacing: 0.6px; margin-top: 1px; }
    .meta { text-align: right; color: #475569; font-size: 8.5px; }
    .meta strong { color: #0f172a; }
    .party-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr;
      gap: 8px;
      margin-bottom: 10px;
    }
    .party-box { border: 1px solid #e2e8f0; border-radius: 3px; padding: 7px 8px; background: #f8fafc; }
    .party-box .label { color: #64748b; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
    .party-box .value { font-size: 10px; font-weight: 700; margin-top: 2px; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin: 8px 0 10px;
    }
    .summary-box { border: 1px solid #e2e8f0; border-radius: 3px; padding: 6px 7px; background: #ffffff; }
    .summary-box .label { color: #64748b; font-size: 7.5px; font-weight: 700; text-transform: uppercase; }
    .summary-box .value { font-family: Consolas, monospace; font-size: 10px; font-weight: 700; margin-top: 2px; }
    .summary-box.highlight { background: #eff6ff; border-color: #bfdbfe; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    thead { display: table-header-group; }
    th {
      background: #f1f5f9;
      color: #334155;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.25px;
      text-align: left;
      text-transform: uppercase;
      border: 1px solid #cbd5e1;
      padding: 5px 4px;
    }
    td {
      border: 1px solid #e2e8f0;
      padding: 4px 4px;
      vertical-align: top;
      overflow-wrap: anywhere;
    }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tr { break-inside: avoid; }
    .reference { font-family: Consolas, monospace; font-weight: 700; }
    .amount { text-align: right; white-space: nowrap; font-family: Consolas, monospace; }
    .balance { font-weight: 700; }
    .muted { color: #94a3b8; }
    .opening-row td, .closing-row td, .total-row td { font-weight: 700; background: #f8fafc; }
    .closing-row td { background: #eff6ff; border-color: #bfdbfe; }
    .total-row td { background: #fff7ed; border-color: #fed7aa; }
    .empty { padding: 14px !important; text-align: center; color: #64748b; }
    .closing-note {
      margin-top: 9px;
      padding: 7px 8px;
      border: 1px solid #bfdbfe;
      border-radius: 3px;
      background: #eff6ff;
      font-size: 9px;
      font-weight: 700;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      margin-top: 10px;
      padding-top: 5px;
      color: #64748b;
      font-size: 8px;
      text-align: center;
    }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .page { min-height: 277mm; }
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="header">
      <div>
        <div class="company">${escapeHtml(COMPANY_NAME)}</div>
        <div class="document-title">${escapeHtml(title)}</div>
        <div class="document-subtitle">${escapeHtml(subtitle)}</div>
      </div>
      <div class="meta">
        <div>Statement No: <strong>${escapeHtml(statementNo)}</strong></div>
        <div>Generated On: <strong>${escapeHtml(generatedAt)}</strong></div>
        <div>Period: <strong>${escapeHtml(period)}</strong></div>
      </div>
    </header>

    <section class="party-grid">
      <div class="party-box">
        <div class="label">${isCustomer ? 'Customer' : 'Supplier'}</div>
        <div class="value">${escapeHtml(party.title || '—')}</div>
        <div class="muted">${escapeHtml(party.code ? `Code: ${party.code}` : '')}</div>
      </div>
      <div class="party-box">
        <div class="label">Contact</div>
        <div class="value">${escapeHtml(party.mobile || '—')}</div>
        <div class="muted">${isCustomer ? 'Receivable Account' : 'Payable Account'}</div>
      </div>
      <div class="party-box">
        <div class="label">Statement Basis</div>
        <div class="value">Posted Entries</div>
        <div class="muted">Read-only export</div>
      </div>
    </section>

    <section class="summary-grid">
      ${summaryItems.map(([label, value]) => `
        <div class="summary-box">
          <div class="label">${escapeHtml(label)}</div>
          <div class="value">${formatCurrency(value)}</div>
        </div>`).join('')}
      <div class="summary-box">
        <div class="label">${escapeHtml(openingLabel)}</div>
        <div class="value">${formatCurrency(openingBalance)}</div>
      </div>
      <div class="summary-box highlight">
        <div class="label">${escapeHtml(closingLabel)}</div>
        <div class="value">${formatCurrency(closingBalance)}</div>
      </div>
    </section>

    <table aria-label="${escapeHtml(title)}">
      <thead>
        <tr>
          <th style="width: 9%">Date</th>
          <th style="width: 13%">Voucher / Ref No</th>
          <th>Particulars</th>
          <th style="width: 14%">${escapeHtml(firstAmountLabel)}</th>
          <th style="width: 14%">${escapeHtml(secondAmountLabel)}</th>
          <th style="width: 15%">${escapeHtml(balanceLabel)}</th>
        </tr>
      </thead>
      <tbody>
        <tr class="opening-row">
          <td>Opening</td>
          <td>—</td>
          <td>${escapeHtml(openingLabel)}</td>
          <td class="amount">—</td>
          <td class="amount">—</td>
          <td class="amount balance">${formatCurrency(openingBalance)}</td>
        </tr>
        ${records.length ? buildTransactionRows(records, kind) : '<tr><td colspan="6" class="empty">No posted transactions in the selected period.</td></tr>'}
        <tr class="total-row">
          <td colspan="3">Period Totals</td>
          <td class="amount">${formatCurrency(totalDebit)}</td>
          <td class="amount">${formatCurrency(totalCredit)}</td>
          <td class="amount">—</td>
        </tr>
        <tr class="closing-row">
          <td>Closing</td>
          <td>—</td>
          <td>${escapeHtml(closingLabel)}</td>
          <td class="amount">—</td>
          <td class="amount">—</td>
          <td class="amount balance">${formatCurrency(closingBalance)}</td>
        </tr>
      </tbody>
    </table>

    <div class="closing-note">Closing ${isCustomer ? 'Receivable' : 'Payable'} Balance: ${escapeHtml(formatCurrency(closingBalance))}</div>
    <footer class="footer">This is a computer-generated statement. Amounts are in PKR and are based on posted ledger entries.</footer>
  </main>
</body>
</html>`;
}

module.exports = {
  buildCustomerStatementHtml: (data, options) => buildStatementHtml({ kind: 'customer', data, ...options }),
  buildSupplierStatementHtml: (data, options) => buildStatementHtml({ kind: 'supplier', data, ...options }),
};
