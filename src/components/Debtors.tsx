import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Plus, Trash2, HandCoins, UserPlus, Smartphone, BadgeDollarSign } from 'lucide-react';
import { useData } from '../context/AppDataContext';
import { fmt, cn } from '../lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

export default function Debtors() {
  const { data, addDebtor, addPayment, deleteDebtor, updateDebtor } = useData();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isExtraOpen, setIsExtraOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [selectedDebtorId, setSelectedDebtorId] = useState<string | null>(null);
  const [debtorToDelete, setDebtorToDelete] = useState<string | null>(null);

  const [newDebtor, setNewDebtor] = useState({
    name: '',
    description: '',
    totalAmount: 0,
    initialPayment: 0,
  });

  const [paymentAmount, setPaymentAmount] = useState(0);
  const [extraAmount, setExtraAmount] = useState(0);

  const handleAddDebtor = () => {
    if (!newDebtor.name || !newDebtor.totalAmount) return;
    addDebtor({
      name: newDebtor.name,
      description: newDebtor.description,
      totalAmount: newDebtor.totalAmount,
      payments: newDebtor.initialPayment > 0 ? [newDebtor.initialPayment] : [],
      status: newDebtor.initialPayment >= newDebtor.totalAmount ? 'paid' : 'pending',
    });
    setNewDebtor({ name: '', description: '', totalAmount: 0, initialPayment: 0 });
    setIsAddOpen(false);
  };

  const handleAddPayment = () => {
    if (!selectedDebtorId || !paymentAmount) return;
    addPayment(selectedDebtorId, paymentAmount);
    setPaymentAmount(0);
    setIsPaymentOpen(false);
    setSelectedDebtorId(null);
  };

  const handleAddExtraDebt = () => {
    if (!selectedDebtorId || !extraAmount) return;
    const debtor = data.debtors.find(d => d.id === selectedDebtorId);
    if (debtor) {
      updateDebtor(selectedDebtorId, {
        totalAmount: debtor.totalAmount + extraAmount,
        status: 'pending'
      });
    }
    setExtraAmount(0);
    setIsExtraOpen(false);
    setSelectedDebtorId(null);
  };

  const confirmDelete = () => {
    if (debtorToDelete) {
      deleteDebtor(debtorToDelete);
      setDebtorToDelete(null);
      setIsConfirmDeleteOpen(false);
    }
  };

  const totalPending = data.debtors.reduce((sum, d) => {
    const paid = d.payments.reduce((a, b) => a + b, 0);
    return sum + (d.totalAmount - paid);
  }, 0);
  const totalDebtorsAmount = data.debtors.reduce((sum, d) => sum + d.totalAmount, 0);
  const totalDebtorsPaid = data.debtors.reduce((sum, d) => sum + d.payments.reduce((a, b) => a + b, 0), 0);

  const reservedProducts = data.products.filter(p => p.status === 'reserved');
  const totalReservedPending = reservedProducts.reduce((sum, p) => {
    const total = (p.salePrice || 0) * (p.quantity || 1);
    const paid = p.reservationAmount || 0;
    return sum + (total - paid);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Deudores</h2>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger
            render={
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" /> Agregar Deudor
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Nuevo Deudor</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="d-name">Nombre *</Label>
                <Input id="d-name" value={newDebtor.name} onChange={e => setNewDebtor({...newDebtor, name: e.target.value})} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="d-desc">Descripción</Label>
                <Input id="d-desc" value={newDebtor.description} onChange={e => setNewDebtor({...newDebtor, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="d-total">Monto Total *</Label>
                  <Input id="d-total" type="number" value={newDebtor.totalAmount || 0} onChange={e => setNewDebtor({...newDebtor, totalAmount: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="d-abono">Abono Inicial</Label>
                  <Input id="d-abono" type="number" value={newDebtor.initialPayment || 0} onChange={e => setNewDebtor({...newDebtor, initialPayment: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
            </div>
            <Button onClick={handleAddDebtor} className="w-full">Guardar Deudor</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm bg-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-[10px] uppercase font-bold pl-6 text-muted-foreground">Deudor</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Descripción</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-right text-muted-foreground">Total</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-right text-muted-foreground">Abonado</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-right text-muted-foreground">Saldo</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-muted-foreground">Progreso</TableHead>
                <TableHead className="text-[10px] uppercase font-bold text-right pr-6 text-muted-foreground">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.debtors.map((d) => {
                const paid = d.payments.reduce((a, b) => a + b, 0);
                const balance = d.totalAmount - paid;
                const progress = Math.min(100, Math.round((paid / d.totalAmount) * 100));
                
                return (
                  <TableRow key={d.id} className="border-border">
                    <TableCell className="py-4 pl-6 font-medium text-foreground">{d.name}</TableCell>
                    <TableCell className="py-4 text-xs text-muted-foreground">{d.description || '—'}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-mono text-foreground">{fmt(d.totalAmount)}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-mono text-emerald-600">{fmt(paid)}</TableCell>
                    <TableCell className="py-4 text-right text-xs font-mono text-rose-600 font-bold">{fmt(balance)}</TableCell>
                    <TableCell className="py-4">
                      <div className="w-24">
                        <div className="flex justify-between text-[9px] font-bold mb-1">
                          <span className="text-foreground">{progress}%</span>
                          <Badge variant="outline" className={cn(
                            "text-[8px] h-3 px-1 border-none",
                            d.status === 'paid' ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                          )}>
                            {d.status === 'paid' ? 'Pagado' : 'Pendiente'}
                          </Badge>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full transition-all duration-500", d.status === 'paid' ? "bg-emerald-500" : "bg-rose-500")} 
                            style={{ width: `${progress}%` }} 
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                          title="Agregar más duda"
                          onClick={() => {
                            setSelectedDebtorId(d.id);
                            setIsExtraOpen(true);
                          }}
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                        {d.status === 'pending' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                            title="Registrar abono"
                            onClick={() => {
                              setSelectedDebtorId(d.id);
                              setIsPaymentOpen(true);
                            }}
                          >
                            <HandCoins className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          onClick={() => {
                            setDebtorToDelete(d.id);
                            setIsConfirmDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {data.debtors.length > 0 && (
                <TableRow className="bg-muted/50 font-black border-border">
                  <TableCell className="py-4 pl-6 text-foreground" colSpan={2}>TOTALES CONSOLIDADOS</TableCell>
                  <TableCell className="py-4 text-right font-mono text-foreground">{fmt(totalDebtorsAmount)}</TableCell>
                  <TableCell className="py-4 text-right font-mono text-emerald-600">{fmt(totalDebtorsPaid)}</TableCell>
                  <TableCell className="py-4 text-right font-mono text-rose-600">{fmt(totalPending)}</TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              )}
              {data.debtors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No hay deudores registrados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {reservedProducts.length > 0 && (
        <div className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black uppercase tracking-tight text-orange-600 flex items-center gap-2">
              <BadgeDollarSign className="w-5 h-5" /> Separaciones Pendientes
            </h3>
            <Badge className="bg-orange-500/10 text-orange-600 border-none font-black text-xs px-3 py-1">
              Saldo Total: {fmt(totalReservedPending)}
            </Badge>
          </div>

          <Card className="border-none shadow-sm bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-orange-50/50">
                <TableRow className="hover:bg-transparent border-orange-100">
                  <TableHead className="text-[10px] uppercase font-black pl-6 text-orange-600">Cliente</TableHead>
                  <TableHead className="text-[10px] uppercase font-black text-orange-600">Equipo</TableHead>
                  <TableHead className="text-[10px] uppercase font-black text-right text-orange-600">Valor Venta</TableHead>
                  <TableHead className="text-[10px] uppercase font-black text-right text-orange-600">Abonado</TableHead>
                  <TableHead className="text-[10px] uppercase font-black text-right text-orange-600 pr-6">Saldo Pendiente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservedProducts.map((p) => {
                  const total = (p.salePrice || 0) * (p.quantity || 1);
                  const paid = p.reservationAmount || 0;
                  const balance = total - paid;
                  return (
                    <TableRow key={p.id} className="border-orange-50/50 hover:bg-orange-50/30 transition-colors">
                      <TableCell className="py-4 pl-6 font-bold text-foreground">
                        {p.reservationBuyer || p.buyer || 'Cliente'}
                        <div className="text-[9px] text-muted-foreground uppercase mt-0.5 tracking-widest">{p.reservationDate || 'Sin fecha'}</div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                           <Smartphone className="w-3.5 h-3.5 text-orange-400" />
                           <span className="text-xs font-bold text-foreground">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-right text-xs font-mono font-medium text-foreground">{fmt(total)}</TableCell>
                      <TableCell className="py-4 text-right text-xs font-mono font-bold text-orange-600">{fmt(paid)}</TableCell>
                      <TableCell className="py-4 text-right text-xs font-mono font-black text-emerald-600 pr-6">{fmt(balance)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="p-4 bg-orange-50/20 border-t border-orange-100 italic text-[10px] text-orange-600 font-medium">
               Nota: Estas separaciones se gestionan desde el Inventario al completar el pago o editar el monto.
            </div>
          </Card>
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Registrar Abono</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="p-amount">Monto del Abono *</Label>
              <Input 
                id="p-amount" 
                type="number" 
                value={paymentAmount || 0} 
                onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)} 
              />
            </div>
          </div>
          <Button onClick={handleAddPayment} className="w-full bg-emerald-600 hover:bg-emerald-700">Guardar Abono</Button>
        </DialogContent>
      </Dialog>

      {/* Extra Debt Dialog */}
      <Dialog open={isExtraOpen} onOpenChange={setIsExtraOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agregar más deuda</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="e-amount">Monto de la nueva deuda *</Label>
              <Input 
                id="e-amount" 
                type="number" 
                value={extraAmount || 0} 
                onChange={e => setExtraAmount(parseFloat(e.target.value) || 0)} 
              />
            </div>
          </div>
          <Button onClick={handleAddExtraDebt} className="w-full bg-blue-600 hover:bg-blue-700">Aumentar Deuda</Button>
        </DialogContent>
      </Dialog>

      {/* Deletion Confirmation */}
      <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente al deudor y todos sus registros de pagos de nuestros servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-rose-600 hover:bg-rose-700">Eliminar definitivamente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
