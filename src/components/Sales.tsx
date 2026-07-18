import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Receipt, Download, Pencil, Trash2, Copy, Search, Filter, TrendingUp, ShoppingBag, Hash, Users } from 'lucide-react';
import { useData } from '../context/AppDataContext';
import { fmt, cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { Product, PaymentMethod, Investor } from '../types';
import { motion } from 'motion/react';

type TimePeriod = 'hoy' | 'semana' | 'mes' | 'año' | 'todo';

export default function Sales() {
  const { data, updateProduct, undoSale } = useData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<TimePeriod>('todo');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Product | null>(null);
  const [isUndoOpen, setIsUndoOpen] = useState(false);
  const [undoId, setUndoId] = useState<string | null>(null);
  const [showInvestorProfitability, setShowInvestorProfitability] = useState(false);

  const periodOptions: { value: TimePeriod; label: string }[] = [
    { value: 'hoy', label: 'Hoy' },
    { value: 'semana', label: 'Semana' },
    { value: 'mes', label: 'Mes' },
    { value: 'año', label: 'Año' },
    { value: 'todo', label: 'Todo' },
  ];

  const soldProducts = React.useMemo(() => {
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

    return [...data.products.filter(p => 
      p.status === 'sold' && 
      filterByPeriod(p.saleDate || '') &&
      (p.name.toLowerCase().includes(search.toLowerCase()) || 
       p.imei?.includes(search) || 
       p.buyer?.toLowerCase().includes(search.toLowerCase()) ||
       p.invoiceNumber?.toLowerCase().includes(search.toLowerCase()))
    )].sort((a, b) => 
      (b.saleDate || '').localeCompare(a.saleDate || '')
    );
  }, [data.products, period, search]);

  const summary = React.useMemo(() => {
    const total = soldProducts.reduce((acc, p) => acc + ((p.salePrice || 0) * (p.quantity || 1)), 0);
    const profit = soldProducts.reduce((acc, p) => acc + (((p.salePrice || 0) - p.purchasePrice) * (p.quantity || 1)), 0);
    return { total, profit, count: soldProducts.length };
  }, [soldProducts]);

  const investorsList: Investor[] = ['Duvan', 'Lina', 'Santiago', 'Johana', 'Pool', 'Santa Maria', 'Thomas'];

  const investorProfitability = React.useMemo(() => {
    return investorsList.map(inv => {
      let salesTotal = 0;
      let costTotal = 0;
      let profitTotal = 0;
      let qtyTotal = 0;

      soldProducts.forEach(p => {
        const share = p.coInvestors && p.coInvestors.length > 0
          ? (p.coInvestors.find(co => co.investor === inv)?.percentage || 0) / 100
          : (p.investor === inv ? 1 : 0);

        if (share > 0) {
          const qty = p.quantity || 1;
          const purchaseVal = p.purchasePrice * share * qty;
          const saleVal = (p.salePrice || 0) * share * qty;
          const profitVal = (saleVal - purchaseVal);

          qtyTotal += qty * share;
          salesTotal += saleVal;
          costTotal += purchaseVal;
          profitTotal += profitVal;
        }
      });

      return {
        investor: inv,
        sales: salesTotal,
        cost: costTotal,
        profit: profitTotal,
        quantity: qtyTotal
      };
    }).filter(item => item.sales > 0 || item.cost > 0 || item.profit !== 0);
  }, [soldProducts]);

  const handleUpdateSale = () => {
    if (!editingSale) return;
    updateProduct(editingSale.id, editingSale);
    setIsEditOpen(false);
    setEditingSale(null);
  };

  const exportToCSV = () => {
    const headers = ['Factura', 'Producto', 'Cant.', 'IMEI', 'Inversor', 'Proveedor', 'Fecha Venta', 'Precio Compra (u)', 'Precio Venta (u)', 'Ganancia Total'];
    const rows = soldProducts.map(p => {
      const qty = p.quantity || 1;
      const profitPerUnit = (p.salePrice || 0) - p.purchasePrice;
      return [
        p.invoiceNumber || '',
        p.name,
        qty,
        p.imei || '',
        p.investor,
        p.provider || '',
        p.saleDate || '',
        p.purchasePrice,
        p.salePrice || 0,
        profitPerUnit * qty
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ventas_ldiphone_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Gestión de Ventas</h2>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider opacity-60 mt-1">Control detallado de transacciones finalizadas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportToCSV}
            disabled={soldProducts.length === 0}
            className="text-[10px] font-black uppercase tracking-widest border-border h-10 rounded-xl"
          >
            <Download className="w-3.5 h-3.5 mr-2" />
            Descargar Reporte
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-premium border-none bg-primary/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Volumen Ventas</p>
              <p className="text-xl font-black tracking-tighter text-foreground">{fmt(summary.total)}</p>
              <p className="text-[10px] font-bold text-muted-foreground mt-0.5">{summary.count} operaciones en {period}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium border-none bg-emerald-500/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rentabilidad Bruta</p>
              <p className="text-xl font-black tracking-tighter text-emerald-600">{fmt(summary.profit)}</p>
              <p className="text-[10px] font-bold text-muted-foreground mt-0.5">Margen sobre costo</p>
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium border-none bg-blue-500/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Hash className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ticket Promedio</p>
              <p className="text-xl font-black tracking-tighter text-blue-600">{fmt(summary.count > 0 ? summary.total / summary.count : 0)}</p>
              <p className="text-[10px] font-bold text-muted-foreground mt-0.5">Por unidad vendida</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rentabilidad por Persona Section */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Rentabilidad por Persona</h3>
              <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Distribución proporcional de ganancias según aportes en {period}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInvestorProfitability(!showInvestorProfitability)}
            className="text-[10px] font-black uppercase tracking-widest border-border h-9 rounded-xl px-4 shrink-0"
          >
            {showInvestorProfitability ? "Ocultar Rentabilidad" : "Ver Rentabilidad"}
          </Button>
        </div>

        {showInvestorProfitability && (
          <div className="pt-5 mt-4 border-t border-border">
            {investorProfitability.length === 0 ? (
              <p className="text-center py-6 text-xs font-medium text-muted-foreground">
                No hay ventas o rentabilidad para los inversores seleccionados en este período.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {investorProfitability.map((item) => (
                  <div key={item.investor} className="p-4 bg-muted/20 rounded-xl border border-border/60 flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-foreground">{item.investor}</span>
                      <span className="text-[10px] font-mono bg-muted/60 px-2 py-0.5 rounded-full border text-muted-foreground font-bold">
                        {item.quantity.toFixed(1)} ud
                      </span>
                    </div>
                    <div className="space-y-1.5 mt-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Ventas:</span>
                        <span className="font-semibold text-foreground">{fmt(item.sales)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Inversión (Costo):</span>
                        <span className="font-semibold text-foreground">{fmt(item.cost)}</span>
                      </div>
                      <div className="h-px bg-border/50 my-1"></div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-bold">Ganancia:</span>
                        <span className={cn(
                          "font-black font-mono",
                          item.profit >= 0 ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {fmt(item.profit)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            className="pl-11 h-12 rounded-2xl border-none bg-muted/30 font-medium placeholder:text-muted-foreground text-sm"
            placeholder="Buscar por producto, IMEI, cliente o factura..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center bg-muted/30 p-1 rounded-2xl border border-border w-full md:w-auto overflow-x-auto no-scrollbar">
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

      <Card className="border-none shadow-sm bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="text-[10px] uppercase font-bold pl-6 text-muted-foreground">Producto</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-center text-muted-foreground">Cant.</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Proveedor</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Fecha Venta</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-right text-muted-foreground">P. Compra (u)</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-right text-muted-foreground">P. Venta (u)</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-right text-muted-foreground">Ganancia Total</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-right text-muted-foreground">Factura</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-right pr-6 text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {soldProducts.map((p) => {
                const qty = p.quantity || 1;
                const profit = ((p.salePrice || 0) - p.purchasePrice) * qty;
                return (
                  <TableRow key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <TableCell className="py-4 pl-6">
                      <div className="text-sm font-semibold text-foreground">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{p.invoiceNumber || 'S/N'}</div>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <div className="text-xs font-bold bg-muted px-2 py-1 rounded w-fit mx-auto border border-border text-foreground">
                        {qty}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="text-sm font-medium text-primary">{p.provider || '—'}</div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="text-xs font-mono text-muted-foreground">{p.saleDate || '—'}</div>
                    </TableCell>
                    <TableCell className="py-4 text-right text-xs font-mono text-muted-foreground">{fmt(p.purchasePrice)}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-mono font-semibold text-foreground">{fmt(p.salePrice || 0)}</TableCell>
                    <TableCell className="py-4 text-right">
                      <div className={`text-xs font-bold font-mono ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {fmt(profit)}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-primary hover:text-primary/80 hover:bg-primary/10"
                        onClick={() => navigate(`/invoice?id=${p.id}`)}
                      >
                        <Receipt className="w-4 h-4 mr-2" />
                        Factura
                      </Button>
                    </TableCell>
                    <TableCell className="py-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-primary/60 hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Duplicar para inventario"
                          onClick={() => navigate(`/inventory?duplicateProductId=${p.id}`)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                          onClick={() => {
                            setEditingSale({ ...p });
                            setIsEditOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-500/10"
                          onClick={() => {
                            setUndoId(p.id);
                            setIsUndoOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {soldProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                    No hay ventas registradas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Confirm Undo Dialog */}
      <Dialog open={isUndoOpen} onOpenChange={setIsUndoOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="w-5 h-5" /> ¿Eliminar Venta?
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            Esta acción revertirá la venta. El equipo volverá al inventario y el dinero se descontará de la cuenta correspondiente.
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsUndoOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={async () => {
              if (undoId) {
                await undoSale(undoId);
                setIsUndoOpen(false);
                setUndoId(null);
              }
            }}>Confirmar y Revertir</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Sale Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Venta</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Producto</Label>
              <Input value={editingSale?.name || ''} disabled />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Precio Venta (u)</Label>
                <Input 
                  type="number" 
                  value={editingSale?.salePrice || 0} 
                  onChange={e => setEditingSale(prev => prev ? ({...prev, salePrice: parseFloat(e.target.value) || 0}) : null)} 
                />
              </div>
              <div className="grid gap-2">
                <Label>Precio Compra (u)</Label>
                <Input 
                  type="number" 
                  value={editingSale?.purchasePrice || 0} 
                  onChange={e => setEditingSale(prev => prev ? ({...prev, purchasePrice: parseFloat(e.target.value) || 0}) : null)} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Fecha Venta</Label>
                <Input 
                  type="date" 
                  value={editingSale?.saleDate || ''} 
                  onChange={e => setEditingSale(prev => prev ? ({...prev, saleDate: e.target.value}) : null)} 
                />
              </div>
              <div className="grid gap-2">
                <Label>Cantidad</Label>
                <Input 
                  type="number" 
                  value={editingSale?.quantity || 1} 
                  onChange={e => setEditingSale(prev => prev ? ({...prev, quantity: parseInt(e.target.value) || 1}) : null)} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Cuenta Destino</Label>
                <Select 
                  value={editingSale?.saleMethod || 'Efectivo'} 
                  onValueChange={v => setEditingSale(prev => prev ? ({...prev, saleMethod: v as PaymentMethod}) : null)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="Bancolombia">Bancolombia</SelectItem>
                    <SelectItem value="Nequi">Nequi</SelectItem>
                    <SelectItem value="Banco de Bogota">Banco de Bogota</SelectItem>
                    {editingSale?.investor === 'Duvan' && <SelectItem value="Cripto (USDT)">Cripto (USDT)</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Proveedor</Label>
                <Input 
                  value={editingSale?.provider || ''} 
                  onChange={e => setEditingSale(prev => prev ? ({...prev, provider: e.target.value}) : null)} 
                  placeholder="Proveedor"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Número de Factura</Label>
                <Input 
                  value={editingSale?.invoiceNumber || ''} 
                  onChange={e => setEditingSale(prev => prev ? ({...prev, invoiceNumber: e.target.value}) : null)} 
                />
              </div>
              <div className="grid gap-2">
                <Label>IMEI</Label>
                <Input 
                  value={editingSale?.imei || ''} 
                  onChange={e => setEditingSale(prev => prev ? ({...prev, imei: e.target.value}) : null)} 
                  placeholder="IMEI del equipo"
                />
              </div>
            </div>

            <div className="grid gap-2 border-t border-border pt-4">
              <div className="grid gap-2">
                <Label className="text-rose-600 font-bold uppercase text-[10px] tracking-widest">Garantía (Meses)</Label>
                <Input 
                  type="number" 
                  min="0"
                  className="rounded-xl border-border h-11"
                  value={editingSale?.warrantyMonths || 0} 
                  onChange={e => {
                    const months = parseInt(e.target.value) || 0;
                    setEditingSale(prev => {
                      if (!prev) return null;
                      const date = prev.saleDate ? new Date(prev.saleDate) : new Date();
                      date.setMonth(date.getMonth() + months);
                      return {
                        ...prev,
                        warrantyMonths: months,
                        warrantyExpiration: date.toISOString().split('T')[0]
                      };
                    });
                  }} 
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Vencimiento</Label>
                <Input 
                  type="date"
                  className="rounded-xl border-border h-11"
                  value={editingSale?.warrantyExpiration || ''} 
                  onChange={e => setEditingSale(prev => prev ? ({...prev, warrantyExpiration: e.target.value}) : null)} 
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-rose-600">Términos de Garantía Específicos</Label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={editingSale?.warrantyTerms || ''} 
                placeholder="Deja en blanco para usar los generales de configuración..."
                onChange={e => setEditingSale(prev => prev ? ({...prev, warrantyTerms: e.target.value}) : null)} 
              />
            </div>
          </div>
          <Button onClick={handleUpdateSale} className="w-full bg-primary text-primary-foreground h-12 rounded-xl font-bold uppercase text-xs tracking-widest shadow-lg shadow-primary/10">Actualizar Información</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
