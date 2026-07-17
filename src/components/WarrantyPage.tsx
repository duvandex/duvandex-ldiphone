import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Hash, User, ShoppingBag, ChevronLeft, ShieldCheck, Calendar } from 'lucide-react';
import { useData } from '../context/AppDataContext';
import { fmt } from '../lib/utils';
import Logo from './Logo';

export default function WarrantyPage() {
  const { id } = useParams();
  const { data, findProductPublicly, searchedProduct, loading } = useData();
  const [search, setSearch] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  
  // Direct ID check on mount
  React.useEffect(() => {
    if (id) {
       findProductPublicly(id);
    }
  }, [id]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!search) return;
    await findProductPublicly(search);
    setHasSearched(true);
  };

  const product = searchedProduct || data.products.find(p => (id && p.id === id) || (search && (p.invoiceNumber === search || p.imei === search)));

  if (loading && !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  if (!id && !product) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full border-none shadow-xl bg-card">
          <CardHeader className="text-center">
            <Logo size="lg" className="mb-4" />
            <CardTitle className="text-xl font-bold uppercase tracking-tight text-foreground">Consulta de Garantía</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search" className="text-foreground">IMEI o Número de Factura</Label>
                <div className="flex gap-2">
                  <Input 
                    id="search"
                    placeholder="Ej: LDI-15 o 3546..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-muted border-none uppercase text-foreground"
                  />
                  <Button type="submit" size="icon" className="shrink-0 bg-primary text-primary-foreground">
                    <ShieldCheck className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </form>
            {hasSearched && !product && (
              <p className="text-center text-xs font-bold text-rose-500">No se encontró ningún registro</p>
            )}
            <div className="pt-4 border-t border-border">
              <Link to="/catalog">
                <Button variant="ghost" className="w-full text-muted-foreground text-xs font-bold uppercase hover:text-foreground">Volver al Catálogo</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full text-center p-8 border-none shadow-sm bg-card">
          <Hash className="w-12 h-12 text-muted mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-foreground">Garantía No Encontrada</h2>
          <p className="text-muted-foreground mb-6 text-sm">No pudimos encontrar un registro de garantía válido.</p>
          <Link to="/catalog">
            <Button variant="outline" className="w-full border-border">Volver al Catálogo</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link to="/catalog" className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> VOLVER
        </Link>

        {/* Certificate Header */}
        <Card className="border-none shadow-sm overflow-hidden bg-secondary text-secondary-foreground">
          <CardContent className="p-8 text-center sm:text-left flex flex-col sm:flex-row items-center gap-6">
            <div className="bg-white p-3 rounded-2xl dark:bg-slate-100">
              <Logo size="lg" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black uppercase tracking-tight">Certificado de Garantía</h1>
              <p className="opacity-70 font-mono text-sm uppercase">{data.settings.companyName}</p>
              <p className="opacity-50 text-[10px] font-bold uppercase tracking-widest">Factura No. {product.invoiceNumber}</p>
            </div>
            <ShieldCheck className="w-16 h-16 ml-auto opacity-20 text-emerald-400 hidden sm:block" />
          </CardContent>
        </Card>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm bg-card text-card-foreground">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" /> Información del Producto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Producto</Label>
                <div className="text-lg font-bold text-foreground">{product.name}</div>
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">IMEI / Serie</Label>
                <div className="text-sm font-mono text-foreground">{product.imei || 'No registrado'}</div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Cantidad</Label>
                  <div className="text-sm font-bold text-foreground">{product.quantity}</div>
                </div>
                <div className="flex-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Valor Unitario</Label>
                  <div className="text-sm font-mono font-bold text-emerald-600">{fmt(product.salePrice || 0)}</div>
                </div>
              </div>
              {product.warrantyMonths ? (
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 mt-2">
                   <div className="text-[10px] uppercase font-bold text-blue-500">Garantía Limitada</div>
                   <div className="text-sm font-black text-blue-600 dark:text-blue-400">{product.warrantyMonths} MESES</div>
                   {product.warrantyExpiration && (
                     <div className="text-[9px] font-bold text-blue-500/70 mt-1 uppercase">VENCE: {product.warrantyExpiration}</div>
                   )}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-card text-card-foreground">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Detalles de Cobertura
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-500 shrink-0 mt-1" />
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Fecha de Venta</Label>
                  <div className="text-sm font-bold text-foreground">{product.saleDate}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-blue-500 shrink-0 mt-1" />
                <div>
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Comprador</Label>
                  <div className="text-sm font-bold text-foreground">{product.buyer || 'Cliente General'}</div>
                </div>
              </div>
              <div className="pt-2">
                <Badge className="bg-emerald-500/10 text-emerald-600 border-none hover:bg-emerald-500/20 text-xs font-bold py-1 px-3">
                  Garantía Activa ({product.warrantyMonths || 6} Meses)
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Terms */}
        <Card className="border-none shadow-sm overflow-hidden bg-card text-card-foreground">
          <CardHeader className="bg-muted border-b border-border">
            <CardTitle className="text-sm font-bold uppercase text-muted-foreground">Condiciones y Cobertura</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-medium">
              {product.warrantyTerms || data.settings.warrantyTerms}
            </div>
          </CardContent>
        </Card>

        {/* Images if any */}
        {product.images && product.images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {product.images.map((img, i) => (
              <div key={i} className="aspect-square rounded-xl overflow-hidden bg-card shadow-sm border border-border p-1">
                <img src={img} className="w-full h-full object-cover rounded-lg" alt={`Product ${i}`} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
