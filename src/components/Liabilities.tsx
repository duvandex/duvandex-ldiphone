import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { 
  Plus, 
  Trash2, 
  HandCoins, 
  UserPlus, 
  Search, 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Eye, 
  FileText, 
  ShieldCheck, 
  Clock, 
  TrendingDown, 
  TrendingUp, 
  CheckCircle2, 
  Bookmark,
  Building,
  CreditCard,
  User,
  Info
} from 'lucide-react';
import { useData } from '../context/AppDataContext';
import { fmt, cn } from '../lib/utils';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from './ui/alert-dialog';

export default function Liabilities() {
  const { data, addLiability, addLiabilityPayment, deleteLiability, updateLiability } = useData();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isExtraOpen, setIsExtraOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [selectedLiabilityId, setSelectedLiabilityId] = useState<string | null>(null);
  const [liabilityToDelete, setLiabilityToDelete] = useState<string | null>(null);

  // Form states
  const [newLiability, setNewLiability] = useState({
    creditor: '',
    description: '',
    totalAmount: 0,
    initialPayment: 0,
  });

  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDescription, setPaymentDescription] = useState('');
  const [extraAmount, setExtraAmount] = useState(0);

  // Search & Presentation states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [isolatedId, setIsolatedId] = useState<string | null>(null);

  const handleAddLiability = () => {
    if (!newLiability.creditor || !newLiability.totalAmount) return;
    addLiability({
      creditor: newLiability.creditor,
      description: newLiability.description,
      totalAmount: newLiability.totalAmount,
      payments: newLiability.initialPayment > 0 ? [newLiability.initialPayment] : [],
      status: newLiability.initialPayment >= newLiability.totalAmount ? 'paid' : 'pending',
    });
    setNewLiability({ creditor: '', description: '', totalAmount: 0, initialPayment: 0 });
    setIsAddOpen(false);
  };

  const handleAddPayment = () => {
    if (!selectedLiabilityId || !paymentAmount) return;
    addLiabilityPayment(selectedLiabilityId, paymentAmount, paymentDescription);
    setPaymentAmount(0);
    setPaymentDescription('');
    setIsPaymentOpen(false);
    setSelectedLiabilityId(null);
  };

  const handleAddExtraDebt = () => {
    if (!selectedLiabilityId || !extraAmount) return;
    const liability = data.liabilities.find(l => l.id === selectedLiabilityId);
    if (liability) {
      updateLiability(selectedLiabilityId, {
        totalAmount: liability.totalAmount + extraAmount,
        status: 'pending'
      });
    }
    setExtraAmount(0);
    setIsExtraOpen(false);
    setSelectedLiabilityId(null);
  };

  const confirmDelete = () => {
    if (liabilityToDelete) {
      deleteLiability(liabilityToDelete);
      setLiabilityToDelete(null);
      setIsConfirmDeleteOpen(false);
      // If we deleted the isolated one, reset it
      if (isolatedId === liabilityToDelete) {
        setIsolatedId(null);
      }
    }
  };

  // Helper to format dates cleanly
  const formatPaymentDate = (dateStr?: string) => {
    if (!dateStr) return 'Fecha anterior registrada';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Fecha registrada';
      return d.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Fecha registrada';
    }
  };

  // Compute stats for all registered liabilities (for general background totals)
  const totalLiabilitiesAmount = data.liabilities.reduce((sum, l) => sum + l.totalAmount, 0);
  const totalLiabilitiesPaid = data.liabilities.reduce((sum, l) => sum + (l.payments?.reduce((a, b) => a + b, 0) || 0), 0);
  const totalPendingGlobal = totalLiabilitiesAmount - totalLiabilitiesPaid;

  // Filter liabilities based on user criteria
  const filteredLiabilities = useMemo(() => {
    return data.liabilities.filter(l => {
      const matchesSearch = l.creditor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (l.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const paid = l.payments?.reduce((a, b) => a + b, 0) || 0;
      const isPaid = l.status === 'paid' || paid >= l.totalAmount;
      const matchesStatus = statusFilter === 'all' || 
                            (statusFilter === 'paid' && isPaid) || 
                            (statusFilter === 'pending' && !isPaid);
      
      return matchesSearch && matchesStatus;
    });
  }, [data.liabilities, searchQuery, statusFilter]);

  // Dynamic totals corresponding strictly to visible (filtered) liabilities
  const filteredTotals = useMemo(() => {
    const total = filteredLiabilities.reduce((sum, l) => sum + l.totalAmount, 0);
    const paid = filteredLiabilities.reduce((sum, l) => sum + (l.payments?.reduce((a, b) => a + b, 0) || 0), 0);
    return {
      total,
      paid,
      pending: total - paid,
      count: filteredLiabilities.length
    };
  }, [filteredLiabilities]);

  // Render Isolated Secured View for a selected creditor
  if (isolatedId) {
    const liability = data.liabilities.find(l => l.id === isolatedId);
    if (!liability) {
      setIsolatedId(null);
      return null;
    }
    const paid = liability.payments?.reduce((a, b) => a + b, 0) || 0;
    const balance = liability.totalAmount - paid;
    const progress = Math.min(100, Math.round((paid / liability.totalAmount) * 100));

    return (
      <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-rose-100">
          <Button 
            variant="outline" 
            onClick={() => setIsolatedId(null)}
            className="self-start rounded-full border-slate-200 text-slate-700 font-extrabold text-[11px] uppercase tracking-wider h-9"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5 text-rose-500" /> Volver al Tablero
          </Button>
          <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 px-4 py-2 rounded-2xl">
            <ShieldCheck className="w-4 h-4 text-[#f15a24] animate-pulse" />
            <span className="text-[10px] font-black text-[#f15a24] uppercase tracking-widest">Modo Seguro Activo</span>
          </div>
        </div>

        {/* Business Invoice-Like Presentation Statement */}
        <Card className="border border-slate-100 shadow-xl overflow-hidden bg-white text-slate-900 rounded-[2rem]">
          <CardContent className="p-8 sm:p-12 space-y-8">
            {/* Professional Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="space-y-2">
                <div className="text-[11px] font-black tracking-widest uppercase text-[#f15a24]">Empresa de Celulares / Equipos</div>
                <h1 className="text-2xl font-black tracking-tighter uppercase leading-none text-slate-900">LDIPHONE ACCESORIOS</h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Duvan Dario Marin Jaramillo • CC 1128401809</p>
                <p className="text-[9px] text-slate-400">Dirección: Carrera 108 #107B 17, Apartadó, Antioquia</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] space-y-1.5 max-w-xs bg-opacity-80">
                <p className="text-slate-800 font-black tracking-wider uppercase mb-1">REGISTRO MINTIC AUTORIZADO</p>
                <p className="text-slate-500 font-medium">Resolución No. <span className="font-bold text-slate-900">0000003130</span></p>
                <p className="text-slate-500 font-medium">NIT / CC Verificado: <span className="font-bold text-slate-900">1128401809</span></p>
              </div>
            </div>

            {/* Account Title Details */}
            <div className="space-y-3 bg-red-50/20 p-6 rounded-3xl border border-red-50">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#f15a24]">Estado de Cuenta de la Obligación</span>
              <h2 className="text-3xl font-black tracking-tight text-slate-950 uppercase">{liability.creditor}</h2>
              {liability.description && (
                <p className="text-sm font-semibold text-slate-500 italic">“{liability.description}”</p>
              )}
            </div>

            {/* The Big Account Ledger Standout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 block mb-2">Deuda Inicial Pactada</span>
                <span className="text-2xl font-black text-slate-800">{fmt(liability.totalAmount)}</span>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] uppercase tracking-widest font-black text-emerald-600 block mb-2">Total Abonado a la Fecha</span>
                <span className="text-2xl font-black text-emerald-600">+{fmt(paid)}</span>
              </div>
              <div className="bg-[#f15a24]/5 border border-[#f15a24]/10 p-6 rounded-2xl flex flex-col justify-between ring-2 ring-[#f15a24]/20 animate-pulse">
                <span className="text-[10px] uppercase tracking-widest font-black text-[#f15a24] block mb-2">Saldo Total Pendiente</span>
                <span className="text-3xl font-black text-[#f15a24]">{fmt(balance)}</span>
              </div>
            </div>

            {/* Beautiful Progress Gauge */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-black">
                <span className="text-slate-500 uppercase tracking-wider">Avance del Reembolso</span>
                <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">{progress}% Completado</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-700", liability.status === 'paid' ? "bg-emerald-500" : "bg-[#f15a24]")} 
                  style={{ width: `${progress}%` }} 
                />
              </div>
            </div>

            {/* List of Payments with exact Dates (ABONOS) */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Calendar className="w-4.5 h-4.5 text-[#f15a24]" />
                <h3 className="text-sm font-black uppercase tracking-widest text-[#f15a24]">Historial Cronológico de Abonos</h3>
              </div>

              {((liability.paymentHistory && liability.paymentHistory.length > 0) || (liability.payments && liability.payments.length > 0)) ? (
                <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-50 shadow-sm bg-slate-50/20">
                  {liability.paymentHistory ? (
                    liability.paymentHistory.map((pt, index) => (
                      <div key={index} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/50 hover:bg-white transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mt-0.5 shrink-0 font-bold text-xs">
                            {index + 1}
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Abono Recibido</span>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <Clock className="w-3.5 h-3.5 text-slate-300" />
                              <span>{formatPaymentDate(pt.date)}</span>
                            </div>
                            {pt.description && (
                              <p className="text-[10px] font-bold text-slate-500 bg-slate-100 inline-block px-2 py-0.5 rounded-md mt-1">
                                Nota: {pt.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right sm:self-center">
                          <span className="text-md font-black text-emerald-600 font-mono tracking-tight">+{fmt(pt.amount)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    // Fallback Reconstruction from legacy number array
                    liability.payments.map((amt, idx) => (
                      <div key={idx} className="p-4 flex items-center justify-between bg-white/50 hover:bg-white transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 font-bold text-xs">
                            {idx + 1}
                          </div>
                          <div>
                            <span className="text-xs font-black text-emerald-600 uppercase tracking-widest block">Abono Registrado</span>
                            <span className="text-[10px] text-slate-400 italic">Fecha previa a registro</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-md font-black text-emerald-600 font-mono">+{fmt(amt)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="text-center py-8 rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/40 text-slate-500 space-y-2">
                  <Info className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold uppercase tracking-wider">No se han registrado abonos todavía</p>
                  <p className="text-[10px] text-slate-400">El saldo se encuentra en su totalidad deudor.</p>
                </div>
              )}
            </div>

            {/* Receipt Footer Stamp */}
            <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 text-[9px] text-slate-400">
              <p className="text-center md:text-left leading-relaxed">Este estado de cuenta y relación de abonos se extrae digitalmente del sistema de control de inventarios de LDIPHONE ACCESORIOS y representa de manera fiel las entregas realizadas.</p>
              <div className="font-mono text-[8px] bg-slate-100 px-3 py-1 rounded border border-slate-200 uppercase tracking-wider">ID Ref: {liability.id}</div>
            </div>
          </CardContent>
        </Card>

        {/* Action center inside isolated screen */}
        <div className="flex items-center justify-between bg-slate-50/70 p-5 rounded-3xl border border-slate-100">
          <Button 
            variant="ghost" 
            onClick={() => setIsolatedId(null)}
            className="text-[10px] font-black uppercase text-slate-500 hover:text-slate-900"
          >
            ← Volver al Listado General
          </Button>

          {liability.status === 'pending' && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider px-6 py-4 rounded-xl"
              onClick={() => {
                setSelectedLiabilityId(liability.id);
                setIsPaymentOpen(true);
              }}
            >
              <HandCoins className="w-4 h-4 mr-1.5" /> Registrar Abono aquí
            </Button>
          )}
        </div>
      </div>
    );
  }

  // --- Normal Dashboard + Separate Cards View ---
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-rose-50">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-500">Gestión de Pasivos</span>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 mt-1 uppercase">Obligaciones Financieras (Acreedores)</h2>
          <p className="text-xs text-slate-500 mt-1">Control de dinero adeudado, histórico de pagos con fecha y presentación limpia por acreedor.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger
            render={
              <Button className="bg-[#f15a24] hover:bg-[#d04919] text-white font-black uppercase tracking-wider text-[10px] px-5 py-5 rounded-xl shadow-md h-10">
                <Plus className="w-4.5 h-4.5 mr-1.5" /> Nueva Obligación
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase tracking-wider text-slate-950">Agregar Nueva Obligación</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">Registra un nuevo saldo adeudado con un acreedor particular.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="l-creditor" className="text-[10px] font-black uppercase text-slate-500">Acreedor / Proveedor *</Label>
                <Input id="l-creditor" value={newLiability.creditor} onChange={e => setNewLiability({...newLiability, creditor: e.target.value})} placeholder="Ej: Duvan, Socio Omar, Banco, etc." className="rounded-xl h-10 border-slate-200" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="l-desc" className="text-[10px] font-black uppercase text-slate-500">Descripción / Concepto</Label>
                <Input id="l-desc" value={newLiability.description} onChange={e => setNewLiability({...newLiability, description: e.target.value})} placeholder="Ej: Préstamo para repuestos de iPhone 15" className="rounded-xl h-10 border-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="l-total" className="text-[10px] font-black uppercase text-slate-500">Monto Total Adquirido *</Label>
                  <Input id="l-total" type="number" value={newLiability.totalAmount || ''} onChange={e => setNewLiability({...newLiability, totalAmount: parseFloat(e.target.value) || 0})} placeholder="0" className="rounded-xl h-10 border-slate-200 font-mono" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="l-abono" className="text-[10px] font-black uppercase text-slate-500">Abono Inicial (Opcional)</Label>
                  <Input id="l-abono" type="number" value={newLiability.initialPayment || ''} onChange={e => setNewLiability({...newLiability, initialPayment: parseFloat(e.target.value) || 0})} placeholder="0" className="rounded-xl h-10 border-slate-200 font-mono" />
                </div>
              </div>
            </div>
            <Button onClick={handleAddLiability} className="w-full bg-[#f15a24] hover:bg-[#d04919] text-white font-black uppercase tracking-wider text-[10px] rounded-xl h-11">Guardar Obligación</Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Top Level Dynamic Summary Cards (Strictly aligned to search/filter) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm rounded-2xl bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12" />
          <CardHeader className="pb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#f15a24]">
              {searchQuery ? 'Saldo Pendiente (Filtrado)' : 'Saldo Deudor Total'}
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-[#f15a24] tracking-tight">{fmt(filteredTotals.pending)}</div>
            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
              {filteredTotals.count} {filteredTotals.count === 1 ? 'Obligación visible' : 'Obligaciones visibles'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-2xl bg-white text-slate-900 border border-slate-100">
          <CardHeader className="pb-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Total Abonado (Filtrado)
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600 tracking-tight">+{fmt(filteredTotals.paid)}</div>
            <p className="text-[10px] text-slate-400 mt-1 uppercase font-black">
              Acumulado abonado de deudas en vista
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-2xl bg-slate-50 border border-slate-100 text-slate-900">
          <CardHeader className="pb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Importe Total Pactado</span>
          </CardHeader>
          <CardContent className="flex justify-between items-baseline">
            <div className="text-2xl font-black text-slate-800 tracking-tight">{fmt(filteredTotals.total)}</div>
            {totalPendingGlobal > filteredTotals.pending && (
              <span className="text-[9px] font-bold uppercase text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-md">
                Oli. Global: {fmt(totalPendingGlobal)}
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Control Filters and Search Bar */}
      <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <Input 
              type="text" 
              placeholder="Buscar por acreedor, banco o concepto..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 h-10 w-full rounded-xl border-slate-200 bg-white"
            />
          </div>

          {/* Quick Pillar Filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto shrink-0">
            <button 
              onClick={() => setStatusFilter('all')} 
              className={cn(
                "px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all w-full sm:w-auto text-center shrink-0", 
                statusFilter === 'all' ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Cualquiera
            </button>
            <button 
              onClick={() => setStatusFilter('pending')} 
              className={cn(
                "px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all w-full sm:w-auto text-center shrink-0", 
                statusFilter === 'pending' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Pendientes
            </button>
            <button 
              onClick={() => setStatusFilter('paid')} 
              className={cn(
                "px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all w-full sm:w-auto text-center shrink-0", 
                statusFilter === 'paid' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Pagadas
            </button>
          </div>
        </div>

        {searchQuery && (
          <div className="flex items-center justify-between bg-[#f15a24]/5 rounded-xl px-4 py-1.5 border border-[#f15a24]/10">
            <span className="text-[10px] font-black text-[#f15a24] uppercase tracking-wider">
              Búsqueda activa: mostrando ({filteredLiabilities.length}) obligaciones de acreedores
            </span>
            <Button 
              variant="ghost" 
              onClick={() => setSearchQuery('')}
              className="h-6 text-[9px] font-black uppercase tracking-wider text-[#f15a24] hover:bg-[#f15a24]/15"
            >
              Limpiar Búsqueda
            </Button>
          </div>
        )}
      </div>

      {/* INDIVIDUAL DEBT CARDS GRID */}
      {filteredLiabilities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredLiabilities.map((l) => {
            const paid = l.payments?.reduce((a, b) => a + b, 0) || 0;
            const balance = l.totalAmount - paid;
            const progress = Math.min(100, Math.round((paid / l.totalAmount) * 100));
            const isFullyPaid = l.status === 'paid' || paid >= l.totalAmount;

            return (
              <Card key={l.id} className="border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-3xl overflow-hidden bg-white flex flex-col justify-between">
                <div className="p-6 space-y-5">
                  
                  {/* Card Header Top */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2.5 rounded-2xl shrink-0 mt-0.5",
                        isFullyPaid ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-[#f15a24]"
                      )}>
                        <Bookmark className="w-5 h-5 fill-current" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black tracking-tight uppercase text-slate-900 leading-tight">
                          {l.creditor}
                        </h3>
                        {l.description ? (
                          <p className="text-xs text-slate-500 mt-1 italic font-medium leading-normal">
                            “{l.description}”
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-300 uppercase font-bold mt-1">
                            Sin nota descripción
                          </p>
                        )}
                      </div>
                    </div>

                    <Badge className={cn(
                      "text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 border-none rounded-md",
                      isFullyPaid ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700 hover:bg-rose-100"
                    )}>
                      {isFullyPaid ? 'Pagado' : 'Pendiente'}
                    </Badge>
                  </div>

                  {/* Financial Grid Inside Card */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-2xl p-4 text-center border border-slate-100/50">
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Monto Inicial</span>
                      <span className="text-xs font-black text-slate-700 font-mono block">{fmt(l.totalAmount)}</span>
                    </div>
                    <div className="border-l border-slate-200">
                      <span className="text-[9px] font-black uppercase text-emerald-500 block mb-1">Total Pagado</span>
                      <span className="text-xs font-black text-emerald-600 font-mono block">+{fmt(paid)}</span>
                    </div>
                    <div className="border-l border-slate-200">
                      <span className="text-[9px] font-black uppercase text-[#f15a24] block mb-1">Saldo Deudor</span>
                      <span className="text-xs font-black text-rose-600 font-mono block">{fmt(balance)}</span>
                    </div>
                  </div>

                  {/* Progress Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400">
                      <span>PAGADO: {progress}%</span>
                      <span>SALDO: {fmt(balance)}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-500", isFullyPaid ? "bg-emerald-500" : "bg-rose-500")} 
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                  </div>

                  {/* MINI HISTORIAL DE ABONOS (Granular List) */}
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Abonos o Cuotas Realizadas:
                    </span>

                    {((l.paymentHistory && l.paymentHistory.length > 0) || (l.payments && l.payments.length > 0)) ? (
                      <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-50">
                        {l.paymentHistory ? (
                          l.paymentHistory.map((pt, idx) => (
                            <div key={idx} className="flex justify-between items-start text-[10px] py-1 bg-white">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-700 block">Abono #{idx + 1}</span>
                                <span className="text-[8px] text-slate-400 font-mono flex items-center gap-1">
                                  {formatPaymentDate(pt.date)}
                                </span>
                                {pt.description && (
                                  <span className="text-[8px] text-[#f15a24] bg-[#f15a24]/5 inline-block px-1 rounded font-medium">
                                    Nota: {pt.description}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-emerald-600 font-black shrink-0 font-bold tracking-tight">+{fmt(pt.amount)}</span>
                            </div>
                          ))
                        ) : (
                          // Reconstructed
                          l.payments.map((amt, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[10px] py-1 bg-white">
                              <div>
                                <span className="font-bold text-slate-700 block">Abono #{idx + 1}</span>
                                <span className="text-[8px] text-slate-300 italic">Fecha previa registrada</span>
                              </div>
                              <span className="font-mono text-emerald-600 font-black tracking-tight">+{fmt(amt)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-slate-50/50 rounded-xl text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                        No se registran abonos
                      </div>
                    )}
                  </div>

                </div>

                {/* Card Operations Bar */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex gap-1.5 w-full">
                    {/* Secure Focus Toggle Button */}
                    <Button 
                      onClick={() => setIsolatedId(l.id)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-black text-[9px] uppercase tracking-wider py-2 px-3.5 h-8 rounded-lg flex items-center gap-1 w-full"
                      title="Mostrar a Acreedor de manera privada sin otras deudas"
                    >
                      <Eye className="w-3.5 h-3.5" /> Mostrar
                    </Button>

                    {!isFullyPaid && (
                      <Button 
                        onClick={() => {
                          setSelectedLiabilityId(l.id);
                          setIsPaymentOpen(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-wider py-2 px-3.5 h-8 rounded-lg flex items-center gap-1 w-full"
                      >
                        <HandCoins className="w-3.5 h-3.5" /> Abonar
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setSelectedLiabilityId(l.id);
                        setIsExtraOpen(true);
                      }}
                      className="h-8 w-8 rounded-lg text-blue-600 hover:bg-blue-50"
                      title="Aumentar saldo"
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setLiabilityToDelete(l.id);
                        setIsConfirmDeleteOpen(true);
                      }}
                      className="h-8 w-8 rounded-lg text-rose-600 hover:bg-rose-50"
                      title="Eliminar Obligación"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl space-y-3 dark:border-slate-800">
          <TrendingDown className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="text-base font-black text-slate-950 uppercase tracking-widest">No hay obligaciones para mostrar</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">Prueba cambiando tu búsqueda o filtro por estado para visualizar el historial, o bien agrega una nueva obligación si correspondiere.</p>
          <Button 
            onClick={() => { setSearchQuery(''); setStatusFilter('all'); }} 
            variant="outline"
            className="rounded-xl font-black text-[10px] uppercase tracking-wider border-slate-200"
          >
            Restablecer Filtros
          </Button>
        </div>
      )}

      {/* dialogs */}

      {/* Registration of Payment (Abono) Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-wider text-slate-950">Registrar Abono</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">Guarda un nuevo pago parcial o abono final a esta obligación. Quedará registrado con fecha y hora actual.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="pl-amount" className="text-[10px] font-black uppercase text-slate-500">Monto del Abono *</Label>
              <Input 
                id="pl-amount" 
                type="number" 
                value={paymentAmount || ''} 
                onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)} 
                placeholder="0"
                className="rounded-xl h-10 border-slate-200 font-mono"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pl-desc" className="text-[10px] font-black uppercase text-slate-500">Nota u Observación (Opcional)</Label>
              <Input 
                id="pl-desc" 
                type="text" 
                value={paymentDescription} 
                onChange={e => setPaymentDescription(e.target.value)} 
                placeholder="Ej: Transferencia Bancolombia / Efectivo..."
                className="rounded-xl h-10 border-slate-200"
              />
            </div>
          </div>
          <Button onClick={handleAddPayment} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-[10px] rounded-xl h-11">Guardar Abono</Button>
        </DialogContent>
      </Dialog>

      {/* Compounding Debt Dialog */}
      <Dialog open={isExtraOpen} onOpenChange={setIsExtraOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-wider text-slate-950">Incrementar Deuda</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">Aumenta el saldo pendiente de esta deuda por adquisiciones adicionales o intereses.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="le-amount" className="text-[10px] font-black uppercase text-slate-500">Monto de nueva deuda a sumar *</Label>
              <Input 
                id="le-amount" 
                type="number" 
                value={extraAmount || ''} 
                onChange={e => setExtraAmount(parseFloat(e.target.value) || 0)} 
                placeholder="0"
                className="rounded-xl h-10 border-slate-200 font-mono"
              />
            </div>
          </div>
          <Button onClick={handleAddExtraDebt} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider text-[10px] rounded-xl h-11">Aumentar Deuda</Button>
        </DialogContent>
      </Dialog>

      {/* Confirmation of deletion */}
      <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-slate-950 uppercase text-sm tracking-wider">¿Eliminar Obligación permanente?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Esta acción eliminará de forma irreversible el pasivo y su historial de abonos relacionados del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-bold text-[10px] uppercase">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700 rounded-xl font-bold text-[10px] uppercase text-white">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
