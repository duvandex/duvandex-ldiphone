import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Package, ShoppingCart, TrendingUp, TrendingDown, Wallet, CreditCard, RefreshCw, ChevronRight, Activity, Calendar, Filter } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { useData } from '../context/AppDataContext';
import { fmt, cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

type TimePeriod = 'hoy' | 'semana' | 'mes' | 'año' | 'todo';

export default function Dashboard() {
  const { data, user, initializeDatabase, usdtRate } = useData();
  const [period, setPeriod] = useState<TimePeriod>('mes');

  const isDuvan = React.useMemo(() => user?.email === 'duvanmarinj@gmail.com', [user]);
  const isDbEmpty = React.useMemo(() => data.products.length === 0, [data.products]);

  const filteredData = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const filterByPeriod = (dateStr: string) => {
      if (!dateStr) return false;
      const date = new Date(dateStr + 'T12:00:00'); // Use noon to avoid TZ issues
      
      switch (period) {
        case 'hoy':
          return date.toDateString() === today.toDateString();
        case 'semana':
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          return date >= startOfWeek;
        case 'mes':
          return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
        case 'año':
          return date.getFullYear() === today.getFullYear();
        case 'todo':
          return true;
        default:
          return true;
      }
    };

    const soldInPeriod = data.products.filter(p => p.status === 'sold' && filterByPeriod(p.saleDate || ''));
    const expensesInPeriod = data.expenses.filter(e => filterByPeriod(e.date));
    
    return { soldInPeriod, expensesInPeriod };
  }, [data.products, data.expenses, period]);

  const { stock, sold, totalProfit, totalStockUnits, stockValue, totalRevenue } = React.useMemo(() => {
    const stockProducts = (data.products || []).filter(p => p.status === 'stock');
    const soldProducts = filteredData.soldInPeriod;
    
    const profit = soldProducts.reduce((acc, p) => acc + (((p.salePrice || 0) - p.purchasePrice) * (p.quantity || 1)), 0);
    const revenue = soldProducts.reduce((acc, p) => acc + ((p.salePrice || 0) * (p.quantity || 1)), 0);
    
    const stockVal = stockProducts.reduce((acc, p) => {
      if (p.isExternal) return acc;
      return acc + (p.purchasePrice * (p.quantity || 1));
    }, 0);
    
    const stockUnits = stockProducts.reduce((acc, p) => acc + (p.quantity || 1), 0);

    return {
      stock: stockProducts,
      sold: soldProducts,
      totalProfit: profit,
      totalStockUnits: stockUnits,
      stockValue: stockVal,
      totalRevenue: revenue
    };
  }, [data.products, filteredData.soldInPeriod]);
  
  const pendingDebts = React.useMemo(() => {
    return data.debtors.reduce((acc, d) => {
      const paid = d.payments.reduce((a, b) => a + b, 0);
      return acc + (d.totalAmount - paid);
    }, 0);
  }, [data.debtors]);

  const { investorStats, totalCapital, totalLiabilities } = React.useMemo(() => {
    const getAccountBalanceCOP = (acc: any) => {
      if (acc.method === 'Cripto (USDT)') {
        return acc.balance * usdtRate;
      }
      return acc.balance;
    };

    const investors = ['Duvan', 'Lina', 'Santiago', 'Johana', 'Pool', 'Santa Maria', 'Thomas'];
    const iStats = investors.map(inv => {
      let capital = 0;
      let profitView = 0;
      let salesView = 0;
      let stockCount = 0;

      // For capital and stock, we use global data (current state)
      data.products.forEach(p => {
        if (p.coInvestors && p.coInvestors.length > 0) {
          const coMatch = p.coInvestors.find(c => c.investor === inv);
          if (coMatch) {
            const share = coMatch.percentage / 100;
            if (p.status === 'stock') {
              capital += p.purchasePrice * p.quantity * share;
              stockCount += p.quantity * share;
            }
          }
        } 
        else if (!p.isExternal && p.investor === inv) {
          if (p.status === 'stock') {
            capital += p.purchasePrice * p.quantity;
            stockCount += p.quantity;
          }
        }
      });

      // For profit and sales, we use the PERIOD filtered data
      filteredData.soldInPeriod.forEach(p => {
        if (p.coInvestors && p.coInvestors.length > 0) {
          const coMatch = p.coInvestors.find(c => c.investor === inv);
          if (coMatch) {
            const share = coMatch.percentage / 100;
            salesView += (p.salePrice || 0) * p.quantity * share;
            profitView += ((p.salePrice || 0) - p.purchasePrice) * p.quantity * share;
          }
        } 
        else if (p.isExternal) {
          if (inv === 'Duvan') {
            salesView += (p.salePrice || 0) * p.quantity;
            profitView += ((p.salePrice || 0) - p.purchasePrice) * p.quantity;
          }
        }
        else if (p.investor === inv) {
          salesView += (p.salePrice || 0) * p.quantity;
          profitView += ((p.salePrice || 0) - p.purchasePrice) * p.quantity;
        }
      });
      
      return {
        name: inv,
        capital,
        sales: salesView,
        profit: profitView,
        balance: data.accounts.filter(a => a.investor === inv).reduce((acc, a) => acc + getAccountBalanceCOP(a), 0),
        stockCount
      };
    });

    const tCapital = data.accounts.reduce((acc, a) => acc + getAccountBalanceCOP(a), 0);

    const tLiabilities = data.liabilities.reduce((acc, l) => {
      const paid = l.payments.reduce((a, b) => a + b, 0);
      return acc + (l.totalAmount - paid);
    }, 0);

    return { investorStats: iStats, totalCapital: tCapital, totalLiabilities: tLiabilities };
  }, [data.products, data.accounts, data.liabilities, usdtRate, filteredData.soldInPeriod]);

  const stats = React.useMemo(() => [
    { label: 'Ventas Periodo', value: fmt(totalRevenue), icon: ShoppingCart, color: 'bg-primary/10 text-primary' },
    { label: 'Ganancia Periodo', value: fmt(totalProfit), icon: TrendingUp, color: totalProfit >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500' },
    { label: 'Capital Stock', value: fmt(stockValue), icon: Package, color: 'bg-blue-500/10 text-blue-500' },
    { label: 'Cuentas x Cobrar', value: fmt(pendingDebts), icon: CreditCard, color: 'bg-amber-500/10 text-amber-500' },
    { label: 'Pasivos (Deudas)', value: fmt(totalLiabilities), icon: TrendingDown, color: 'bg-rose-600/10 text-rose-600' },
  ], [totalRevenue, totalProfit, stockValue, pendingDebts, totalLiabilities]);

  const periodOptions: { value: TimePeriod; label: string }[] = [
    { value: 'hoy', label: 'Hoy' },
    { value: 'semana', label: 'Esta Semana' },
    { value: 'mes', label: 'Este Mes' },
    { value: 'año', label: 'Este Año' },
    { value: 'todo', label: 'Todo' },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-12"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            Cuentas y Ganancias
            <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full tracking-widest">REALTIME</span>
          </h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider opacity-60 mt-1">Control financiero y de inventario centralizado</p>
        </div>

        <div className="flex items-center bg-muted/30 p-1 rounded-2xl border border-border overflow-x-auto no-scrollbar">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={cn(
                "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap",
                period === opt.value 
                  ? "bg-white text-primary shadow-sm shadow-black/5" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isDuvan && isDbEmpty && (
        <Card className="card-premium bg-gradient-to-br from-white to-slate-50 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-4 relative z-10">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin-slow" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black tracking-tight">Estructura detectada, pero sin registros</h3>
              <p className="text-slate-500 text-sm max-w-sm">Si es tu primera vez, puedes restaurar la base de datos de LDIPHONE desde la nube.</p>
            </div>
            <Button onClick={initializeDatabase} className="bg-slate-900 rounded-full px-8 h-12 hover:scale-105 transition-transform">
              Sincronizar Cloud Data
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={item}>
            <Card className="card-premium border-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <div className={cn("p-2 rounded-xl", stat.color)}>
                  <stat.icon className="h-3.5 w-3.5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black tracking-tighter text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <Card className="card-premium border-none overflow-hidden h-full">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Rendimiento de Inversores
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={investorStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} stroke="var(--muted-foreground)" />
                  <YAxis fontSize={10} fontWeight={700} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000000}M`} stroke="var(--muted-foreground)" />
                  <Tooltip 
                    cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                    contentStyle={{ borderRadius: '16px', border: '1px solid var(--border)', backgroundColor: 'var(--card)', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)', padding: '12px' }}
                    labelStyle={{ fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px', color: 'var(--foreground)' }}
                  />
                    <Bar dataKey="profit" radius={[6, 6, 0, 0]} barSize={32}>
                      {investorStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? 'var(--primary)' : '#f43f5e'} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
  
          <motion.div variants={item}>
            <Card className="card-premium border-none h-full bg-slate-900 text-white overflow-hidden">
              <CardHeader className="border-b border-white/5 bg-white/5">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Posiciones de Capital
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-none bg-white/5">
                      <TableHead className="text-[10px] uppercase font-black px-6 h-10 text-slate-400">Inversor</TableHead>
                      <TableHead className="text-[10px] uppercase font-black text-right px-6 h-10 text-slate-400">Contable</TableHead>
                      <TableHead className="text-[10px] uppercase font-black text-right px-6 h-10 text-slate-400">Profit ({period})</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investorStats.map((inv) => (
                      <TableRow key={inv.name} className="group cursor-default border-white/5 hover:bg-white/5">
                        <TableCell className="font-bold py-4 px-6 text-sm flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black group-hover:bg-primary group-hover:text-white transition-colors uppercase">
                            {inv.name.substring(0, 2)}
                          </div>
                          {inv.name}
                        </TableCell>
                        <TableCell className="text-right py-4 px-6 font-mono text-xs text-blue-400 font-bold">{fmt(inv.balance)}</TableCell>
                        <TableCell className={cn(
                          "text-right py-4 px-6 font-mono text-xs font-bold",
                          inv.profit >= 0 ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {fmt(inv.profit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </div>

      <motion.div variants={item}>
        <Card className="card-premium border-none">
          <CardHeader className="border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary"></span>
              Stock Reciente
            </CardTitle>
            <Button variant="ghost" className="text-[10px] font-black uppercase h-7 px-2">Ver todo <ChevronRight className="w-3 h-3 ml-1" /></Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-none bg-muted/30">
                  <TableHead className="text-[10px] uppercase font-black px-6 h-10">Producto</TableHead>
                  <TableHead className="text-[10px] uppercase font-black text-center h-10">Cant.</TableHead>
                  <TableHead className="text-[10px] uppercase font-black h-10">Inversor</TableHead>
                  <TableHead className="text-[10px] uppercase font-black text-right px-6 h-10">P. Compra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stock.slice(0, 5).map((p) => (
                  <TableRow key={p.id} className="border-border group hover:bg-muted/50 transition-colors">
                    <TableCell className="font-bold py-4 px-6 text-xs text-foreground/80">{p.name}</TableCell>
                    <TableCell className="py-4 text-center">
                      <span className="text-[10px] font-black bg-card border border-border text-foreground px-2.5 py-1 rounded-full shadow-sm">
                        {p.quantity || 1}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-muted-foreground font-bold text-[10px] uppercase tracking-wider">{p.investor}</TableCell>
                    <TableCell className="text-right py-4 px-6 font-mono text-[11px] font-bold text-foreground">{fmt(p.purchasePrice)}</TableCell>
                  </TableRow>
                ))}
                {stock.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-slate-400 font-medium italic">Inventario actualmente vacío</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
