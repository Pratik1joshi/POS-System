import { getShopDatabase } from '@/lib/shop-db'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const shopId = searchParams.get('shopId')

  if (!shopId) {
    return Response.json({ success: false, error: 'Shop ID required' }, { status: 400 })
  }

  try {
    const db = getShopDatabase(shopId)
    
    const products = db.prepare(`
      SELECT * FROM products
      ORDER BY created_at DESC
    `).all()

    return Response.json({ success: true, products })
  } catch (error) {
    console.error('Error fetching products:', error)
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
