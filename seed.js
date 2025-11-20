import db from './lib/db.js'

// Seed sample products
const products = [
  { name: 'Dove Shampoo', barcode: '8901234567890', category: 'Cosmetics', price: 15.99, stock: 50, unit: 'bottle', min_stock: 10 },
  { name: 'Organic Shampoo', barcode: '8901234567891', category: 'Cosmetics', price: 22.99, stock: 30, unit: 'bottle', min_stock: 10 },
  { name: 'Aspirin 500mg', barcode: '8901234567892', category: 'Medicine', price: 5.99, stock: 100, unit: 'pack', min_stock: 20 },
  { name: 'Laptop Dell XPS', barcode: '8901234567893', category: 'Electronics', price: 899.99, stock: 5, unit: 'pcs', min_stock: 2 },
  { name: 'Phone Case', barcode: '8901234567894', category: 'Electronics', price: 25.50, stock: 75, unit: 'pcs', min_stock: 15 },
  { name: 'Wireless Mouse', barcode: '8901234567895', category: 'Electronics', price: 29.99, stock: 40, unit: 'pcs', min_stock: 10 },
  { name: 'USB Cable Type-C', barcode: '8901234567896', category: 'Electronics', price: 12.99, stock: 100, unit: 'pcs', min_stock: 25 },
  { name: 'Vitamin C 1000mg', barcode: '8901234567897', category: 'Medicine', price: 18.99, stock: 60, unit: 'bottle', min_stock: 15 },
  { name: 'Hand Sanitizer', barcode: '8901234567898', category: 'Health', price: 4.99, stock: 200, unit: 'bottle', min_stock: 50 },
  { name: 'Face Mask N95', barcode: '8901234567899', category: 'Health', price: 2.50, stock: 500, unit: 'pcs', min_stock: 100 },
  { name: 'Coca Cola 500ml', barcode: '8901234567800', category: 'Beverage', price: 1.99, stock: 150, unit: 'bottle', min_stock: 50 },
  { name: 'Pepsi 500ml', barcode: '8901234567801', category: 'Beverage', price: 1.99, stock: 150, unit: 'bottle', min_stock: 50 },
  { name: 'Mineral Water 1L', barcode: '8901234567802', category: 'Beverage', price: 0.99, stock: 300, unit: 'bottle', min_stock: 100 },
  { name: 'Lays Chips 50g', barcode: '8901234567803', category: 'Snacks', price: 2.49, stock: 120, unit: 'pack', min_stock: 30 },
  { name: 'Oreo Cookies', barcode: '8901234567804', category: 'Snacks', price: 3.99, stock: 80, unit: 'pack', min_stock: 20 },
  { name: 'Notebook A4', barcode: '8901234567805', category: 'Stationery', price: 4.99, stock: 100, unit: 'pcs', min_stock: 25 },
  { name: 'Ballpoint Pen Blue', barcode: '8901234567806', category: 'Stationery', price: 0.99, stock: 500, unit: 'pcs', min_stock: 100 },
  { name: 'Colgate Toothpaste', barcode: '8901234567807', category: 'Personal Care', price: 3.99, stock: 80, unit: 'tube', min_stock: 20 },
  { name: 'Gillette Razor', barcode: '8901234567808', category: 'Personal Care', price: 12.99, stock: 45, unit: 'pack', min_stock: 10 },
  { name: 'Dettol Soap', barcode: '8901234567809', category: 'Personal Care', price: 2.99, stock: 150, unit: 'bar', min_stock: 30 }
]

console.log('Seeding database with sample products...')

const stmt = db.prepare(`
  INSERT OR IGNORE INTO products (name, barcode, category, price, stock, unit, min_stock)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)

let inserted = 0
for (const product of products) {
  try {
    const result = stmt.run(
      product.name,
      product.barcode,
      product.category,
      product.price,
      product.stock,
      product.unit,
      product.min_stock
    )
    if (result.changes > 0) {
      inserted++
      console.log(`✓ Added: ${product.name}`)
    } else {
      console.log(`- Skipped (already exists): ${product.name}`)
    }
  } catch (error) {
    console.error(`✗ Error adding ${product.name}:`, error.message)
  }
}

console.log(`\nSeeding complete! Added ${inserted} new products.`)

// Display current products
const allProducts = db.prepare('SELECT * FROM products ORDER BY category, name').all()
console.log(`\nTotal products in database: ${allProducts.length}`)
console.log('\nProducts by category:')
const categories = {}
allProducts.forEach(p => {
  if (!categories[p.category]) categories[p.category] = []
  categories[p.category].push(p.name)
})
Object.entries(categories).forEach(([cat, prods]) => {
  console.log(`  ${cat}: ${prods.length} products`)
})

db.close()
