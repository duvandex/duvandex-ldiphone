import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { useData } from '../context/AppDataContext';
import { fmt, cn } from '../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Coins, TrendingUp } from 'lucide-react';

export default function Investors() {
  const { data } = useData();

  // --- HISTORIAL DE PATRIMONIO PARAMS & HOOK ---
  const [selectedInv, setSelectedInv] = React.useState<string>('Santiago');
  const [selectedMonth, setSelectedMonth] = React.useState<number>(6); // Junio
  const [selectedYear, setSelectedYear] = React.useState<number>(2026);
  const [daysCount, setDaysCount] = React.useState<number>(10);

  const historicalData = React.useMemo(() => {
    const prods = data.products.filter(p => p.investor === selectedInv);
    const accounts = data.accounts.filter(a => a.investor === selectedInv);
    const expenses = data.expenses.filter(e => e.investor === selectedInv);
    
    // Current total account balance for this investor
    const currentAccountBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

    const points = [];
    
    // Day-by-day calculation
    for (let d = 1; d <= daysCount; d++) {
      const dayStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      // Stock Capital on dayStr
      const stockCapital = prods
        .filter(p => {
          const ptDate = p.purchaseDate || '2000-01-01';
          return ptDate <= dayStr && (p.status !== 'sold' || !p.saleDate || p.saleDate > dayStr);
        })
        .reduce((sum, p) => sum + (p.purchasePrice * (p.quantity || 1)), 0);

      // Backtrack cash balance to dayStr
      let backtrackedCash = currentAccountBalance;

      // 1. Revert Purchases made AFTER dayStr
      prods.filter(p => p.purchaseDate && p.purchaseDate > dayStr).forEach(p => {
        backtrackedCash += p.purchasePrice * (p.quantity || 1);
      });

      // 2. Revert Sales made AFTER dayStr
      prods.filter(p => p.status === 'sold' && p.saleDate && p.saleDate > dayStr).forEach(p => {
        backtrackedCash -= (p.salePrice || 0) * (p.quantity || 1);
      });

      // 3. Revert Expenses made AFTER dayStr
      expenses.filter(e => e.date && e.date > dayStr).forEach(e => {
        backtrackedCash += e.amount;
      });

      const cashVal = Math.max(0, backtrackedCash);
      const totalVal = stockCapital + cashVal;

      points.push({
        day: d,
        dateFormatted: `${d} Jun`,
        inventario: stockCapital,
        cuentas: cashVal,
        total: totalVal,
      });
    }

    // Map variations
    return points.map((p, idx, arr) => {
      const prevTotal = idx > 0 ? arr[idx - 1].total : p.total;
      const variation = p.total - prevTotal;
      return {
        ...p,
        variation,
      };
    });
  }, [data.products, data.accounts, data.expenses, selectedInv, selectedMonth, selectedYear, daysCount]);

  const investorData = React.useMemo(() => {
    const investors = ['Duvan', 'Lina', 'Santiago', 'Johana', 'Pool', 'Santa Maria', 'Thomas'];
    return investors.map((inv) => {
      const prods = data.products.filter(p => p.investor === inv);
      const accounts = data.accounts.filter(a => a.investor === inv);
      
      const stockCapital = prods.filter(p => p.status === 'stock').reduce((acc, p) => acc + (p.purchasePrice * (p.quantity || 1)), 0);
      const accountBalance = accounts.reduce((acc, a) => acc + a.balance, 0);
      const totalCapital = stockCapital + accountBalance;
      
      const totalProfit = prods.filter(p => p.status === 'sold').reduce((acc, p) => acc + (((p.salePrice || 0) - p.purchasePrice) * (p.quantity || 1)), 0);
      const stockCount = prods.filter(p => p.status === 'stock').reduce((acc, p) => acc + (p.quantity || 1), 0);
      const soldCount = prods.filter(p => p.status === 'sold').length;
      const stockItemCount = prods.filter(p => p.status === 'stock').length;

      return {
        name: inv,
        prods,
        accounts,
        stockCapital,
        accountBalance,
        totalCapital,
        totalProfit,
        stockCount,
        soldCount,
        stockItemCount
      };
    }).filter(d => d.prods.length > 0 || d.accounts.length > 0);
  }, [data.products, data.accounts]);

  const globalSummary = React.useMemo(() => {
    const stockProducts = data.products.filter(p => p.status === 'stock');
    const soldProducts = data.products.filter(p => p.status === 'sold');
    
    return {
      currentCapital: stockProducts.reduce((acc, p) => acc + (p.purchasePrice * (p.quantity || 1)), 0) +
                     data.accounts.reduce((acc, a) => acc + a.balance, 0),
      totalProfit: soldProducts.reduce((acc, p) => acc + (((p.salePrice || 0) - p.purchasePrice) * (p.quantity || 1)), 0),
      totalStockItems: stockProducts.reduce((acc, p) => acc + (p.quantity || 1), 0)
    };
  }, [data.products, data.accounts]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Detalle por Inversor</h2>
      </div>

      {investorData.map((inv) => {
        return (
          <div key={inv.name} className="space-y-4">
            <div className="flex items-end justify-between px-1">
              <div>
                <h3 className="text-lg font-bold text-foreground">{inv.name}</h3>
                <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {inv.stockItemCount} en stock · {inv.soldCount} vendidos
                </div>
              </div>
              <div className="flex gap-6 text-right">
                <div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Cap. Total</div>
                  <div className="text-sm font-mono font-bold text-foreground">{fmt(inv.totalCapital)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground flex flex-col">
                    <span>Stock: {fmt(inv.stockCapital)}</span>
                    <span>Cuentas: {fmt(inv.accountBalance)}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Ganancia</div>
                  <div className="text-sm font-mono font-semibold text-emerald-600">{fmt(inv.totalProfit)}</div>
                </div>
              </div>
            </div>

            <Card className="border-none shadow-sm overflow-hidden bg-card text-card-foreground">
              <CardContent className="p-0 text-card-foreground">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead className="text-[10px] uppercase font-bold pl-6 text-muted-foreground">Producto</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Proveedor</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Compra</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Venta</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Ganancia</TableHead>
                      <TableHead className="text-[10px] uppercase font-bold pr-6 text-muted-foreground">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inv.prods.map((p) => {
                      const profit = p.status === 'sold' ? (p.salePrice || 0) - p.purchasePrice : null;
                      return (
                        <TableRow key={p.id} className="group border-border">
                          <TableCell className="py-3 pl-6">
                            <div className="text-sm font-medium text-foreground">{p.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{p.imei || 'S/I'}</div>
                          </TableCell>
                          <TableCell className="py-3 text-xs text-muted-foreground">{p.provider || '—'}</TableCell>
                          <TableCell className="py-3 text-xs font-mono text-foreground">{fmt(p.purchasePrice)}</TableCell>
                          <TableCell className="py-3 text-xs font-mono text-foreground">{p.salePrice ? fmt(p.salePrice) : '—'}</TableCell>
                          <TableCell className="py-3">
                            {profit !== null ? (
                              <div className={cn("text-xs font-bold font-mono", profit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                {fmt(profit)}
                              </div>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="py-3 pr-6">
                            <Badge variant={p.status === 'stock' ? 'secondary' : 'default'} className={cn(
                              "text-[9px] uppercase font-bold px-1.5 py-0.5 border-none",
                              p.status === 'stock' ? "bg-blue-500/10 text-blue-600" : "bg-emerald-500/10 text-emerald-600"
                            )}>
                              {p.status === 'stock' ? 'Stock' : 'Vendido'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );
      })}

      {/* Historical Equity Evolution Widget */}
      <div className="pt-10 border-t border-border">
        <Card className="border-none shadow-sm overflow-hidden bg-card text-card-foreground">
          <CardHeader className="border-b border-border/60 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-md font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Historial de Patrimonio por Inversor
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Calcula y desanda el patrimonio acumulado día a día según adquisiciones, ventas y egresos.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {/* Investor Selector */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Inversor</span>
                <Select value={selectedInv} onValueChange={setSelectedInv}>
                  <SelectTrigger className="w-36 h-9 rounded-xl border-border bg-background hover:bg-muted font-semibold text-xs text-foreground">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border bg-popover text-popover-foreground">
                    {['Duvan', 'Lina', 'Santiago', 'Johana', 'Pool', 'Santa Maria', 'Thomas'].map(invName => (
                      <SelectItem key={invName} value={invName} className="text-xs font-semibold rounded-lg">{invName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Range Selector */}
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Rango del Mes</span>
                <Select value={String(daysCount)} onValueChange={(val) => setDaysCount(Number(val))}>
                  <SelectTrigger className="w-40 h-9 rounded-xl border-border bg-background hover:bg-muted font-semibold text-xs text-foreground">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border bg-popover text-popover-foreground">
                    <SelectItem value="10" className="text-xs font-semibold rounded-lg">Primeros 10 días (1-10)</SelectItem>
                    <SelectItem value="15" className="text-xs font-semibold rounded-lg">Primeros 15 días (1-15)</SelectItem>
                    <SelectItem value="30" className="text-xs font-semibold rounded-lg">Mes Completo (30 d)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              {/* Chart Column */}
              <div className="xl:col-span-3 flex flex-col justify-between h-[340px] bg-muted/20 border border-border/40 rounded-2xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Evolución de Patrimonio ({selectedInv})</h4>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                        {fmt(historicalData[historicalData.length - 1]?.total || 0)}
                      </span>
                      <Badge variant="outline" className={cn(
                        "text-[10px] font-bold border-none py-0.5",
                        (historicalData[historicalData.length - 1]?.variation || 0) >= 0 
                          ? "bg-emerald-500/10 text-emerald-600" 
                          : "bg-rose-500/10 text-rose-600"
                      )}>
                        {(historicalData[historicalData.length - 1]?.variation || 0) >= 0 ? '+' : ''}
                        {fmt(historicalData[historicalData.length - 1]?.variation || 0)} (Acumulado)
                      </Badge>
                    </div>
                  </div>
                  <TrendingUp className="w-8 h-8 text-primary/10" />
                </div>

                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historicalData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                      <XAxis 
                        dataKey="dateFormatted" 
                        fontSize={9} 
                        fontWeight={700} 
                        tickLine={false} 
                        axisLine={false} 
                        stroke="var(--muted-foreground)" 
                      />
                      <YAxis 
                        fontSize={9} 
                        fontWeight={700} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} 
                        stroke="var(--muted-foreground)" 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: '1px solid var(--border)', 
                          backgroundColor: 'var(--card)', 
                          boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)', 
                          padding: '12px' 
                        }}
                        labelStyle={{ fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px', color: 'var(--foreground)' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="total" 
                        stroke="var(--primary)" 
                        strokeWidth={2.5} 
                        fillOpacity={1} 
                        fill="url(#colorTotal)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Table Column */}
              <div className="xl:col-span-2 flex flex-col justify-between">
                <div className="border border-border/50 rounded-2xl overflow-hidden bg-card/40">
                  <div className="max-h-[290px] overflow-y-auto scrollbar-thin">
                    <Table>
                      <TableHeader className="bg-muted sticky top-0 z-10 border-b border-border/50">
                        <TableRow className="hover:bg-transparent border-none">
                          <TableHead className="text-[10px] uppercase font-bold text-muted-foreground py-2 pl-4">Día</TableHead>
                          <TableHead className="text-[10px] uppercase font-bold text-muted-foreground py-2 text-right">Stock / Cuenta</TableHead>
                          <TableHead className="text-[10px] uppercase font-bold text-muted-foreground py-2 text-right pr-4">Patrimonio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historicalData.map((d) => (
                          <TableRow key={d.day} className="hover:bg-muted/10 border-border/30">
                            <TableCell className="py-2.5 pl-4">
                              <div className="text-xs font-bold text-foreground">{d.dateFormatted}</div>
                            </TableCell>
                            <TableCell className="py-2.5 text-right text-[10px] text-muted-foreground font-mono font-medium">
                              {fmt(d.inventario)} / {fmt(d.cuentas)}
                            </TableCell>
                            <TableCell className="py-2.5 text-right pr-4">
                              <div className="text-xs font-extrabold font-mono text-foreground">{fmt(d.total)}</div>
                              {d.variation !== 0 && (
                                <div className={cn(
                                  "text-[9px] font-bold font-mono leading-none mt-0.5",
                                  d.variation > 0 ? "text-emerald-500" : "text-rose-500"
                                )}>
                                  {d.variation > 0 ? '▲ +' : '▼ '} {fmt(Math.abs(d.variation))}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground mt-3 leading-relaxed flex items-start gap-2 bg-primary/5 p-2.5 px-3 rounded-xl border border-primary/10">
                  <Coins className="w-3.5 h-3.5 text-primary/80 flex-shrink-0 mt-0.5" />
                  <span>
                    El total diario se computa partiendo de los saldos actuales, descontando las adquisiciones, ingresos por ventas y los gastos de dicho inversor posteriores a cada día.
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global Summary */}
      <div className="pt-10 border-t border-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold tracking-tight uppercase text-foreground">Resumen General de Inversión</h2>
          <Badge className="bg-primary text-primary-foreground font-mono h-7 px-4">TOTAL LDIPHONE</Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Capital Actual (Stock + Cuentas)</div>
              <div className="text-2xl font-black tracking-tighter text-foreground">
                {fmt(globalSummary.currentCapital)}
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Ganancia Total Realizada</div>
              <div className="text-2xl font-black tracking-tighter text-emerald-600">
                {fmt(globalSummary.totalProfit)}
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Productos en Stock</div>
              <div className="text-2xl font-black tracking-tighter text-blue-600">
                {globalSummary.totalStockItems}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
