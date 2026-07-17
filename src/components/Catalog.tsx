import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Search, ShoppingBag, Camera, Menu, ShieldCheck, LayoutDashboard, ChevronRight, Apple, Smartphone, X, ChevronLeft, Send, Tablet, Watch, Headphones, CreditCard, MessageCircle } from 'lucide-react';
import { useData } from '../context/AppDataContext';
import { useCloudinary } from '../hooks/useCloudinary';
import { fmt, cn, extractGB, extractBattery } from '../lib/utils';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Product } from '../types';

// Dynamic Warranty Badge/Label based on product characteristics & category
export const getProductWarranty = (p: Product) => {
  const nameLower = p.name.toLowerCase();
  const descLower = (p.description || '').toLowerCase();
  
  const isApple = nameLower.includes('iphone') || 
                  nameLower.includes('apple') || 
                  nameLower.includes('ipad') || 
                  nameLower.includes('watch') || 
                  (p.category && ['CELULARES', 'TABLETS', 'RELOJ INTELIGENTES', 'AURICULARES'].includes(p.category));

  // If the product explicitly says "apple directo", "garantia apple", "nueva de apple", etc.
  const isAppleDirect = isApple && (
    nameLower.includes('apple directo') || 
    nameLower.includes('directa apple') || 
    nameLower.includes('garantía apple') ||
    descLower.includes('garantía apple') || 
    descLower.includes('apple directo') ||
    descLower.includes('garantía directa apple')
  );

  const isNew = nameLower.includes('nuevo') || 
                nameLower.includes('sellado') || 
                nameLower.includes('new') ||
                descLower.includes('nuevo') || 
                descLower.includes('sellado');

  if (isApple) {
    if (isNew || isAppleDirect) {
      return {
        short: "🍏 1 Año Apple Directo",
        long: "1 Año Garantía Directa Apple",
        description: "Equipo original nuevo o con garantía vigente de Apple. Cobertura oficial de Apple de un año a nivel mundial.",
        badgeColor: "bg-[#f15a24]/10 text-[#f15a24] dark:bg-[#f15a24]/20 dark:text-[#f15a24]"
      };
    } else {
      const months = p.warrantyMonths || 3;
      return {
        short: `🛡️ ${months} Meses Garantía Premium`,
        long: `Garantía Premium de ${months} Meses`,
        description: `iPhone certificado con batería testeada. Incluye ${months} meses de garantía con cobertura técnica y soporte post-venta de confianza.`,
        badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
      };
    }
  }

  // Default other products
  const months = p.warrantyMonths || 3;
  return {
    short: `🛡️ ${months} Meses Garantía`,
    long: `Garantía de ${months} Meses`,
    description: `Este artículo cuenta con ${months} meses de garantía local y de nuestra marca con cobertura de soporte técnico ante cualquier imperfección.`,
    badgeColor: "bg-slate-50 text-slate-700 dark:bg-slate-900/45 dark:text-slate-300"
  };
};

