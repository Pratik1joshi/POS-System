// Shop-specific database (Local SQLite)
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

export function getShopDatabase(shopId) {
  // Create databases directory if it doesn't exist
  const dbDir = path.join(process.cwd(), 'databases')
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  const dbPath = path.join(dbDir, `shop_${shopId}.db`)
  const db = new Database(dbPath)

  // Initialize shop database schema
  db.exec(`
    -- Shop Information
    CREATE TABLE IF NOT EXISTS shop_info (
      id INTEGER PRIMARY KEY,
      shop_id TEXT UNIQUE NOT NULL,
      shop_name TEXT NOT NULL,
      owner_name TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Customers (Shop-specific customer database)
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      age INTEGER,
      address TEXT,
      total_purchases INTEGER DEFAULT 0,
      total_spent REAL DEFAULT 0,
      credit_balance REAL DEFAULT 0,
      loyalty_points INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_purchase_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Credit Payments (Track partial payments on credit)
    CREATE TABLE IF NOT EXISTS credit_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      transaction_id INTEGER,
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'Cash',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    );

    -- Local Transactions (Shop-specific sales)
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_number TEXT UNIQUE,
      customer_id INTEGER,
      total REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      final_total REAL DEFAULT 0,
      payment_method TEXT,
      amount_paid REAL DEFAULT 0,
      change_amount REAL DEFAULT 0,
      credit_amount REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    -- Transaction Items
    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER,
      product_id INTEGER,  -- Links to shop products table
      product_name TEXT,
      product_barcode TEXT,
      quantity INTEGER DEFAULT 1,
      price REAL DEFAULT 0,
      subtotal REAL DEFAULT 0,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- Products (Shop-specific product catalog)
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      barcode TEXT UNIQUE NOT NULL,
      category TEXT,
      price REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      unit TEXT DEFAULT 'pcs',
      min_stock INTEGER DEFAULT 10,
      global_product_id TEXT,  -- Optional link to Global Product Master
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Local Stock Levels (Shop-specific inventory) - DEPRECATED, use products table
    CREATE TABLE IF NOT EXISTS local_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      global_product_id TEXT UNIQUE NOT NULL,  -- Links to Global Product Master
      stock INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 10,
      cost_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Stock History (Local)
    CREATE TABLE IF NOT EXISTS stock_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      change_type TEXT,
      quantity_change INTEGER,
      previous_stock INTEGER,
      new_stock INTEGER,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- Held Bills (Local)
    CREATE TABLE IF NOT EXISTS held_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      held_by TEXT,
      total REAL DEFAULT 0,
      item_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS held_bill_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      held_bill_id INTEGER,
      global_product_id TEXT NOT NULL,
      product_name TEXT,
      product_barcode TEXT,
      quantity INTEGER DEFAULT 1,
      price REAL DEFAULT 0,
      FOREIGN KEY (held_bill_id) REFERENCES held_bills(id)
    );

    -- Sync Queue (tracks what needs to be synced to cloud)
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id INTEGER NOT NULL,
      action TEXT NOT NULL, -- 'insert', 'update', 'delete'
      data TEXT, -- JSON data
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced INTEGER DEFAULT 0
    );
  `)

  // Migration: Add customer_id and credit_amount to existing transactions table
  try {
    const transactionsInfo = db.prepare("PRAGMA table_info(transactions)").all()
    const hasCustomerId = transactionsInfo.some(col => col.name === 'customer_id')
    const hasCreditAmount = transactionsInfo.some(col => col.name === 'credit_amount')
    
    if (!hasCustomerId) {
      console.log(`Adding customer_id column to transactions table in ${shopId}`)
      db.exec('ALTER TABLE transactions ADD COLUMN customer_id INTEGER')
    }
    
    if (!hasCreditAmount) {
      console.log(`Adding credit_amount column to transactions table in ${shopId}`)
      db.exec('ALTER TABLE transactions ADD COLUMN credit_amount REAL DEFAULT 0')
    }
  } catch (error) {
    console.error('Migration error (transactions):', error)
  }

  // Migration: Add product_id to existing transaction_items table (rename from global_product_id)
  try {
    const itemsInfo = db.prepare("PRAGMA table_info(transaction_items)").all()
    const hasProductId = itemsInfo.some(col => col.name === 'product_id')
    const hasGlobalProductId = itemsInfo.some(col => col.name === 'global_product_id')
    
    if (!hasProductId && hasGlobalProductId) {
      console.log(`Migrating transaction_items: global_product_id -> product_id in ${shopId}`)
      // SQLite doesn't support RENAME COLUMN directly in older versions, so we recreate the table
      db.exec(`
        -- Create temporary table with new schema
        CREATE TABLE transaction_items_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transaction_id INTEGER,
          product_id INTEGER,
          product_name TEXT,
          product_barcode TEXT,
          quantity INTEGER DEFAULT 1,
          price REAL DEFAULT 0,
          subtotal REAL DEFAULT 0,
          FOREIGN KEY (transaction_id) REFERENCES transactions(id),
          FOREIGN KEY (product_id) REFERENCES products(id)
        );
        
        -- Copy data from old table (global_product_id -> product_id)
        INSERT INTO transaction_items_new (id, transaction_id, product_id, product_name, product_barcode, quantity, price, subtotal)
        SELECT id, transaction_id, global_product_id, product_name, product_barcode, quantity, price, subtotal
        FROM transaction_items;
        
        -- Drop old table
        DROP TABLE transaction_items;
        
        -- Rename new table to original name
        ALTER TABLE transaction_items_new RENAME TO transaction_items;
      `)
    } else if (!hasProductId && !hasGlobalProductId) {
      console.log(`Adding product_id column to transaction_items table in ${shopId}`)
      db.exec('ALTER TABLE transaction_items ADD COLUMN product_id INTEGER')
    }
  } catch (error) {
    console.error('Migration error (transaction_items):', error)
  }

  // Migration: Fix stock_history table (rename global_product_id to product_id)
  try {
    const historyInfo = db.prepare("PRAGMA table_info(stock_history)").all()
    const hasProductId = historyInfo.some(col => col.name === 'product_id')
    const hasGlobalProductId = historyInfo.some(col => col.name === 'global_product_id')
    
    if (!hasProductId && hasGlobalProductId) {
      console.log(`Migrating stock_history: global_product_id -> product_id in ${shopId}`)
      db.exec(`
        CREATE TABLE stock_history_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          change_type TEXT,
          quantity_change INTEGER,
          previous_stock INTEGER,
          new_stock INTEGER,
          reason TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id)
        );
        
        INSERT INTO stock_history_new (id, product_id, change_type, quantity_change, previous_stock, new_stock, reason, created_at)
        SELECT id, global_product_id, change_type, quantity_change, previous_stock, new_stock, reason, created_at
        FROM stock_history;
        
        DROP TABLE stock_history;
        ALTER TABLE stock_history_new RENAME TO stock_history;
      `)
    }
  } catch (error) {
    console.error('Migration error (stock_history):', error)
  }

  return db
}

export function getCurrentShopId() {
  // Get from localStorage in production
  // For now, return default
  if (typeof window !== 'undefined') {
    return localStorage.getItem('currentShopId') || 'shop_demo'
  }
  return 'shop_demo'
}

export default getShopDatabase(getCurrentShopId())
