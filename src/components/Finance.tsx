import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Plus, Trash2, Wallet, Landmark, Banknote, TrendingDown, TrendingUp, PiggyBank, Users, User, Pencil, Save, CreditCard, Bitcoin, ChevronDown, ChevronUp } from 'lucide-react';
import { useData } from '../context/AppDataContext';
import { PaymentMethod, FinancialAccount, Investor, Expense } from '../types';
import { fmt, cn } from '../lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

type TimePeriod = 'hoy' | 'semana' | 'mes' | 'año' | 'todo';

export default function Finance() {
  const { data, addExpense, deleteExpense, updateAccountBalance, usdtRate } = useData();
  const [period, setPeriod] = useState<TimePeriod>('mes');
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<FinancialAccount | null>(null);
  const [newBalance, setNewBalance] = useState<number>(0);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseState, setEditExpenseState] = useState<Expense | null>(null);
  const [expandedInvestors, setExpandedInvestors] = useState<Set<string>>(new Set());
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  const expenseMonths = React.useMemo(() => {
    const monthsSet = new Set<string>();
    data.expenses.forEach(e => {
      if (e.date) {
        const ym = e.date.substring(0, 7); // "YYYY-MM"
        if (/^\d{4}-\d{2}$/.test(ym)) {
          monthsSet.add(ym);
        }
      }
    });
    // Always guarantee current month is listed in the dropdown if we want to,
    // but listing all months that actually have expenses is perfect.
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [data.expenses]);

  const getMonthLabel = (yearMonth: string) => {
    if (yearMonth === 'all') return 'Todos los meses';
    const [year, month] = yearMonth.split('-');
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthIdx = parseInt(month, 10) - 1;
    return `${monthNames[monthIdx] || month} ${year}`;
  };

  const filteredExpenses = React.useMemo(() => {
    return [...data.expenses]
      .filter(e => {
        const matchUser = filterUser === 'all' || e.investor === filterUser;
        const matchMonth = filterMonth === 'all' || e.date.substring(0, 7) === filterMonth;
        return matchUser && matchMonth;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data.expenses, filterUser, filterMonth]);

  const filteredExpensesTotal = React.useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const toggleInvestor = (name: string) => {
    const next = new Set(expandedInvestors);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setExpandedInvestors(next);
  };

  const getAccountBalanceCOP = (acc: FinancialAccount) => {
    if (acc.method === 'Cripto (USDT)') {
      return acc.balance * usdtRate;
    }
    return acc.balance;
  };

  const investors: Investor[] = ['Duvan', 'Lina', 'Santiago', 'Johana', 'Pool', 'Santa Maria', 'Thomas'];

  const periodOptions: { value: TimePeriod; label: string }[] = [
    { value: 'hoy', label: 'Hoy' },
    { value: 'semana', label: 'Semana' },
    { value: 'mes', label: 'Mes' },
    { value: 'año', label: 'Año' },
    { value: 'todo', label: 'Todo' },
  ];

  const filteredData = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const filterByPeriod = (dateStr: string) => {
      if (!dateStr) return false;
      const date = new Date(dateStr + 'T12:00:00');
      
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

  const totalCapital = data.accounts.reduce((sum, acc) => sum + getAccountBalanceCOP(acc), 0);
  const totalInventory = data.products
    .filter(p => p.status === 'stock' || p.status === 'reserved')
    .reduce((sum, p) => sum + (p.purchasePrice * (p.quantity || 1)), 0);

  const dashboardData = React.useMemo(() => {
    const assetsData = [
      { name: 'Capital', value: totalCapital, color: '#0ea5e9' },
      { name: 'Inventario', value: totalInventory, color: '#10b981' },
    ];

    const revenueByInvestor = investors.map(inv => {
      const invProducts = data.products.filter(p => 
        (p.investor === inv || p.coInvestors?.some(ci => ci.investor === inv)) && 
        p.status === 'sold' && 
        (() => {
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const d = new Date(p.saleDate || '');
          if (period === 'hoy') return d >= today;
          if (period === 'semana') {
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            return d >= weekAgo;
          }
          if (period === 'mes') {
            const monthAgo = new Date(today);
            monthAgo.setMonth(today.getMonth() - 1);
            return d >= monthAgo;
          }
          if (period === 'año') {
            const yearAgo = new Date(today);
            yearAgo.setFullYear(today.getFullYear() - 1);
            return d >= yearAgo;
          }
          return true;
        })()
      );
      const totalRevenue = invProducts.reduce((sum, p) => {
        const share = p.coInvestors && p.coInvestors.length > 0 
          ? (p.coInvestors.find(co => co.investor === inv)?.percentage || 0) / 100
          : (p.investor === inv ? 1 : 0);
        return sum + ((p.salePrice || 0) * share * (p.quantity || 1));
      }, 0);
      return { name: inv, ingresos: totalRevenue };
    }).filter(d => d.ingresos > 0);

    return { assetsData, revenueByInvestor };
  }, [totalCapital, totalInventory, data.products, period]);
  
  const totalGain = filteredData.soldInPeriod
    .reduce((sum, p) => {
      const pGain = (p.salePrice || 0) - p.purchasePrice;
      return sum + (pGain * p.quantity);
    }, 0);

  const totalExpenses = filteredData.expensesInPeriod.reduce((sum, e) => sum + e.amount, 0);

  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: 0,
    method: 'Efectivo' as PaymentMethod,
    category: 'Varios',
    date: new Date().toISOString().split('T')[0],
    investor: 'Duvan' as Investor,
  });

  const reservedProducts = data.products.filter(p => p.status === 'reserved');
  const totalReservedPending = reservedProducts.reduce((sum, p) => {
    const total = (p.salePrice || 0) * (p.quantity || 1);
    const paid = p.reservationAmount || 0;
    return sum + (total - paid);
  }, 0);

  const totalDebts = data.debtors.reduce((sum, d) => {
    const paid = d.payments.reduce((a, b) => a + b, 0);
    return sum + (d.totalAmount - paid);
  }, 0) + totalReservedPending;
  const totalLiabilities = data.liabilities.reduce((sum, l) => {
    const paid = l.payments.reduce((a, b) => a + b, 0);
    return sum + (l.totalAmount - paid);
  }, 0);

  const handleAddExpense = () => {
    if (!newExpense.description || !newExpense.amount) return;
    addExpense(newExpense);
    setNewExpense({
      ...newExpense,
      description: '',
      amount: 0,
    });
    setIsExpenseOpen(false);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditExpenseState(expense);
    setEditingExpenseId(expense.id);
  };

  const saveExpenseEdit = async () => {
    if (!editExpenseState || !editingExpenseId) return;
    // For simplicity since we don't have updateExpense, 
    // we'll implement it by updating the doc directly if we have access or 
    // just re-run deletion and addition if too complex.
    // However, I added `updateDoc` logic in useAppData for others, 
    // let's add `updateExpense` to `useAppData` properly to maintain balances.
    
    // For now, I'll delete and re-add which is the safest way to trigger balance updates in current useAppData logic
    await deleteExpense(editingExpenseId);
    await addExpense(editExpenseState);
    
    setEditingExpenseId(null);
    setEditExpenseState(null);
  };

  const handleAdjustBalance = () => {
    if (!selectedAccount) return;
    updateAccountBalance(selectedAccount.id, newBalance);
    setIsAdjustOpen(false);
    setSelectedAccount(null);
  };

  const confirmDeleteExpense = () => {
    if (expenseToDelete) {
      deleteExpense(expenseToDelete);
      setExpenseToDelete(null);
      setIsConfirmDeleteOpen(false);
    }
  };

  const accountIcons: Record<string, any> = {
    'Bancolombia': <Landmark className="w-4 h-4 text-blue-600" />,
    'Nequi': <Wallet className="w-4 h-4 text-fuchsia-600" />,
    'Banco de Bogota': <Landmark className="w-4 h-4 text-slate-800" />,
    'Efectivo': <Banknote className="w-4 h-4 text-emerald-600" />,
    'Cripto (USDT)': <Bitcoin className="w-4 h-4 text-orange-500" />,
    'Deudores': <Users className="w-4 h-4 text-amber-500" />,
  };

  return (
    <div className="space-y-12 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-background/80 backdrop-blur-md z-40 py-4 -mx-4 px-4 border-b border-border shadow-sm">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tight text-foreground">Gestión de Cuentas</h2>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Balance General de Inversores y Gastos</p>
        </div>
        <div className="flex items-center bg-muted/50 p-1 rounded-2xl border border-border overflow-x-auto no-scrollbar">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={cn(
                "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap",
                period === opt.value 
                  ? "bg-white text-primary shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Dashboard Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="card-premium lg:col-span-1 border-none shadow-xl overflow-hidden bg-white">
          <CardHeader className="pb-0">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Distribución de Activos</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px] p-0 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={dashboardData.assetsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {dashboardData.assetsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => fmt(value)}
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', fontWeight: 900, fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[9px] font-black uppercase tracking-widest pb-6">
              {dashboardData.assetsData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                  <span className="text-slate-500">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium lg:col-span-2 border-none shadow-xl overflow-hidden bg-white">
          <CardHeader className="pb-0">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ventas por Inversor ({period})</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData.revenueByInvestor} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <XAxis 
                   dataKey="name" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} 
                   dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.02)', radius: 12 }}
                  formatter={(value: number) => fmt(value)}
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', fontWeight: 900, fontSize: '12px' }}
                />
                <Bar 
                   dataKey="ingresos" 
                   fill="url(#barGradient)" 
                   radius={[12, 12, 4, 4]} 
                   barSize={40}
                />
                <defs>
                   <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" />
                      <stop offset="100%" stopColor="#38bdf8" />
                   </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-12">
        {investors.map((investor) => {
          const methods: PaymentMethod[] = ['Efectivo', 'Bancolombia', 'Nequi', 'Banco de Bogota'];
          if (investor === 'Duvan') methods.push('Cripto (USDT)');

          const accountsToRender = methods.map(method => {
            const existing = data.accounts.find(a => a.investor === investor && a.method === method);
            return existing || { 
              id: `${investor}-${method}`,
              investor, 
              method, 
              balance: 0, 
              name: method 
            } as FinancialAccount;
          });

          if (investor === 'Duvan') {
            accountsToRender.push({
              id: 'Duvan-Deudores',
              investor: 'Duvan',
              method: 'Deudores' as any,
              name: 'Deudores',
              balance: totalDebts
            });
          }

          const investorProducts = filteredData.soldInPeriod.filter(p => 
            p.investor === investor || 
            (p.coInvestors && p.coInvestors.some(co => co.investor === investor))
          );
          // For inventory we ALWAYS use the full data because inventory is CURRENT state
          const invFullInventory = data.products.filter(p => 
            (p.investor === investor || (p.coInvestors && p.coInvestors.some(co => co.investor === investor))) &&
            (p.status === 'stock' || p.status === 'reserved')
          );

          const investorExpenses = filteredData.expensesInPeriod.filter(e => e.investor === investor);
          
          const invCapital = accountsToRender.reduce((s, a) => s + getAccountBalanceCOP(a), 0);
          
          const invInventoryValue = invFullInventory
            .filter(p => !p.isExternal)
            .reduce((s, p) => {
              const share = p.coInvestors && p.coInvestors.length > 0 
                ? (p.coInvestors.find(co => co.investor === investor)?.percentage || 0) / 100
                : 1;
              return s + (p.purchasePrice * share * (p.quantity || 1));
            }, 0);

          const invGainInPeriod = investorProducts
            .reduce((s, p) => {
              const share = p.coInvestors && p.coInvestors.length > 0 
                ? (p.coInvestors.find(co => co.investor === investor)?.percentage || 0) / 100
                : 1;
              const pGain = (p.salePrice || 0) - p.purchasePrice;
              return s + (pGain * share * (p.quantity || 1));
            }, 0);
          const invExpensesTotalInPeriod = investorExpenses.reduce((s, e) => s + e.amount, 0);

          return (
            <div key={investor} className="space-y-4">
              <div className="flex items-center gap-3 border-b border-border pb-2 group">
                <div className="bg-primary text-primary-foreground p-1.5 rounded-xl group-hover:rotate-12 transition-transform shadow-lg shadow-primary/20">
                  <User className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">{investor}</h2>
                <div className="ml-auto flex gap-4">
                   <div className="text-right">
                      <div className="text-[10px] uppercase font-black text-muted-foreground opacity-60">Situación Patrimonial</div>
                      <div className="text-lg font-black text-foreground tracking-tighter">{fmt(invCapital + invInventoryValue)}</div>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Investor Stats */}
                <Card className="border-none shadow-sm bg-card overflow-hidden card-premium">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Saldo Contable</span>
                      <span className="text-xs font-mono font-black text-blue-600">{fmt(invCapital)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Activos Stock</span>
                      <span className="text-xs font-mono font-black text-foreground">{fmt(invInventoryValue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Profit ({period})</span>
                      <span className={cn("text-xs font-mono font-black", invGainInPeriod >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {fmt(invGainInPeriod)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-border flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-rose-500 tracking-widest">Egresos ({period})</span>
                      <span className="text-xs font-mono font-black text-rose-500">{fmt(invExpensesTotalInPeriod)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Investor Accounts */}
                <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
                  {accountsToRender.map(acc => (
                    <div key={acc.id} className="p-3 bg-card border border-border rounded-lg shadow-sm group relative flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        {accountIcons[acc.method]}
                        {acc.method !== 'Deudores' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setSelectedAccount(acc);
                              setNewBalance(acc.balance);
                              setIsAdjustOpen(true);
                            }}
                          >
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                      <div className="mt-1">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase truncate">{acc.method}</div>
                        <div className="text-xs font-mono font-bold truncate text-foreground">
                          {acc.method === 'Cripto (USDT)' ? (
                            <span title={`${acc.balance} USDT @ ${fmt(usdtRate)}`}>
                              {fmt(acc.balance * usdtRate)}
                              <span className="text-[8px] ml-1 opacity-50">({acc.balance} U)</span>
                            </span>
                          ) : fmt(acc.balance)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Card className="lg:col-span-2 border-none shadow-sm flex flex-col justify-center p-4 bg-muted/50">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground">Operaciones Rápidas</h4>
                      <p className="text-[11px] text-muted-foreground/60">Registra salidas de dinero para {investor}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-rose-200 text-rose-600 hover:bg-rose-50 font-bold uppercase text-[10px]"
                        onClick={() => {
                          setNewExpense(prev => ({ ...prev, investor: investor }));
                          setIsExpenseOpen(true);
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Registrar Gasto
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary font-bold uppercase text-[10px] h-8"
                        onClick={() => toggleInvestor(investor)}
                      >
                        {expandedInvestors.has(investor) ? (
                          <>Ocultar Inversiones <ChevronUp className="w-3 h-3 ml-1" /></>
                        ) : (
                          <>Ver Inversiones <ChevronDown className="w-3 h-3 ml-1" /></>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Detailed Product List (Accordion) */}
              {expandedInvestors.has(investor) && (
                <Card className="border-none shadow-sm bg-muted/30 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 border-border">
                          <TableHead className="text-[9px] uppercase font-black py-2 tracking-widest">Producto Invertido</TableHead>
                          <TableHead className="text-[9px] uppercase font-black py-2 tracking-widest text-center">Cant.</TableHead>
                          <TableHead className="text-[9px] uppercase font-black py-2 tracking-widest text-right">Inversión Individual</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {investorProducts
                          .filter(p => !p.isExternal && (p.status === 'stock' || p.status === 'reserved'))
                          .map(p => {
                            const shareInfo = p.coInvestors && p.coInvestors.length > 0 
                              ? p.coInvestors.find(co => co.investor === investor)
                              : null;
                            const share = shareInfo ? (shareInfo.percentage / 100) : 1;
                            const invValue = p.purchasePrice * share * (p.quantity || 1);
                            
                            return (
                              <TableRow key={p.id} className="border-border hover:bg-muted/50">
                                <TableCell className="py-3 text-[10px] font-medium text-foreground">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-bold text-slate-800">{p.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className={cn(
                                        "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                        p.status === 'reserved' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                                      )}>
                                        {p.status === 'reserved' ? 'Reservado' : 'En Stock'}
                                      </span>
                                      {shareInfo && (
                                        <span className="text-[8px] text-primary font-bold">Share: {shareInfo.percentage}%</span>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3 text-[10px] font-black text-center text-foreground">{p.quantity}</TableCell>
                                <TableCell className="py-3 text-sm font-mono font-black text-right text-foreground">
                                  {fmt(invValue)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        {investorProducts.filter(p => !p.isExternal && (p.status === 'stock' || p.status === 'reserved')).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-[10px] uppercase font-bold">Sin inversiones activas en stock</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          );
        })}
      </div>

      {/* Global Summary Section */}
      <div className="pt-12 border-t-2 border-dashed border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-600 text-white p-2 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">Resumen General Consolidad</h2>
            <p className="text-xs text-muted-foreground font-medium">CONSOLIDADO DE TODOS LOS INVERSORES</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm bg-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase opacity-80 mb-1">Capital Total Disponible</p>
                  <h3 className="text-2xl font-black">{fmt(totalCapital)}</h3>
                </div>
                <PiggyBank className="w-8 h-8 opacity-40" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Inversión Total Stock</p>
                  <h3 className="text-2xl font-black text-foreground">{fmt(totalInventory)}</h3>
                </div>
                <TrendingDown className="w-8 h-8 text-muted/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Ganancia Neta Global</p>
                  <h3 className="text-2xl font-black text-emerald-600">{fmt(totalGain)}</h3>
                </div>
                <TrendingUp className="w-8 h-8 text-emerald-500/10" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-secondary text-secondary-foreground">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase opacity-60 mb-1">Patrimonio Total</p>
                  <h3 className="text-2xl font-black">{fmt(totalCapital + totalInventory + totalDebts - totalLiabilities)}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Card className="border-none shadow-sm bg-amber-500/10 border-amber-500/20">
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Cuentas por Cobrar</p>
                <h3 className="text-xl font-black text-amber-700 dark:text-amber-500">{fmt(totalDebts)}</h3>
              </div>
              <CreditCard className="w-8 h-8 text-amber-500/20" />
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-rose-500/10 border-rose-500/20">
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black uppercase text-rose-600 tracking-widest">Pasivos (Deudas)</p>
                <h3 className="text-xl font-black text-rose-700 dark:text-rose-500">{fmt(totalLiabilities)}</h3>
              </div>
              <TrendingDown className="w-8 h-8 text-rose-500/20" />
            </CardContent>
          </Card>
        </div>

        {/* Expenses History */}
        <Card className="mt-8 border-none shadow-sm bg-card">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
              <TrendingDown className="w-4 h-4" /> Historial de Egresos (Gastos)
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {(filterMonth !== 'all' || filterUser !== 'all') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setFilterMonth('all'); setFilterUser('all'); }}
                  className="h-8 text-xs font-bold uppercase text-muted-foreground hover:text-foreground"
                >
                  Limpiar Filtros
                </Button>
              )}
              {/* Filter by Month */}
              <div className="w-[160px]">
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="h-8 text-xs font-bold uppercase bg-background border-border">
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-bold uppercase">Todos los meses</SelectItem>
                    {expenseMonths.map(ym => (
                      <SelectItem key={ym} value={ym} className="text-xs font-bold uppercase">
                        {getMonthLabel(ym)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filter by User */}
              <div className="w-[160px]">
                <Select value={filterUser} onValueChange={setFilterUser}>
                  <SelectTrigger className="h-8 text-xs font-bold uppercase bg-background border-border">
                    <SelectValue placeholder="Usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-bold uppercase">Todos los usuarios</SelectItem>
                    {investors.map(inv => (
                      <SelectItem key={inv} value={inv} className="text-xs font-bold uppercase">
                        {inv}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 border-border">
                    <TableHead className="text-[10px] uppercase font-bold">Fecha</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold">Inversor / Descripción</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold">Cuenta</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-right">Monto</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold text-right w-20">Acceso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((e) => (
                    <TableRow key={e.id} className="border-border">
                      <TableCell className="text-xs font-mono py-3 text-foreground">{e.date}</TableCell>
                      <TableCell className="text-xs py-3">
                        <div className="flex items-center gap-2 text-foreground">
                          <Badge variant="outline" className="text-[8px] font-bold uppercase px-1 py-0 border-border">{e.investor}</Badge>
                          <span className="font-medium">{e.description}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[10px] font-bold py-3 uppercase text-muted-foreground">{e.method}</TableCell>
                      <TableCell className="text-xs font-mono text-rose-600 font-bold text-right py-3">{fmt(e.amount)}</TableCell>
                      <TableCell className="text-right py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-blue-400 hover:text-blue-600" 
                            onClick={() => handleEditExpense(e)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            className="h-7 w-7 text-rose-400 hover:text-rose-600" 
                            onClick={() => {
                              setExpenseToDelete(e.id);
                              setIsConfirmDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Sin gastos reportados con los filtros seleccionados</TableCell>
                    </TableRow>
                  )}
                  {filteredExpenses.length > 0 && (
                    <TableRow className="bg-muted/35 hover:bg-muted/35 font-black border-t border-border">
                      <TableCell colSpan={3} className="text-right py-4 text-xs uppercase tracking-wider text-muted-foreground font-black">
                        Valor Total Egresos Filtrados:
                      </TableCell>
                      <TableCell className="text-sm font-mono text-rose-600 font-black text-right py-4">
                        {fmt(filteredExpensesTotal)}
                      </TableCell>
                      <TableCell className="py-4" />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expense Dialog */}
      {isExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-sm shadow-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Registrar Gasto: {newExpense.investor}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} placeholder="Ej: Pago de Luz, Almuerzo, etc." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input type="number" value={newExpense.amount || 0} onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <Label>Cuenta</Label>
                  <Select value={newExpense.method} onValueChange={v => setNewExpense({...newExpense, method: v as PaymentMethod})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Bancolombia">Bancolombia</SelectItem>
                      <SelectItem value="Nequi">Nequi</SelectItem>
                      <SelectItem value="Banco de Bogota">Banco de Bogota</SelectItem>
                      {newExpense.investor === 'Duvan' && <SelectItem value="Cripto (USDT)">Cripto (USDT)</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsExpenseOpen(false)}>Cancelar</Button>
                <Button className="flex-1 bg-rose-600 hover:bg-rose-700" onClick={handleAddExpense}>Confirmar Gasto</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Expense Edit Dialog */}
      {editingExpenseId && editExpenseState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-sm shadow-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Editar Gasto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input value={editExpenseState.description} onChange={e => setEditExpenseState({...editExpenseState, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto</Label>
                  <Input type="number" value={editExpenseState.amount || 0} onChange={e => setEditExpenseState({...editExpenseState, amount: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <Label>Cuenta</Label>
                  <Select value={editExpenseState.method} onValueChange={v => setEditExpenseState({...editExpenseState, method: v as PaymentMethod})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Bancolombia">Bancolombia</SelectItem>
                      <SelectItem value="Nequi">Nequi</SelectItem>
                      <SelectItem value="Banco de Bogota">Banco de Bogota</SelectItem>
                      {editExpenseState.investor === 'Duvan' && <SelectItem value="Cripto (USDT)">Cripto (USDT)</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={editExpenseState.date} onChange={e => setEditExpenseState({...editExpenseState, date: e.target.value})} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditingExpenseId(null)}>Cancelar</Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={saveExpenseEdit}>Guardar Cambios</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Adjust Balance Dialog */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">Ajustar Saldo: {selectedAccount?.investor} - {selectedAccount?.method}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="adj-balance" className="text-foreground">
                {selectedAccount?.method === 'Cripto (USDT)' ? 'Nuevo Saldo en USDT' : 'Nuevo Saldo Disponible'}
              </Label>
              <Input 
                id="adj-balance" 
                type="number" 
                step="any"
                className="bg-background text-foreground border-border"
                value={newBalance || 0} 
                onChange={e => setNewBalance(parseFloat(e.target.value) || 0)} 
              />
              {selectedAccount?.method === 'Cripto (USDT)' && (
                <p className="text-[10px] text-muted-foreground font-bold uppercase">
                  Valor Aproximado en COP: {fmt(newBalance * usdtRate)}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setIsAdjustOpen(false)}>Cancelar</Button>
            <Button className="flex-1 bg-primary text-primary-foreground" onClick={handleAdjustBalance}>Guardar Cambios</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este gasto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción restaurará el dinero a la cuenta correspondiente y eliminará el registro permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteExpense} className="bg-rose-600 hover:bg-rose-700">Eliminar Gasto</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
