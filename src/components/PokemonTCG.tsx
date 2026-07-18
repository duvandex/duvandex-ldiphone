import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Badge } from './ui/badge';
import { 
  Camera, Upload, Sparkles, Plus, Minus, Trash2, Search, Filter, ArrowUpDown, 
  Coins, TrendingUp, Layers, Edit, Save, RefreshCw, Eye, AlertCircle, ShoppingBag, 
  Grid, List, Smartphone, HelpCircle, Info, Check, Keyboard, Zap
} from 'lucide-react';
import { useData } from '../context/AppDataContext';
import { fmt, cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { MonPriceImportDialog } from './MonPriceImportDialog';

// Types for Pokemon Inventory
interface PokemonItem {
  id: string;
  type: 'card' | 'sealed'; // card vs sealed product
  name: string;
  set: string;
  cardNumber?: string;
  rarity?: string;
  marketPrice: number; // Suggested price
  collectrPrice?: number | null; // in USD (Collectr market price)
  investedPrice?: number | null; // in USD (optional acquisition cost)
  imageUrl: string;
  quantity: number;
  condition: string; // e.g. NM, LP, Sealed, etc.
  notes?: string;
  dateAdded: string;
  language?: string; // e.g. Inglés, Español, Japonés, etc.
  lastPriceUpdate?: {
    source: 'MonPrice' | 'Manual' | 'TCGPlayer';
    date: string;
    previousPrice: number;
  };
}

function getLanguagePresets(language: string, basePrice: number) {
  if (!basePrice) return [];
  switch (language) {
    case 'Español':
      return [
        { label: 'Recomendado (65%)', price: basePrice * 0.65, percent: '65' },
        { label: 'Descuento Alto (50%)', price: basePrice * 0.50, percent: '50' }
      ];
    case 'Japonés':
      return [
        { label: 'Estándar JP (80%)', price: basePrice * 0.80, percent: '80' },
        { label: 'Arte/Promo JP (120%)', price: basePrice * 1.20, percent: '120' }
      ];
    case 'Coreano':
    case 'Chino':
      return [
        { label: 'Estándar Asia (45%)', price: basePrice * 0.45, percent: '45' }
      ];
    case 'Alemán':
    case 'Francés':
    case 'Italiano':
    case 'Portugués':
      return [
        { label: 'Estándar Europa (75%)', price: basePrice * 0.75, percent: '75' }
      ];
    default:
      return [];
  }
}

function convertDirectImageUrl(url: string): string {
  if (!url) return '';
  let cleanUrl = url.trim();

  // If it's already a base64 data URI, return it directly
  if (cleanUrl.startsWith('data:')) {
    return cleanUrl;
  }

  // Handle Google Drive links
  if (cleanUrl.includes('drive.google.com')) {
    let fileId = '';
    const fileDMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const idParamMatch = cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    
    if (fileDMatch && fileDMatch[1]) {
      fileId = fileDMatch[1];
    } else if (idParamMatch && idParamMatch[1]) {
      fileId = idParamMatch[1];
    }
    
    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  // Handle Imgur links
  if (cleanUrl.includes('imgur.com') && !cleanUrl.includes('i.imgur.com')) {
    const imgurMatch = cleanUrl.match(/imgur\.com\/([a-zA-Z0-9]+)$/);
    if (imgurMatch && imgurMatch[1]) {
      return `https://i.imgur.com/${imgurMatch[1]}.png`;
    }
  }

  // Bypass TCGplayer hotlinking protection and other pokemon resource sites (avoid 403 Forbidden)
  const isExternalAsset = cleanUrl.includes('tcgplayer.com') || 
                          cleanUrl.includes('tcgplayer-cdn') || 
                          cleanUrl.includes('pokemon.com') || 
                          cleanUrl.includes('pokellector') || 
                          cleanUrl.includes('pokemontcg.io') ||
                          cleanUrl.includes('limitlesstcg') ||
                          cleanUrl.startsWith('http://') ||
                          (cleanUrl.startsWith('https://') && 
                           !cleanUrl.includes('lh3.googleusercontent.com') && 
                           !cleanUrl.includes('i.imgur.com') && 
                           !cleanUrl.includes('images.weserv.nl') && 
                           !cleanUrl.includes('wsrv.nl'));

  if (isExternalAsset) {
    // Use images.weserv.nl as an active proxy to load images and bypass referrer restrictions
    return `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}`;
  }

  return cleanUrl;
}

function getRarityGlowClass(rarity?: string): string {
  if (!rarity) return '';
  const r = rarity.toLowerCase();
  if (r.includes('secret') || r.includes('gold') || r.includes('rainbow') || r.includes('special illustration') || r.includes('hyper')) {
    return 'pokemon-gold-glow';
  }
  if (r.includes('ultra') || r.includes('sir') || r.includes('ex') || r.includes('vmax') || r.includes('vstar') || r.includes('illustration') || r.includes('full art') || r.includes('galarian gallery')) {
    return 'pokemon-ultra-glow';
  }
  if (r.includes('holo') || r.includes('rare') || r.includes('shining') || r.includes('shiny') || r.includes('prism')) {
    return 'pokemon-holo-glow';
  }
  return '';
}

function PokemonImage({ 
  src, 
  name, 
  set, 
  type = 'card', 
  cardNumber, 
  className 
}: { 
  src?: string; 
  name?: string; 
  set?: string; 
  type?: 'card' | 'sealed'; 
  cardNumber?: string; 
  className?: string; 
}) {
  const [hasError, setHasError] = useState(!src);

  useEffect(() => {
    setHasError(!src);
  }, [src]);

  const finalSrc = convertDirectImageUrl(src || '');

  if (hasError || !src || !finalSrc) {
    if (type === 'sealed') {
      return (
        <div className={cn(
          "w-full h-full bg-slate-900 border border-slate-700 rounded-xl flex flex-col justify-between p-3 select-none relative overflow-hidden text-slate-100",
          className
        )}>
          {/* Box pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.15),transparent)] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 z-10">
            <span className="text-[8px] font-black tracking-widest text-indigo-400 uppercase">PRODUCTO SELLADO</span>
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          </div>

          <div className="flex flex-col items-center justify-center my-auto py-2 z-10 text-center space-y-1">
            <div className="p-3 bg-indigo-500/10 rounded-full border border-indigo-500/20 text-indigo-400 animate-pulse">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black uppercase text-slate-300 mt-2 line-clamp-2 px-1">
              {name || "PRODUCTO SELLADO"}
            </p>
            <p className="text-[8px] font-bold text-slate-500 uppercase">
              {set || "Pokémon Official"}
            </p>
          </div>

          <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between text-[8px] font-mono text-slate-400 z-10">
            <span>OFFICIAL BOX</span>
            <span>★ PORTFOLIO</span>
          </div>
        </div>
      );
    }

    return (
      <div className={cn(
        "w-full h-full bg-gradient-to-b from-slate-950 to-slate-900 border-2 border-yellow-500/40 rounded-xl flex flex-col justify-between p-3 select-none relative overflow-hidden text-slate-200 shadow-inner",
        className
      )}>
        {/* Card pattern background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.1),transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />

        <div className="flex items-center justify-between border-b border-yellow-500/10 pb-1 z-10">
          <span className="text-[8px] font-black tracking-widest text-yellow-500/80 uppercase font-bold">POKÉMON TCG</span>
          {cardNumber && <span className="text-[8px] font-mono text-slate-400">{cardNumber}</span>}
        </div>

        <div className="flex flex-col items-center justify-center my-auto py-2 z-10 text-center space-y-1">
          {/* Classic pokeball visual using div */}
          <div className="relative w-12 h-12 rounded-full border border-yellow-500/20 bg-slate-800 flex flex-col items-center justify-center overflow-hidden shadow-lg">
            <div className="absolute top-0 w-full h-1/2 bg-red-600/70 border-b border-slate-950" />
            <div className="absolute bottom-0 w-full h-1/2 bg-white/90" />
            <div className="absolute w-4 h-4 rounded-full bg-slate-800 border border-slate-950 z-20 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </div>
          
          <p className="text-[9px] font-black uppercase text-slate-300 mt-2 line-clamp-2 px-1 leading-tight">
            {name || "CARTA INDIVIDUAL"}
          </p>
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tight">
            {set || "Coleccionable"}
          </p>
        </div>

        <div className="border-t border-yellow-500/10 pt-1 flex items-center justify-between text-[7px] font-bold text-slate-500 uppercase tracking-widest z-10">
          <span>COLECCIÓN</span>
          <span>VALORADO</span>
        </div>
      </div>
    );
  }

  return (
    <img 
      src={finalSrc} 
      alt={name || "Pokemon Item"}
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setHasError(true)}
    />
  );
}

export default function PokemonTCG() {
  const { usdtRate } = useData();
  const [inventory, setInventory] = useState<PokemonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & UI states
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'card' | 'sealed'>('all');
  const [filterSet, setFilterSet] = useState('all');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [sortBy, setSortBy] = useState<'price_desc' | 'price_asc' | 'qty_desc' | 'name_asc'>('price_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Manual & Scan Result Dialog State
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [isMonPriceOpen, setIsMonPriceOpen] = useState(false);
  const [originalEnglishPrice, setOriginalEnglishPrice] = useState<number>(0);
  const [previewError, setPreviewError] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string } | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<PokemonItem>>({
    type: 'card',
    name: '',
    set: '',
    cardNumber: '',
    rarity: 'Common',
    marketPrice: 0,
    collectrPrice: null,
    investedPrice: undefined,
    imageUrl: '',
    quantity: 1,
    condition: 'NM',
    notes: '',
    language: 'Inglés'
  });

  // Scanner State
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-capture loop
  useEffect(() => {
    if (cameraActive && autoDetectEnabled && !isSearching && !capturedImage) {
      scanIntervalRef.current = setInterval(() => {
        if (!isSearching && cameraActive) {
          autoCapture();
        }
      }, 3000); // Try every 3 seconds
    } else {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    }
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [cameraActive, autoDetectEnabled, isSearching, capturedImage]);

  const autoCapture = () => {
    if (!videoRef.current || !canvasRef.current || isSearching) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // Lower quality for faster detection
      analyzeItem(dataUrl, true); // true indicates auto-capture
    }
  };

  // Scanner Handlers
  const startCamera = async () => {
    try {
      setScanError(null);
      setCapturedImage(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setScanError("No se pudo acceder a la cámara. Revisa los permisos.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(dataUrl);
      stopCamera();
      analyzeItem(dataUrl);
    }
  };

  const analyzeItem = async (imageData: string, isAuto = false) => {
    if (isAuto && isSearching) return;
    setIsSearching(true);
    setScanError(null);
    if (!isAuto) setCapturedImage(imageData);
    
    try {
      const res = await fetch('/api/pokemon/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
      });
      
      if (!res.ok) throw new Error("Error en el análisis");
      const data = await res.json();
      
      if (data.name) {
        setEditingItem({
          type: data.type || 'card',
          name: data.name,
          set: data.set,
          cardNumber: data.cardNumber || '',
          rarity: data.rarity || 'Common',
          marketPrice: (data.collectrPrice || 0) * (usdtRate || 4000),
          collectrPrice: data.collectrPrice || null,
          imageUrl: data.imageUrl || '',
          quantity: 1,
          condition: data.type === 'sealed' ? 'Sealed' : 'NM',
          language: data.language || 'Inglés'
        });
        setIsScanOpen(false);
        setIsResultOpen(true);
        stopCamera();
      } else if (!isAuto) {
        setScanError("No se pudo identificar el item. Intenta con una foto más clara.");
      }
    } catch (err) {
      if (!isAuto) setScanError("Error de conexión con el servidor de IA.");
    } finally {
      setIsSearching(false);
    }
  };

  // Subscribe to real-time Pokemon Inventory in Firestore
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'pokemon_inventory'),
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as PokemonItem[];
        setInventory(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error reading pokemon inventory:", err);
        setError("Error al conectar con Firestore. Revisa permisos.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Set Options for filters
  const uniqueSets = useMemo(() => {
    const sets = new Set<string>();
    inventory.forEach(item => {
      if (item.set) sets.add(item.set);
    });
    return Array.from(sets).sort();
  }, [inventory]);

  // Language options for filters
  const uniqueLanguages = useMemo(() => {
    const langs = new Set<string>();
    inventory.forEach(item => {
      langs.add(item.language || 'Inglés');
    });
    return Array.from(langs).sort();
  }, [inventory]);

  // Compute stats
  const stats = useMemo(() => {
    let totalQty = 0;
    let totalUsd = 0;
    let cardsQty = 0;
    let sealedQty = 0;
    let totalInvestedUsd = 0;
    let totalCurrentValueForROI = 0;
    let totalInvestedValueForROI = 0;

    inventory.forEach((item) => {
      totalQty += item.quantity;
      totalUsd += (item.marketPrice || 0) * item.quantity;
      
      const invested = Number(item.investedPrice) || 0;
      if (invested > 0) {
        totalInvestedUsd += invested * item.quantity;
        totalInvestedValueForROI += invested * item.quantity;
        totalCurrentValueForROI += (item.marketPrice || 0) * item.quantity;
      }

      if (item.type === 'card') {
        cardsQty += item.quantity;
      } else {
        sealedQty += item.quantity;
      }
    });

    const totalCop = totalUsd * usdtRate;
    const totalInvestedCop = totalInvestedUsd * usdtRate;
    const roiPct = totalInvestedValueForROI > 0 ? ((totalCurrentValueForROI - totalInvestedValueForROI) / totalInvestedValueForROI) * 100 : 0;
    const totalGainLossUsd = totalCurrentValueForROI - totalInvestedValueForROI;

    return {
      totalQty,
      totalUsd,
      totalCop,
      cardsQty,
      sealedQty,
      uniqueCount: inventory.length,
      totalInvestedUsd,
      totalInvestedCop,
      roiPct,
      totalGainLossUsd
    };
  }, [inventory, usdtRate]);

  // Chart data
  const categoryChartData = useMemo(() => {
    let cardsValue = 0;
    let sealedValue = 0;

    inventory.forEach((item) => {
      const val = (item.marketPrice || 0) * item.quantity;
      if (item.type === 'card') cardsValue += val;
      else sealedValue += val;
    });

    return [
      { name: 'Cartas Sueltas', value: Math.round(cardsValue), valueCop: Math.round(cardsValue * usdtRate) },
      { name: 'Producto Sellado', value: Math.round(sealedValue), valueCop: Math.round(sealedValue * usdtRate) }
    ];
  }, [inventory, usdtRate]);

  const topItemsChartData = useMemo(() => {
    return [...inventory]
      .sort((a, b) => ((b.marketPrice || 0) * b.quantity) - ((a.marketPrice || 0) * a.quantity))
      .slice(0, 5)
      .map(item => ({
        name: item.name.length > 15 ? `${item.name.substring(0, 15)}...` : item.name,
        valorUSD: Math.round((item.marketPrice || 0) * item.quantity),
        valorCOP: Math.round((item.marketPrice || 0) * item.quantity * usdtRate)
      }));
  }, [inventory, usdtRate]);

  // Handle Search, Sort, Filter
  const filteredInventory = useMemo(() => {
    return [...inventory]
      .filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
          item.set.toLowerCase().includes(search.toLowerCase()) ||
          (item.cardNumber && item.cardNumber.toLowerCase().includes(search.toLowerCase()));
        
        const matchesType = filterType === 'all' || item.type === filterType;
        const matchesSet = filterSet === 'all' || item.set === filterSet;
        const matchesLanguage = filterLanguage === 'all' || (item.language || 'Inglés') === filterLanguage;

        return matchesSearch && matchesType && matchesSet && matchesLanguage;
      })
      .sort((a, b) => {
        if (sortBy === 'price_desc') return (b.marketPrice || 0) - (a.marketPrice || 0);
        if (sortBy === 'price_asc') return (a.marketPrice || 0) - (b.marketPrice || 0);
        if (sortBy === 'qty_desc') return b.quantity - a.quantity;
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [inventory, search, filterType, filterSet, filterLanguage, sortBy]);

  // Live Camera Handlers
  // Save Inventory Item
  const handleSaveItem = async () => {
    if (!editingItem.name || !editingItem.set) {
      alert("El nombre y el set son obligatorios.");
      return;
    }

    try {
      const id = editingItem.id || Math.random().toString(36).substr(2, 9);
      const docRef = doc(db, 'pokemon_inventory', id);
      
      const payload: PokemonItem = {
        id,
        type: editingItem.type || 'card',
        name: editingItem.name,
        set: editingItem.set,
        cardNumber: editingItem.cardNumber || '',
        rarity: editingItem.rarity || '',
        marketPrice: Number(editingItem.marketPrice) || 0,
        collectrPrice: editingItem.collectrPrice !== undefined && editingItem.collectrPrice !== null ? Number(editingItem.collectrPrice) : null,
        investedPrice: (editingItem.investedPrice !== undefined && editingItem.investedPrice !== null && editingItem.investedPrice !== '') ? Number(editingItem.investedPrice) : null,
        imageUrl: editingItem.imageUrl || '',
        quantity: Number(editingItem.quantity) || 1,
        condition: editingItem.condition || 'NM',
        notes: editingItem.notes || '',
        language: editingItem.language || 'Inglés',
        dateAdded: editingItem.dateAdded || new Date().toISOString().split('T')[0]
      };

      await setDoc(docRef, payload, { merge: true });

      // ALSO sync with the main 'products' collection for global dashboard visibility
      try {
        const productRef = doc(db, 'products', id);
        await setDoc(productRef, {
          id,
          name: payload.name,
          category: 'POKEMON TCG',
          purchasePrice: payload.investedPrice || 0,
          salePrice: payload.marketPrice || 0,
          status: payload.quantity > 0 ? 'stock' : 'out_of_stock',
          quantity: payload.quantity,
          purchaseDate: payload.dateAdded || new Date().toISOString().split('T')[0],
          investor: 'Duvan', // Default investor for Pokemon items
          description: `${payload.set} - ${payload.cardNumber} (${payload.condition}) - ${payload.notes}`,
          images: payload.imageUrl ? [payload.imageUrl] : [],
          warrantyMonths: 0,
          warrantyExpiration: '',
          warrantyTerms: 'Sin garantía por categoría Pokemon TCG'
        }, { merge: true });
      } catch (syncErr) {
        console.error("Failed to sync with main products collection:", syncErr);
      }

      setIsResultOpen(false);
      // Reset editing item
      setEditingItem({
        type: 'card',
        name: '',
        set: '',
        cardNumber: '',
        rarity: 'Common',
        marketPrice: 0,
        collectrPrice: null,
        investedPrice: undefined,
        imageUrl: '',
        quantity: 1,
        condition: 'NM',
        notes: '',
        language: 'Inglés'
      });
    } catch (err: any) {
      console.error("Error saving to Firestore:", err);
      alert(`No se pudo guardar: ${err.message}`);
    }
  };

  // Quantity updates
  const handleUpdateQty = async (item: PokemonItem, change: number) => {
    const newQty = item.quantity + change;
    if (newQty <= 0) {
      setDeleteConfirmation({ id: item.id, name: item.name });
      return;
    }
    try {
      await updateDoc(doc(db, 'pokemon_inventory', item.id), { quantity: newQty });
    } catch (err: any) {
      console.error("Error updating quantity:", err);
      setError("No se pudo actualizar la cantidad. Revisa tus permisos.");
    }
  };

  // Delete item
  const handleDeleteItem = (id: string, name: string) => {
    setDeleteConfirmation({ id, name });
  };

  // Confirmed Delete in custom modal
  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    const { id, name } = deleteConfirmation;
    try {
      await deleteDoc(doc(db, 'pokemon_inventory', id));
      setDeleteConfirmation(null);
    } catch (err: any) {
      console.error("Error deleting item:", err);
      setError(`No se pudo eliminar el artículo "${name}". Revisa tus permisos.`);
      setDeleteConfirmation(null);
    }
  };

  const handleEditClick = (item: PokemonItem) => {
    setPreviewError(false);
    setEditingItem({ ...item });
    let base = item.marketPrice || 0;
    if (item.language === 'Español' && base > 0) {
      base = base / 0.65;
    } else if (item.language === 'Japonés' && base > 0) {
      base = base / 0.80;
    } else if (item.language === 'Coreano' && base > 0) {
      base = base / 0.45;
    } else if (item.language === 'Chino' && base > 0) {
      base = base / 0.50;
    } else if (['Alemán', 'Francés', 'Italiano', 'Portugués'].includes(item.language || '') && base > 0) {
      base = base / 0.75;
    }
    setOriginalEnglishPrice(base || 0);
    setIsResultOpen(true);
  };

  const handleExportCSV = () => {
    if (inventory.length === 0) {
      alert("No hay artículos para exportar.");
      return;
    }
    const headers = ["ID", "Tipo", "Nombre", "Set", "Numero de Carta", "Rareza", "Idioma", "Condicion", "Cantidad", "Precio Sugerido (USD)", "Inversion (USD)", "Notas", "Fecha de Adicion"];
    const rows = inventory.map(item => [
      item.id,
      item.type === 'card' ? 'Carta' : 'Producto Sellado',
      item.name.replace(/"/g, '""'),
      item.set.replace(/"/g, '""'),
      item.cardNumber || '',
      item.rarity || '',
      item.language || 'Inglés',
      item.condition,
      item.quantity,
      item.marketPrice,
      item.investedPrice || '',
      (item.notes || '').replace(/"/g, '""'),
      item.dateAdded
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pokemon_tcg_inventario_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Title & Top Scan CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
            <Coins className="w-6 h-6 text-yellow-500 animate-pulse" /> Pokémon TCG Hub
          </h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
            Gestión Profesional de Colecciones y Valuación Manual / MonPrice
          </p>
        </div>
         <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline"
            onClick={handleExportCSV}
            className="border-dashed border-border text-foreground hover:bg-muted font-bold text-xs uppercase tracking-wider h-10 px-3 flex items-center gap-2"
            title="Exportar base de datos a formato Excel/CSV"
          >
            <Upload className="w-3.5 h-3.5" /> Exportar CSV
          </Button>
          <Button 
            variant="outline"
            onClick={() => setIsScanOpen(true)}
            className="bg-slate-900 text-white hover:bg-slate-800 font-black text-xs uppercase tracking-tighter h-10 px-4 flex items-center gap-2 shadow-lg shadow-slate-900/20 group animate-in slide-in-from-right duration-500"
          >
            <div className="relative">
              <Smartphone className="w-4 h-4" />
              <Sparkles className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 text-yellow-400 animate-pulse" />
            </div>
            Scandex AI
          </Button>
          <Button 
            variant="outline"
            onClick={() => setIsMonPriceOpen(true)}
            className="border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/10 font-bold text-xs uppercase tracking-wider h-10 px-3 flex items-center gap-2 shadow-sm"
            title="Importar precios desde MonPrice (JSON/CSV)"
          >
            <RefreshCw className="w-3.5 h-3.5" /> 
            Importar MonPrice
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              setPreviewError(false);
              setEditingItem({
                type: 'card',
                name: '',
                set: '',
                cardNumber: '',
                rarity: 'Common',
                marketPrice: 0,
                imageUrl: '',
                quantity: 1,
                condition: 'NM',
                notes: '',
                dateAdded: new Date().toISOString().split('T')[0]
              });
              setIsResultOpen(true);
            }}
            className="font-bold text-xs uppercase tracking-wider h-10"
          >
            Agregar Manual
          </Button>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="border-none shadow-sm bg-card xs:col-span-1">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100  rounded-xl text-blue-600  shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Total de Artículos</p>
              <h3 className="text-lg sm:text-xl font-black mt-1">{stats.totalQty} unidades</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stats.uniqueCount} referencias</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card xs:col-span-1">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-yellow-100  rounded-xl text-yellow-600  shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Valor Colección (USD)</p>
              <h3 className="text-lg sm:text-xl font-black mt-1 text-yellow-600">
                ${stats.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Valuación basada en mercado</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card bg-emerald-50/20  xs:col-span-1">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-100  rounded-xl text-emerald-600  shrink-0">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-emerald-600/80  uppercase tracking-wider">Valor Equiv. (COP)</p>
              <h3 className="text-lg sm:text-xl font-black mt-1 text-emerald-600 ">{fmt(stats.totalCop)}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Tasa USDT: {fmt(usdtRate)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card bg-blue-50/20  xs:col-span-1">
          <CardContent className="p-4 flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-xl shrink-0",
              stats.totalInvestedUsd > 0 
                ? (stats.roiPct >= 0 ? "bg-emerald-100  text-emerald-600 " : "bg-rose-100  text-rose-600 ")
                : "bg-blue-100  text-blue-600 "
            )}>
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Inversión y ROI</p>
              {stats.totalInvestedUsd > 0 ? (
                <>
                  <h3 className="text-lg sm:text-xl font-black mt-1 text-foreground">
                    ${stats.totalInvestedUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-wider px-1 py-0.5 rounded",
                      stats.roiPct >= 0 ? "bg-emerald-500/10 text-emerald-600 " : "bg-rose-500/10 text-rose-600 "
                    )}>
                      {stats.roiPct >= 0 ? '+' : ''}{stats.roiPct.toFixed(0)}%
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono">
                      ({stats.totalGainLossUsd >= 0 ? '+' : ''}${stats.totalGainLossUsd.toFixed(0)})
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg sm:text-xl font-black mt-1 text-muted-foreground">$0.00</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Sin registro de inversión</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card xs:col-span-2 lg:col-span-1">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-slate-100  rounded-xl text-slate-600 shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Distribución</p>
              <h3 className="text-lg sm:text-xl font-black mt-1">{stats.cardsQty} cartas / {stats.sealedQty} sellados</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Cartas individuales vs Cajas/ETBs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics */}
      {inventory.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recharts Pie Chart (Category value split) */}
          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">Distribución de Valor por Categoría</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`$${value.toLocaleString()} USD (${fmt(Number(value) * usdtRate)})`, 'Valor Estimado']}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Valued Items Bar Chart */}
          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">Top 5 Artículos más Valiosos (USD)</CardTitle>
            </CardHeader>
            <CardContent className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItemsChartData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={80} 
                    style={{ fontSize: '9px' }} 
                    tickFormatter={(val) => val && val.length > 12 ? `${val.substring(0, 10)}...` : val} 
                  />
                  <Tooltip 
                    formatter={(value: any) => [`$${value} USD`, 'Valor Total']}
                  />
                  <Bar dataKey="valorUSD" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                    {topItemsChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Inventory Filter and View */}
      <Card className="border-none shadow-sm bg-card">
        <CardHeader className="pb-4 border-b border-border/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Inventario Pokémon TCG
            </CardTitle>
            <CardDescription className="text-xs">
              Muestra el listado de tus cartas, cajas de entrenador élite, estuches de colección y más.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode */}
            <div className="flex border border-border rounded-lg overflow-hidden bg-background">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 rounded-none px-3"
              >
                <Grid className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8 rounded-none px-3"
              >
                <List className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, set..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 text-xs font-bold uppercase"
              />
            </div>

            <div>
              <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                <SelectTrigger className="h-10 text-xs font-bold uppercase bg-background">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-bold uppercase">Categorías (Todas)</SelectItem>
                  <SelectItem value="card" className="text-xs font-bold uppercase">Cartas Sueltas</SelectItem>
                  <SelectItem value="sealed" className="text-xs font-bold uppercase">Producto Sellado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={filterSet} onValueChange={setFilterSet}>
                <SelectTrigger className="h-10 text-xs font-bold uppercase bg-background">
                  <SelectValue placeholder="Expansión (Set)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-bold uppercase">Sets (Todos)</SelectItem>
                  {uniqueSets.map(s => (
                    <SelectItem key={s} value={s} className="text-xs font-bold uppercase">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                <SelectTrigger className="h-10 text-xs font-bold uppercase bg-background">
                  <SelectValue placeholder="Idioma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-bold uppercase">Idiomas (Todos)</SelectItem>
                  {uniqueLanguages.map(l => (
                    <SelectItem key={l} value={l} className="text-xs font-bold uppercase">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="h-10 text-xs font-bold uppercase bg-background">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price_desc" className="text-xs font-bold uppercase">Precio: Alto a Bajo</SelectItem>
                  <SelectItem value="price_asc" className="text-xs font-bold uppercase">Precio: Bajo a Alto</SelectItem>
                  <SelectItem value="qty_desc" className="text-xs font-bold uppercase">Cantidad: Mayor Primero</SelectItem>
                  <SelectItem value="name_asc" className="text-xs font-bold uppercase">Nombre: A - Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear filters trigger */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch('');
                  setFilterType('all');
                  setFilterSet('all');
                  setFilterLanguage('all');
                  setSortBy('price_desc');
                }}
                className="w-full text-xs font-bold uppercase border border-border h-10"
              >
                Limpiar
              </Button>
            </div>
          </div>

          {/* Loading and empty states */}
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <RefreshCw className="w-8 h-8 animate-spin text-yellow-500" />
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sincronizando Cartas Pokémon...</p>
            </div>
          )}

          {!loading && filteredInventory.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-border rounded-xl">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black uppercase tracking-tight">Sin Artículos Pokémon</h3>
              <p className="text-muted-foreground text-xs mt-1 max-w-sm mx-auto uppercase">
                Usa el botón de escaneo con IA o agrega manualmente para empezar a armar tu portafolio.
              </p>
            </div>
          )}

          {/* Grid View */}
          {!loading && viewMode === 'grid' && filteredInventory.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredInventory.map((item) => {
                const itemTotalUsd = (item.marketPrice || 0) * item.quantity;
                const itemTotalCop = itemTotalUsd * usdtRate;

                return (
                  <div 
                    key={item.id} 
                    className={cn(
                      "group relative bg-background border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col",
                      getRarityGlowClass(item.rarity) || "hover:border-yellow-500/50",
                      item.type === 'card' && (item.rarity?.toLowerCase().includes('holo') || item.rarity?.toLowerCase().includes('rare') || item.rarity?.toLowerCase().includes('secret') || item.rarity?.toLowerCase().includes('sir') || item.rarity?.toLowerCase().includes('ex') || item.rarity?.toLowerCase().includes('vstar') || item.rarity?.toLowerCase().includes('gallery') || item.rarity?.toLowerCase().includes('illustration')) && "pokemon-holo-card"
                    )}
                  >
                    {/* Touch-Friendly Edit/Delete Controls for Mobile */}
                    <div className="absolute top-2 right-2 z-10 flex gap-1 sm:hidden">
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        onClick={() => handleEditClick(item)}
                        className="h-7 w-7 rounded-full bg-background/90 text-foreground border border-border shadow-sm"
                      >
                        <Edit className="w-3 h-3 text-slate-700 " />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="destructive"
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="h-7 w-7 rounded-full bg-rose-600/90 text-white shadow-sm"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Badge */}
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 max-w-[65%]">
                      <Badge className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5",
                        item.type === 'sealed' ? 'bg-indigo-600 text-white' : 'bg-yellow-500 text-slate-900'
                      )}>
                        {item.type === 'sealed' ? 'Producto Sellado' : 'Carta'}
                      </Badge>
                      <div className="flex gap-1 flex-wrap">
                        {item.condition && (
                          <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-background/90 text-foreground">
                            {item.condition}
                          </Badge>
                        )}
                        <Badge className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-600 text-white border-none">
                          {item.language || 'Inglés'}
                        </Badge>
                      </div>
                    </div>

                    {/* Image Area */}
                    <div className="relative aspect-[3/4] bg-muted/20 flex items-center justify-center p-2 overflow-hidden border-b border-border/50">
                      <PokemonImage 
                        src={item.imageUrl} 
                        name={item.name} 
                        set={item.set} 
                        type={item.type} 
                        cardNumber={item.cardNumber} 
                        className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* Hover controls overlay */}
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all duration-200">
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          onClick={() => handleEditClick(item)}
                          className="h-8 w-8 rounded-full bg-white text-slate-900 hover:bg-slate-100"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="destructive"
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          className="h-8 w-8 rounded-full"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Meta info & values */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider line-clamp-1">{item.set}</p>
                        <h4 className="text-xs font-black uppercase mt-0.5 text-foreground leading-tight line-clamp-2 h-8" title={item.name}>
                          {item.name}
                        </h4>
                        {item.cardNumber && (
                          <p className="text-[9px] text-muted-foreground font-mono mt-0.5">#{item.cardNumber}</p>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground font-bold uppercase">Precio Unit.</span>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-0.5">Market Prices</span>
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-xs font-black text-foreground">${(item.marketPrice || 0).toFixed(2)} USD</span>
                              {item.collectrPrice ? (
                                <span className="text-[10px] font-black text-indigo-500">${item.collectrPrice.toFixed(2)} (C)</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        {item.investedPrice ? (
                          <>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[10px] text-muted-foreground font-bold uppercase">Inversión U.</span>
                              <span className="text-xs font-bold text-blue-500">${item.investedPrice.toFixed(2)} USD</span>
                            </div>
                            {item.quantity > 1 && (
                              <div className="flex items-center justify-between mt-0.5">
                                <span className="text-[10px] text-muted-foreground font-bold uppercase">Inversión Total</span>
                                <span className="text-xs font-bold text-blue-600">${(item.investedPrice * item.quantity).toFixed(2)} USD</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-[10px] text-muted-foreground font-bold uppercase">ROI Est.</span>
                              <span className={cn(
                                "text-xs font-black",
                                (item.marketPrice || 0) >= item.investedPrice ? "text-emerald-500" : "text-rose-500"
                              )}>
                                {(item.marketPrice || 0) >= item.investedPrice ? '+' : ''}
                                {((((item.marketPrice || 0) - item.investedPrice) / item.investedPrice) * 100).toFixed(0)}%
                              </span>
                            </div>
                          </>
                        ) : null}
                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/30">
                          <span className="text-[10px] text-muted-foreground font-bold uppercase">Valor Total</span>
                          <span className="text-xs font-black text-amber-600">${((item.marketPrice || 0) * item.quantity).toFixed(2)} USD</span>
                        </div>
                        <div className="text-[10px] text-right font-bold text-emerald-600 mt-0.5">{fmt((item.marketPrice || 0) * item.quantity * usdtRate)}</div>
                      </div>
                    </div>

                    {/* Quantity Selector footer */}
                    <div className="px-3 pb-3 pt-1 flex items-center justify-between border-t border-border/30 bg-muted/15">
                      <span className="text-[10px] text-muted-foreground font-black uppercase">Cant:</span>
                      <div className="flex items-center gap-2 border border-border bg-background rounded-full p-0.5">
                        <button 
                          onClick={() => handleUpdateQty(item, -1)}
                          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-black font-mono w-6 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => handleUpdateQty(item, 1)}
                          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table View */}
          {!loading && viewMode === 'table' && filteredInventory.length > 0 && (
            <div className="rounded-lg border border-border overflow-x-auto w-full">
              <Table className="min-w-[1000px]">
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-border">
                    <TableHead className="w-16">Item</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-foreground">Nombre</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-foreground">Set</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-foreground">Idioma</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-foreground">Estado</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-foreground text-center">Cant</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-foreground text-right">Inv. Unit. (USD)</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-foreground text-right">Inv. Total (USD)</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-foreground text-right">Precio USD</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-foreground text-right">Valor Total USD</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-foreground text-right">Valor Total COP</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-foreground text-right">ROI</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((item) => {
                    const itemTotalUsd = (item.marketPrice || 0) * item.quantity;
                    const itemTotalCop = itemTotalUsd * usdtRate;

                    return (
                      <TableRow key={item.id} className="border-border hover:bg-muted/10">
                        <TableCell className="p-2">
                          <div className="w-12 h-16 bg-muted/20 flex items-center justify-center p-1 rounded border border-border/50 overflow-hidden">
                            <PokemonImage 
                              src={item.imageUrl} 
                              name={item.name} 
                              set={item.set} 
                              type={item.type} 
                              cardNumber={item.cardNumber} 
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="font-black text-xs uppercase text-foreground">{item.name}</div>
                          {item.cardNumber && <div className="text-[10px] text-muted-foreground font-mono mt-0.5">#{item.cardNumber}</div>}
                          {item.rarity && <div className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{item.rarity}</div>}
                        </TableCell>
                        <TableCell className="text-xs font-black text-muted-foreground uppercase py-4">{item.set}</TableCell>
                        <TableCell className="py-4">
                          <Badge className="text-[9px] font-black uppercase px-2 py-0.5 bg-blue-600 text-white border-none">
                            {item.language || 'Inglés'}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant="outline" className="text-[9px] font-black uppercase px-2 py-0.5">
                            {item.condition}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button 
                              onClick={() => handleUpdateQty(item, -1)}
                              className="w-5 h-5 flex items-center justify-center rounded-full border border-border hover:bg-muted text-muted-foreground transition-colors"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="text-xs font-black font-mono w-6 text-center">{item.quantity}</span>
                            <button 
                              onClick={() => handleUpdateQty(item, 1)}
                              className="w-5 h-5 flex items-center justify-center rounded-full border border-border hover:bg-muted text-muted-foreground transition-colors"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-right py-4 text-blue-500 font-bold">
                          {item.investedPrice ? `$${item.investedPrice.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-right py-4 text-blue-600 font-bold">
                          {item.investedPrice ? `$${(item.investedPrice * item.quantity).toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-xs font-black font-mono text-right py-4">
                          <div className="flex flex-col items-end gap-0.5">
                            <span>${(item.marketPrice || 0).toFixed(2)}</span>
                            {item.collectrPrice ? (
                              <span className="text-[10px] text-indigo-500 font-bold">${item.collectrPrice.toFixed(2)} (C)</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-black font-mono text-amber-600 text-right py-4">
                          ${((item.marketPrice || 0) * item.quantity).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs font-black font-mono text-emerald-600 text-right py-4">
                          {fmt((item.marketPrice || 0) * item.quantity * usdtRate)}
                        </TableCell>
                        <TableCell className="text-xs font-bold font-mono text-right py-4">
                          {item.investedPrice ? (
                            <span className={cn(
                              (item.marketPrice || 0) >= item.investedPrice ? "text-emerald-500" : "text-rose-500"
                            )}>
                              {(item.marketPrice || 0) >= item.investedPrice ? '+' : ''}
                              {((((item.marketPrice || 0) - item.investedPrice) / item.investedPrice) * 100).toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="p-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handleEditClick(item)}
                              className="h-8 w-8 text-foreground"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Summary Totals Table Row */}
                  <TableRow className="bg-muted/20 font-black border-t-2 border-border">
                    <TableCell colSpan={5} className="text-right py-4 text-xs font-black uppercase text-muted-foreground">
                      Valuación Total Inventario Pokémon:
                    </TableCell>
                    <TableCell className="text-center py-4 font-mono text-xs font-black">
                      {stats.totalQty} unds
                    </TableCell>
                    <TableCell className="py-4" />
                    <TableCell className="text-right py-4 font-mono text-xs text-blue-500 font-black">
                      {stats.totalInvestedUsd > 0 ? `$${stats.totalInvestedUsd.toFixed(2)}` : ''}
                    </TableCell>
                    <TableCell className="py-4" />
                    <TableCell className="text-right py-4 font-mono text-sm text-amber-600 font-black">
                      ${stats.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </TableCell>
                    <TableCell className="text-right py-4 font-mono text-sm text-emerald-600 font-black">
                      {fmt(stats.totalCop)}
                    </TableCell>
                    <TableCell className="text-right py-4 font-mono text-xs">
                      {stats.roiPct !== 0 ? (
                        <span className={cn(
                          "font-black text-xs",
                          stats.roiPct >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {stats.roiPct >= 0 ? '+' : ''}{stats.roiPct.toFixed(0)}%
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="py-4" />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual / Scan Edit result Dialog */}
      <Dialog open={isResultOpen} onOpenChange={setIsResultOpen}>
        <DialogContent className="max-w-lg bg-card border-none shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-yellow-500" /> Detalle del Artículo Pokémon
            </DialogTitle>
            <DialogDescription className="text-xs uppercase font-bold tracking-wide">
              Confirma los datos identificados o introduce los valores para registrar en el inventario.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Split layout: Photo / Data inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Photo Art preview input */}
              <div className="sm:col-span-1 flex flex-col items-center gap-2">
                <Label className="text-xs font-black uppercase text-muted-foreground">Vista Previa</Label>
                <div className="w-full aspect-[3/4] bg-muted/20 border border-border rounded-xl p-2 flex items-center justify-center overflow-hidden">
                  <img 
                    src={convertDirectImageUrl(editingItem.imageUrl || 'https://images.pokemontcg.io/logo.png')} 
                    alt="Preview" 
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.pokemontcg.io/logo.png';
                      if (editingItem.imageUrl) {
                        setPreviewError(true);
                      }
                    }}
                  />
                </div>
                <Input 
                  placeholder="URL de imagen alterna"
                  value={editingItem.imageUrl || ''}
                  onChange={(e) => {
                    const converted = convertDirectImageUrl(e.target.value);
                    setPreviewError(false);
                    setEditingItem(prev => ({ ...prev, imageUrl: converted }));
                  }}
                  className="h-8 text-[10px] mt-1 text-center font-mono bg-background"
                />
                {previewError && editingItem.imageUrl && (
                  <p className="text-[9px] font-bold text-rose-500 uppercase mt-1 leading-tight text-center">
                    ⚠️ Error de carga. Usa un enlace directo (que termine en .png, .jpg o .webp).
                  </p>
                )}
                {!previewError && editingItem.imageUrl && editingItem.imageUrl.includes('googleusercontent.com') && (
                  <p className="text-[9px] font-bold text-emerald-500 uppercase mt-1 leading-tight text-center">
                    ✓ Drive convertido a directo.
                  </p>
                )}
                {!previewError && editingItem.imageUrl && editingItem.imageUrl.includes('i.imgur.com') && (
                  <p className="text-[9px] font-bold text-emerald-500 uppercase mt-1 leading-tight text-center">
                    ✓ Imgur convertido a directo.
                  </p>
                )}
              </div>

              {/* Data Inputs */}
              <div className="sm:col-span-2 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase">Tipo de Producto</Label>
                    <Select 
                      value={editingItem.type} 
                      onValueChange={(val: 'card' | 'sealed') => setEditingItem(prev => ({ ...prev, type: val }))}
                    >
                      <SelectTrigger className="h-8 text-xs font-bold uppercase bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="card" className="text-xs font-bold uppercase">Carta Individual</SelectItem>
                        <SelectItem value="sealed" className="text-xs font-bold uppercase">Producto Sellado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase">Estado / Condición</Label>
                    <Input 
                      placeholder="e.g. NM, LP, Sealed"
                      value={editingItem.condition || ''}
                      onChange={(e) => setEditingItem(prev => ({ ...prev, condition: e.target.value }))}
                      className="h-8 text-xs font-bold uppercase bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase">Nombre Oficial</Label>
                  <Input 
                    placeholder="e.g. Charizard ex"
                    value={editingItem.name || ''}
                    onChange={(e) => setEditingItem(prev => ({ ...prev, name: e.target.value }))}
                    className="h-8 text-xs font-bold uppercase bg-background"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase">Expansión (Set)</Label>
                    <Input 
                      placeholder="e.g. Scarlet & Violet 151"
                      value={editingItem.set || ''}
                      onChange={(e) => setEditingItem(prev => ({ ...prev, set: e.target.value }))}
                      className="h-8 text-xs font-bold uppercase bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase">Número de Carta</Label>
                    <Input 
                      placeholder="e.g. 199/165 (opcional)"
                      value={editingItem.cardNumber || ''}
                      onChange={(e) => setEditingItem(prev => ({ ...prev, cardNumber: e.target.value }))}
                      className="h-8 text-xs font-bold uppercase bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-yellow-600">Precio Sugerido (USD)</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs text-muted-foreground">$</span>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={editingItem.marketPrice || ''}
                        onChange={(e) => setEditingItem(prev => ({ ...prev, marketPrice: Number(e.target.value) }))}
                        className="h-8 text-xs font-bold pl-6 font-mono bg-background text-yellow-600"
                      />
                    </div>
                    {/* Real-time COP conversion display */}
                    {editingItem.marketPrice ? (
                      <p className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5">
                        Equiv: {fmt((editingItem.marketPrice || 0) * usdtRate)}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-indigo-600 ">Precio Collectr (USD)</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs text-muted-foreground">$</span>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={editingItem.collectrPrice !== undefined && editingItem.collectrPrice !== null ? editingItem.collectrPrice : ''}
                        onChange={(e) => setEditingItem(prev => ({ ...prev, collectrPrice: e.target.value ? Number(e.target.value) : null }))}
                        className="h-8 text-xs font-bold pl-6 font-mono bg-background text-indigo-600 "
                      />
                    </div>
                    {editingItem.collectrPrice ? (
                      <p className="text-[9px] font-bold text-indigo-500 uppercase mt-0.5">
                        Equiv: {fmt(editingItem.collectrPrice * usdtRate)}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-blue-500">Valor Invertido U. (USD)</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs text-muted-foreground">$</span>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={editingItem.investedPrice || ''}
                        onChange={(e) => setEditingItem(prev => ({ ...prev, investedPrice: e.target.value ? Number(e.target.value) : undefined }))}
                        className="h-8 text-xs font-bold pl-6 font-mono bg-background text-blue-500"
                      />
                    </div>
                    {editingItem.investedPrice ? (
                      <div className="mt-1 flex flex-col gap-0.5">
                        <p className="text-[9px] font-bold text-emerald-600 uppercase">
                          Equiv. Unit: {fmt(editingItem.investedPrice * usdtRate)}
                        </p>
                        {Number(editingItem.quantity) > 1 && (
                          <p className="text-[9px] font-bold text-blue-500 uppercase">
                            Inv. Total: ${(editingItem.investedPrice * Number(editingItem.quantity)).toFixed(2)} USD ({fmt(editingItem.investedPrice * Number(editingItem.quantity) * usdtRate)})
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase">Cantidad</Label>
                    <Input 
                      type="number" 
                      min="1"
                      placeholder="1"
                      value={editingItem.quantity || ''}
                      onChange={(e) => setEditingItem(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                      className="h-8 text-xs font-bold font-mono bg-background"
                    />
                  </div>
                </div>

                {/* Language adjust helper */}
                {editingItem.language && editingItem.language !== 'Inglés' && originalEnglishPrice > 0 && (
                  <div className="p-2 bg-blue-500/5 rounded border border-blue-500/10 text-[9px] font-bold text-slate-300">
                    <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                      <span className="text-blue-400 font-extrabold uppercase">Ajuste por Idioma ({editingItem.language})</span>
                      <span className="text-slate-400 font-mono">EN Base: ${originalEnglishPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {getLanguagePresets(editingItem.language, originalEnglishPrice).map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setEditingItem(prev => ({ ...prev, marketPrice: Number(preset.price.toFixed(2)) }));
                          }}
                          className="w-full text-left px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[8px] font-black uppercase tracking-wider transition-colors flex items-center justify-between"
                        >
                          <span>{preset.label}</span>
                          <span className="font-mono text-yellow-400">${preset.price.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase">Rarity (Rareza)</Label>
                    <Input 
                      placeholder="e.g. Special Illustration Rare"
                      value={editingItem.rarity || ''}
                      onChange={(e) => setEditingItem(prev => ({ ...prev, rarity: e.target.value }))}
                      className="h-8 text-xs font-bold uppercase bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-blue-600">Idioma (Lenguaje)</Label>
                    <Select 
                      value={editingItem.language || 'Inglés'} 
                      onValueChange={(val) => setEditingItem(prev => ({ ...prev, language: val }))}
                    >
                      <SelectTrigger className="h-8 text-xs font-bold uppercase bg-background">
                        <SelectValue placeholder="Idioma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inglés" className="text-xs font-bold uppercase">Inglés</SelectItem>
                        <SelectItem value="Español" className="text-xs font-bold uppercase">Español</SelectItem>
                        <SelectItem value="Japonés" className="text-xs font-bold uppercase">Japonés</SelectItem>
                        <SelectItem value="Coreano" className="text-xs font-bold uppercase">Coreano</SelectItem>
                        <SelectItem value="Alemán" className="text-xs font-bold uppercase">Alemán</SelectItem>
                        <SelectItem value="Francés" className="text-xs font-bold uppercase">Francés</SelectItem>
                        <SelectItem value="Italiano" className="text-xs font-bold uppercase">Italiano</SelectItem>
                        <SelectItem value="Chino" className="text-xs font-bold uppercase">Chino</SelectItem>
                        <SelectItem value="Portugués" className="text-xs font-bold uppercase">Portugués</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes / Gemini rationale */}
            <div className="space-y-1 mt-2">
              <Label className="text-[10px] font-black uppercase text-slate-500">Notas / Explicación del Análisis</Label>
              <textarea 
                placeholder="Añade notas del coleccionista o detalles adicionales..."
                value={editingItem.notes || ''}
                onChange={(e) => setEditingItem(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full h-20 bg-background border border-border rounded-lg p-2 text-xs font-bold text-slate-600 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsResultOpen(false)}
              className="text-xs font-bold uppercase"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveItem}
              className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 text-xs font-black uppercase tracking-wider"
            >
              Guardar en Inventario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmation} onOpenChange={(open) => !open && setDeleteConfirmation(null)}>
        <DialogContent className="max-w-md bg-card border-none shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 text-rose-500">
              <Trash2 className="w-5 h-5" />
              Eliminar Artículo
            </DialogTitle>
            <DialogDescription className="text-xs uppercase font-bold tracking-wide text-muted-foreground">
              Confirmación de eliminación permanente
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-bold text-foreground">
              ¿Estás seguro de que deseas eliminar permanentemente <span className="text-rose-500">"{deleteConfirmation?.name}"</span> del inventario Pokémon TCG?
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Esta acción no se puede deshacer y el artículo se borrará de forma definitiva de la base de datos de Firestore.
            </p>
          </div>
          <DialogFooter className="gap-3 pt-3 border-t border-border/60 flex-col sm:flex-row">
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirmation(null)}
              className="text-xs font-bold uppercase h-12 sm:h-10"
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmDelete}
              variant="destructive"
              className="text-xs font-black uppercase tracking-wider h-12 sm:h-10 animate-pulse hover:animate-none"
            >
              Eliminar Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* MonPrice Import Dialog */}
      <MonPriceImportDialog 
        open={isMonPriceOpen} 
        onOpenChange={setIsMonPriceOpen} 
        inventory={inventory} 
        onImportComplete={() => {
          // Refetch happens automatically via onSnapshot
          console.log("Importación de MonPrice completada.");
        }}
      />

      {/* AI Scanner Dialog */}
      <Dialog 
        open={isScanOpen} 
        onOpenChange={(open) => {
          setIsScanOpen(open);
          if (!open) stopCamera();
        }}
      >
        <DialogContent className="sm:max-w-md bg-white text-slate-950 border-none shadow-2xl p-0 overflow-hidden rounded-[2rem] max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <DialogHeader className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-indigo-600">
                    <Sparkles className="w-5 h-5" /> SCANDEX AUTO
                  </DialogTitle>
                  <DialogDescription className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                    Detección Automática de Cartas
                  </DialogDescription>
                </div>
                <Badge className="bg-indigo-500/10 text-indigo-600 border-none text-[9px] font-black uppercase">IA ACTIVE</Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {/* Camera Preview / Captured Image */}
              <div className="relative aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-inner group">
                {!capturedImage ? (
                  <>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className={cn("w-full h-full object-cover", !cameraActive && "hidden")}
                    />
                    {!cameraActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600 animate-pulse">
                          <Smartphone className="w-8 h-8" />
                        </div>
                        <Button 
                          onClick={startCamera}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider rounded-full px-6"
                        >
                          Activar Cámara
                        </Button>
                      </div>
                    )}
                    {cameraActive && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        <div className="w-48 h-64 border-2 border-indigo-500/50 rounded-xl relative shadow-[0_0_0_9999px_rgba(255,255,255,0.4)]">
                          <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-indigo-600" />
                          <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-indigo-600" />
                          <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-indigo-600" />
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-indigo-600" />
                          
                          {/* Animated Scan line */}
                          <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,1)] animate-scan-laser-poke" />
                        </div>
                        
                        <div className="mt-4 flex flex-col items-center gap-2">
                          <Badge className="bg-emerald-500 text-white border-none animate-pulse px-3 py-1 text-[10px] font-black uppercase">
                            Escaneando automáticamente...
                          </Badge>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-white/80 px-3 py-1 rounded-full backdrop-blur-sm shadow-sm">
                            Mantén la carta quieta
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <img 
                    src={capturedImage} 
                    alt="Captura" 
                    className="w-full h-full object-cover"
                  />
                )}
                
                {isSearching && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
                    <div className="relative">
                      <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin" />
                      <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-indigo-400 animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black uppercase tracking-tighter text-slate-900">Identificando con IA...</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600/60 mt-1">Detectando set y valor de mercado</p>
                    </div>
                  </div>
                )}
              </div>

              {scanError && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-rose-600 uppercase tracking-tight leading-snug">{scanError}</p>
                </div>
              )}

              <div className="flex gap-3">
                {cameraActive && (
                  <Button 
                    onClick={capturePhoto}
                    disabled={isSearching}
                    className="flex-1 h-14 bg-indigo-600 text-white hover:bg-indigo-700 font-black uppercase tracking-tighter rounded-2xl text-lg shadow-[0_4px_0_rgb(67,56,202)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" /> ESCANEAR AHORA
                  </Button>
                )}
                {!cameraActive && capturedImage && (
                  <Button 
                    onClick={() => {
                      setCapturedImage(null);
                      startCamera();
                    }}
                    disabled={isSearching}
                    variant="outline"
                    className="flex-1 h-12 border-slate-200 hover:bg-slate-50 text-slate-950 font-black uppercase tracking-wider rounded-xl"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" /> Reintentar
                  </Button>
                )}
                <Button 
                  onClick={() => setIsScanOpen(false)}
                  disabled={isSearching}
                  variant="ghost"
                  className="h-12 text-slate-500 hover:text-slate-950 font-bold uppercase tracking-widest px-6"
                >
                  Cerrar
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-2">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Modo Auto</span>
                    <p className="text-[11px] font-medium text-slate-700 leading-tight">La IA detectará la carta automáticamente cada 3 segundos.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
