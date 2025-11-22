import { NextResponse } from 'next/server'
import adminDb from '@/lib/admin-db'

export async function GET() {
  try {
    // Total shops
    const totalShops = adminDb.prepare('SELECT COUNT(*) as count FROM shops').get()
    
    // Active shops
    const activeShops = adminDb.prepare(`
      SELECT COUNT(*) as count FROM shops WHERE subscription_status = 'active'
    `).get()
    
    // Total revenue this month
    const revenueThisMonth = adminDb.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM payments
      WHERE strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now')
        AND status = 'paid'
    `).get()
    
    // Total transactions across all shops (this month)
    const transactionsThisMonth = adminDb.prepare(`
      SELECT COUNT(*) as count
      FROM all_transactions
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get()
    
    // Total sales across all shops (this month)
    const salesThisMonth = adminDb.prepare(`
      SELECT COALESCE(SUM(final_total), 0) as total
      FROM all_transactions
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get()
    
    // Top 10 shops by sales
    const topShops = adminDb.prepare(`
      SELECT 
        s.id,
        s.shop_name,
        s.city,
        COALESCE(SUM(at.final_total), 0) as total_sales,
        COUNT(at.id) as transaction_count
      FROM shops s
      LEFT JOIN all_transactions at ON s.id = at.shop_id
        AND strftime('%Y-%m', at.created_at) = strftime('%Y-%m', 'now')
      GROUP BY s.id
      ORDER BY total_sales DESC
      LIMIT 10
    `).all()
    
    // Top 10 products across all shops
    const topProducts = adminDb.prepare(`
      SELECT 
        product_name,
        COUNT(*) as times_sold,
        SUM(quantity) as total_quantity,
        SUM(subtotal) as total_revenue
      FROM all_transaction_items
      WHERE product_name IS NOT NULL
      GROUP BY product_name
      ORDER BY total_revenue DESC
      LIMIT 10
    `).all()
    
    // Shops by city
    const shopsByCity = adminDb.prepare(`
      SELECT city, COUNT(*) as count
      FROM shops
      WHERE city IS NOT NULL
      GROUP BY city
      ORDER BY count DESC
      LIMIT 10
    `).all()
    
    // Recent sync logs
    const recentSyncs = adminDb.prepare(`
      SELECT 
        sl.*,
        s.shop_name
      FROM sync_logs sl
      JOIN shops s ON sl.shop_id = s.id
      ORDER BY sl.started_at DESC
      LIMIT 10
    `).all()
    
    // Pending payments
    const pendingPayments = adminDb.prepare(`
      SELECT 
        p.*,
        s.shop_name,
        s.owner_name,
        s.owner_phone
      FROM payments p
      JOIN shops s ON p.shop_id = s.id
      WHERE p.status = 'pending'
      ORDER BY p.period_end ASC
    `).all()

    return NextResponse.json({
      success: true,
      stats: {
        totalShops: totalShops.count,
        activeShops: activeShops.count,
        trialShops: totalShops.count - activeShops.count,
        revenueThisMonth: revenueThisMonth.total,
        transactionsThisMonth: transactionsThisMonth.count,
        salesThisMonth: salesThisMonth.total
      },
      topShops,
      topProducts,
      shopsByCity,
      recentSyncs,
      pendingPayments
    })

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
