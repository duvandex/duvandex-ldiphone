import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Search, Plus, Trash2, ShoppingCart, Pencil, Camera, X, ImagePlus, Smartphone, ShieldCheck, Users, ExternalLink, Copy, ArrowLeft, ArrowRight, Star, HandCoins, User, ArrowUpDown, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '../context/AppDataContext';
import { useCloudinary } from '../hooks/useCloudinary';
import { Investor, Product, PaymentMethod, CoInvestor, Category } from '../types';
import { fmt, cn, extractGB, extractBattery } from '../lib/utils';
import IMEIScanner from './IMEIScanner';
import { useSearchParams } from 'react-router-dom';

const ImageUploader = ({ 
  images, 
  onUpload, 
  onRemove,
  onReorder,
  uploading
}: { 
  images: string[], 
  onUpload: (urls: string[]) => void, 
  onRemove: (index: number) => void,
  onReorder?: (index: number, direction: 'left' | 'right') => void,
  uploading: boolean
}) => {
  const localFileInputRef = useRef<HTMLInputElement>(null);
  const { uploadMultiple } = useCloudinary();
  const [internalUploading, setInternalUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (images.length >= 4) return;
    const remainingSlots = 4 - images.length;
    const filesArray = Array.from(files).slice(0, remainingSlots) as File[];

    setInternalUploading(true);
    try {
      const urls = await uploadMultiple(filesArray, 'ldiphone/products');
      onUpload(urls);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error al subir imágenes');
    } finally {
      setInternalUploading(false);
    }
    
    if (localFileInputRef.current) localFileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fotos del Producto (Máx 4)</Label>
        <span className="text-[9px] text-muted-foreground font-bold uppercase italic">La primera foto es la principal</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {images.map((img, i) => (
          <div key={i} className={cn(
            "relative group aspect-square rounded-lg overflow-hidden bg-muted border transition-all",
            i === 0 ? "border-primary ring-2 ring-primary/20" : "border-border"
          )}>
            <img src={img} className="w-full h-full object-cover" alt="preview" />
            
            {/* Main Label */}
            {i === 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-blue-500 text-white text-[8px] font-black uppercase text-center py-0.5">
                Principal
              </div>
            )}

            {/* Actions */}
            <div className="absolute top-1.5 right-1.5 flex flex-col gap-2 z-10">
              <button 
                type="button"
                onClick={() => onRemove(i)}
                className="p-2.5 bg-white/95 rounded-full shadow-md active:bg-rose-500 active:text-white text-rose-500 transition-all border border-rose-100"
                title="Eliminar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Reorder Buttons - Optimization for mobile (always visible at bottom or significantly better hover) */}
            <div className="absolute inset-x-0 bottom-0 top-0 bg-black/5 flex items-center justify-center gap-4 opacity-0 sm:group-hover:opacity-100 transition-opacity">
               {onReorder && i > 0 && (
                 <button
                   type="button"
                   onClick={() => onReorder(i, 'left')}
                   className="p-2 bg-white rounded-full text-slate-700 shadow-xl active:scale-90 transition-transform"
                   title="Mover a la izquierda"
                 >
                   <ArrowLeft className="w-4 h-4" />
                 </button>
               )}
               {onReorder && i < images.length - 1 && (
                 <button
                   type="button"
                   onClick={() => onReorder(i, 'right')}
                   className="p-2 bg-white rounded-full text-slate-700 shadow-xl active:scale-90 transition-transform"
                   title="Mover a la derecha"
                 >
                   <ArrowRight className="w-4 h-4" />
                 </button>
               )}
            </div>
            
            {/* Mobile indicator for reorder - visible touch zone if opacity logic fails */}
            <div className="md:hidden absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
                {onReorder && i > 0 && (
                    <div className="w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center pointer-events-auto active:scale-90" onClick={() => onReorder(i, 'left')}>
                        <ChevronLeft className="w-4 h-4 text-white" />
                    </div>
                )}
                {onReorder && i < images.length - 1 && (
                    <div className="w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center pointer-events-auto active:scale-90 ml-auto" onClick={() => onReorder(i, 'right')}>
                        <ChevronRight className="w-4 h-4 text-white" />
                    </div>
                )}
            </div>
          </div>
        ))}
        {images.length < 4 && (
          <button
            type="button"
            disabled={internalUploading || uploading}
            onClick={() => localFileInputRef.current?.click()}
            className="aspect-square flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-400 gap-1 transition-colors disabled:opacity-50"
          >
            {internalUploading || uploading ? (
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent animate-spin rounded-full" />
            ) : (
              <ImagePlus className="w-5 h-5" />
            )}
            <span className="text-[9px] uppercase font-black">{internalUploading || uploading ? 'Subiendo...' : 'Subir'}</span>
          </button>
        )}
      </div>
      <input 
        type="file" 
        accept="image/*" 
        multiple 
        className="hidden" 
        ref={localFileInputRef} 
        onChange={handleImageUpload} 
      />
    </div>
  );
};

