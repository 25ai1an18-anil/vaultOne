const screen = document.getElementById('screen');
const cashEl = document.getElementById('cash');
let token = null, name = '', state = 'card', buf = '', tmp = {};

const api = async (url, method = 'GET', body) => {
  const r = await fetch('/api/' + url, { method, headers: { 'Content-Type': 'application/json', 'x-token': token || '' }, body: body && JSON.stringify(body) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || 'Something went wrong.');
  return d;
};
const inr = n => '₹' + Number(n).toLocaleString('en-IN');
const mask = s => '•'.repeat(s.length);

function draw(html) { screen.innerHTML = html; }
function msg(text, err) { const m = document.getElementById('msg'); if (m) { m.textContent = text; m.className = err ? 'err' : ''; } }
function entry() { const e = document.getElementById('entry'); if (e) e.textContent = (state === 'pin' || state === 'oldpin' || state === 'newpin') ? mask(buf) : buf; }

function show(s) {
  state = s; buf = '';
  if (s === 'card') draw(`<h2>Welcome to VaultOne</h2><p>Enter your 16-digit card number, then press Enter.</p><div class="entry" id="entry"></div><p id="msg"></p>`);
  if (s === 'pin') draw(`<h2>Enter PIN</h2><p>Card ${tmp.card.slice(-4).padStart(16, '•')}</p><div class="entry" id="entry"></div><p id="msg"></p>`);
  if (s === 'menu') draw(`<h2>Hello, ${name}</h2><p>What would you like to do?</p><div class="menu">
    <button data-a="balance">Check balance</button><button data-a="withdraw">Withdraw cash</button>
    <button data-a="deposit">Deposit cash</button><button data-a="history">Mini statement</button>
    <button data-a="pin">Change PIN</button><button data-a="exit">Eject card</button></div><p id="msg"></p>`);
  if (s === 'withdraw' || s === 'deposit') draw(`<h2>${s === 'withdraw' ? 'Withdraw' : 'Deposit'}</h2><p>Type an amount, press Enter. ${s === 'withdraw' ? 'Multiples of ₹100.' : ''}</p>
    <div class="row">${[500, 1000, 2000, 5000].map(v => `<button data-q="${v}">${inr(v)}</button>`).join('')}</div>
    <div class="entry" id="entry"></div><p id="msg"></p><div class="row"><button data-a="menu">Back</button></div>`);
  if (s === 'oldpin') draw(`<h2>Change PIN</h2><p>Enter your current PIN.</p><div class="entry" id="entry"></div><p id="msg"></p>`);
  if (s === 'newpin') draw(`<h2>Change PIN</h2><p>Enter a new 4-digit PIN.</p><div class="entry" id="entry"></div><p id="msg"></p>`);
}

async function submit() {
  try {
    if (state === 'card') { if (buf.length !== 16) return msg('Card number must be 16 digits.', 1); tmp.card = buf; return show('pin'); }
    if (state === 'pin') { const d = await api('login', 'POST', { card: tmp.card, pin: buf }); token = d.token; name = d.name; return show('menu'); }
    if (state === 'withdraw' || state === 'deposit') {
      const d = await api(state, 'POST', { amount: Number(buf) });
      if (state === 'withdraw') { cashEl.textContent = inr(buf) + ' dispensed'; cashEl.classList.add('out'); setTimeout(() => cashEl.classList.remove('out'), 3500); }
      const amt = buf; show(state); return msg(`Done. New balance ${inr(d.balance)}`);
    }
    if (state === 'oldpin') { tmp.old = buf; return show('newpin'); }
    if (state === 'newpin') { await api('change-pin', 'POST', { oldPin: tmp.old, newPin: buf }); show('menu'); return msg('PIN changed successfully.'); }
  } catch (e) {
    const wasLogin = state === 'pin'; msg(e.message, 1); buf = ''; entry();
    if (wasLogin && /blocked/i.test(e.message)) setTimeout(() => show('card'), 2500);
    if (/Session expired/.test(e.message)) setTimeout(() => show('card'), 1500);
  }
}

document.getElementById('pad').addEventListener('click', e => {
  const k = e.target.dataset.k; if (!k) return;
  if (k === 'C') { buf = ''; entry(); }
  else if (k === 'OK') submit();
  else { const max = state === 'card' ? 16 : (state.includes('pin') || state === 'pin') ? 4 : 7; if (buf.length < max) buf += k; entry(); }
});
addEventListener('keydown', e => {
  if (/^\d$/.test(e.key)) document.querySelector(`[data-k="${e.key}"]`).click();
  if (e.key === 'Enter') submit(); if (e.key === 'Backspace') { buf = buf.slice(0, -1); entry(); }
});

screen.addEventListener('click', async e => {
  const q = e.target.dataset.q, a = e.target.dataset.a;
  if (q) { buf = q; entry(); return; }
  if (!a) return;
  try {
    if (a === 'menu') return show('menu');
    if (a === 'withdraw' || a === 'deposit') return show(a);
    if (a === 'pin') return show('oldpin');
    if (a === 'balance') { const d = await api('balance'); draw(`<h2>Balance</h2><div class="big">${inr(d.balance)}</div><div class="row"><button data-a="menu">Back</button></div>`); }
    if (a === 'history') {
      const h = await api('history');
      draw(`<h2>Mini statement</h2><table>${h.slice(0, 6).map(t => `<tr><td>${new Date(t.date).toLocaleDateString('en-IN')}</td><td>${t.type}</td><td>${inr(t.amount)}</td></tr>`).join('') || '<tr><td>No transactions yet.</td></tr>'}</table><div class="row"><button data-a="menu">Back</button></div>`);
    }
    if (a === 'exit') { await api('logout', 'POST'); token = null; draw('<h2>Card ejected</h2><p>Thank you for banking with VaultOne.</p>'); setTimeout(() => show('card'), 1800); }
  } catch (err) { msg(err.message, 1); }
});

show('card');
