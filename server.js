const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'data.json');
const hash = (pin, salt) => crypto.scryptSync(pin, salt, 32).toString('hex');

// ---- tiny JSON "database" (swap for MongoDB Atlas later) ----
function seed() {
  const mk = (card, name, pin, balance) => {
    const salt = crypto.randomBytes(8).toString('hex');
    return { card, name, salt, pinHash: hash(pin, salt), balance, failed: 0, locked: false, history: [] };
  };
  return [mk('1111222233334444', 'Aarav Sharma', '1234', 25000),
          mk('5555666677778888', 'Riya Verma', '4321', 48000)];
}
let accounts = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE)) : seed();
const save = () => fs.writeFileSync(DB_FILE, JSON.stringify(accounts, null, 2));
save();

const sessions = new Map(); // token -> card
const LIMIT = 20000;        // per-withdrawal limit

function auth(req, res, next) {
  const card = sessions.get(req.headers['x-token']);
  const acc = accounts.find(a => a.card === card);
  if (!acc) return res.status(401).json({ error: 'Session expired. Insert card again.' });
  req.acc = acc; next();
}
const log = (acc, type, amount) => {
  acc.history.unshift({ type, amount, balance: acc.balance, date: new Date().toISOString() });
  acc.history = acc.history.slice(0, 20); save();
};

app.post('/api/login', (req, res) => {
  const { card, pin } = req.body;
  const acc = accounts.find(a => a.card === card);
  if (!acc) return res.status(404).json({ error: 'Card not recognised.' });
  if (acc.locked) return res.status(423).json({ error: 'Card blocked after 3 wrong PINs.' });
  if (hash(String(pin), acc.salt) !== acc.pinHash) {
    acc.failed++; if (acc.failed >= 3) acc.locked = true; save();
    return res.status(401).json({ error: acc.locked ? 'Card blocked.' : `Wrong PIN. ${3 - acc.failed} attempt(s) left.` });
  }
  acc.failed = 0; save();
  const token = crypto.randomBytes(16).toString('hex');
  sessions.set(token, acc.card);
  res.json({ token, name: acc.name });
});

app.get('/api/balance', auth, (req, res) => res.json({ balance: req.acc.balance }));
app.get('/api/history', auth, (req, res) => res.json(req.acc.history));

app.post('/api/deposit', auth, (req, res) => {
  const amt = Number(req.body.amount);
  if (!Number.isInteger(amt) || amt <= 0 || amt > 100000) return res.status(400).json({ error: 'Enter a valid amount (max 1,00,000).' });
  req.acc.balance += amt; log(req.acc, 'Deposit', amt);
  res.json({ balance: req.acc.balance });
});

app.post('/api/withdraw', auth, (req, res) => {
  const amt = Number(req.body.amount);
  if (!Number.isInteger(amt) || amt <= 0 || amt % 100 !== 0) return res.status(400).json({ error: 'Amount must be a multiple of 100.' });
  if (amt > LIMIT) return res.status(400).json({ error: `Limit per withdrawal is ${LIMIT}.` });
  if (amt > req.acc.balance) return res.status(400).json({ error: 'Insufficient balance.' });
  req.acc.balance -= amt; log(req.acc, 'Withdrawal', amt);
  res.json({ balance: req.acc.balance });
});

app.post('/api/change-pin', auth, (req, res) => {
  const { oldPin, newPin } = req.body;
  if (hash(String(oldPin), req.acc.salt) !== req.acc.pinHash) return res.status(401).json({ error: 'Old PIN is incorrect.' });
  if (!/^\d{4}$/.test(newPin)) return res.status(400).json({ error: 'New PIN must be 4 digits.' });
  req.acc.pinHash = hash(newPin, req.acc.salt); save();
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => { sessions.delete(req.headers['x-token']); res.json({ ok: true }); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ATM running → http://localhost:${PORT}`));
