/* ═══════════════════════════════════════
   KASA — app.js
   Finance Terminal Logic
═══════════════════════════════════════ */

// ── STATE ─────────────────────────────────
let transactions = JSON.parse(localStorage.getItem('kasa_tx') || '[]');
let currentFilter = 'all';
let txType = 'income'; // 'income' | 'expense'

const CATEGORIES = {
  income:  ['Plat', 'Brigáda', 'Freelance', 'Investície', 'Ostatné príjmy'],
  expense: ['Jedlo', 'Bývanie', 'Doprava', 'Zábava', 'Zdravie', 'Oblečenie', 'Iné'],
};

// ── LOADER ───────────────────────────────
const LOADER_STEPS = [
  { pct: 10, msg: 'LOADING MODULES...' },
  { pct: 28, msg: 'CONNECTING TO STORAGE...' },
  { pct: 47, msg: 'DECRYPTING DATA...' },
  { pct: 65, msg: 'PARSING TRANSACTIONS...' },
  { pct: 82, msg: 'CALCULATING BALANCE...' },
  { pct: 94, msg: 'RENDERING INTERFACE...' },
  { pct: 100, msg: 'READY.' },
];

function runLoader() {
  const bar    = document.getElementById('loaderBar');
  const status = document.getElementById('loaderStatus');
  const pctEl  = document.getElementById('loaderPct');
  const loader = document.getElementById('loader');
  const app    = document.getElementById('app');

  let step = 0;

  function nextStep() {
    if (step >= LOADER_STEPS.length) {
      // Done — show app
      setTimeout(() => {
        loader.classList.add('fade-out');
        app.classList.remove('hidden');
        initApp();
        loader.addEventListener('transitionend', () => loader.remove(), { once: true });
      }, 350);
      return;
    }

    const { pct, msg } = LOADER_STEPS[step];
    bar.style.width    = pct + '%';
    status.textContent = msg;
    pctEl.textContent  = pct + '%';
    step++;

    // Random delay between steps: feels more "real"
    const delay = step === LOADER_STEPS.length ? 600 : 180 + Math.random() * 280;
    setTimeout(nextStep, delay);
  }

  // Small initial pause before starting
  setTimeout(nextStep, 400);
}

// ── INIT APP ─────────────────────────────
function updateCategories() {
  const sel = document.getElementById('category');
  sel.innerHTML = CATEGORIES[txType]
    .map(c => `<option value="${c}">▸ ${c.toUpperCase()}</option>`)
    .join('');
}

function initApp() {
  // Date
  document.getElementById('currentDate').textContent =
    new Date().toLocaleDateString('sk-SK', {
      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
    }).toUpperCase();

  // Type toggle
  document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      txType = btn.dataset.type;
      document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateCategories();
    });
  });

  updateCategories();

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  // Add button
  document.getElementById('btnAdd').addEventListener('click', addTransaction);

  // Enter key
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' &&
        (document.activeElement.id === 'desc' ||
         document.activeElement.id === 'amount' ||
         document.activeElement.id === 'category')) {
      addTransaction();
    }
  });

  render();
}

// ── SAVE ─────────────────────────────────
function save() {
  localStorage.setItem('kasa_tx', JSON.stringify(transactions));
}

// ── FORMAT CURRENCY ───────────────────────
function fmt(n) {
  return '€' + Math.abs(n).toLocaleString('sk-SK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// ── ADD TRANSACTION ───────────────────────
function addTransaction() {
  const descEl   = document.getElementById('desc');
  const amountEl = document.getElementById('amount');
  const cat      = document.getElementById('category').value;

  const desc   = descEl.value.trim();
  const amount = parseFloat(amountEl.value);

  let valid = true;

  if (!desc) {
    descEl.classList.add('error');
    valid = false;
  } else {
    descEl.classList.remove('error');
  }

  if (isNaN(amount) || amount <= 0) {
    amountEl.classList.add('error');
    valid = false;
  } else {
    amountEl.classList.remove('error');
  }

  if (!valid) {
    // Shake
    const form = document.querySelector('.form-section');
    form.style.transform = 'translateX(-4px)';
    setTimeout(() => { form.style.transform = 'translateX(4px)'; }, 60);
    setTimeout(() => { form.style.transform = ''; }, 120);
    return;
  }

  const isIncome = txType === 'income';

  transactions.unshift({
    id:     Date.now(),
    desc,
    amount: isIncome ? amount : -amount,
    cat,
    date:   new Date().toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit' }),
    ts:     Date.now()
  });

  descEl.value   = '';
  amountEl.value = '';
  descEl.focus();

  save();
  render();
}

// ── DELETE ────────────────────────────────
function deleteTransaction(id) {
  const item = document.querySelector(`[data-id="${id}"]`);
  if (item) {
    item.style.opacity = '0';
    item.style.transform = 'translateX(20px)';
    item.style.transition = 'opacity 0.15s, transform 0.15s';
    setTimeout(() => {
      transactions = transactions.filter(t => t.id !== id);
      save();
      render();
    }, 150);
  }
}

// ── RENDER ────────────────────────────────
function render() {
  const income  = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const balance = income + expense;

  // Stats
  document.getElementById('balance').textContent     = fmt(balance);
  document.getElementById('totalIncome').textContent  = fmt(income);
  document.getElementById('totalExpense').textContent = fmt(expense);

  // Balance bar: % of income used
  const balancePct = income > 0 ? Math.max(0, Math.min(100, (balance / income) * 100)) : 0;
  document.getElementById('balanceBar').style.width = balancePct + '%';

  // Balance color
  const balanceEl = document.getElementById('balance');
  balanceEl.classList.toggle('red', balance < 0);

  // Count
  document.getElementById('txCount').textContent = transactions.length + ' TXN';

  // Filter
  const filtered = transactions.filter(t => {
    if (currentFilter === 'income')  return t.amount > 0;
    if (currentFilter === 'expense') return t.amount < 0;
    return true;
  });

  document.getElementById('listCount').textContent =
    filtered.length > 0 ? filtered.length + ' ZÁZNAMOV' : '—';

  const list = document.getElementById('txList');

  if (filtered.length === 0) {
    list.innerHTML = `
      <li class="tx-empty">
        <span>PRÁZDNE</span>
        <small>Žiadne záznamy pre tento filter.</small>
      </li>`;
    return;
  }

  list.innerHTML = filtered.map(t => {
    const type = t.amount > 0 ? 'income' : 'expense';
    const sign = t.amount > 0 ? '+' : '−';
    return `
      <li class="tx-item" data-id="${t.id}">
        <div class="tx-indicator ${type}"></div>
        <div class="tx-desc">${escHtml(t.desc)}</div>
        <div class="tx-cat">${escHtml(t.cat).toUpperCase()}</div>
        <div class="tx-date">${t.date}</div>
        <div class="tx-amount ${type}">${sign}${fmt(t.amount)}</div>
        <button class="tx-del" onclick="deleteTransaction(${t.id})" title="Vymazať">×</button>
      </li>`;
  }).join('');
}

// ── XSS PROTECTION ────────────────────────
function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── BOOT ─────────────────────────────────
runLoader();