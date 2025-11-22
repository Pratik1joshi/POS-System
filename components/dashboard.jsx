'use client'

import { useState, useEffect } from 'react'
import StatCard from '@/components/stat-card'
import Chart from '@/components/chart'
import QuickActions from '@/components/quick-actions'
import { TrendingUp, TrendingDown, Clock, CreditCard, Wallet, Smartphone, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function Dashboard({ onNavigate }) {
  const [period, setPeriod] = useState('weekly')
  const [transactions, setTransactions] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [transactionsRes, productsRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/products')
      ])
      
      const transactionsData = await transactionsRes.json()
      const productsData = await productsRes.json()
      
      if (transactionsData.success) {
        setTransactions(transactionsData.transactions || [])
      }
      if (productsData.success) {
        setProducts(productsData.products || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate dynamic statistics
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const lastWeek = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)

  const filterTransactions = (startDate, endDate = null) => {
    return transactions.filter(t => {
      const date = new Date(t.created_at)
      return endDate ? date >= startDate && date < endDate : date >= startDate
    })
  }

  const calculateStats = (filteredTransactions, comparisonTransactions) => {
    const totalSales = filteredTransactions.reduce((sum, t) => sum + parseFloat(t.total || 0), 0)
    const totalCount = filteredTransactions.length
    const avgOrder = totalCount > 0 ? totalSales / totalCount : 0
    const totalItems = filteredTransactions.reduce((sum, t) => 
      sum + (t.items?.reduce((s, i) => s + i.quantity, 0) || 0), 0
    )
    
    // Calculate profit (assuming 30% margin)
    const profit = totalSales * 0.3
    
    // Calculate comparison changes
    const compSales = comparisonTransactions.reduce((sum, t) => sum + parseFloat(t.total || 0), 0)
    const compCount = comparisonTransactions.length
    const compItems = comparisonTransactions.reduce((sum, t) => 
      sum + (t.items?.reduce((s, i) => s + i.quantity, 0) || 0), 0
    )
    const compAvg = compCount > 0 ? compSales / compCount : 0
    const compProfit = compSales * 0.3
    
    const salesChange = compSales > 0 ? ((totalSales - compSales) / compSales) * 100 : 0
    const profitChange = compProfit > 0 ? ((profit - compProfit) / compProfit) * 100 : 0
    const itemsChange = compItems > 0 ? ((totalItems - compItems) / compItems) * 100 : 0
    const transactionsChange = compCount > 0 ? ((totalCount - compCount) / compCount) * 100 : 0
    const avgOrderChange = compAvg > 0 ? ((avgOrder - compAvg) / compAvg) * 100 : 0
    
    return {
      sales: { value: totalSales, change: salesChange, trend: salesChange >= 0 ? 'up' : 'down' },
      profit: { value: profit, change: profitChange, trend: profitChange >= 0 ? 'up' : 'down' },
      items: { value: totalItems, change: itemsChange, trend: itemsChange >= 0 ? 'up' : 'down' },
      transactions: { value: totalCount, change: transactionsChange, trend: transactionsChange >= 0 ? 'up' : 'down' },
      avgOrder: { value: avgOrder, change: avgOrderChange, trend: avgOrderChange >= 0 ? 'up' : 'down' },
      alerts: { value: products.filter(p => p.stock < (p.min_stock || 10)).length, change: 0, trend: 'neutral' }
    }
  }

  const todayTransactions = filterTransactions(today)
  const yesterdayTransactions = filterTransactions(yesterday, today)
  const weekTransactions = filterTransactions(thisWeek)
  const lastWeekTransactions = filterTransactions(lastWeek, thisWeek)

  const stats = {
    today: calculateStats(todayTransactions, yesterdayTransactions),
    weekly: calculateStats(weekTransactions, lastWeekTransactions)
  }

  const currentStats = stats[period]

  // Calculate category distribution
  const categorySales = {}
  transactions.forEach(transaction => {
    transaction.items?.forEach(item => {
      const product = products.find(p => p.id === item.product_id)
      if (product) {
        const category = product.category || 'Uncategorized'
        categorySales[category] = (categorySales[category] || 0) + (item.subtotal || 0)
      }
    })
  })

  const topCategory = Object.entries(categorySales)
    .sort(([, a], [, b]) => b - a)[0]

  // Calculate payment method distribution
  const paymentMethods = {}
  transactions.forEach(t => {
    const method = t.payment_method || 'Cash'
    paymentMethods[method] = (paymentMethods[method] || 0) + 1
  })
  const totalPayments = Object.values(paymentMethods).reduce((sum, count) => sum + count, 0)
  const topPaymentMethod = Object.entries(paymentMethods)
    .sort(([, a], [, b]) => b - a)[0]

  // Calculate peak transaction time
  const hourCounts = Array(24).fill(0)
  transactions.forEach(t => {
    const hour = new Date(t.created_at).getHours()
    hourCounts[hour]++
  })
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts))
  const peakHourPercent = hourCounts[peakHour] > 0 ? (hourCounts[peakHour] / transactions.length) * 100 : 0

  // Top selling products
  const productSales = {}
  transactions.forEach(transaction => {
    transaction.items?.forEach(item => {
      if (!productSales[item.product_id]) {
        productSales[item.product_id] = { quantity: 0, revenue: 0 }
      }
      productSales[item.product_id].quantity += item.quantity || 0
      productSales[item.product_id].revenue += item.subtotal || 0
    })
  })

  const topSellingProducts = Object.entries(productSales)
    .map(([productId, data]) => {
      const product = products.find(p => p.id === parseInt(productId))
      return {
        id: productId,
        name: product?.name || 'Unknown',
        category: product?.category || 'N/A',
        ...data
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Recent transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8)

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-xl font-semibold text-muted-foreground">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {period === 'today' ? 'Today\'s Performance' : 'Weekly Performance'}
          </p>
        </div>
        <div className="flex gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => setPeriod('today')}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              period === 'today'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setPeriod('weekly')}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              period === 'weekly'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            This Week
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="Total Sales"
          value={`Rs ${currentStats.sales.value.toFixed(2)}`}
          change={currentStats.sales.change}
          trend={currentStats.sales.trend}
          icon="💰"
        />
        <StatCard
          title="Net Profit"
          value={`Rs ${currentStats.profit.value.toFixed(2)}`}
          change={currentStats.profit.change}
          trend={currentStats.profit.trend}
          icon="📈"
        />
        <StatCard
          title="Items Sold"
          value={currentStats.items.value.toLocaleString()}
          change={currentStats.items.change}
          trend={currentStats.items.trend}
          icon="📦"
        />
        <StatCard
          title="Transactions"
          value={currentStats.transactions.value.toLocaleString()}
          change={currentStats.transactions.change}
          trend={currentStats.transactions.trend}
          icon="🔔"
        />
        <StatCard
          title="Avg Order"
          value={`Rs ${currentStats.avgOrder.value.toFixed(2)}`}
          change={currentStats.avgOrder.change}
          trend={currentStats.avgOrder.trend}
          icon="🛒"
        />
        <StatCard
          title="Alerts"
          value={currentStats.alerts.value}
          change={0}
          trend="neutral"
          icon="⚠️"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Chart 
          title="Daily Sales Trend" 
          span="lg:col-span-2" 
          type="line"
          data={(() => {
            // Generate last 7 days of sales data
            const days = []
            for (let i = 6; i >= 0; i--) {
              const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
              const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
              const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
              const dayTransactions = transactions.filter(t => {
                const tDate = new Date(t.created_at)
                return tDate >= dayStart && tDate < dayEnd
              })
              const dayTotal = dayTransactions.reduce((sum, t) => sum + parseFloat(t.total || 0), 0)
              days.push({
                label: date.toLocaleDateString('en-US', { weekday: 'short' }),
                value: dayTotal
              })
            }
            return days
          })()}
        />
        <Chart 
          title="Sales by Category" 
          span="col-span-1" 
          type="pie"
          data={Object.entries(categorySales)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([category, sales]) => ({
              label: category,
              value: sales
            }))}
        />
      </div>

      {/* Quick Actions */}
      <QuickActions onNavigate={onNavigate} />

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="pos-stat-card">
          <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-foreground">Top Performing Metrics</h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground">Highest Selling Category</span>
                <span className="font-bold text-primary text-sm">
                  {topCategory ? `${topCategory[0]} (Rs ${topCategory[1].toFixed(2)})` : 'N/A'}
                </span>
              </div>
              <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary"
                  style={{ width: topCategory ? `${(topCategory[1] / Object.values(categorySales).reduce((a,b) => a+b, 0)) * 100}%` : '0%' }}
                />
              </div>
            </div>
            
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground">Peak Transaction Time</span>
                <span className="font-bold text-primary text-sm">
                  {peakHour !== -1 ? `${peakHour % 12 || 12}:00 ${peakHour >= 12 ? 'PM' : 'AM'}` : 'N/A'}
                </span>
              </div>
              <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary"
                  style={{ width: `${peakHourPercent}%` }}
                />
              </div>
            </div>
            
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground">Payment Method Preference</span>
                <span className="font-bold text-primary text-sm">
                  {topPaymentMethod ? `${topPaymentMethod[0]} (${((topPaymentMethod[1] / totalPayments) * 100).toFixed(0)}%)` : 'N/A'}
                </span>
              </div>
              <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary"
                  style={{ width: topPaymentMethod ? `${(topPaymentMethod[1] / totalPayments) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pos-stat-card">
          <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-foreground">Top Selling Products</h3>
          {topSellingProducts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No sales data available</p>
          ) : (
            <div className="space-y-3">
              {topSellingProducts.map((product, idx) => (
                <div key={product.id} className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${idx < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                          #{idx + 1}
                        </span>
                        <span className="font-semibold text-sm truncate">{product.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{product.category}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-primary text-sm">Rs {product.revenue.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{product.quantity} sold</p>
                    </div>
                  </div>
                  <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-secondary"
                      style={{ width: topSellingProducts.length > 0 ? `${(product.revenue / topSellingProducts[0].revenue) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="pos-stat-card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-foreground">Recent Transactions</h3>
          <span className="text-sm text-muted-foreground">{recentTransactions.length} transactions</span>
        </div>
        {recentTransactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-xs sm:text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr className="text-muted-foreground font-semibold">
                  <th className="text-left py-2 sm:py-3 px-3 sm:px-4">ID</th>
                  <th className="text-right py-2 sm:py-3 px-3 sm:px-4">Amount</th>
                  <th className="text-center py-2 sm:py-3 px-3 sm:px-4 hidden sm:table-cell">Items</th>
                  <th className="text-left py-2 sm:py-3 px-3 sm:px-4 hidden lg:table-cell">Payment</th>
                  <th className="text-left py-2 sm:py-3 px-3 sm:px-4">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((transaction, i) => {
                  const itemCount = transaction.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
                  const transactionTime = new Date(transaction.created_at)
                  const paymentIcon = transaction.payment_method === 'Card' ? <CreditCard size={14} /> :
                                     transaction.payment_method === 'Mobile' ? <Smartphone size={14} /> :
                                     <Wallet size={14} />
                  
                  return (
                    <tr key={transaction.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="py-2 sm:py-3 px-3 sm:px-4 font-mono text-primary text-xs">
                        #{transaction.id}
                      </td>
                      <td className="py-2 sm:py-3 px-3 sm:px-4 font-bold text-foreground text-right">
                        Rs {parseFloat(transaction.total || 0).toFixed(2)}
                      </td>
                      <td className="py-2 sm:py-3 px-3 sm:px-4 text-center hidden sm:table-cell">
                        {itemCount}
                      </td>
                      <td className="py-2 sm:py-3 px-3 sm:px-4 hidden lg:table-cell">
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary font-semibold inline-flex items-center gap-1">
                          {paymentIcon}
                          {transaction.payment_method || 'Cash'}
                        </span>
                      </td>
                      <td className="py-2 sm:py-3 px-3 sm:px-4 text-muted-foreground text-xs">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {transactionTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="pos-stat-card border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <ArrowUpRight className="text-green-500" size={20} />
          </div>
          <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">
            Rs {transactions.reduce((sum, t) => sum + parseFloat(t.total || 0), 0).toFixed(2)}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">All time</p>
        </div>

        <div className="pos-stat-card border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Total Products</p>
            <ArrowUpRight className="text-purple-500" size={20} />
          </div>
          <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {products.length}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {Object.keys(categorySales).length} categories
          </p>
        </div>

        <div className="pos-stat-card border-l-4 border-amber-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Inventory Value</p>
            <ArrowUpRight className="text-amber-500" size={20} />
          </div>
          <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            Rs {products.reduce((sum, p) => sum + (p.stock * p.price), 0).toFixed(2)}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Current stock</p>
        </div>
      </div>
    </div>
  )
}
