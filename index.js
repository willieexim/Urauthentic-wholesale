import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./db.sqlite');
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// Create tables on startup
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE, password TEXT, role TEXT)`);
  db.run(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, category TEXT, subcategory TEXT, name TEXT, price REAL)`);
  db.run(`CREATE TABLE IF NOT EXISTS variants (id INTEGER PRIMARY KEY, product_id INTEGER, color TEXT, size TEXT, stock INTEGER)`);
  db.run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY, outlet_email TEXT, items TEXT, payment_method TEXT, status TEXT, created_at TEXT)`);

  // Create default admin
  db.get("SELECT * FROM users WHERE email = 'admin@urauthentic.co.za'", (err, row) => {
    if (!row) {
      const hash = bcrypt.hashSync('admin123', 10);
      db.run("INSERT INTO users (email, password, role) VALUES (?,?,?)",
        ['admin@urauthentic.co.za', hash, 'admin']);
    }
  });
});

// Auth middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({error: 'No token'});
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({error: 'Invalid token'});
  }
};

// Login
app.post('/api/login', (req, res) => {
  const {email, password} = req.body;
  db.get("SELECT * FROM users WHERE email =?", [email], (err, user) => {
    if (!user ||!bcrypt.compareSync(password, user.password))
      return res.status(401).json({error: 'Invalid credentials'});
    const token = jwt.sign({id: user.id, email: user.email, role: user.role}, JWT_SECRET);
    res.json({token, user: {email: user.email, role: user.role}});
  });
});

// Get products with variants
app.get('/api/products', (req, res) => {
  db.all(`SELECT p.*, v.color, v.size, v.stock, v.id as variant_id
          FROM products p LEFT JOIN variants v ON p.id = v.product_id`, (err, rows) => {
    res.json(rows);
  });
});

// Create order
app.post('/api/orders', (req, res) => {
  const {outlet_email, items, payment_method} = req.body;
  const status = payment_method === 'consignment'? 'pending_consignment' : 'pending_payment';
  const created_at = new Date().toISOString();

  db.run(`INSERT INTO orders (outlet_email, items, payment_method, status, created_at)
          VALUES (?,?,?,?,?)`,
    [outlet_email, JSON.stringify(items), payment_method, status, created_at],
    function(err) {
      res.json({id: this.lastID, status});
    }
  );
});

// Get all orders - admin only
app.get('/api/orders', auth, (req, res) => {
  db.all("SELECT * FROM orders ORDER BY created_at DESC", (err, rows) => {
    res.json(rows);
  });
});

const PORT = process.env.PORT || 3000;
   app.listen(PORT, () => console.log(Server running on port ${PORT}));