export default function Inventory() {
  const { data, addProduct, deleteProduct, updateProduct, processBulkSale, generateInvoiceNumber } = useData();
  const { uploading } = useCloudinary();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [investorFilter, setInvestorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [isReserveOpen, setIsReserveOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    images: string[];
    currentIndex: number;
  }>({
    isOpen: false,
    images: [],
    currentIndex: 0,
  });

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkSellOpen, setIsBulkSellOpen] = useState(false);
  const [bulkSellItems, setBulkSellItems] = useState<{
    productId: string;
    productName: string;
    salePrice: number;
    sellQuantity: number;
    discount: number;
    discountType: 'fixed' | 'percentage';
    warrantyMonths: number;
    warrantyExpiration: string;
    maxQuantity: number;
  }[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeScannerMode, setActiveScannerMode] = useState<'add' | 'edit' | null>(null);

  const [bulkSellData, setBulkSellData] = useState({
    buyer: '',
    saleDate: new Date().toISOString().split('T')[0],
    saleMethod: 'Efectivo' as PaymentMethod,
  });

  const toggleSelection = (id: string | 'all') => {
    if (id === 'all') {
      if (selectedIds.size === filteredProducts.filter(p => p.status === 'stock' || p.status === 'reserved').length) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(filteredProducts.filter(p => p.status === 'stock' || p.status === 'reserved').map(p => p.id)));
      }
    } else {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
    }
  };

  const startBulkSell = () => {
    const items = data.products.filter(p => selectedIds.has(p.id)).map(p => ({
      productId: p.id,
      productName: p.name,
      salePrice: p.salePrice || 0,
      sellQuantity: 1,
      discount: 0,
      discountType: 'fixed' as const,
      warrantyMonths: 3,
      warrantyExpiration: '',
      maxQuantity: p.quantity || 1
    }));
    
    // Set default warranty expiration for each item
    const itemsWithWarranty = items.map(item => {
      const date = new Date(bulkSellData.saleDate);
      date.setMonth(date.getMonth() + item.warrantyMonths);
      return { ...item, warrantyExpiration: date.toISOString().split('T')[0] };
    });

    setBulkSellItems(itemsWithWarranty);
    setIsBulkSellOpen(true);
  };

  const handleBulkSell = async () => {
    if (!bulkSellData.buyer || !bulkSellData.saleDate) {
      alert("Por favor complete los datos del cliente y la fecha.");
      return;
    }
    
    await processBulkSale(bulkSellItems, bulkSellData);
    setIsBulkSellOpen(false);
    setSelectedIds(new Set());
  };

  const [sortBy, setSortBy] = useState<string>('purchasePrice');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const isValidIMEI = (imei: string) => {
    if (!imei) return true; // Allow empty for other types of products if needed, but if present must be 15 digits
    return /^\d{15}$/.test(imei);
  };

  const isIMEIUnique = (imei: string, currentId?: string) => {
    if (!imei) return true;
    return !data.products.some(p => 
      p.id !== currentId && 
      p.imei === imei && 
      (p.status === 'stock' || p.status === 'reserved' || !p.status)
    );
  };

  const investors: Investor[] = ['Duvan', 'Lina', 'Santiago', 'Johana', 'Pool', 'Santa Maria', 'Thomas'];

  // Form states
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    name: '',
    imei: '',
    provider: '',
    investor: 'Duvan' as Investor,
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: 0,
    salePrice: 0,
    regularPrice: 0,
    quantity: 1,
    status: 'stock',
    images: [],
    purchaseMethod: 'Efectivo',
    warrantyMonths: 3,
    warrantyExpiration: '',
    description: '',
    category: 'CELULARES',
    isExternal: false,
    coInvestors: [],
    hideInCatalog: false
  });

  const [useCoInvestment, setUseCoInvestment] = useState(false);
  const [useMultiSource, setUseMultiSource] = useState(false);
  const [purchaseSources, setPurchaseSources] = useState<{ accountId: string; amount: number }[]>([]);
  const [coInvList, setCoInvList] = useState<CoInvestor[]>([
    { investor: 'Duvan', percentage: 100, method: 'Efectivo' }
  ]);

  useEffect(() => {
    const dupId = searchParams.get('duplicateProductId');
    if (dupId && data.products.length > 0) {
      const prodToDup = data.products.find(p => p.id === dupId);
      if (prodToDup) {
        handleDuplicate(prodToDup);
        // Clean URL
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, data.products]);

  const addCoInvestor = () => {
    setCoInvList([...coInvList, { investor: 'Lina', percentage: 0, method: 'Efectivo' }]);
  };

  const addPurchaseSource = () => {
    setPurchaseSources([...purchaseSources, { accountId: 'Duvan-Efectivo', amount: 0 }]);
  };

  const removePurchaseSource = (idx: number) => {
    setPurchaseSources(purchaseSources.filter((_, i) => i !== idx));
  };

  const updatePurchaseSource = (idx: number, updates: Partial<{ accountId: string; amount: number }>) => {
    const next = [...purchaseSources];
    next[idx] = { ...next[idx], ...updates };
    setPurchaseSources(next);
  };

  const removeCoInvestor = (idx: number) => {
    setCoInvList(coInvList.filter((_, i) => i !== idx));
  };

  const updateCoInv = (idx: number, updates: Partial<CoInvestor>) => {
    const newList = [...coInvList];
    newList[idx] = { ...newList[idx], ...updates };
    setCoInvList(newList);
  };

  const handleDuplicate = (p: Product) => {
    setNewProduct({
      name: p.name,
      imei: '',
      provider: p.provider || '',
      investor: p.investor,
      purchaseDate: new Date().toISOString().split('T')[0],
      purchasePrice: p.purchasePrice,
      salePrice: p.salePrice || 0,
      quantity: 1,
      status: 'stock',
      images: p.images || [],
      purchaseMethod: p.purchaseMethod || 'Efectivo',
      warrantyMonths: p.warrantyMonths || 3,
      warrantyExpiration: '',
      description: p.description || '',
      category: p.category || 'CELULARES',
      isExternal: p.isExternal || false,
      coInvestors: p.coInvestors || []
    });
    
    if (p.coInvestors && p.coInvestors.length > 0) {
      setUseCoInvestment(true);
      setCoInvList(p.coInvestors);
      setUseMultiSource(false);
      setPurchaseSources([]);
    } else if (p.purchaseSources && p.purchaseSources.length > 0) {
      setUseMultiSource(true);
      setPurchaseSources(p.purchaseSources);
      setUseCoInvestment(false);
      setCoInvList([{ investor: 'Duvan', percentage: 100, method: 'Efectivo' }]);
    } else {
      setUseCoInvestment(false);
      setUseMultiSource(false);
      setPurchaseSources([]);
      setCoInvList([{ investor: 'Duvan', percentage: 100, method: 'Efectivo' }]);
    }

    setIsAddOpen(true);
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.purchasePrice) return;

    if (newProduct.imei && !isValidIMEI(newProduct.imei)) {
      alert("El IMEI debe ser un número de 15 dígitos.");
      return;
    }

    if (newProduct.imei && !isIMEIUnique(newProduct.imei)) {
      alert("Este IMEI ya está registrado en un equipo en stock o separado.");
      return;
    }
    
    let finalProduct = { ...newProduct };
    if (useMultiSource) {
      const totalAmount = purchaseSources.reduce((a, b) => a + b.amount, 0);
      const expectedTotal = finalProduct.purchasePrice * finalProduct.quantity;
      if (Math.abs(totalAmount - expectedTotal) > 1) {
        if (!confirm(`La suma de los pagos (${fmt(totalAmount)}) no coincide con el costo total (${fmt(expectedTotal)}). ¿Deseas continuar de todas formas?`)) {
          return;
        }
      }
      finalProduct.purchaseSources = purchaseSources;
    } else if (useCoInvestment) {
      const totalPct = coInvList.reduce((a, b) => a + b.percentage, 0);
      if (Math.abs(totalPct - 100) > 0.01) {
        alert("La suma de los porcentajes debe ser exactamente 100%");
        return;
      }
      finalProduct.coInvestors = coInvList;
      finalProduct.investor = coInvList[0].investor; // Primary reference
    } else {
      finalProduct.coInvestors = [];
    }

    addProduct(finalProduct as any);
    setIsAddOpen(false);
    // Reset
    setNewProduct({
      name: '', imei: '', provider: '', investor: 'Duvan', 
      purchaseDate: new Date().toISOString().split('T')[0],
      purchasePrice: 0, salePrice: 0, quantity: 1, status: 'stock',
      category: 'CELULARES',
      images: [], purchaseMethod: 'Efectivo', warrantyMonths: 3,
      warrantyExpiration: '', description: '', isExternal: false, coInvestors: [],
      hideInCatalog: false
    });
    setUseCoInvestment(false);
    setUseMultiSource(false);
    setPurchaseSources([]);
    setCoInvList([{ investor: 'Duvan', percentage: 100 }]);
  };

  // ... (keeping search/filter logic same)
  const toggleHideInCatalog = async (p: Product) => {
    await updateProduct(p.id, { hideInCatalog: !p.hideInCatalog });
  };

  const filteredProducts = React.useMemo(() => {
    return data.products.filter(p => {
      if (p.status === 'sold') return false;

      const matchesSearch = (p.name?.toLowerCase() || '').includes(search.toLowerCase()) || 
                           (p.imei || '').includes(search) ||
                           (p.provider || '').toLowerCase().includes(search.toLowerCase()) ||
                           (p.category || '').toLowerCase().includes(search.toLowerCase());
      
      const matchesInvestor = investorFilter === 'all' || 
                             (p.investor === investorFilter) || 
                             (p.coInvestors?.some(c => c.investor === investorFilter));
      
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter || (!p.status && statusFilter === 'stock');
      return matchesSearch && matchesInvestor && matchesStatus;
    });
  }, [data.products, search, investorFilter, statusFilter]);

  const sortedProducts = React.useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortBy === 'profit') {
        valA = (a.salePrice || 0) - a.purchasePrice;
        valB = (b.salePrice || 0) - b.purchasePrice;
      } else if (sortBy === 'investor') {
        valA = a.investor || (a.coInvestors?.[0]?.investor || '');
        valB = b.investor || (b.coInvestors?.[0]?.investor || '');
      } else {
        valA = (a as any)[sortBy] || '';
        valB = (b as any)[sortBy] || '';
      }

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProducts, sortBy, sortOrder]);

  const [editProductState, setEditProductState] = useState<Product | null>(null);

  const startEditing = (p: Product) => {
    setEditProductState(p);
    if (p.coInvestors && p.coInvestors.length > 0) {
      setUseCoInvestment(true);
      setCoInvList(p.coInvestors);
    } else {
      setUseCoInvestment(false);
      setCoInvList([{ investor: p.investor || 'Duvan', percentage: 100, method: p.purchaseMethod || 'Efectivo' }]);
    }
    setIsEditOpen(true);
  };

  const handleEditProduct = async () => {
    if (!editProductState) return;

    if (editProductState.imei && !isValidIMEI(editProductState.imei)) {
      alert("El IMEI debe ser un número de 15 dígitos.");
      return;
    }

    if (editProductState.imei && !isIMEIUnique(editProductState.imei, editProductState.id)) {
      alert("Este IMEI ya está registrado en un equipo en stock o separado.");
      return;
    }

    let finalProduct = { ...editProductState };
    if (useCoInvestment) {
      const totalPct = coInvList.reduce((a, b) => a + b.percentage, 0);
      if (Math.abs(totalPct - 100) > 0.01) {
        alert("La suma de los porcentajes debe ser exactamente 100%");
        return;
      }
      finalProduct.coInvestors = coInvList;
      // In a co-investment, we designate the first one as primary for simple filtering
      if (coInvList.length > 0) {
        finalProduct.investor = coInvList[0].investor;
      }
    } else {
      finalProduct.coInvestors = [];
      // investor is already in editProductState from the field
    }

    await updateProduct(editProductState.id, finalProduct);
    setIsEditOpen(false);
  };

  const [sellData, setSellData] = useState<{
    salePrice: number | string;
    saleDate: string;
    buyer: string;
    sellQuantity: number | string;
    saleMethod: PaymentMethod;
    warrantyMonths: number;
    warrantyExpiration: string;
    discount: number;
    discountType: 'fixed' | 'percentage';
  }>({
    salePrice: '',
    saleDate: new Date().toISOString().split('T')[0],
    buyer: '',
    sellQuantity: 1,
    saleMethod: 'Efectivo',
    warrantyMonths: 3,
    warrantyExpiration: '',
    discount: 0,
    discountType: 'fixed',
  });

  // Add effect to sync warranty expiration in sell dialog
  useEffect(() => {
    if (isSellOpen && sellData.saleDate && sellData.warrantyMonths !== undefined) {
      const date = new Date(sellData.saleDate);
      date.setMonth(date.getMonth() + sellData.warrantyMonths);
      const expDate = date.toISOString().split('T')[0];
      if (sellData.warrantyExpiration !== expDate) {
        setSellData(prev => ({ ...prev, warrantyExpiration: expDate }));
      }
    }
  }, [isSellOpen, sellData.saleDate, sellData.warrantyMonths]);

  // Add similar for new product
  useEffect(() => {
    if (newProduct.purchaseDate && newProduct.warrantyMonths !== undefined) {
      const date = new Date(newProduct.purchaseDate);
      date.setMonth(date.getMonth() + newProduct.warrantyMonths);
      const expDate = date.toISOString().split('T')[0];
      if (newProduct.warrantyExpiration !== expDate) {
        setNewProduct(prev => ({ ...prev, warrantyExpiration: expDate }));
      }
    }
  }, [newProduct.purchaseDate, newProduct.warrantyMonths]);

  // And for edit
  useEffect(() => {
    if (editProductState?.purchaseDate && editProductState?.warrantyMonths !== undefined) {
      const date = new Date(editProductState.purchaseDate);
      date.setMonth(date.getMonth() + editProductState.warrantyMonths);
      const expDate = date.toISOString().split('T')[0];
      if (editProductState.warrantyExpiration !== expDate) {
        setEditProductState(prev => prev ? ({ ...prev, warrantyExpiration: expDate }) : null);
      }
    }
  }, [editProductState?.purchaseDate, editProductState?.warrantyMonths]);

  const [reserveData, setReserveData] = useState({
    amount: '',
    buyer: '',
    date: new Date().toISOString().split('T')[0],
    method: 'Efectivo' as PaymentMethod
  });

  const sellErrors = {
    price: !sellData.salePrice || Number(sellData.salePrice) <= 0,
    qty: !sellData.sellQuantity || Number(sellData.sellQuantity) <= 0 || Number(sellData.sellQuantity) > (selectedProduct?.quantity || 0)
  };

  const parseError = (err: any) => {
    try {
      const info = JSON.parse(err.message);
      if (info.error) {
        if (info.error.includes('permissions') || info.error.includes('PERMISSION_DENIED')) {
          return "No tienes permisos para realizar esta acción. Por favor revisa que seas Administrador.";
        }
        return info.error;
      }
    } catch (e) {}
    return err.message || "Error desconocido";
  };

  const handleSellProduct = async () => {
    const sPrice = typeof sellData.salePrice === 'string' ? parseFloat(sellData.salePrice) : sellData.salePrice;
    const sQty = typeof sellData.sellQuantity === 'string' ? parseInt(sellData.sellQuantity) : sellData.sellQuantity;
    
    if (!selectedProduct) return;

    if (isNaN(sPrice) || sPrice <= 0) {
      alert("Por favor ingresa un precio de venta válido.");
      return;
    }

    if (isNaN(sQty) || sQty <= 0) {
      alert("La cantidad debe ser mayor a 0.");
      return;
    }

    if (sQty > (selectedProduct.quantity || 0)) {
      alert(`No hay suficiente stock disponible. (Stock actual: ${selectedProduct.quantity})`);
      return;
    }

    let finalPrice = sPrice;
    if (sellData.discount > 0) {
      if (sellData.discountType === 'percentage') {
        finalPrice = sPrice * (1 - (sellData.discount / 100));
      } else {
        finalPrice = sPrice - sellData.discount;
      }
    }
    
    try {
      await updateProduct(selectedProduct.id, {
        ...sellData,
        salePrice: finalPrice,
        sellQuantity: sQty,
        status: 'sold',
        warrantyTerms: data.settings.warrantyTerms,
      });
      setIsSellOpen(false);
      setSelectedProduct(null);
    } catch (err: any) {
      alert("Error al procesar la venta: " + parseError(err));
    }
  };

  const handleReserveProduct = async () => {
    if (!selectedProduct || !reserveData.amount || !reserveData.buyer) {
      alert("Por favor completa los campos obligatorios.");
      return;
    }
    
    const amount = parseFloat(reserveData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert("El abono debe ser mayor a 0.");
      return;
    }

    const currentPayments = selectedProduct.reservationPayments || [];
    const newPayment = {
      amount,
      date: reserveData.date,
      method: reserveData.method
    };

    const totalAbonado = currentPayments.reduce((sum, p) => sum + p.amount, 0) + amount;

    try {
      await updateProduct(selectedProduct.id, {
        status: 'reserved',
        reservationAmount: totalAbonado,
        reservationBuyer: reserveData.buyer,
        reservationDate: reserveData.date, // Last payment date
        reservationPayments: [...currentPayments, newPayment],
        saleMethod: reserveData.method, // Default for account tracking
        amountToBalance: amount, // Financial trigger
        buyer: reserveData.buyer,
      });
      setIsReserveOpen(false);
      setSelectedProduct(null);
    } catch (err: any) {
      alert("Error al procesar el abono: " + parseError(err));
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    try {
      await deleteProduct(selectedProduct.id);
      setIsDeleteOpen(false);
      setSelectedProduct(null);
    } catch (err: any) {
      alert("No se pudo eliminar el producto: " + parseError(err));
    }
  };

  const handleImageUploadCloudinary = (urls: string[], mode: 'add' | 'edit') => {
    if (mode === 'add') {
      setNewProduct(prev => ({ ...prev, images: [...(prev.images || []), ...urls].slice(0, 4) }));
    } else {
      setEditProductState(prev => prev ? ({ ...prev, images: [...(prev.images || []), ...urls].slice(0, 4) }) : null);
    }
  };

  const removeImage = (index: number, mode: 'add' | 'edit') => {
    if (mode === 'add') {
      setNewProduct(prev => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== index) }));
    } else {
      setEditProductState(prev => prev ? ({ ...prev, images: (prev.images || []).filter((_, i) => i !== index) }) : null);
    }
  };

  const reorderImages = (index: number, direction: 'left' | 'right', mode: 'add' | 'edit') => {
    const list = mode === 'add' ? [...(newProduct.images || [])] : [...(editProductState?.images || [])];
    if (direction === 'left' && index > 0) {
      const temp = list[index - 1];
      list[index - 1] = list[index];
      list[index] = temp;
    } else if (direction === 'right' && index < list.length - 1) {
      const temp = list[index + 1];
      list[index + 1] = list[index];
      list[index] = temp;
    }
    
    if (mode === 'add') {
      setNewProduct(prev => ({ ...prev, images: list }));
    } else {
      setEditProductState(prev => prev ? ({ ...prev, images: list }) : null);
    }
  };

  const summaryByStatus = React.useMemo(() => {
    const stock = data.products.filter(p => p.status === 'stock' || p.status === 'reserved');
    let totalCost = 0;
    let totalEstSale = 0;
    let totalUnits = 0;
    let matchingCount = 0;

    stock.forEach(p => {
      const q = p.quantity || 1;
      let pct = 100;
      
      const hasInvestorMatch = investorFilter === 'all' || 
                              p.investor === investorFilter || 
                              p.coInvestors?.some(c => c.investor === investorFilter);
      
      if (!hasInvestorMatch) return;

      matchingCount++;
      if (investorFilter !== 'all') {
        if (p.coInvestors && p.coInvestors.length > 0) {
          const match = p.coInvestors.find(c => c.investor === investorFilter);
          pct = match ? match.percentage : (p.investor === investorFilter ? 100 : 0);
        } else {
          pct = p.investor === investorFilter ? 100 : 0;
        }
      }
      
      totalCost += p.purchasePrice * q * (pct / 100);
      totalEstSale += (p.salePrice || 0) * q * (pct / 100);
      totalUnits += q * (pct / 100);
    });

    return {
      count: matchingCount,
      units: Math.round(totalUnits * 100) / 100,
      cost: totalCost,
      profit: totalEstSale - totalCost
    };
  }, [data.products, investorFilter]);

  const filteredTotals = React.useMemo(() => {
    let totalCost = 0;
    let totalEstSale = 0;
    let totalUnits = 0;

    filteredProducts.forEach(p => {
      const q = p.quantity || 1;
      let pct = 100;
      if (investorFilter !== 'all') {
        if (p.coInvestors && p.coInvestors.length > 0) {
          const match = p.coInvestors.find(c => c.investor === investorFilter);
          pct = match ? match.percentage : (p.investor === investorFilter ? 100 : 0);
        } else {
          pct = p.investor === investorFilter ? 100 : 0;
        }
      }
      totalCost += p.purchasePrice * q * (pct / 100);
      totalEstSale += (p.salePrice || 0) * q * (pct / 100);
      totalUnits += q * (pct / 100);
    });

    return {
      cost: totalCost,
      sale: totalEstSale,
      profit: totalEstSale - totalCost,
      units: Math.round(totalUnits * 100) / 100,
      count: filteredProducts.length
    };
  }, [filteredProducts, investorFilter]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Inventory Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="card-premium border-none bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8" />
          <CardContent className="p-4 relative">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Equipos en Stock</p>
            <div className="text-xl font-black">{summaryByStatus.units} <span className="text-[10px] opacity-40">unid.</span></div>
          </CardContent>
        </Card>
        <Card className="card-premium border-none bg-blue-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8" />
          <CardContent className="p-4 relative">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Valor Inventario</p>
            <div className="text-xl font-black">{fmt(summaryByStatus.cost)}</div>
          </CardContent>
        </Card>
        <Card className="card-premium border-none bg-emerald-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8" />
          <CardContent className="p-4 relative">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Profit Est. Bruto</p>
            <div className="text-xl font-black">+{fmt(summaryByStatus.profit)}</div>
          </CardContent>
        </Card>
        <Card className="card-premium border-none bg-white border border-slate-100 overflow-hidden relative">
          <CardContent className="p-4 relative">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Margen Est. %</p>
            <div className="text-xl font-black text-slate-900">
              {summaryByStatus.cost > 0 ? ((summaryByStatus.profit / summaryByStatus.cost) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row gap-4 w-full">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
            <Input
              placeholder="Buscar por nombre, IMEI o proveedor..."
              className="pl-11 bg-card border-none shadow-sm h-12 rounded-2xl ring-offset-background focus-visible:ring-2 focus-visible:ring-primary transition-all font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-4">
            <Select value={investorFilter} onValueChange={setInvestorFilter}>
              <SelectTrigger className="flex-1 lg:w-[180px] bg-card border-none shadow-sm h-12 rounded-2xl font-bold text-xs uppercase tracking-widest px-4">
                <SelectValue placeholder="Inversor" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Duvan">Duvan</SelectItem>
                <SelectItem value="Lina">Lina</SelectItem>
                <SelectItem value="Santiago">Santiago</SelectItem>
                <SelectItem value="Johana">Johana</SelectItem>
                <SelectItem value="Pool">Pool</SelectItem>
                <SelectItem value="Santa Maria">Santa María</SelectItem>
                <SelectItem value="Thomas">Thomas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1 lg:w-[160px] bg-white border-none shadow-sm h-12 rounded-2xl font-bold text-xs uppercase tracking-widest px-4">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="stock">En Stock</SelectItem>
                <SelectItem value="reserved">Separados</SelectItem>
                <SelectItem value="out_of_stock">Agotado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-4 md:hidden">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="flex-1 bg-card border-none shadow-sm h-12 rounded-2xl font-bold text-xs uppercase tracking-widest px-4">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-3 h-3" />
                  <SelectValue placeholder="Ordenar por" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border">
                <SelectItem value="purchaseDate">Fecha Compra</SelectItem>
                <SelectItem value="name">Nombre</SelectItem>
                <SelectItem value="category">Categoría</SelectItem>
                <SelectItem value="investor">Inversor</SelectItem>
                <SelectItem value="quantity">Cantidad</SelectItem>
                <SelectItem value="purchasePrice">Valor Inversión</SelectItem>
                <SelectItem value="salePrice">Precio Venta</SelectItem>
                <SelectItem value="profit">Ganancia Est.</SelectItem>
                <SelectItem value="status">Estado</SelectItem>
              </SelectContent>
            </Select>
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="h-12 w-12 bg-card border-none shadow-sm rounded-2xl text-muted-foreground"
            >
                {sortOrder === 'asc' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger
            render={
              <Button className="w-full lg:w-fit lg:px-12 bg-primary text-primary-foreground h-12 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/10 transition-all hover:scale-[1.02] active:scale-95 ml-auto">
                <Plus className="w-5 h-5 mr-3" /> Nuevo Producto
              </Button>
            }
          />
          {/* ... Dialog content remains mostly same but with rounded-3xl and spacing ... */}
          <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto rounded-3xl p-8 border-none shadow-2xl bg-card">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl font-black tracking-tight uppercase text-foreground">Registrar Dispositivo</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6">
              <ImageUploader 
                images={newProduct.images || []} 
                onUpload={(urls) => handleImageUploadCloudinary(urls, 'add')} 
                onRemove={(idx) => removeImage(idx, 'add')} 
                onReorder={(idx, dir) => reorderImages(idx, dir, 'add')}
                uploading={uploading}
              />
              
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nombre del Dispositivo *</Label>
                <Input id="name" placeholder="Ej: iPhone 15 Pro Max" className="rounded-xl border-border h-11" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="desc" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Descripción / Detalles</Label>
                <Textarea id="desc" placeholder="Estado, color, detalles adicionales..." className="rounded-xl border-slate-100 min-h-[100px]" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="category" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Categoría</Label>
                  <Select value={newProduct.category} onValueChange={v => setNewProduct({...newProduct, category: v as Category})}>
                    <SelectTrigger className="rounded-xl border-slate-100 h-11 font-bold text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-100">
                      <SelectItem value="CELULARES">CELULARES</SelectItem>
                      <SelectItem value="TABLETS">TABLETS</SelectItem>
                      <SelectItem value="RELOJ INTELIGENTES">RELOJ INTELIGENTES</SelectItem>
                      <SelectItem value="AURICULARES">AURICULARES</SelectItem>
                      <SelectItem value="ACCESORIOS">ACCESORIOS</SelectItem>
                      <SelectItem value="Other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="imei" className="text-[10px] font-black uppercase tracking-widest text-slate-400">IMEI / Serial</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="imei" 
                      placeholder="15 dígitos" 
                      maxLength={15}
                      className="rounded-xl border-slate-100 h-11 flex-1" 
                      value={newProduct.imei} 
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 15);
                        setNewProduct({...newProduct, imei: val});
                      }} 
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={() => { setActiveScannerMode('add'); setIsScannerOpen(true); }}
                      className="h-11 w-11 rounded-xl border-rose-100 bg-rose-50 text-rose-500 hover:bg-rose-100"
                    >
                      <Camera className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="provider" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Proveedor</Label>
                <Input id="provider" placeholder="Origen" className="rounded-xl border-slate-100 h-11" value={newProduct.provider} onChange={e => setNewProduct({...newProduct, provider: e.target.value})} />
              </div>

              <div className="flex flex-wrap gap-6 border-t border-slate-50 pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="is-external" 
                    checked={newProduct.isExternal} 
                    onCheckedChange={(v) => setNewProduct({...newProduct, isExternal: !!v})} 
                  />
                  <Label htmlFor="is-external" className="text-[10px] font-black uppercase tracking-widest text-rose-500 flex items-center gap-1.5 cursor-pointer">
                    <ExternalLink className="w-3 h-3" /> Producto Externo (Sin Stock)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="is-co-inv" 
                    checked={useCoInvestment} 
                    onCheckedChange={(v) => {
                       setUseCoInvestment(!!v);
                       if (v) setUseMultiSource(false);
                    }} 
                  />
                  <Label htmlFor="is-co-inv" className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-1.5 cursor-pointer">
                    <Users className="w-3 h-3" /> Inversión Compartida
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="is-multi-src" 
                    checked={useMultiSource} 
                    onCheckedChange={(v) => {
                       setUseMultiSource(!!v);
                       if (v) {
                          setUseCoInvestment(false);
                          if (purchaseSources.length === 0) {
                             setPurchaseSources([{ accountId: `${newProduct.investor}-${newProduct.purchaseMethod}`, amount: newProduct.purchasePrice * newProduct.quantity }]);
                          }
                       }
                    }} 
                  />
                  <Label htmlFor="is-multi-src" className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1.5 cursor-pointer">
                    <HandCoins className="w-3 h-3" /> Pago Multi-Cuenta
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="hide-catalog" 
                    checked={newProduct.hideInCatalog} 
                    onCheckedChange={(v) => setNewProduct({...newProduct, hideInCatalog: !!v})} 
                  />
                  <Label htmlFor="hide-catalog" className="text-[10px] font-black uppercase tracking-widest text-rose-500 cursor-pointer">
                    No Mostrar
                  </Label>
                </div>
              </div>

              {!useCoInvestment && !useMultiSource && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inversor *</Label>
                    <Select value={newProduct.investor} onValueChange={v => setNewProduct({...newProduct, investor: v as Investor})}>
                      <SelectTrigger className="rounded-xl border-slate-100 h-11 font-bold text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-100 transition-all">
                        {investors.map(inv => <SelectItem key={inv} value={inv}>{inv}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Método Pago</Label>
                    <Select value={newProduct.purchaseMethod} onValueChange={v => setNewProduct({...newProduct, purchaseMethod: v as PaymentMethod})}>
                      <SelectTrigger className="rounded-xl border-slate-100 h-11 font-bold text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-100">
                        <SelectItem value="none">Ninguno / Efectivo</SelectItem>
                        <SelectItem value="Bancolombia">Bancolombia</SelectItem>
                        <SelectItem value="Nequi">Nequi</SelectItem>
                        <SelectItem value="Banco de Bogota">Banco de Bogotá</SelectItem>
                        <SelectItem value="Cripto (USDT)">Cripto (USDT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {useCoInvestment && (
                <div className="space-y-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600">Reparto de Inversión (%)</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={addCoInvestor} className="h-7 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-100 px-3">
                      <Plus className="w-3 h-3 mr-1" /> Añadir Socio
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {coInvList.map((co, idx) => (
                      <div key={idx} className="space-y-2 p-3 bg-white rounded-2xl border border-blue-50 shadow-sm">
                        <div className="flex gap-2">
                          <Select value={co.investor} onValueChange={v => updateCoInv(idx, { investor: v as Investor })}>
                            <SelectTrigger className="flex-1 rounded-xl border-blue-100 h-10 font-bold text-[11px] bg-slate-50/50"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {investors.map(inv => <SelectItem key={inv} value={inv}>{inv}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <div className="relative w-24">
                            <Input 
                              type="number" 
                              className="rounded-xl border-blue-100 h-10 font-black text-xs pl-3 pr-6 bg-slate-50/50" 
                              value={co.percentage} 
                              onChange={e => updateCoInv(idx, { percentage: parseFloat(e.target.value) || 0 })}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-400">%</span>
                          </div>
                          {coInvList.length > 1 && (
                            <Button variant="ghost" size="icon" onClick={() => removeCoInvestor(idx)} className="h-10 w-10 text-rose-500 hover:bg-rose-50 rounded-xl">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 px-1">
                          <Label className="text-[9px] font-black uppercase text-slate-400 whitespace-nowrap">Origen del Capital:</Label>
                          <Select value={co.method} onValueChange={v => updateCoInv(idx, { method: v as PaymentMethod })}>
                            <SelectTrigger className="flex-1 h-8 rounded-lg border-blue-50 bg-white text-[10px] font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Efectivo">Efectivo</SelectItem>
                              <SelectItem value="Bancolombia">Bancolombia</SelectItem>
                              <SelectItem value="Nequi">Nequi</SelectItem>
                              <SelectItem value="Banco de Bogota">Banco de Bogotá</SelectItem>
                              {co.investor === 'Duvan' && <SelectItem value="Cripto (USDT)">Cripto (USDT)</SelectItem>}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={cn(
                    "text-[10px] font-black text-center pt-1 uppercase tracking-widest",
                    Math.abs(coInvList.reduce((a, b) => a + b.percentage, 0) - 100) < 0.01 ? "text-emerald-600" : "text-rose-500"
                  )}>
                    Total: {coInvList.reduce((a, b) => a + b.percentage, 0)}% / 100%
                  </div>
                </div>
              )}

              {useMultiSource && (
                <div className="space-y-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Distribución de Pago</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={addPurchaseSource} className="h-7 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-100 px-3">
                      <Plus className="w-3 h-3 mr-1" /> Añadir Cuenta
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {purchaseSources.map((src, idx) => (
                      <div key={idx} className="flex gap-2 p-3 bg-white rounded-xl border border-emerald-50 shadow-sm items-end">
                        <div className="flex-1 space-y-2">
                           <Label className="text-[8px] font-black uppercase text-slate-400">Cuenta / Origen</Label>
                           <Select value={src.accountId} onValueChange={v => updatePurchaseSource(idx, { accountId: v })}>
                             <SelectTrigger className="w-full rounded-lg border-emerald-100 h-9 font-bold text-[10px] bg-slate-50/50"><SelectValue /></SelectTrigger>
                             <SelectContent className="rounded-xl">
                               {data.accounts.map(acc => (
                                 <SelectItem key={acc.id} value={acc.id} className="text-xs">
                                   <div className="flex justify-between items-center w-full gap-4">
                                     <span>{acc.investor} - {acc.method}</span>
                                     <span className={cn("font-black", acc.balance >= 0 ? "text-emerald-600" : "text-rose-500")}>
                                       {fmt(acc.balance)}
                                     </span>
                                   </div>
                                 </SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                        </div>
                        <div className="w-32 space-y-2">
                           <Label className="text-[8px] font-black uppercase text-slate-400">Valor</Label>
                           <Input 
                             type="number" 
                             className="rounded-lg border-emerald-100 h-9 font-black text-xs bg-slate-50/50" 
                             value={src.amount || ''} 
                             onChange={e => updatePurchaseSource(idx, { amount: parseFloat(e.target.value) || 0 })}
                           />
                        </div>
                        {purchaseSources.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => removePurchaseSource(idx)} className="h-9 w-9 text-rose-500 hover:bg-rose-50 rounded-lg shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className={cn(
                    "text-[10px] font-black text-center pt-1 uppercase tracking-widest",
                    Math.abs(purchaseSources.reduce((a, b) => a + b.amount, 0) - (newProduct.purchasePrice * newProduct.quantity)) < 1 ? "text-emerald-600" : "text-rose-500"
                  )}>
                    Total: {fmt(purchaseSources.reduce((a, b) => a + b.amount, 0))} / {fmt(newProduct.purchasePrice * newProduct.quantity)}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="date" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha Compra</Label>
                  <Input id="date" type="date" className="rounded-xl border-slate-100 h-11" value={newProduct.purchaseDate} onChange={e => setNewProduct({...newProduct, purchaseDate: e.target.value})} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pc" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Costo Unitario *</Label>
                  <Input id="pc" type="number" placeholder="0" className="rounded-xl border-slate-100 h-11 font-black" value={newProduct.purchasePrice || ''} onChange={e => setNewProduct({...newProduct, purchasePrice: parseFloat(e.target.value) || 0})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                <div className="grid gap-2">
                  <Label htmlFor="pv" className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Precio Sugerido Venta</Label>
                  <Input id="pv" type="number" placeholder="0" className="rounded-xl border-emerald-100 bg-emerald-50/30 h-11 font-black text-emerald-700" value={newProduct.salePrice || ''} onChange={e => setNewProduct({...newProduct, salePrice: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pr" className="text-[10px] font-black uppercase tracking-widest text-rose-500">Precio Regular (Promo)</Label>
                  <Input id="pr" type="number" placeholder="0" className="rounded-xl border-rose-100 bg-rose-50/30 h-11 font-black text-rose-700" value={newProduct.regularPrice || ''} onChange={e => setNewProduct({...newProduct, regularPrice: parseFloat(e.target.value) || 0})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                <div className="grid gap-2">
                  <Label htmlFor="warranty" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Garantía (Meses)</Label>
                  <Input id="warranty" type="number" min="0" placeholder="0" className="rounded-xl border-slate-100 h-11" value={newProduct.warrantyMonths} onChange={e => setNewProduct({...newProduct, warrantyMonths: parseInt(e.target.value) || 0})} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="w-exp" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vencimiento</Label>
                  <Input id="w-exp" type="date" className="rounded-xl border-slate-100 h-11" value={newProduct.warrantyExpiration} onChange={e => setNewProduct({...newProduct, warrantyExpiration: e.target.value})} />
                </div>
              </div>

              <Button onClick={handleAddProduct} className="w-full bg-slate-900 hover:bg-slate-800 h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-900/10 mt-2">
                Finalizar Registro
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Desktop Table View */}
      <Card className="hidden md:block card-premium border-none shadow-sm rounded-[2rem] overflow-hidden bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full scrollbar-thin">
            <Table className="min-w-[1000px] xl:min-w-0">
              <TableHeader className="bg-muted/20">
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="w-10 pl-6 py-2.5 h-11">
                    <Checkbox 
                      checked={selectedIds.size > 0 && selectedIds.size === filteredProducts.filter(p => p.status === 'stock' || p.status === 'reserved').length}
                      onCheckedChange={() => toggleSelection('all')}
                    />
                  </TableHead>
                  <TableHead 
                    className="text-[9px] uppercase font-black tracking-wider text-muted-foreground pl-2 py-2.5 h-11 cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Dispositivo {sortBy === 'name' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-[9px] uppercase font-black tracking-wider text-slate-400 py-2.5 h-11 text-center cursor-pointer hover:text-foreground transition-colors hidden xl:table-cell"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Tipo {sortBy === 'category' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-[9px] uppercase font-black tracking-wider text-slate-400 py-2.5 h-11 text-center cursor-pointer hover:text-foreground transition-colors hidden sm:table-cell"
                    onClick={() => handleSort('investor')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Inversor {sortBy === 'investor' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-[9px] uppercase font-black tracking-wider text-slate-400 py-2.5 h-11 text-center cursor-pointer hover:text-foreground transition-colors hidden md:table-cell"
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Qty {sortBy === 'quantity' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-[9px] uppercase font-black tracking-wider text-slate-400 py-2.5 h-11 text-right cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('purchasePrice')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Costo (u) {sortBy === 'purchasePrice' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-[9px] uppercase font-black tracking-wider text-emerald-600 py-2.5 h-11 text-right cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('salePrice')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      P. Venta {sortBy === 'salePrice' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-[9px] uppercase font-black tracking-wider text-slate-400 py-2.5 h-11 text-right cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => handleSort('profit')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Neto {sortBy === 'profit' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </TableHead>
                  <TableHead 
                     className="text-[9px] uppercase font-black tracking-wider text-slate-400 py-2.5 h-11 text-center cursor-pointer hover:text-foreground transition-colors"
                     onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Estado {sortBy === 'status' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </div>
                  </TableHead>
                  <TableHead className="text-[9px] uppercase font-black tracking-wider text-slate-400 py-2.5 h-11 text-right pr-6">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProducts.map((p) => {
                  const profitPerUnit = (p.salePrice || 0) - p.purchasePrice;
                  const totalProfit = profitPerUnit * (p.quantity || 1);
                  return (
                    <TableRow key={p.id} className="group border-b border-border/50 hover:bg-muted/15 transition-colors">
                      <TableCell className="w-10 pl-6 py-1.5">
                         {(p.status === 'stock' || p.status === 'reserved') && (
                           <Checkbox 
                             checked={selectedIds.has(p.id)}
                             onCheckedChange={() => toggleSelection(p.id)}
                           />
                         )}
                      </TableCell>
                      <TableCell className="py-1.5 pl-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className={cn(
                              "w-10 h-10 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0 border border-card shadow-sm transition-transform group-hover:scale-105 duration-300",
                              p.images && p.images.length > 0 ? "cursor-zoom-in" : ""
                            )}
                            onClick={(e) => {
                              if (p.images && p.images.length > 0) {
                                e.stopPropagation();
                                setLightbox({
                                  isOpen: true,
                                  images: p.images,
                                  currentIndex: 0
                                });
                              }
                            }}
                          >
                            {p.images && p.images.length > 0 ? (
                              <img src={p.images[0]} className="w-full h-full object-cover" alt={p.name} />
                            ) : (
                              <div className="text-muted-foreground bg-card w-full h-full flex items-center justify-center">
                                 <Smartphone className="w-4 h-4 opacity-30" />
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-0.5 min-w-0 max-w-[280px]">
                            <div className="font-extrabold text-xs text-foreground tracking-tight group-hover:text-primary transition-colors truncate">{p.name}</div>
                            
                            <div className="flex flex-wrap items-center gap-1.5 text-[8px] font-bold text-muted-foreground">
                              <span className="font-mono tracking-tight text-muted-foreground/90 bg-muted px-1.5 py-0.2 rounded">
                                ID: {p.imei || p.id.slice(0,8).toUpperCase()}
                              </span>
                              <span>•</span>
                              <span>{p.purchaseDate}</span>
                            </div>

                            {/* Auto Spec Labels */}
                            {(p.category === 'CELULARES' || p.name.toLowerCase().includes('iphone')) && (
                              <div className="flex flex-wrap gap-1">
                                {extractGB(p.name, p.description) && (
                                  <div className="bg-slate-100 text-slate-700 px-1 py-0.2 rounded text-[7px] font-black uppercase tracking-tighter">
                                    💾 {extractGB(p.name, p.description)}
                                  </div>
                                )}
                                {extractBattery(p.name, p.description) && (
                                  <div className="bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded text-[7px] font-black uppercase tracking-tighter">
                                    🔋 {extractBattery(p.name, p.description)}%
                                  </div>
                                )}
                                {p.warrantyMonths ? (
                                  <div className="bg-blue-50 text-blue-700 px-1 py-0.2 rounded text-[7px] font-black uppercase tracking-tighter">
                                    🛡️ {p.warrantyMonths}M
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5 text-center hidden xl:table-cell">
                         <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-tighter bg-card border-none text-muted-foreground/80 py-0.5 px-1.5">
                            {p.category || 'CELULARES'}
                         </Badge>
                      </TableCell>
                      <TableCell className="py-1.5 text-center hidden sm:table-cell">
                        <div className="flex flex-wrap items-center justify-center gap-0.5 max-w-[120px] mx-auto">
                          {p.isExternal ? (
                            <span className="text-rose-500 text-[8px] font-black uppercase flex items-center gap-0.5"><ExternalLink className="w-2.5 h-2.5" /> Ext</span>
                          ) : p.coInvestors && p.coInvestors.length > 0 ? (
                            p.coInvestors.map((c, i) => (
                              <span key={i} className="bg-primary/10 text-primary px-1 rounded-[4px] text-[7px] font-black leading-normal">
                                {c.investor}
                              </span>
                            ))
                          ) : (
                            <span className="text-[9px] font-black uppercase text-muted-foreground">{p.investor}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5 text-center hidden md:table-cell">
                        <div className="text-[10px] font-bold bg-card border border-border/80 px-2 py-0.5 rounded-lg w-fit mx-auto text-foreground">
                          {p.quantity || 1}
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5 text-right font-mono">
                        <div className="text-xs font-extrabold text-foreground leading-tight">
                          {p.coInvestors && p.coInvestors.length > 0 && investorFilter !== 'all' ? (
                            <>
                              {fmt(p.purchasePrice * (p.coInvestors.find(c => c.investor === investorFilter)?.percentage || 0) / 100)}
                              <span className="ml-1 text-[8px] text-blue-500 font-bold">({p.coInvestors.find(c => c.investor === investorFilter)?.percentage}%)</span>
                            </>
                          ) : (
                            fmt(p.purchasePrice)
                          )}
                        </div>
                        {p.quantity > 1 && <div className="text-[7px] text-slate-400 font-bold uppercase leading-none mt-0.5">Costo Unid</div>}
                      </TableCell>
                      <TableCell className="py-1.5 text-right font-mono">
                        <div className="text-xs font-extrabold text-emerald-700 leading-tight">
                          {fmt(p.salePrice || 0)}
                        </div>
                        {(p.regularPrice || 0) > (p.salePrice || 0) && (
                          <div className="text-[7px] text-slate-300 line-through leading-none mt-0.5">{fmt(p.regularPrice || 0)}</div>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 text-right font-mono">
                         <div className="text-xs font-extrabold text-emerald-600 leading-tight">+{fmt(totalProfit)}</div>
                      </TableCell>
                      <TableCell className="py-1.5 text-center">
                        <Badge className={cn(
                          "text-[8px] font-black h-4 px-2 rounded-md border-none flex items-center justify-center uppercase tracking-wider w-fit mx-auto",
                          p.status === 'stock' ? "bg-blue-50 text-blue-600" : 
                          p.status === 'reserved' ? "bg-orange-50 text-orange-600" : 
                          "bg-slate-100 text-slate-400"
                        )}>
                          {p.status === 'stock' ? 'STOCK' : p.status === 'reserved' ? 'SEPARADO' : 'AGOTADO'}
                        </Badge>
                        {p.status === 'reserved' && (
                          <div className="text-[7px] font-black text-orange-500 uppercase tracking-tighter mt-0.5">
                            Debe: {fmt((p.salePrice || 0) * (p.quantity || 1) - (p.reservationAmount || 0))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground hover:text-blue-500 hover:bg-muted/50 rounded-lg transition-all"
                            title="Duplicar publicación"
                            onClick={() => handleDuplicate(p)}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all"
                            onClick={() => startEditing(p)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {(p.status === 'stock' || p.status === 'reserved') && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-orange-500 hover:text-white hover:bg-orange-500 rounded-lg transition-all"
                              title="Abono / Separar"
                              onClick={() => {
                                setSelectedProduct(p);
                                setReserveData({
                                  amount: '',
                                  buyer: p.reservationBuyer || '',
                                  date: new Date().toISOString().split('T')[0],
                                  method: 'Efectivo',
                                });
                                setIsReserveOpen(true);
                              }}
                            >
                              <HandCoins className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {(p.status === 'stock' || p.status === 'reserved') && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-emerald-500 hover:text-white hover:bg-emerald-500 rounded-lg transition-all"
                              title={p.status === 'reserved' ? 'Liquidar Venta' : 'Vender'}
                              onClick={() => {
                                setSelectedProduct(p);
                                setSellData({
                                  salePrice: p.salePrice || 0,
                                  saleDate: new Date().toISOString().split('T')[0],
                                  buyer: p.reservationBuyer || '',
                                  sellQuantity: 1,
                                  saleMethod: 'Efectivo',
                                  warrantyMonths: 3,
                                  warrantyExpiration: '',
                                });
                                setIsSellOpen(true);
                              }}
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-muted/50 rounded-lg"
                            onClick={() => {
                              setSelectedProduct(p);
                              setIsDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          <div className="flex items-center gap-0.5 ml-1 pl-1.5 border-l border-border h-4">
                             <Checkbox 
                               id={`hide-${p.id}`}
                               checked={p.hideInCatalog}
                               onCheckedChange={() => toggleHideInCatalog(p)}
                               className="h-3 w-3 rounded-sm border-rose-200 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
                             />
                             <Label htmlFor={`hide-${p.id}`} className="text-[7px] font-black uppercase text-rose-500 cursor-pointer select-none leading-none">Ocultar</Label>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          <div className="bg-muted/15 p-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6 sm:gap-10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Equipos Mostrados</span>
                <span className="text-xl font-black text-slate-950">{filteredTotals.count} <span className="text-xs text-slate-400 font-bold uppercase">unid.</span></span>
              </div>
              <div className="border-l border-slate-100 pl-6 sm:pl-8">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  {investorFilter !== 'all' ? `Inversión total (${investorFilter})` : 'Inversión total en vista'}
                </span>
                <span className="text-3xl font-black text-[#f15a24]">
                  {fmt(filteredTotals.cost)}
                </span>
              </div>
              <div className="border-l border-slate-100 pl-6 sm:pl-8">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Profit Est.</span>
                <span className="text-xl font-black text-emerald-600">
                  +{fmt(filteredTotals.profit)}
                </span>
              </div>
            </div>
            {investorFilter !== 'all' && (
              <div className="bg-[#f15a24]/5 rounded-2xl border border-[#f15a24]/10 p-3.5 flex items-center gap-2 pr-5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f15a24] animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#f15a24]">Filtrado por: {investorFilter}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product List - Mobile View (Cards) */}
      <div className="grid grid-cols-1 md:hidden gap-6">
        {sortedProducts.map((p) => {
          const profitPerUnit = (p.salePrice || 0) - p.purchasePrice;
          return (
            <Card key={p.id} className="card-premium border-none shadow-sm overflow-hidden rounded-3xl relative">
                {(p.status === 'stock' || p.status === 'reserved') && (
                  <div 
                    className="absolute top-0 left-0 w-24 h-24 z-30 flex items-start justify-start p-4 group cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSelection(p.id);
                    }}
                  >
                    <Checkbox 
                      className="w-10 h-10 rounded-2xl bg-white/90 backdrop-blur-md border-2 border-slate-200/50 shadow-xl data-[state=checked]:bg-primary data-[state=checked]:border-white pointer-events-none transition-all group-hover:scale-110"
                      checked={selectedIds.has(p.id)}
                      onCheckedChange={() => {}}
                    />
                  </div>
                )}
              <div className="flex flex-col">
                <div 
                  className={cn(
                    "relative aspect-video bg-muted flex items-center justify-center overflow-hidden",
                    p.images && p.images.length > 0 ? "cursor-zoom-in group-hover:opacity-95 transition-opacity" : ""
                  )}
                  onClick={() => {
                    if (p.images && p.images.length > 0) {
                      setLightbox({
                        isOpen: true,
                        images: p.images,
                        currentIndex: 0
                      });
                    }
                  }}
                >
                  {p.images && p.images.length > 0 ? (
                    <img src={p.images[0]} className="w-full h-full object-contain bg-slate-100 dark:bg-slate-950/40" alt={p.name} />
                  ) : (
                    <Smartphone className="w-12 h-12 text-muted-foreground/30" />
                  )}
                  <Badge className="absolute top-4 right-4 bg-card/90 backdrop-blur-md text-foreground border-none font-black text-[9px] tracking-widest px-3 rounded-full">
                     {p.investor}
                  </Badge>
                </div>
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="min-w-0">
                      <h3 className="font-black text-lg text-foreground tracking-tight truncate">{p.name}</h3>
                      
                      {/* Auto Spec Labels Mobile */}
                      {(p.category === 'CELULARES' || p.name.toLowerCase().includes('iphone')) && (
                        <div className="flex flex-wrap gap-1.5 mt-1 border-b border-border/50 pb-2 mb-2">
                          {extractGB(p.name, p.description) && (
                            <div className="bg-slate-100 text-slate-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                              💾 {extractGB(p.name, p.description)}
                            </div>
                          )}
                          {extractBattery(p.name, p.description) && (
                            <div className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                              🔋 {extractBattery(p.name, p.description)}
                            </div>
                          )}
                          {p.warrantyMonths && (
                            <div className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                              🛡️ {p.warrantyMonths} MESES GARANTÍA
                            </div>
                          )}
                        </div>
                      )}

                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">{p.id.slice(0, 8)}</div>
                    </div>
                    <Badge variant={p.status === 'stock' ? 'secondary' : p.status === 'reserved' ? 'outline' : 'default'} className={cn(
                      "text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full",
                      p.status === 'stock' ? "bg-blue-50 text-blue-600" : 
                      p.status === 'reserved' ? "bg-orange-50 text-orange-600" :
                      "bg-rose-50 text-rose-600"
                    )}>
                      {p.status === 'stock' ? 'STOCK' : p.status === 'reserved' ? 'SEPARADO' : 'OUT'}
                    </Badge>
                  </div>
                  
                  {p.status === 'reserved' && (
                    <div className="mb-4 p-3 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-between">
                       <div>
                          <div className="text-[8px] font-black text-orange-400 uppercase tracking-widest">Abonado</div>
                          <div className="text-sm font-black text-orange-600">{fmt(p.reservationAmount || 0)}</div>
                       </div>
                       <div className="text-right">
                          <div className="text-[8px] font-black text-orange-400 uppercase tracking-widest">Saldo Pendiente</div>
                          <div className="text-sm font-black text-emerald-600">{fmt(((p.salePrice || 0) * (p.quantity || 1)) - (p.reservationAmount || 0))}</div>
                       </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1 p-3 bg-muted/30 rounded-2xl">
                      <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Inversión</div>
                      <div className="text-sm font-black text-foreground">
                        {p.coInvestors && p.coInvestors.length > 0 && investorFilter !== 'all' ? (
                          <>
                            {fmt(p.purchasePrice * (p.coInvestors.find(c => c.investor === investorFilter)?.percentage || 0) / 100)}
                            <span className="ml-1 text-[8px] text-primary">({p.coInvestors.find(c => c.investor === investorFilter)?.percentage}%)</span>
                          </>
                        ) : fmt(p.purchasePrice)}
                      </div>
                    </div>
                    <div className="space-y-1 p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100/30">
                      <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600">P. Venta</div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-black text-emerald-700">{fmt(p.salePrice || 0)}</div>
                        {(p.regularPrice || 0) > (p.salePrice || 0) && (
                          <div className="text-[8px] font-bold text-slate-300 line-through">{fmt(p.regularPrice || 0)}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="space-y-1 px-3">
                       <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Utilidad Est.</div>
                       <div className="text-sm font-black text-emerald-600">+{fmt((p.salePrice || 0) * (p.quantity || 1) - (p.purchasePrice * (p.quantity || 1)))}</div>
                    </div>
                    <div className="space-y-1 px-3 text-right">
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Stock Disp.</div>
                      <div className="text-sm font-black text-blue-600">{p.quantity} Unid.</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border">
                    <Button 
                      variant="outline"
                      className="w-12 h-12 border-2 border-border text-muted-foreground hover:bg-muted hover:text-primary hover:border-primary/50 rounded-2xl transition-colors shrink-0"
                      onClick={() => handleDuplicate(p)}
                    >
                      <Copy className="w-5 h-5" />
                    </Button>
                    
                    <Button 
                      variant="outline"
                      className={cn(
                        "w-12 h-12 border-2 rounded-2xl transition-colors shrink-0",
                        p.status === 'stock' ? "border-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100" : "bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-white"
                      )}
                      onClick={() => p.status === 'stock' ? (setSelectedProduct(p), setIsDeleteOpen(true)) : startEditing(p)}
                    >
                      {p.status === 'stock' ? <Trash2 className="w-5 h-5" /> : <Pencil className="w-4 h-4" />}
                    </Button>

                    <div className="flex items-center gap-2 w-full pt-2 mt-2 border-t border-slate-50">
                        <Checkbox 
                           id={`hide-mobile-${p.id}`}
                           checked={p.hideInCatalog}
                           onCheckedChange={() => toggleHideInCatalog(p)}
                           className="w-6 h-6 rounded-lg border-2 border-rose-200 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500 shadow-sm"
                        />
                        <Label htmlFor={`hide-mobile-${p.id}`} className="text-[10px] font-black uppercase text-rose-500 cursor-pointer select-none tracking-widest">No Mostrar</Label>
                    </div>

                    {(p.status === 'stock' || p.status === 'reserved') && (
                        <div className="flex gap-2 flex-1 min-w-0">
                            <Button 
                                variant="outline"
                                className="flex-1 border-2 border-orange-100 text-orange-500 hover:bg-orange-50 hover:border-orange-200 rounded-2xl font-black uppercase text-[10px] tracking-widest h-12 px-0"
                                onClick={() => {
                                    setSelectedProduct(p);
                                    setReserveData({
                                        amount: '',
                                        buyer: p.reservationBuyer || '',
                                        date: new Date().toISOString().split('T')[0],
                                        method: 'Efectivo',
                                    });
                                    setIsReserveOpen(true);
                                }}
                            >
                                <HandCoins className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Abono</span>
                            </Button>
                            <Button 
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest h-12 flex shadow-lg shadow-emerald-500/20 px-0"
                                onClick={() => {
                                    setSelectedProduct(p);
                                    setSellData({
                                        salePrice: p.salePrice || 0,
                                        saleDate: new Date().toISOString().split('T')[0],
                                        buyer: p.reservationBuyer || '',
                                        sellQuantity: 1,
                                        saleMethod: 'Efectivo',
                                        warrantyMonths: 3,
                                        warrantyExpiration: '',
                                    });
                                    setIsSellOpen(true);
                                }}
                            >
                                <ShoppingCart className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">{p.status === 'reserved' ? 'Liquidar' : 'Vender'}</span><span className="sm:hidden">{p.status === 'reserved' ? 'Liq.' : 'Ven.'}</span>
                            </Button>
                            {p.status === 'stock' && (
                                <Button 
                                    className="w-12 h-12 bg-primary text-primary-foreground hover:opacity-90 rounded-2xl font-black uppercase shrink-0"
                                    onClick={() => startEditing(p)}
                                >
                                    <Pencil className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    )}

                    {p.status === 'sold' && (
                        <Button 
                          className="flex-1 bg-primary text-primary-foreground hover:opacity-90 rounded-2xl font-black uppercase text-[10px] tracking-widest h-12"
                          onClick={() => startEditing(p)}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-2" /> Detalle / Editar
                        </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Mobile Summary Card */}
      <div className="md:hidden">
        <Card className="card-premium border-none bg-slate-900 text-white rounded-[2rem] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12" />
          <div className="relative space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Resumen Filtrado</span>
              {investorFilter !== 'all' ? (
                <span className="text-[9px] font-black uppercase tracking-wider bg-[#f15a24] text-white px-2 py-0.5 rounded-md">Socio: {investorFilter}</span>
              ) : (
                <span className="text-[9px] font-black uppercase tracking-wider bg-white/10 text-white/60 px-2 py-0.5 rounded-md">Todos</span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 block mb-0.5">Equipos</span>
                <span className="text-lg font-black">{filteredTotals.count} ud.</span>
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 block mb-0.5">Profit Est.</span>
                <span className="text-lg font-black text-emerald-400">+{fmt(filteredTotals.profit)}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10">
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 block mb-1">
                {investorFilter !== 'all' ? `Inversión Total (${investorFilter})` : 'Inversión Total en Vista'}
              </span>
              <span className="text-3xl font-black text-[#f15a24]">
                {fmt(filteredTotals.cost)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl bg-slate-950 text-white rounded-[2.5rem] p-6 shadow-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-10 duration-500 ring-1 ring-white/10 backdrop-blur-2xl bg-opacity-90">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-2xl font-black border border-white/5 shadow-inner">
              {selectedIds.size}
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-[0.2em] text-white">Equipos en Carrito</div>
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none mt-1 items-center flex gap-2">
                 <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                 Listo para venta múltiple
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Button 
                variant="ghost" 
                className="text-white/60 hover:text-white hover:bg-white/5 rounded-2xl px-6 h-12 text-[10px] font-black uppercase tracking-widest hidden sm:flex" 
                onClick={() => setSelectedIds(new Set())}
             >
                Limpiar
             </Button>
             <Button 
               className="bg-emerald-500 hover:bg-emerald-400 text-white h-14 px-10 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-2xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2" 
               onClick={startBulkSell}
             >
               <ShoppingCart className="w-4 h-4" /> Realizar Venta
             </Button>
          </div>
        </div>
      )}

      {/* Add Product Dialog - Empty as it is handled by the Dialog block above */}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-black tracking-tight uppercase">Editar Producto</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6">
            <ImageUploader 
              images={editProductState?.images || []} 
              onUpload={(urls) => handleImageUploadCloudinary(urls, 'edit')} 
              onRemove={(idx) => removeImage(idx, 'edit')} 
              onReorder={(idx, dir) => reorderImages(idx, dir, 'edit')}
              uploading={uploading}
            />
            
            <div className="grid gap-2">
              <Label htmlFor="e-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nombre del Producto</Label>
              <Input id="e-name" className="rounded-xl border-border h-11" value={editProductState?.name || ''} onChange={e => setEditProductState(prev => prev ? ({...prev, name: e.target.value}) : null)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="e-desc" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Descripción</Label>
              <Textarea id="e-desc" className="rounded-xl border-border min-h-[100px]" value={editProductState?.description || ''} onChange={e => setEditProductState(prev => prev ? ({...prev, description: e.target.value}) : null)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="e-imei" className="text-[10px] font-black uppercase tracking-widest text-slate-400">IMEI</Label>
                <div className="flex gap-2">
                  <Input 
                    id="e-imei" 
                    maxLength={15}
                    placeholder="15 dígitos"
                    className="rounded-xl border-slate-100 h-11 flex-1" 
                    value={editProductState?.imei || ''} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 15);
                      setEditProductState(prev => prev ? ({...prev, imei: val}) : null);
                    }} 
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    onClick={() => { setActiveScannerMode('edit'); setIsScannerOpen(true); }}
                    className="h-11 w-11 rounded-xl border-rose-100 bg-rose-50 text-rose-500 hover:bg-rose-100"
                  >
                    <Camera className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Categoría</Label>
                <Select value={editProductState?.category || 'CELULARES'} onValueChange={v => setEditProductState(prev => prev ? ({...prev, category: v as Category}) : null)}>
                  <SelectTrigger className="rounded-xl border-slate-100 h-11 font-bold text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100">
                    <SelectItem value="CELULARES">CELULARES</SelectItem>
                    <SelectItem value="TABLETS">TABLETS</SelectItem>
                    <SelectItem value="RELOJ INTELIGENTES">RELOJ INTELIGENTES</SelectItem>
                    <SelectItem value="AURICULARES">AURICULARES</SelectItem>
                    <SelectItem value="ACCESORIOS">ACCESORIOS</SelectItem>
                    <SelectItem value="Other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="e-provider" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Proveedor</Label>
                <Input id="e-provider" className="rounded-xl border-slate-100 h-11" value={editProductState?.provider || ''} onChange={e => setEditProductState(prev => prev ? ({...prev, provider: e.target.value}) : null)} />
              </div>
            </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="e-pc" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inversión (u)</Label>
                <Input id="e-pc" type="number" className="rounded-xl border-slate-100 h-11" value={editProductState?.purchasePrice || 0} onChange={e => setEditProductState(prev => prev ? ({...prev, purchasePrice: parseFloat(e.target.value) || 0}) : null)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="e-qty" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cantidad</Label>
                <Input id="e-qty" type="number" className="rounded-xl border-slate-100 h-11" value={editProductState?.quantity || 1} onChange={e => setEditProductState(prev => prev ? ({...prev, quantity: parseInt(e.target.value) || 1}) : null)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="e-pv" className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Precio Venta Sugerido</Label>
                <Input id="e-pv" type="number" className="rounded-xl border-emerald-100 bg-emerald-50/30 h-11 font-black text-emerald-700" value={editProductState?.salePrice || 0} onChange={e => setEditProductState(prev => prev ? ({...prev, salePrice: parseFloat(e.target.value) || 0}) : null)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="e-pr" className="text-[10px] font-black uppercase tracking-widest text-rose-500">Precio Regular (Promo)</Label>
                <Input id="e-pr" type="number" className="rounded-xl border-rose-100 bg-rose-50/30 h-11 font-black text-rose-700" value={editProductState?.regularPrice || 0} onChange={e => setEditProductState(prev => prev ? ({...prev, regularPrice: parseFloat(e.target.value) || 0}) : null)} />
              </div>
            </div>

            <div className="grid gap-2 border-t border-slate-50 pt-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado del Producto</Label>
              <Select value={editProductState?.status || 'stock'} onValueChange={v => setEditProductState(prev => prev ? ({...prev, status: v as any}) : null)}>
                <SelectTrigger className="rounded-xl border-slate-100 h-11 font-bold text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100">
                  <SelectItem value="stock">En Stock</SelectItem>
                  <SelectItem value="reserved">Separado (Con Abono)</SelectItem>
                  <SelectItem value="out_of_stock">Agotado / No disponible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ownership Change Section */}
            <div className="space-y-4 border-t border-slate-50 pt-6">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-900">Propiedad y Socios</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="e-is-external" 
                    checked={editProductState?.isExternal || false} 
                    onCheckedChange={(v) => setEditProductState(prev => prev ? ({...prev, isExternal: !!v}) : null)} 
                  />
                  <Label htmlFor="e-is-external" className="text-[10px] font-black uppercase tracking-widest text-rose-500 cursor-pointer">
                    Externa
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="e-is-co-inv" 
                    checked={useCoInvestment} 
                    onCheckedChange={(v) => setUseCoInvestment(!!v)} 
                  />
                  <Label htmlFor="e-is-co-inv" className="text-[10px] font-black uppercase tracking-widest text-blue-600 cursor-pointer">
                    Co-Inversión
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                   <Checkbox 
                     id="e-hide-catalog" 
                     checked={editProductState?.hideInCatalog || false} 
                     onCheckedChange={(v) => setEditProductState(prev => prev ? ({...prev, hideInCatalog: !!v}) : null)} 
                   />
                   <Label htmlFor="e-hide-catalog" className="text-[10px] font-black uppercase tracking-widest text-rose-500 cursor-pointer">
                     No Mostrar
                   </Label>
                </div>
              </div>

              {!useCoInvestment ? (
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inversionista</Label>
                    <Select value={editProductState?.investor} onValueChange={v => setEditProductState(prev => prev ? ({...prev, investor: v as Investor}) : null)}>
                      <SelectTrigger className="rounded-xl border-white h-10 font-bold text-xs shadow-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-100">
                        {investors.map(inv => <SelectItem key={inv} value={inv}>{inv}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Medio Pago</Label>
                    <Select value={editProductState?.purchaseMethod} onValueChange={v => setEditProductState(prev => prev ? ({...prev, purchaseMethod: v as PaymentMethod}) : null)}>
                      <SelectTrigger className="rounded-xl border-white h-10 font-bold text-xs shadow-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-100">
                        <SelectItem value="none">Ninguno / Efectivo</SelectItem>
                        <SelectItem value="Bancolombia">Bancolombia</SelectItem>
                        <SelectItem value="Nequi">Nequi</SelectItem>
                        <SelectItem value="Banco de Bogota">Banco de Bogotá</SelectItem>
                        <SelectItem value="Cripto (USDT)">Cripto (USDT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600">Reparto de Inversión (%)</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={addCoInvestor} className="h-7 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-100 px-3">
                      <Plus className="w-3 h-3 mr-1" /> Añadir Socio
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {coInvList.map((co, idx) => (
                      <div key={idx} className="space-y-2 p-3 bg-white rounded-2xl border border-blue-50 shadow-sm">
                        <div className="flex gap-2">
                          <Select value={co.investor} onValueChange={v => updateCoInv(idx, { investor: v as Investor })}>
                            <SelectTrigger className="flex-1 rounded-xl border-blue-100 h-10 font-bold text-[11px] bg-slate-50/50"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {investors.map(inv => <SelectItem key={inv} value={inv}>{inv}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <div className="relative w-24">
                            <Input 
                              type="number" 
                              className="rounded-xl border-blue-100 h-10 font-bold text-xs pr-7" 
                              value={co.percentage} 
                              onChange={e => updateCoInv(idx, { percentage: parseFloat(e.target.value) || 0 })}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">%</span>
                          </div>
                          {coInvList.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeCoInvestor(idx)} className="h-10 w-10 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="e-warranty" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Garantía (Meses)</Label>
                <Input id="e-warranty" type="number" min="0" className="rounded-xl border-slate-100 h-11" value={editProductState?.warrantyMonths || 0} onChange={e => setEditProductState(prev => prev ? ({...prev, warrantyMonths: parseInt(e.target.value) || 0}) : null)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="e-w-exp" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vencimiento</Label>
                <Input id="e-w-exp" type="date" className="rounded-xl border-slate-100 h-11" value={editProductState?.warrantyExpiration || ''} onChange={e => setEditProductState(prev => prev ? ({...prev, warrantyExpiration: e.target.value}) : null)} />
              </div>
            </div>
            
            <Button onClick={handleEditProduct} className="w-full bg-primary text-primary-foreground h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/10 mt-2">
               Aplicar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reserve Product Dialog */}
      <Dialog open={isReserveOpen} onOpenChange={setIsReserveOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="max-h-[95vh] overflow-y-auto p-8 custom-scrollbar">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl font-black tracking-tight uppercase text-orange-600 flex items-center gap-2">
                  <HandCoins className="w-6 h-6" /> Separar Equipo
              </DialogTitle>
            </DialogHeader>
          <div className="grid gap-6">
            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex items-center gap-4">
               <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">
                  <Smartphone className="w-6 h-6 text-orange-400" />
               </div>
               <div>
                  <div className="font-black text-orange-900 truncate">{selectedProduct?.name}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-orange-400">Total a Pagar: {fmt((selectedProduct?.salePrice || 0) * (selectedProduct?.quantity || 1))}</div>
               </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="res-buyer" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre del Cliente *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                    id="res-buyer" 
                    placeholder="¿Quién separa el equipo?" 
                    className="rounded-xl border-slate-100 h-11 pl-10"
                    value={reserveData.buyer} 
                    onChange={e => setReserveData({...reserveData, buyer: e.target.value})} 
                />
              </div>
            </div>

            {(selectedProduct?.reservationPayments?.length || 0) > 0 && (
               <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Historial de Abonos</Label>
                  {selectedProduct?.reservationPayments?.map((p, i) => (
                    <div key={i} className="flex justify-between items-center text-[10px] font-bold bg-slate-50 p-2 rounded-lg border border-slate-100">
                       <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                          <span className="text-slate-500">{p.date}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <span className="text-slate-400">{p.method}</span>
                          <span className="text-orange-600">{fmt(p.amount)}</span>
                       </div>
                    </div>
                  ))}
               </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="res-amount" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {selectedProduct?.status === 'reserved' ? 'Nuevo Abono' : 'Monto del Abono / Separación'} *
              </Label>
              <Input 
                id="res-amount" 
                type="number" 
                placeholder="0"
                className="rounded-xl border-orange-100 bg-orange-50/20 h-12 font-black text-orange-600 text-lg"
                value={reserveData.amount} 
                onChange={e => setReserveData({...reserveData, amount: e.target.value})}
              />
              {selectedProduct?.status === 'reserved' && (
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-tight">
                  <span className="text-slate-400">Total Abonado: {fmt(selectedProduct.reservationAmount || 0)}</span>
                  <span className="text-emerald-600">Pendiente: {fmt((selectedProduct.salePrice || 0) * (selectedProduct.quantity || 1) - (selectedProduct.reservationAmount || 0))}</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="res-date" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha de Abono</Label>
                <Input 
                  id="res-date" 
                  type="date" 
                  className="rounded-xl border-slate-100 h-11"
                  value={reserveData.date} 
                  onChange={e => setReserveData({...reserveData, date: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Método de Pago</Label>
                <Select value={reserveData.method} onValueChange={v => setReserveData({...reserveData, method: v as PaymentMethod})}>
                  <SelectTrigger className="rounded-xl border-slate-100 h-11 font-bold text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100">
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="Bancolombia">Bancolombia</SelectItem>
                    <SelectItem value="Nequi">Nequi</SelectItem>
                    <SelectItem value="Banco de Bogota">Banco de Bogota</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleReserveProduct}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-orange-600/10 mt-2"
            >
              Registrar Separación
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

      {/* Bulk Sell Dialog */}
      <Dialog open={isBulkSellOpen} onOpenChange={setIsBulkSellOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
          <div className="p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight uppercase text-emerald-600 flex items-center gap-2">
                 <ShoppingCart className="w-6 h-6" /> Registro de Venta Múltiple
              </DialogTitle>
            </DialogHeader>

            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre del Cliente *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Nombre completo" 
                      className="rounded-xl border-slate-200 h-11 pl-10 bg-white"
                      value={bulkSellData.buyer}
                      onChange={e => setBulkSellData({...bulkSellData, buyer: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha de Venta *</Label>
                  <Input 
                     type="date" 
                     className="rounded-xl border-slate-200 h-11 bg-white"
                     value={bulkSellData.saleDate}
                     onChange={e => {
                        const newDate = e.target.value;
                        setBulkSellData({...bulkSellData, saleDate: newDate});
                        // Update all items warranty expiration based on new date
                        setBulkSellItems(prev => prev.map(item => {
                           const d = new Date(newDate);
                           d.setMonth(d.setMonth(d.getMonth() + item.warrantyMonths));
                           return { ...item, warrantyExpiration: d.toISOString().split('T')[0] };
                        }));
                     }}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Método de Pago Global</Label>
                <Select value={bulkSellData.saleMethod} onValueChange={v => setBulkSellData({...bulkSellData, saleMethod: v as PaymentMethod})}>
                  <SelectTrigger className="rounded-xl border-slate-200 h-11 font-bold text-xs bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="Bancolombia">Bancolombia</SelectItem>
                    <SelectItem value="Nequi">Nequi</SelectItem>
                    <SelectItem value="Banco de Bogota">Banco de Bogotá</SelectItem>
                    <SelectItem value="Cripto (USDT)">Cripto (USDT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

                <div className="space-y-4">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Equipos en el Carrito ({bulkSellItems.length})</Label>
                   <div className="space-y-3">
                      {bulkSellItems.map((item, idx) => {
                         const totalItemPrice = item.salePrice * item.sellQuantity;
                         let discountValue = 0;
                         if (item.discount > 0) {
                            if (item.discountType === 'percentage') {
                               discountValue = totalItemPrice * (item.discount / 100);
                            } else {
                               // MODIFIED: In bulk sell, the discount in the input is PER UNIT
                               discountValue = item.discount * item.sellQuantity;
                            }
                         }
                         const finalItemPrice = totalItemPrice - discountValue;

                         return (
                            <div key={item.productId} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4">
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                                        <Smartphone className="w-5 h-5 text-slate-400" />
                                     </div>
                                     <div className="font-black text-sm text-slate-900">{item.productName}</div>
                                  </div>
                                  <Button 
                                     variant="ghost" 
                                     size="icon" 
                                     className="h-8 w-8 text-rose-500"
                                     onClick={() => {
                                        const next = bulkSellItems.filter((_, i) => i !== idx);
                                        setBulkSellItems(next);
                                        const nextIds = new Set(selectedIds);
                                        nextIds.delete(item.productId);
                                        setSelectedIds(nextIds);
                                        if (next.length === 0) setIsBulkSellOpen(false);
                                     }}
                                  >
                                     <Trash2 className="w-4 h-4" />
                                  </Button>
                               </div>

                               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div className="space-y-1">
                                     <Label className="text-[8px] font-black uppercase text-slate-400">Precio Base</Label>
                                     <Input 
                                        type="number"
                                        className="h-9 text-xs font-bold rounded-lg"
                                        value={item.salePrice}
                                        onChange={e => {
                                           const next = [...bulkSellItems];
                                           next[idx].salePrice = parseFloat(e.target.value) || 0;
                                           setBulkSellItems(next);
                                        }}
                                     />
                                  </div>
                                  <div className="space-y-1">
                                     <Label className="text-[8px] font-black uppercase text-slate-400">Cantidad</Label>
                                     <Input 
                                        type="number"
                                        min="1"
                                        max={item.maxQuantity}
                                        className="h-9 text-xs font-bold rounded-lg"
                                        value={item.sellQuantity}
                                        onChange={e => {
                                           const next = [...bulkSellItems];
                                           next[idx].sellQuantity = Math.min(parseInt(e.target.value) || 1, item.maxQuantity);
                                           setBulkSellItems(next);
                                        }}
                                     />
                                  </div>
                                  <div className="space-y-1">
                                     <Label className="text-[8px] font-black uppercase text-slate-400">Dto. (unid)</Label>
                                     <Input 
                                        type="number"
                                        className="h-9 text-xs font-bold rounded-lg"
                                        value={item.discount}
                                        onChange={e => {
                                           const next = [...bulkSellItems];
                                           next[idx].discount = parseFloat(e.target.value) || 0;
                                           setBulkSellItems(next);
                                        }}
                                     />
                                  </div>
                                  <div className="space-y-1">
                                     <Label className="text-[8px] font-black uppercase text-slate-400">Tipo Dto.</Label>
                                     <Select 
                                        value={item.discountType} 
                                        onValueChange={v => {
                                           const next = [...bulkSellItems];
                                           next[idx].discountType = v as 'fixed' | 'percentage';
                                           setBulkSellItems(next);
                                        }}
                                     >
                                        <SelectTrigger className="h-9 text-[10px] font-bold rounded-lg"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                           <SelectItem value="fixed">$ Fijo c/u</SelectItem>
                                           <SelectItem value="percentage">% Perc c/u</SelectItem>
                                        </SelectContent>
                                     </Select>
                                  </div>
                               </div>

                               <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                  <div className="flex gap-4">
                                     <div className="space-y-0.5">
                                        <div className="text-[8px] font-black uppercase text-slate-400">Garantía (Meses)</div>
                                        <Input 
                                           type="number" 
                                           className="h-7 w-16 text-[10px] font-bold rounded-md"
                                           value={item.warrantyMonths}
                                           onChange={e => {
                                              const next = [...bulkSellItems];
                                              const val = parseInt(e.target.value) || 0;
                                              next[idx].warrantyMonths = val;
                                              const d = new Date(bulkSellData.saleDate);
                                              d.setMonth(d.getMonth() + val);
                                              next[idx].warrantyExpiration = d.toISOString().split('T')[0];
                                              setBulkSellItems(next);
                                           }}
                                        />
                                     </div>
                                     <div className="space-y-0.5">
                                        <div className="text-[8px] font-black uppercase text-slate-400">Vence</div>
                                        <div className="text-[10px] font-bold text-slate-600 pt-1">{item.warrantyExpiration}</div>
                                     </div>
                                  </div>
                                  <div className="text-right">
                                     <div className="text-[8px] font-black uppercase text-emerald-600">Subtotal con Descuento</div>
                                     <div className="text-sm font-black text-emerald-700">{fmt(finalItemPrice)}</div>
                                  </div>
                               </div>
                            </div>
                         );
                      })}
                   </div>
                </div>

                <div className="bg-emerald-600 p-6 rounded-[2rem] text-white flex items-center justify-between shadow-xl shadow-emerald-600/20">
                   <div>
                      <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Total de la Venta</div>
                      <div className="text-2xl font-black">
                         {fmt(bulkSellItems.reduce((acc, item) => {
                            const total = item.salePrice * item.sellQuantity;
                            // MODIFIED: Calculate discount per unit if fixed
                            const disc = item.discountType === 'percentage' ? total * (item.discount / 100) : (item.discount * item.sellQuantity);
                            return acc + (total - disc);
                         }, 0))}
                      </div>
                   </div>
               <Button 
                onClick={handleBulkSell}
                className="bg-white text-emerald-600 hover:bg-slate-100 h-12 px-8 rounded-xl font-black uppercase text-xs tracking-widest"
               >
                  Confirmar Venta
               </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={(open) => {
        setIsDeleteOpen(open);
        if (!open) setSelectedProduct(null);
      }}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Confirmar Eliminación
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <p className="text-muted-foreground">
              ¿Estás seguro de que deseas eliminar <strong>{selectedProduct?.name}</strong>?
            </p>
            <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg border border-border">
              Esta acción es permanente y no se podrá recuperar el registro del inventario.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteProduct}>Eliminar Definitivamente</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSellOpen} onOpenChange={setIsSellOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="max-h-[95vh] overflow-y-auto p-8 custom-scrollbar">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl font-black tracking-tight uppercase">Registrar Venta</DialogTitle>
            </DialogHeader>
          <div className="grid gap-6">
            <div className="flex items-center gap-4 bg-muted p-4 rounded-2xl border border-border">
               <div className="w-12 h-12 rounded-xl overflow-hidden bg-card shrink-0 border border-border">
                  {selectedProduct?.images?.[0] ? (
                    <img src={selectedProduct.images[0]} className="w-full h-full object-cover" alt={selectedProduct.name} />
                  ) : <Smartphone className="w-full h-full p-3 text-muted-foreground/30" />}
               </div>
               <div className="min-w-0">
                  <div className="font-black text-foreground truncate">{selectedProduct?.name}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Stock: {selectedProduct?.quantity}</div>
               </div>
            </div>
            
            {(selectedProduct?.quantity || 1) > 1 && (
              <div className="grid gap-2">
                <Label htmlFor="sell-qty" className="text-[10px] font-black uppercase tracking-widest text-slate-400">¿Cuántas unidades se venden? *</Label>
                <Input 
                  id="sell-qty" 
                  type="number" 
                  min="1" 
                  max={selectedProduct?.quantity || 1}
                  className={cn("rounded-xl border-slate-100 h-11", sellErrors.qty && "border-rose-500 bg-rose-50")}
                  value={sellData.sellQuantity} 
                  onChange={e => setSellData({...sellData, sellQuantity: e.target.value})}
                />
                {sellErrors.qty && (
                  <span className="text-[9px] font-black uppercase text-rose-500 px-1">
                    {Number(sellData.sellQuantity) > (selectedProduct?.quantity || 0) ? 'Excede stock disponible' : 'Cantidad inválida'}
                  </span>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="sell-price" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Precio de Venta Unitario (Bruto) *</Label>
              <Input 
                id="sell-price" 
                type="number" 
                className={cn("rounded-xl border-slate-100 h-11 font-black text-emerald-600", sellErrors.price && "border-rose-500 bg-rose-50")}
                value={sellData.salePrice} 
                onChange={e => setSellData({...sellData, salePrice: e.target.value})}
                placeholder="0"
              />
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Ingresa el precio antes de aplicar el descuento</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sell-discount" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Descuento</Label>
                <Input 
                  id="sell-discount" 
                  type="number" 
                  className="rounded-xl border-slate-100 h-11"
                  value={sellData.discount} 
                  onChange={e => setSellData({...sellData, discount: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo Dto.</Label>
                <Select value={sellData.discountType} onValueChange={v => setSellData({...sellData, discountType: v as 'fixed' | 'percentage'})}>
                  <SelectTrigger className="rounded-xl border-slate-100 h-11 font-bold text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100">
                    <SelectItem value="fixed">$ Fijo</SelectItem>
                    <SelectItem value="percentage">% Porcentaje</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sell-date" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</Label>
                <Input 
                  id="sell-date" 
                  type="date" 
                  className="rounded-xl border-slate-100 h-11"
                  value={sellData.saleDate} 
                  onChange={e => setSellData({...sellData, saleDate: e.target.value})} 
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Medodo Pago *</Label>
                <Select value={sellData.saleMethod} onValueChange={v => setSellData({...sellData, saleMethod: v as PaymentMethod})}>
                  <SelectTrigger className="rounded-xl border-slate-100 h-11 font-bold text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100">
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="Bancolombia">Bancolombia</SelectItem>
                    <SelectItem value="Nequi">Nequi</SelectItem>
                    <SelectItem value="Banco de Bogota">Banco de Bogota</SelectItem>
                    {(selectedProduct?.investor === 'Duvan' || selectedProduct?.isExternal) && <SelectItem value="Cripto (USDT)">Cripto (USDT)</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-rose-500">Garantía (Meses)</Label>
                <Input 
                  type="number" 
                  min="0" 
                  className="rounded-xl border-slate-100 h-11"
                  value={sellData.warrantyMonths} 
                  onChange={e => setSellData({...sellData, warrantyMonths: parseInt(e.target.value) || 0})} 
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hasta:</Label>
                <Input 
                  type="date" 
                  className="rounded-xl border-slate-100 h-11 bg-slate-50"
                  value={sellData.warrantyExpiration} 
                  readOnly
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="buyer" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre del Comprador</Label>
              <Input 
                id="buyer" 
                placeholder="Identificación / Nombre" 
                className="rounded-xl border-slate-100 h-11"
                value={sellData.buyer} 
                onChange={e => setSellData({...sellData, buyer: e.target.value})} 
              />
            </div>

            <Button 
              onClick={handleSellProduct} 
              disabled={sellErrors.price || sellErrors.qty}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:bg-muted h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-600/10 mt-2"
            >
              Confirmar Venta
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

      {isScannerOpen && (
        <IMEIScanner 
          onResult={(imei) => {
            if (activeScannerMode === 'add') {
              setNewProduct(prev => ({ ...prev, imei }));
            } else if (activeScannerMode === 'edit') {
              setEditProductState(prev => prev ? ({ ...prev, imei }) : null);
            }
          }}
          onClose={() => {
            setIsScannerOpen(false);
            setActiveScannerMode(null);
          }}
        />
      )}

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
            <div className="flex-1 w-full max-w-5xl flex items-center justify-center relative my-4">
              {lightbox.images.length > 1 && (
                <button 
                  type="button"
                  className="absolute left-2 sm:left-6 z-20 p-4 bg-white/10 hover:bg-white/20 active:scale-90 rounded-full text-white transition-all shadow-lg pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox(prev => ({
                      ...prev,
                      currentIndex: prev.currentIndex > 0 ? prev.currentIndex - 1 : prev.images.length - 1
                    }));
                  }}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              <motion.img 
                key={lightbox.currentIndex}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.05, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                src={lightbox.images[lightbox.currentIndex]} 
                className="max-w-full max-h-[75vh] sm:max-h-[80vh] w-auto h-auto object-contain transition-all duration-300 drop-shadow-[0_25px_50px_rgba(0,0,0,0.8)] rounded-xl pointer-events-auto" 
                alt="Expanded inventory view"
                onClick={(e) => e.stopPropagation()} 
              />

              {lightbox.images.length > 1 && (
                <button 
                  type="button"
                  className="absolute right-2 sm:right-6 z-20 p-4 bg-white/10 hover:bg-white/20 active:scale-90 rounded-full text-white transition-all shadow-lg pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox(prev => ({
                      ...prev,
                      currentIndex: prev.currentIndex < prev.images.length - 1 ? prev.currentIndex + 1 : 0
                    }));
                  }}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Clean bottom guidance captions */}
            <div className="text-center pb-6 space-y-1.5 z-10">
              <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest">
                Toca en cualquier parte oscura para volver al inventario
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