export default function Catalog() {
  const { data, user, updateSettings, loading } = useData();
  const { uploadImage, getOptimizedUrl } = useCloudinary();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    images: string[];
    currentIndex: number;
  }>({
    isOpen: false,
    images: [],
    currentIndex: 0,
  });
  const [isUploading, setIsUploading] = useState<number | null>(null);
  const [cart, setCart] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addToCart = (p: Product) => {
    if (!cart.find(item => item.id === p.id)) {
      setCart([...cart, p]);
    }
    setIsCartOpen(true);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(p => p.id !== id));
  };

  const cartTotal = cart.reduce((sum, p) => sum + (p.salePrice || 0), 0);

  const sendCartToWhatsApp = () => {
    const itemsList = cart.map(p => `- ${p.name}: ${fmt(p.salePrice || 0)}`).join('\n');
    const message = `Hola! Me interesan estos equipos del catálogo:\n\n${itemsList}\n\n*Total: ${fmt(cartTotal)}*\n\n¿Están disponibles?`;
    window.open(`https://wa.me/573012949934?text=${encodeURIComponent(message)}`, '_blank');
  };

  const isAuthenticated = !!user;

  const handlePaymentImageUpload = (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      setIsUploading(index);
      try {
        const cloudinaryUrl = await uploadImage(file, 'ldiphone/payments');
        const currentMethods = [...(data.settings.paymentMethods || [])];
        while (currentMethods.length <= index) {
          currentMethods.push('');
        }
        currentMethods[index] = cloudinaryUrl;
        await updateSettings({ paymentMethods: currentMethods });
      } catch (error) {
        console.error('Error subiendo imagen:', error);
        alert('Error al subir la imagen. Intenta de nuevo.');
      } finally {
        setIsUploading(null);
      }
    };
    input.click();
  };

  const removePaymentImage = async (index: number) => {
    if (!confirm('¿Eliminar este medio de pago?')) return;
    const currentMethods = [...(data.settings.paymentMethods || [])];
    currentMethods[index] = '';
    await updateSettings({ paymentMethods: currentMethods });
  };

  const renderPaymentCard = (index: number, classNames?: string) => {
    const imageUrl = data.settings.paymentMethods?.[index];
    return (
      <div key={index} className={cn("relative group shrink-0", classNames)}>
        <div className={cn(
          "w-36 h-18 sm:w-44 sm:h-22 md:w-52 md:h-26 lg:w-64 lg:h-32 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all duration-300 shadow-sm bg-card/50",
          imageUrl ? "border-transparent bg-card hover:shadow-md" : "border-border bg-muted/20"
        )}>
          {imageUrl ? (
            <img src={imageUrl} alt={`Pago ${index + 1}`} className="w-full h-full object-contain p-2 sm:p-3 lg:p-4" referrerPolicy="no-referrer" />
          ) : (
            <div className="flex flex-col items-center gap-0.5 opacity-20 text-foreground">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
              <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-center">Disponible</span>
            </div>
          )}
        </div>

        {isAuthenticated && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl gap-2 backdrop-blur-sm">
            <button 
              onClick={() => handlePaymentImageUpload(index)}
              className="p-1.5 sm:p-2 bg-white rounded-full text-slate-900 hover:scale-110 transition-transform shadow-lg"
              disabled={isUploading === index}
            >
              <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
            </button>
            {imageUrl && (
              <button 
                onClick={() => removePaymentImage(index)}
                className="p-1.5 sm:p-2 bg-rose-500 rounded-full text-white hover:scale-110 transition-transform shadow-lg"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
              </button>
            )}
          </div>
        )}
        
        {isUploading === index && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl">
            <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent animate-spin rounded-full" />
          </div>
        )}
      </div>
    );
  };

  const publicProducts = React.useMemo(() => {
    if (!data.products) return [];
    return data.products
      .filter(p => 
        (p.status === 'stock' || p.status === 'reserved' || !p.status) && 
        !p.hideInCatalog &&
        (p.name?.toLowerCase() || '').includes(search.toLowerCase()) &&
        (category === 'all' || 
         p.category === category || 
         (p.name?.toLowerCase().includes(category.toLowerCase())))
      )
      .sort((a, b) => (b.salePrice || 0) - (a.salePrice || 0));
  }, [data.products, search, category]);

  const categories = [
    { id: 'all', name: 'TODO', icon: ShoppingBag },
    { id: 'CELULARES', name: 'CELULARES', icon: Smartphone },
    { id: 'TABLETS', name: 'TABLETS', icon: Tablet },
    { id: 'RELOJ INTELIGENTES', name: 'RELOJ INTELIGENTES', icon: Watch },
    { id: 'AURICULARES', name: 'AURICULARES', icon: Headphones },
    { id: 'ACCESORIOS', name: 'ACCESORIOS', icon: Apple },
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  const getWhatsAppLink = (p: Product) => {
    const message = `Hola! Estoy interesado en este equipo que vi en su catálogo:%0A%0A📱 *${p.name}*%0A💰 *Precio:* ${fmt(p.salePrice || 0)}%0A📍 *Ref:* ${p.id.slice(0, 8)}%0A%0A¿Sigue disponible?`;
    return `https://wa.me/573012949934?text=${message}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Header */}
      <header className={cn(
        "glass sticky z-50 px-4 py-3 border-b border-border shadow-sm transition-all duration-300",
        isAuthenticated ? "top-14" : "top-0"
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative md:hidden">
              <button 
                className="-ml-2 p-2 hover:bg-muted rounded-full transition-all active:scale-90"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <Menu className="w-5 h-5 text-muted-foreground" />
              </button>
              
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 mt-3 w-64 bg-card rounded-3xl shadow-2xl border border-border p-2 z-50 origin-top-left"
                  >
                    <Link to="/" className="flex items-center gap-3 py-3 px-4 hover:bg-muted rounded-2xl transition-colors" onClick={() => setIsMenuOpen(false)}>
                      <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                      <span className="font-black text-xs uppercase tracking-widest text-foreground">Explorar Admin</span>
                    </Link>
                    <div className="h-px bg-border my-1 mx-2" />
                    <Link to="/warranty" className="flex items-center gap-3 py-3 px-4 hover:bg-muted rounded-2xl transition-colors" onClick={() => setIsMenuOpen(false)}>
                      <ShieldCheck className="w-4 h-4 text-blue-500" />
                      <span className="font-black text-xs uppercase tracking-widest text-foreground">Ver Garantías</span>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <div className="hidden sm:block leading-none">
                <h1 className="text-xl font-black tracking-tighter text-foreground uppercase">{data.settings.companyName}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Premium Stock</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-8 mr-auto ml-12 shrink-0">
            <Link to="/warranty" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors">Seguimiento</Link>
            <Link to="/catalog" className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground border-b-2 border-primary pb-1">Dispositivos</Link>
          </div>

          <div className="relative max-w-[240px] sm:max-w-md w-full flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-foreground transition-colors" />
              <Input 
                placeholder="¿Qué buscas hoy?..." 
                className="pl-11 h-10 bg-muted/50 border-none shadow-inner rounded-full text-xs font-bold text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:bg-card transition-all shadow-muted/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full relative hover:bg-muted"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingBag className="w-5 h-5" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-background">
                  {cart.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-card pt-3 sm:pt-6 pb-4 sm:pb-8 overflow-hidden border-b border-border">
        <div className="absolute inset-0 z-0 opacity-40">
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-muted/20 rounded-full translate-x-1/2 -translate-y-1/2"></div>
           <div className="absolute bottom-0 left-0 w-[800px] h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
            
            {/* Left Payment (Payment Method 1) - Desktop Only */}
            <div className="hidden md:flex flex-col items-center gap-1.5 shrink-0">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Pago 1</span>
              {renderPaymentCard(0)}
            </div>

            {/* Title / Info - Centered */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center text-center space-y-2 sm:space-y-3"
            >
              <Badge variant="outline" className="rounded-full border-border bg-card px-2 sm:px-4 py-0 sm:py-1 text-[7px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground shadow-sm shadow-muted">
                 Catálogo Premium 2026
              </Badge>
              <h2 className="text-xs sm:text-xl lg:text-2xl font-black tracking-tighter text-foreground leading-[1.1] sm:leading-none">
                Tu próximo dispositivo.<br className="hidden sm:block"/>
                <span className="text-muted-foreground/30 sm:ml-4">Sin complicaciones.</span>
              </h2>
              <p className="max-w-sm text-muted-foreground font-medium text-[9px] sm:text-xs leading-relaxed opacity-85 hidden sm:block">
                Explora nuestra colección selecta de dispositivos con garantía extendida y soporte personalizado. Calidad Apple garantizada.
              </p>
            </motion.div>

            {/* Right Payment (Payment Method 2) - Desktop Only */}
            <div className="hidden md:flex flex-col items-center gap-1.5 shrink-0">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Pago 2</span>
              {renderPaymentCard(1)}
            </div>

          </div>

          {/* Payment Methods - Mobile/Tablet Only */}
          <div className="md:hidden mt-4 pt-4 border-t border-border/40">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">Medios de Pago</span>
              <div className="flex justify-center gap-3 w-full animate-fade-in">
                {renderPaymentCard(0)}
                {renderPaymentCard(1)}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Grid */}
      <main className="flex-1 px-1 py-4 sm:px-8 sm:py-12">
        <div className="max-w-7xl mx-auto">
          {/* Categories */}
          <div className="flex items-center gap-1.5 sm:gap-3 mb-4 sm:mb-12 overflow-x-auto pb-2 no-scrollbar px-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl whitespace-nowrap transition-all duration-300 font-black text-[8px] sm:text-[10px] uppercase tracking-widest",
                  category === cat.id 
                    ? "bg-primary text-primary-foreground shadow-xl shadow-primary/10 scale-105" 
                    : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
                )}
              >
                <cat.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-6 sm:mb-10 px-2 sm:px-0">
            <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2 sm:gap-3">
               Colección
               <span className="h-px w-8 sm:w-12 bg-border"></span>
            </h3>
            <p className="text-[8px] sm:text-[10px] font-bold text-muted-foreground italic">{publicProducts.length} equipos</p>
          </div>

          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-8"
          >
            {loading && publicProducts.length === 0 ? (
              // Fast loading skeletons
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] sm:aspect-video bg-muted/20 animate-pulse rounded-2xl" />
              ))
            ) : publicProducts.map((p) => (
              <motion.div key={p.id} variants={item}>
                <Card className="group card-premium rounded-xl sm:rounded-3xl overflow-hidden border-none h-full flex flex-col bg-card shadow-sm hover:shadow-xl transition-all duration-500">
                  <div 
                    className="aspect-[3/4] sm:aspect-video relative flex items-center justify-center bg-muted/30 overflow-hidden cursor-pointer"
                    onClick={() => {
                        setSelectedProduct(p);
                        setActiveImageIndex(0);
                    }}
                  >
                    {p.images && p.images.length > 0 ? (
                      <img 
                        src={getOptimizedUrl(p.images[0], 600, 800)} 
                        className="w-full h-full object-contain sm:object-cover sm:group-hover:scale-110 transition-transform duration-700 bg-slate-50/60 dark:bg-slate-900/20" 
                        alt={p.name} 
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 opacity-20 group-hover:opacity-40 transition-opacity">
                         <Smartphone className="w-12 h-12 sm:w-16 sm:h-16 text-foreground" />
                      </div>
                    )}

                    {/* Promotion Badge - Square Block Style like Reference */}
                    {(p.regularPrice || 0) > (p.salePrice || 0) && (
                        <div className="absolute top-0 left-0 z-20">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-[#f15a24] text-white px-2 py-1 sm:px-3 sm:py-2 font-black text-[10px] sm:text-lg shadow-lg"
                            >
                                -{Math.round(((p.regularPrice! - p.salePrice!) / p.regularPrice!) * 100)}%
                            </motion.div>
                        </div>
                    )}
                    
                    <Badge variant={p.status === 'stock' ? 'secondary' : p.status === 'reserved' ? 'outline' : 'default'} className={cn(
                      "absolute top-2 right-2 sm:top-4 sm:right-4 z-10 text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border-none shadow-lg backdrop-blur-md",
                      p.status === 'stock' ? "bg-white/90 text-[#f15a24]" : 
                      p.status === 'reserved' ? "bg-orange-50/90 text-orange-600" :
                      "bg-rose-50/90 text-rose-600"
                    )}>
                      {p.status === 'stock' ? 'DISPONIBLE' : p.status === 'reserved' ? 'SEPARADO' : 'AGOTADO'}
                    </Badge>
                  </div>

                  <CardContent className="p-4 sm:p-6 flex flex-col flex-1 bg-white">
                    <div className="mb-auto">
                       <div className="flex items-center gap-2 mb-1">
                          <span className="text-[7px] sm:text-[10px] font-black uppercase tracking-widest text-[#f15a24]">{p.category}</span>
                          <span className="text-[7px] sm:text-[10px] font-medium uppercase tracking-widest text-slate-300">ID: {p.id.slice(0, 6)}</span>
                       </div>
                       <h4 className="text-sm sm:text-2xl font-bold text-slate-900 line-clamp-2 leading-tight min-h-[2.5rem] sm:min-h-[3.5rem] tracking-tight group-hover:text-[#f15a24] transition-colors" onClick={() => { setSelectedProduct(p); setActiveImageIndex(0); }}>{p.name}</h4>
                       
                       {/* Auto Spec Labels */}
                       {(p.category === 'CELULARES' || p.category === 'TABLETS' || p.category === 'RELOJ INTELIGENTES' || p.category === 'AURICULARES' || p.name.toLowerCase().includes('iphone') || p.name.toLowerCase().includes('ipad') || p.name.toLowerCase().includes('apple')) && (
                         <div className="flex flex-wrap gap-1.5 mt-1.5">
                           {extractGB(p.name, p.description) && (
                             <div className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter flex items-center gap-0.5 shadow-xs">
                               💾 {extractGB(p.name, p.description)}
                             </div>
                           )}
                           {extractBattery(p.name, p.description) && (
                             <div className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter flex items-center gap-0.5 shadow-xs">
                               🔋 {extractBattery(p.name, p.description)}
                             </div>
                           )}
                           {(() => {
                             const warranty = getProductWarranty(p);
                             return (
                               <div className={cn("px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter flex items-center gap-0.5 shadow-xs", warranty.badgeColor)}>
                                 {warranty.short}
                               </div>
                             );
                           })()}
                         </div>
                       )}
                    </div>

                    <div className="flex items-end justify-between mt-4 sm:mt-6 pt-4 border-t border-slate-50">
                        <div className="flex flex-col">
                            {(p.regularPrice || 0) > (p.salePrice || 0) && (
                                <div className="flex items-center gap-1 mb-0.5">
                                    <span className="text-[7px] sm:text-[9px] font-black text-slate-300 uppercase tracking-widest">Antes:</span>
                                    <span className="text-[10px] sm:text-base font-bold text-slate-300 line-through">
                                        {fmt(p.regularPrice || 0)}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-baseline gap-1">
                                {(p.regularPrice || 0) > (p.salePrice || 0) && (
                                    <span className="text-[8px] sm:text-[10px] font-black text-[#f15a24] uppercase tracking-widest">Hoy:</span>
                                )}
                                <span className={cn(
                                    "text-lg sm:text-4xl font-black tracking-tighter leading-none",
                                    (p.regularPrice || 0) > (p.salePrice || 0) ? "text-[#f15a24]" : "text-slate-900"
                                )}>
                                    {fmt(p.salePrice || 0)}
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                             <Button 
                                size="icon" 
                                variant="outline"
                                onClick={(e) => { e.stopPropagation(); addToCart(p); }}
                                className="h-10 w-10 sm:h-14 sm:w-14 rounded-full border-slate-100 hover:border-[#f15a24] hover:text-[#f15a24] transition-all"
                            >
                                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
                            </Button>
                        </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {publicProducts.length === 0 && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-32 border-4 border-dashed border-border rounded-[3rem]"
            >
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground/30">
                <ShoppingBag className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-foreground tracking-tight">No encontramos lo que buscas</h3>
              <p className="text-muted-foreground mt-2 font-medium">Contáctanos directamente, puede que tengamos stock entrando pronto.</p>
              <Button variant="outline" className="mt-8 rounded-full h-12 px-8 font-black uppercase text-[10px] tracking-widest border-2" onClick={() => setSearch('')}>
                 Limpiar Búsqueda
              </Button>
            </motion.div>
          )}
        </div>
      </main>

      {/* Product View Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
         <DialogContent className="sm:max-w-5xl h-[92vh] sm:h-auto p-0 overflow-hidden border-none rounded-[2rem] md:rounded-[2.5rem] gap-0 shadow-2xl">
            <DialogHeader className="sr-only">
                <DialogTitle>{selectedProduct?.name}</DialogTitle>
            </DialogHeader>
            {selectedProduct && (
                <div className="flex flex-col md:flex-row h-full max-h-[92vh] md:max-h-[80vh]">
                    {/* Image Gallery */}
                    <div className="w-full md:w-1/2 bg-white relative group flex flex-col md:flex-row border-b md:border-b-0 md:border-r border-border/50 shrink-0">
                        {/* Thumbnails */}
                        {selectedProduct.images && selectedProduct.images.length > 1 && (
                            <div className="p-2 sm:p-3 bg-slate-50/50 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto no-scrollbar order-2 md:order-1 select-none w-full md:w-24 shrink-0 border-t md:border-t-0 md:border-r border-border/50 min-h-[66px] sm:min-h-[80px] items-center justify-center md:justify-start">
                                {selectedProduct.images.map((img, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => setActiveImageIndex(i)}
                                        onMouseEnter={() => setActiveImageIndex(i)}
                                        className={cn(
                                            "w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl overflow-hidden border-2 transition-all p-0.5 shrink-0 bg-white shadow-xs focus:outline-none",
                                            activeImageIndex === i ? "border-slate-800 dark:border-slate-200 scale-105" : "border-slate-100 hover:border-slate-300 dark:border-slate-700 opacity-60 hover:opacity-100"
                                        )}
                                        aria-label={`Ver imagen ${i + 1}`}
                                    >
                                        <img src={getOptimizedUrl(img, 200, 200)} className="w-full h-full object-contain rounded-md bg-slate-50/20" alt="" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Main Stage */}
                        <div 
                            className="flex-1 w-full relative overflow-hidden bg-white flex items-center justify-center min-h-[220px] sm:min-h-[450px] p-4 sm:p-6 order-1 md:order-2 touch-pan-y"
                            onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
                            onTouchEnd={(e) => {
                                if (touchStartX === null) return;
                                const touchEndX = e.changedTouches[0].clientX;
                                const diff = touchStartX - touchEndX;
                                if (Math.abs(diff) > 40) { // swipe threshold
                                    if (diff > 0) {
                                        // Swipe Left (Next Image)
                                        setActiveImageIndex(prev => prev < selectedProduct.images!.length - 1 ? prev + 1 : 0);
                                    } else {
                                        // Swipe Right (Prev Image)
                                        setActiveImageIndex(prev => prev > 0 ? prev - 1 : selectedProduct.images!.length - 1);
                                    }
                                }
                                setTouchStartX(null);
                            }}
                        >
                            <AnimatePresence mode="wait">
                                <motion.img 
                                    key={activeImageIndex}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.05 }}
                                    transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                                    src={getOptimizedUrl(selectedProduct.images?.[activeImageIndex] || '', 1200, 1200, 'fit')} 
                                    className="mx-auto block max-w-[85%] max-h-[190px] sm:max-h-[420px] md:max-h-[480px] w-auto h-auto object-contain cursor-zoom-in drop-shadow-sm hover:scale-[1.02] active:scale-95 transition-all duration-300 pointer-events-auto select-none"
                                    alt={selectedProduct.name}
                                    onClick={() => {
                                        setLightbox({
                                            isOpen: true,
                                            images: selectedProduct.images || [],
                                            currentIndex: activeImageIndex
                                        });
                                    }}
                                    loading="eager"
                                />
                            </AnimatePresence>
                            
                            {selectedProduct.images && selectedProduct.images.length > 1 && (
                                <>
                                    <button 
                                        onClick={() => setActiveImageIndex(prev => prev > 0 ? prev - 1 : selectedProduct.images!.length - 1)}
                                        className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 sm:p-2.5 bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-900 active:scale-90 rounded-full text-slate-800 dark:text-slate-100 transition-all shadow-md z-10 border border-slate-200/50"
                                    >
                                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                    <button 
                                        onClick={() => setActiveImageIndex(prev => prev < selectedProduct.images!.length - 1 ? prev + 1 : 0)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 sm:p-2.5 bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-900 active:scale-90 rounded-full text-slate-800 dark:text-slate-100 transition-all shadow-md z-10 border border-slate-200/50"
                                    >
                                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Details */}
                    <div className="w-full md:w-1/2 p-5 sm:p-8 md:p-12 flex flex-col flex-1 bg-card overflow-y-auto custom-scrollbar">
                        <div className="mb-6 sm:mb-8">
                            <Badge className={cn(
                                "border-none text-[9px] font-black uppercase tracking-[0.2em] mb-3 px-4 py-1.5 rounded-full shadow-sm w-fit",
                                selectedProduct.status === 'reserved' ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-600"
                            )}>
                                {selectedProduct.status === 'reserved' ? 'EQUIPO SEPARADO' : 'STOCK DISPONIBLE'}
                            </Badge>
                            <h2 className="text-2xl sm:text-4xl font-black text-foreground tracking-tighter leading-tight mb-3">{selectedProduct.name}</h2>
                            <div className="flex flex-wrap gap-1.5 mb-4">
                                {extractGB(selectedProduct.name, selectedProduct.description) && (
                                    <div className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                        💾 CAPACIDAD: {extractGB(selectedProduct.name, selectedProduct.description)}
                                    </div>
                                )}
                                {extractBattery(selectedProduct.name, selectedProduct.description) && (
                                    <div className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                        🔋 BATERÍA: {extractBattery(selectedProduct.name, selectedProduct.description)}
                                    </div>
                                )}
                                {(() => {
                                    const warranty = getProductWarranty(selectedProduct);
                                    return (
                                        <div className={cn("px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-xs", warranty.badgeColor)}>
                                            {warranty.short}
                                        </div>
                                    );
                                })()}
                            </div>
                             <div className="flex flex-col gap-1 mb-6 sm:mb-8">
                                {(selectedProduct.regularPrice || 0) > (selectedProduct.salePrice || 0) && (
                                    <div className="flex flex-col gap-1.5 mb-3 sm:mb-4">
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-[#f15a24] text-white border-none text-[10px] sm:text-[12px] font-black px-2.5 py-0.5 rounded-xs">
                                                OFERTA ESPECIAL
                                            </Badge>
                                            <span className="text-[9px] sm:text-[10px] font-black text-[#f15a24] uppercase tracking-widest animate-pulse">¡Ahorras el {Math.round(((selectedProduct.regularPrice! - selectedProduct.salePrice!) / selectedProduct.regularPrice!) * 100)}%!</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Precio Anterior:</span>
                                            <span className="text-lg sm:text-2xl font-bold text-slate-300 line-through">{fmt(selectedProduct.regularPrice || 0)}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 mb-1">Precio de Hoy</span>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className={cn(
                                            "text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter leading-none",
                                            (selectedProduct.regularPrice || 0) > (selectedProduct.salePrice || 0) ? "text-[#f15a24]" : "text-slate-900"
                                        )}>
                                            {fmt(selectedProduct.salePrice || 0)}
                                        </div>
                                        {selectedProduct.status === 'stock' && (
                                            <div className="flex flex-col gap-1 pt-1">
                                                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[8px] sm:text-[10px] font-black px-2 py-0.5">DISPONIBILIDAD INMEDIATA</Badge>
                                                <div className="flex items-center gap-1 pl-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600">Certificado Apple</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {selectedProduct.status === 'reserved' && (
                                <div className="mt-3 p-3.5 bg-orange-50 rounded-2xl border border-orange-100 flex items-start gap-2.5">
                                    <ShieldCheck className="w-4.5 h-4.5 text-orange-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest leading-none mb-1">Estado de Reserva</p>
                                        <p className="text-xs font-bold text-orange-700 leading-tight">Este equipo ya cuenta con un abono inicial y está siendo procesado para entrega.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 space-y-8">
                           <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Especificaciones</h4>
                                <div className="h-px flex-1 bg-border/50"></div>
                              </div>
                              <p className="text-[15px] text-foreground/80 font-medium leading-relaxed whitespace-pre-wrap">
                                 {selectedProduct.description || 'Sin descripción disponible para este equipo.'}
                              </p>
                           </div>
                           
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {(() => {
                                     const warranty = getProductWarranty(selectedProduct);
                                     return (
                                         <div className="p-5 bg-muted/20 rounded-2xl border border-border/50 flex flex-col gap-3">
                                             <div className="flex items-center gap-2 text-[#f15a24]">
                                                 <ShieldCheck className="w-5 h-5 animate-pulse" />
                                                 <span className="text-[10px] font-black uppercase tracking-widest">Garantía del Equipo</span>
                                             </div>
                                             <div>
                                                 <p className="text-base font-black text-foreground leading-none uppercase">{warranty.long}</p>
                                                 <p className="text-[10px] text-muted-foreground font-medium mt-1.5 leading-normal">{warranty.description}</p>
                                             </div>
                                         </div>
                                     );
                                 })() && (
                                     null
                                 ) && (
                                    <div className="p-5 bg-muted/20 rounded-2xl border border-border/50 flex flex-col gap-3">
                                        <div className="flex items-center gap-2 text-primary">
                                            <ShieldCheck className="w-5 h-5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Garantía LD</span>
                                        </div>
                                        <div>
                                            <p className="text-base font-black text-foreground leading-none">{selectedProduct.warrantyMonths} MESES</p>
                                            <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Cobertura técnica total</p>
                                        </div>
                                    </div>
                                )}
                                <div className="p-5 bg-muted/20 rounded-2xl border border-border/50 flex flex-col gap-3">
                                    <div className="flex items-center gap-2 text-emerald-500">
                                        <Smartphone className="w-5 h-5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Calidad Apple</span>
                                    </div>
                                    <div>
                                        <p className="text-base font-black text-foreground leading-none">ORIGINAL</p>
                                        <p className="text-[9px] text-muted-foreground font-bold uppercase mt-1">Componentes certificados</p>
                                    </div>
                                </div>
                           </div>
                        </div>

                        <div className="pt-6 sm:pt-10 space-y-3.5">
                            <Button 
                                onClick={() => addToCart(selectedProduct)}
                                className="w-full h-14 sm:h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs sm:text-sm tracking-widest shadow-2xl shadow-slate-900/20 transition-all active:scale-[0.98]"
                            >
                                <ShoppingBag className="w-5.5 h-5.5 sm:w-6 sm:h-6" />
                                AÑADIR AL CARRITO
                            </Button>
                            <a 
                                href={getWhatsAppLink(selectedProduct)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full h-14 sm:h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-xs sm:text-sm tracking-widest shadow-2xl shadow-emerald-600/30 transition-all active:scale-[0.98] group"
                            >
                                <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 sm:w-6 sm:h-6 fill-white group-hover:scale-110 transition-transform" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                                COMPRAR POR WHATSAPP
                            </a>
                            <button 
                                onClick={() => setSelectedProduct(null)}
                                className="w-full h-12 bg-muted hover:bg-muted/80 text-muted-foreground rounded-2xl flex items-center justify-center font-black uppercase text-[10px] tracking-[0.2em] transition-colors"
                            >
                                SEGUIR NAVEGANDO
                            </button>
                        </div>
                    </div>
                </div>
            )}
         </DialogContent>
      </Dialog>

      {/* Cart Dialog */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl">
          <DialogHeader className="p-8 border-b border-border bg-card">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
               <ShoppingBag className="w-7 h-7" /> Tu Carrito
            </DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4 bg-background">
             {cart.length === 0 ? (
               <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                  <ShoppingBag className="w-16 h-16" />
                  <p className="text-xs font-black uppercase tracking-widest">El carrito está vacío</p>
               </div>
             ) : (
               cart.map(p => (
                 <div key={p.id} className="flex gap-4 p-4 bg-card rounded-2xl border border-border shadow-sm items-center">
                    <div className="w-16 h-16 bg-muted rounded-xl overflow-hidden shrink-0">
                       {p.images && p.images[0] ? (
                          <img src={getOptimizedUrl(p.images[0], 200, 200)} className="w-full h-full object-cover" />
                       ) : <div className="w-full h-full flex items-center justify-center"><Smartphone className="w-6 h-6 opacity-20" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="text-[10px] font-black uppercase tracking-tight truncate">{p.name}</h4>
                       <p className="text-lg font-black text-primary">{fmt(p.salePrice || 0)}</p>
                    </div>
                    <button 
                      onClick={() => removeFromCart(p.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                    >
                       <X className="w-5 h-5" />
                    </button>
                 </div>
               ))
             )}
          </div>

          {cart.length > 0 && (
            <div className="p-8 bg-card border-t border-border space-y-6">
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Estimado</span>
                  <span className="text-3xl font-black tracking-tighter">{fmt(cartTotal)}</span>
               </div>
               <div className="grid grid-cols-1 gap-3">
                 <Button 
                   className="h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                   onClick={sendCartToWhatsApp}
                 >
                    <Send className="w-5 h-5" /> Finalizar Pedido WhatsApp
                 </Button>
                 <Button 
                   variant="ghost"
                   className="h-12 rounded-xl text-muted-foreground font-black uppercase text-[10px] tracking-widest"
                   onClick={() => setIsCartOpen(false)}
                 >
                    Seguir Comprando
                 </Button>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating Cart Button Mobile */}
      {cart.length > 0 && !isCartOpen && (
         <motion.button 
           initial={{ scale: 0, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="fixed bottom-24 right-6 z-40 sm:hidden w-16 h-16 bg-primary text-primary-foreground rounded-2xl shadow-2xl flex items-center justify-center"
           onClick={() => setIsCartOpen(true)}
         >
            <ShoppingBag className="w-6 h-6" />
            <span className="absolute -top-2 -right-2 bg-foreground text-background w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-background">
               {cart.length}
            </span>
         </motion.button>
      )}

      {/* Floating WhatsApp Button */}
      <motion.a
        href="https://wa.me/573012949934?text=Hola!%20Vengo%20desde%20el%20catálogo%20y%20me%20gustaría%20recibir%20asesoría%20sobre%20sus%20equipos."
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 sm:w-16 sm:h-16 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-2xl transition-colors duration-300 pointer-events-auto"
        id="whatsapp-floating-button"
      >
        <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
      </motion.a>

      {/* Trust Banner */}
      <section className="bg-muted/30 py-16 border-t border-border">
         <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-2">
                    <Apple className="w-6 h-6" />
                </div>
                <h4 className="text-foreground font-black uppercase tracking-widest text-xs">Original Apple Only</h4>
                <p className="text-muted-foreground text-sm font-medium">Garantizamos la autenticidad de cada componente y dispositivo.</p>
            </div>
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-2">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-foreground font-black uppercase tracking-widest text-xs">Garantía Extendida</h4>
                <p className="text-muted-foreground text-sm font-medium">Hasta 12 meses de cobertura técnica en fallos de fabricación.</p>
            </div>
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-2">
                    <Smartphone className="w-6 h-6" />
                </div>
                <h4 className="text-foreground font-black uppercase tracking-widest text-xs">Test de Calidad</h4>
                <p className="text-muted-foreground text-sm font-medium">Cada equipo pasa por un riguroso test de 32 puntos funcionales.</p>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-4">
                <Logo size="sm" />
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{data.settings.companyName} © 2026</p>
            </div>
            <div className="flex gap-8">
                <a href="#" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Términos</a>
                <a href="#" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Privacidad</a>
                <a href="#" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Instagram</a>
            </div>
        </div>
      </footer>

      {/* Full-Screen Beautiful Lightbox / Zoom Overlay */}
      <AnimatePresence>
        {lightbox.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[10000] bg-slate-950/98 backdrop-blur-xl flex flex-col justify-between items-center p-4 select-none cursor-zoom-out"
            onClick={() => setLightbox(prev => ({ ...prev, isOpen: false }))}
          >
            {/* Header / Counter & Controls */}
            <div className="w-full max-w-6xl flex items-center justify-between text-white/80 z-20 px-4 py-2 mt-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                IMAGEN {lightbox.currentIndex + 1} / {lightbox.images.length}
              </span>
              <button 
                type="button"
                className="p-3 bg-white/10 hover:bg-white/20 active:scale-90 rounded-full transition-all text-white shadow-xl pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox(prev => ({ ...prev, isOpen: false }));
                }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Big Resizing / Zoom Stage */}
            <div 
              className="flex-1 w-full max-w-5xl flex items-center justify-center relative my-4 touch-pan-y"
              onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
              onTouchEnd={(e) => {
                if (touchStartX === null) return;
                const touchEndX = e.changedTouches[0].clientX;
                const diff = touchStartX - touchEndX;
                if (Math.abs(diff) > 40) {
                  if (diff > 0) {
                    // Swipe Left (Next Image)
                    setLightbox(prev => ({
                      ...prev,
                      currentIndex: prev.currentIndex < prev.images.length - 1 ? prev.currentIndex + 1 : 0
                    }));
                  } else {
                    // Swipe Right (Prev Image)
                    setLightbox(prev => ({
                      ...prev,
                      currentIndex: prev.currentIndex > 0 ? prev.currentIndex - 1 : prev.images.length - 1
                    }));
                  }
                }
                setTouchStartX(null);
              }}
            >
              {lightbox.images.length > 1 && (
                <button 
                  type="button"
                  className="absolute left-2 sm:left-6 z-20 p-2 text-white bg-white/10 active:scale-95 rounded-full backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox(prev => ({
                      ...prev,
                      currentIndex: prev.currentIndex > 0 ? prev.currentIndex - 1 : prev.images.length - 1
                    }));
                  }}
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}

              <motion.img 
                key={lightbox.currentIndex}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.05, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                src={lightbox.images[lightbox.currentIndex]} 
                className="mx-auto block max-w-[92%] sm:max-w-full max-h-[65vh] sm:max-h-[80vh] w-auto h-auto object-contain transition-all duration-300 drop-shadow-[0_25px_50px_rgba(0,0,0,0.8)] rounded-xl pointer-events-auto" 
                alt="Expanded catalog view"
                onClick={(e) => e.stopPropagation()} 
              />

              {lightbox.images.length > 1 && (
                <button 
                  type="button"
                  className="absolute right-2 sm:right-6 z-20 p-2 text-white bg-white/10 active:scale-95 rounded-full backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox(prev => ({
                      ...prev,
                      currentIndex: prev.currentIndex < prev.images.length - 1 ? prev.currentIndex + 1 : 0
                    }));
                  }}
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}
            </div>

            {/* Clean bottom guidance captions */}
            <div className="text-center pb-6 space-y-1.5 z-10">
              <p className="text-white/60 font-black text-[10px] uppercase tracking-[0.25em]">
                {selectedProduct?.name}
              </p>
              <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest">
                Toca en cualquier parte oscura para volver al catálogo
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
