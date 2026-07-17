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

// Types for Pokemon Inventory
interface PokemonItem {
  id: string;
  type: 'card' | 'sealed'; // card vs sealed product
  name: string;
  set: string;
  cardNumber?: string;
  rarity?: string;
  tcgplayerPrice: number; // in USD
  collectrPrice?: number | null; // in USD (Collectr market price)
  investedPrice?: number | null; // in USD (optional acquisition cost)
  imageUrl: string;
  quantity: number;
  condition: string; // e.g. NM, LP, Sealed, etc.
  notes?: string;
  dateAdded: string;
  language?: string; // e.g. Inglés, Español, Japonés, etc.
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

  // Bulk Price Synchronization States
  const [isSyncingPrices, setIsSyncingPrices] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Filters & UI states
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'card' | 'sealed'>('all');
  const [filterSet, setFilterSet] = useState('all');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [sortBy, setSortBy] = useState<'price_desc' | 'price_asc' | 'qty_desc' | 'name_asc'>('price_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Scanner states
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'text'>('upload');
  const [textQuery, setTextQuery] = useState('');

  // Camera stream refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');

  // Recent scans history (Scandex feature)
  const [scanHistory, setScanHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('scandex_recent_scans');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Keyboard shortcut listener for MacBook Air users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isScanOpen) return;
      
      // Ignore if typing in input/textarea
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.code === 'Space' && activeTab === 'camera' && cameraActive) {
        e.preventDefault();
        capturePhoto();
      } else if (e.code === 'KeyR' && scanPreview) {
        e.preventDefault();
        setScanPreview(null);
        if (activeTab === 'camera') {
          startCamera(cameraFacing);
        }
      } else if (e.code === 'Enter' && scanPreview && !isScanning) {
        e.preventDefault();
        analyzeItem();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScanOpen, activeTab, cameraActive, scanPreview, isScanning, cameraFacing]);

  // Manual & Scan Result Dialog State
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [originalEnglishPrice, setOriginalEnglishPrice] = useState<number>(0);
  const [previewError, setPreviewError] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string } | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<PokemonItem>>({
    type: 'card',
    name: '',
    set: '',
    cardNumber: '',
    rarity: 'Common',
    tcgplayerPrice: 0,
    collectrPrice: null,
    investedPrice: undefined,
    imageUrl: '',
    quantity: 1,
    condition: 'NM',
    notes: '',
    language: 'Inglés'
  });

  // Fetch real-time suggestions as the user types (debounced)
  useEffect(() => {
    if (!textQuery || textQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearchingSuggestions(true);
      try {
        const response = await fetch('/api/pokemon/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: textQuery.trim() })
        });
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
        }
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(delayDebounce);
  }, [textQuery]);

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

  // Handle bulk price sync calling server endpoint
  const handleSyncPrices = async () => {
    if (inventory.length === 0) {
      alert("No hay artículos en el inventario para sincronizar.");
      return;
    }
    
    setIsSyncingPrices(true);
    setSyncStatus("Sincronizando precios...");
    
    try {
      const response = await fetch('/api/pokemon/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: inventory })
      });
      
      if (!response.ok) {
        throw new Error("Error en el servidor al sincronizar precios.");
      }
      
      const { updates } = await response.json();
      
      if (updates && updates.length > 0) {
        setSyncStatus(`Actualizando ${updates.length} artículos...`);
        let count = 0;
        for (const update of updates) {
          try {
            await updateDoc(doc(db, 'pokemon_inventory', update.id), {
              tcgplayerPrice: Number(update.tcgplayerPrice) || 0,
              notes: update.notes || '',
              imageUrl: update.imageUrl || ''
            });
            count++;
          } catch (err) {
            console.error(`Error actualizando artículo ${update.id}:`, err);
          }
        }
        alert(`Sincronización completada: se actualizaron exitosamente ${count} artículos.`);
      } else {
        alert("Sincronización completada: todos los precios están actualizados.");
      }
    } catch (err: any) {
      console.error("Error sincronizando precios:", err);
      alert(`Error al sincronizar precios: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsSyncingPrices(false);
      setSyncStatus(null);
    }
  };

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
      totalUsd += (item.tcgplayerPrice || 0) * item.quantity;
      
      const invested = Number(item.investedPrice) || 0;
      if (invested > 0) {
        totalInvestedUsd += invested * item.quantity;
        totalInvestedValueForROI += invested * item.quantity;
        totalCurrentValueForROI += (item.tcgplayerPrice || 0) * item.quantity;
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
      const val = (item.tcgplayerPrice || 0) * item.quantity;
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
      .sort((a, b) => (b.tcgplayerPrice * b.quantity) - (a.tcgplayerPrice * a.quantity))
      .slice(0, 5)
      .map(item => ({
        name: item.name.length > 15 ? `${item.name.substring(0, 15)}...` : item.name,
        valorUSD: Math.round(item.tcgplayerPrice * item.quantity),
        valorCOP: Math.round(item.tcgplayerPrice * item.quantity * usdtRate)
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
        if (sortBy === 'price_desc') return b.tcgplayerPrice - a.tcgplayerPrice;
        if (sortBy === 'price_asc') return a.tcgplayerPrice - b.tcgplayerPrice;
        if (sortBy === 'qty_desc') return b.quantity - a.quantity;
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [inventory, search, filterType, filterSet, filterLanguage, sortBy]);

  // Live Camera Handlers
  const startCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    setScannerError(null);
    // Stop any existing tracks before launching a new mode
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facing } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn(`Camera access failed for facing: ${facing}, trying fallback.`, err);
      // Fallback to the other facing mode
      try {
        const fallbackFacing = facing === 'environment' ? 'user' : 'environment';
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: fallbackFacing } 
        });
        setCameraFacing(fallbackFacing);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (fallbackErr: any) {
        console.error("Camera access failed completely:", fallbackErr);
        setScannerError("No se pudo acceder a la cámara. Revisa permisos o intenta subir una imagen.");
        setCameraActive(false);
      }
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

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (cameraActive) {
      startCamera(nextFacing);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setScanPreview(dataUrl);
        stopCamera();
      }
    }
  };

  // Convert File to base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScannerError(null);
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScanPreview(reader.result as string);
      };
      reader.onerror = () => {
        setScannerError("Error al leer el archivo.");
      };
      reader.readAsDataURL(file);
    }
  };

  // Quick Add State for scanned items
  const [quickAddedIds, setQuickAddedIds] = useState<Record<string, boolean>>({});

  // Direct collection addition from history list
  const addScannedItemToCollectionDirectly = async (scanId: string, item: any) => {
    try {
      const id = Math.random().toString(36).substr(2, 9);
      const docRef = doc(db, 'pokemon_inventory', id);
      
      const payload: PokemonItem = {
        id,
        type: item.type || 'card',
        name: item.name,
        set: item.set,
        cardNumber: item.cardNumber || '',
        rarity: item.rarity || '',
        tcgplayerPrice: Number(item.tcgplayerPrice) || 0,
        investedPrice: null,
        imageUrl: item.imageUrl || '',
        quantity: 1,
        condition: item.type === 'sealed' ? 'Sealed' : 'NM',
        notes: item.reasoning || '',
        language: item.language || 'Inglés',
        dateAdded: new Date().toISOString().split('T')[0]
      };

      await setDoc(docRef, payload);
      setQuickAddedIds(prev => ({ ...prev, [scanId]: true }));
    } catch (err) {
      console.error("Failed to quick add scanned item:", err);
    }
  };

  // Trigger Gemini Scanner
  const analyzeItem = async () => {
    if (!scanPreview) {
      setScannerError("Por favor toma una foto o sube un archivo.");
      return;
    }

    setIsScanning(true);
    setScannerError(null);

    try {
      // Clean base64 header
      const commaIndex = scanPreview.indexOf(',');
      const base64Data = commaIndex !== -1 ? scanPreview.substring(commaIndex + 1) : scanPreview;
      
      let mimeType = "image/jpeg";
      if (scanPreview.startsWith("data:")) {
        const semiIndex = scanPreview.indexOf(';');
        if (semiIndex !== -1) {
          mimeType = scanPreview.substring(5, semiIndex);
        }
      }

      const response = await fetch('/api/pokemon/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Data, mimeType })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to scan image");
      }

      const result = await response.json();
      const priceVal = result.tcgplayerPrice || 0;
      setOriginalEnglishPrice(priceVal);

      const finalItem: Partial<PokemonItem> = {
        type: result.type || 'card',
        name: result.name || '',
        set: result.set || '',
        cardNumber: result.cardNumber || '',
        rarity: result.rarity || '',
        tcgplayerPrice: priceVal,
        collectrPrice: result.collectrPrice !== undefined && result.collectrPrice !== null ? Number(result.collectrPrice) : null,
        imageUrl: result.suggestedImageUrl || scanPreview, // prefer official suggested art, fallback to scanned pic
        quantity: 1,
        condition: result.type === 'sealed' ? 'Sealed' : 'NM',
        notes: result.reasoning || '',
        language: result.language || 'Inglés'
      };

      setEditingItem(finalItem);

      // Append to recent scans history
      const scanId = Date.now().toString();
      const newScan = {
        id: scanId,
        timestamp: new Date().toISOString(),
        ...finalItem,
        confidenceScore: result.confidenceScore || 0.95
      };

      setScanHistory(prev => {
        const next = [newScan, ...prev].slice(0, 10);
        try {
          localStorage.setItem('scandex_recent_scans', JSON.stringify(next));
        } catch (e) {
          console.error("Failed to write scan history:", e);
        }
        return next;
      });

      setIsScanOpen(false);
      setIsResultOpen(true);
    } catch (err: any) {
      console.error("AI scanning failed:", err);
      setScannerError(`Error de análisis: ${err.message || 'Inténtalo de nuevo'}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Trigger Gemini Text Search
  const analyzeItemByText = async () => {
    if (!textQuery.trim()) {
      setScannerError("Por favor escribe el nombre de la carta o artículo.");
      return;
    }

    setIsScanning(true);
    setScannerError(null);

    try {
      const response = await fetch('/api/pokemon/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textQuery.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to search item");
      }

      const result = await response.json();
      const priceVal = result.tcgplayerPrice || 0;
      setOriginalEnglishPrice(priceVal);

      const finalItem: Partial<PokemonItem> = {
        type: result.type || 'card',
        name: result.name || '',
        set: result.set || '',
        cardNumber: result.cardNumber || '',
        rarity: result.rarity || '',
        tcgplayerPrice: priceVal,
        collectrPrice: result.collectrPrice !== undefined && result.collectrPrice !== null ? Number(result.collectrPrice) : null,
        imageUrl: result.suggestedImageUrl || 'https://images.pokemontcg.io/logo.png',
        quantity: 1,
        condition: result.type === 'sealed' ? 'Sealed' : 'NM',
        notes: result.reasoning || '',
        language: result.language || 'Inglés'
      };

      setEditingItem(finalItem);

      // Append to recent scans history
      const scanId = Date.now().toString();
      const newScan = {
        id: scanId,
        timestamp: new Date().toISOString(),
        ...finalItem,
        confidenceScore: result.confidenceScore || 0.95
      };

      setScanHistory(prev => {
        const next = [newScan, ...prev].slice(0, 10);
        try {
          localStorage.setItem('scandex_recent_scans', JSON.stringify(next));
        } catch (e) {
          console.error("Failed to write scan history:", e);
        }
        return next;
      });

      setIsScanOpen(false);
      setIsResultOpen(true);
      setTextQuery(''); // reset query
    } catch (err: any) {
      console.error("AI text search failed:", err);
      setScannerError(`Error de búsqueda: ${err.message || 'Inténtalo de nuevo'}`);
    } finally {
      setIsScanning(false);
    }
  };

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
        tcgplayerPrice: Number(editingItem.tcgplayerPrice) || 0,
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
      setIsResultOpen(false);
      setScanPreview(null);
      // Reset editing item
      setEditingItem({
        type: 'card',
        name: '',
        set: '',
        cardNumber: '',
        rarity: 'Common',
        tcgplayerPrice: 0,
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
    let base = item.tcgplayerPrice || 0;
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
    const headers = ["ID", "Tipo", "Nombre", "Set", "Numero de Carta", "Rareza", "Idioma", "Condicion", "Cantidad", "Precio TCGplayer (USD)", "Inversion (USD)", "Notas", "Fecha de Adicion"];
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
      item.tcgplayerPrice,
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
            Gestión Profesional de Colecciones y Valuación en tiempo real (TCGplayer)
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
            onClick={handleSyncPrices}
            disabled={isSyncingPrices}
            className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 font-bold text-xs uppercase tracking-wider h-10 px-3 flex items-center gap-2 shadow-sm"
            title="Sincronizar precios de todo el inventario usando APIs e IA"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isSyncingPrices && "animate-spin")} /> 
            {isSyncingPrices ? (syncStatus || "Sincronizando...") : "Sincronizar Precios"}
          </Button>
          <Button 
            onClick={() => {
              setIsScanOpen(true);
              setScanPreview(null);
              setScannerError(null);
            }}
            className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-black uppercase text-xs tracking-wider h-10 px-4 flex items-center gap-2 shadow-lg hover:shadow-yellow-500/25"
          >
            <Sparkles className="w-4 h-4" /> Escanear Carta o Caja
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
                tcgplayerPrice: 0,
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
            <div className="p-3 bg-blue-100 dark:bg-blue-950/50 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
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
            <div className="p-3 bg-yellow-100 dark:bg-yellow-950/50 rounded-xl text-yellow-600 dark:text-yellow-400 shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Valor Colección (USD)</p>
              <h3 className="text-lg sm:text-xl font-black mt-1 text-yellow-600">
                ${stats.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Precios oficiales TCGplayer</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card bg-emerald-50/20 dark:bg-emerald-950/10 xs:col-span-1">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-emerald-600/80 dark:text-emerald-400 uppercase tracking-wider">Valor Equiv. (COP)</p>
              <h3 className="text-lg sm:text-xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{fmt(stats.totalCop)}</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Tasa USDT: {fmt(usdtRate)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-card bg-blue-50/20 dark:bg-blue-950/10 xs:col-span-1">
          <CardContent className="p-4 flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-xl shrink-0",
              stats.totalInvestedUsd > 0 
                ? (stats.roiPct >= 0 ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400")
                : "bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
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
                      stats.roiPct >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
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
            <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl text-slate-600 shrink-0">
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
                const itemTotalUsd = item.tcgplayerPrice * item.quantity;
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
                        <Edit className="w-3 h-3 text-slate-700 dark:text-slate-300" />
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
                              <span className="text-xs font-black text-foreground">${item.tcgplayerPrice.toFixed(2)} USD</span>
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
                                item.tcgplayerPrice >= item.investedPrice ? "text-emerald-500" : "text-rose-500"
                              )}>
                                {item.tcgplayerPrice >= item.investedPrice ? '+' : ''}
                                {(((item.tcgplayerPrice - item.investedPrice) / item.investedPrice) * 100).toFixed(0)}%
                              </span>
                            </div>
                          </>
                        ) : null}
                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/30">
                          <span className="text-[10px] text-muted-foreground font-bold uppercase">Valor Total</span>
                          <span className="text-xs font-black text-amber-600">${itemTotalUsd.toFixed(2)} USD</span>
                        </div>
                        <div className="text-[10px] text-right font-bold text-emerald-600 mt-0.5">{fmt(itemTotalCop)}</div>
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
              <Table>
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
                    const itemTotalUsd = item.tcgplayerPrice * item.quantity;
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
                            <span>${item.tcgplayerPrice.toFixed(2)}</span>
                            {item.collectrPrice ? (
                              <span className="text-[10px] text-indigo-500 font-bold">${item.collectrPrice.toFixed(2)} (C)</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-black font-mono text-amber-600 text-right py-4">
                          ${itemTotalUsd.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs font-black font-mono text-emerald-600 text-right py-4">
                          {fmt(itemTotalCop)}
                        </TableCell>
                        <TableCell className="text-xs font-bold font-mono text-right py-4">
                          {item.investedPrice ? (
                            <span className={item.tcgplayerPrice >= item.investedPrice ? "text-emerald-500" : "text-rose-500"}>
                              {item.tcgplayerPrice >= item.investedPrice ? '+' : ''}
                              {(((item.tcgplayerPrice - item.investedPrice) / item.investedPrice) * 100).toFixed(0)}%
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

      {/* AI scanner Dialog */}
      <Dialog open={isScanOpen} onOpenChange={(open) => {
        setIsScanOpen(open);
        if (!open) stopCamera();
      }}>
        <DialogContent className="max-w-4xl md:max-w-5xl xl:max-w-6xl bg-card border-none shadow-2xl p-4 sm:p-5 md:p-6 overflow-y-auto max-h-[95vh] md:max-h-[90vh]">
          <style>{`
            @keyframes scan-laser {
              0% { top: 4%; opacity: 0.3; }
              50% { top: 96%; opacity: 1; }
              100% { top: 4%; opacity: 0.3; }
            }
            .scandex-laser {
              animation: scan-laser 2.2s infinite ease-in-out;
            }
            @keyframes pulse-ring {
              0% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4); }
              70% { box-shadow: 0 0 0 10px rgba(234, 179, 8, 0); }
              100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0); }
            }
            .scandex-pulse-ring {
              animation: pulse-ring 2s infinite;
            }
          `}</style>

          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-foreground">
                <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500 animate-pulse" /> SCANDEX <span className="text-yellow-500 font-medium text-xs lowercase tracking-normal">by AI Studio</span>
              </span>
              <Badge variant="outline" className="text-[9px] font-black tracking-wider uppercase bg-yellow-500/10 border-yellow-500/30 text-yellow-500 px-2 py-0.5">
                Scanner TCG Pro
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-1">
              Escanea con tu cámara, sube un archivo o busca por texto para valorar tus cartas al instante con TCGplayer.
            </DialogDescription>
          </DialogHeader>

          {/* Grid Layout optimized for Mobile (single col) & MacBook Air (2 columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3">
            
            {/* COLUMN 1: ACTIVE SCANNER INTERFACE (Span 7) */}
            <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
              
              {/* Tabs */}
              <div className="grid grid-cols-3 bg-muted/25 p-1 rounded-xl border border-border/40 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('camera');
                    startCamera(cameraFacing);
                  }}
                  className={cn(
                    "py-2 px-1 text-[9px] min-[375px]:text-[10px] sm:text-xs font-black uppercase tracking-wider text-center rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-1.5",
                    activeTab === 'camera' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-card/45'
                  )}
                >
                  <Camera className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                  <span className="truncate">Cámara</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('upload');
                    stopCamera();
                  }}
                  className={cn(
                    "py-2 px-1 text-[9px] min-[375px]:text-[10px] sm:text-xs font-black uppercase tracking-wider text-center rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-1.5",
                    activeTab === 'upload' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-card/45'
                  )}
                >
                  <Upload className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">Archivo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('text');
                    stopCamera();
                  }}
                  className={cn(
                    "py-2 px-1 text-[9px] min-[375px]:text-[10px] sm:text-xs font-black uppercase tracking-wider text-center rounded-lg transition-all flex items-center justify-center gap-1 sm:gap-1.5",
                    activeTab === 'text' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-card/45'
                  )}
                >
                  <Search className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">Texto</span>
                </button>
              </div>

              {/* TAB CONTENT */}
              <div className="flex-1 flex flex-col justify-center min-h-[250px] sm:min-h-[300px]">
                
                {/* 1. Camera Tab */}
                {activeTab === 'camera' && !scanPreview && (
                  <div className="relative aspect-[4/3] w-full bg-black rounded-xl overflow-hidden border border-border shadow-inner flex flex-col justify-center">
                    {cameraActive ? (
                      <>
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          className="w-full h-full object-cover"
                        />
                        
                        {/* SCANDEX TARGET SCAN GUIDE FRAME: 2:3 card ratio */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/40">
                          <div className="relative w-44 sm:w-52 aspect-[2.5/3.5] rounded-xl border-2 border-yellow-500/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] flex items-center justify-center">
                            
                            {/* Scanning moving laser line */}
                            <div className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent shadow-[0_0_8px_rgba(234,179,8,1)] scandex-laser" />
                            
                            {/* Card position guides corners */}
                            <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-4 border-l-4 border-yellow-400 rounded-tl" />
                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-4 border-r-4 border-yellow-400 rounded-tr" />
                            <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-4 border-l-4 border-yellow-400 rounded-bl" />
                            <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-4 border-r-4 border-yellow-400 rounded-br" />
                            
                            <p className="absolute bottom-2 text-[8px] font-black uppercase text-center w-full text-yellow-400/90 tracking-widest bg-black/60 py-0.5 px-1 rounded">
                              Centrar Carta
                            </p>
                          </div>
                        </div>

                        {/* Camera Floating HUD Overlay controls */}
                        <div className="absolute top-3 right-3 flex flex-col gap-2 pointer-events-auto">
                          <Button 
                            onClick={toggleCameraFacing}
                            size="icon"
                            variant="secondary"
                            className="w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/10 shadow-md backdrop-blur-sm"
                            title="Cambiar Cámara"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Capture HUD bottom */}
                        <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3">
                          <Button 
                            onClick={capturePhoto}
                            size="default"
                            className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 rounded-full font-black uppercase px-6 text-xs h-10 tracking-wider shadow-lg flex items-center gap-2 border-2 border-background scandex-pulse-ring"
                          >
                            <Camera className="w-4 h-4" /> Capturar Carta
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-xs font-bold text-muted-foreground uppercase text-center p-6 space-y-3">
                        <div className="w-12 h-12 bg-muted/10 rounded-full flex items-center justify-center border border-border">
                          <Camera className="w-5 h-5 text-yellow-500/80 animate-pulse" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-foreground font-black">Esperando acceso a la cámara</p>
                          <p className="text-[10px] text-muted-foreground max-w-xs">Concede los permisos en tu navegador para usar el scanner interactivo.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Upload Tab */}
                {activeTab === 'upload' && !scanPreview && (
                  <div className="border-2 border-dashed border-border/80 rounded-xl p-8 text-center bg-muted/10 hover:bg-yellow-500/5 hover:border-yellow-500/40 transition-all cursor-pointer relative min-h-[220px] flex flex-col items-center justify-center">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="w-14 h-14 bg-background rounded-full flex items-center justify-center mb-3 shadow-md text-yellow-500 border border-border">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-black uppercase text-foreground">Arrastra o Selecciona un Archivo</p>
                    <p className="text-[9px] text-muted-foreground uppercase mt-1 max-w-xs leading-relaxed">Soporta JPG y PNG. Ideal si estás en tu Mac Air y tienes fotos en el escritorio.</p>
                    <div className="mt-4 flex gap-1 items-center justify-center">
                      <Badge variant="outline" className="text-[8px] font-mono text-muted-foreground uppercase">Drag & Drop listo</Badge>
                    </div>
                  </div>
                )}

                {/* 3. Text Search Tab */}
                {activeTab === 'text' && (
                  <div className="space-y-3 bg-muted/10 p-5 rounded-xl border border-border">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-black tracking-wider">
                      <Info className="w-3.5 h-3.5 text-yellow-500" />
                      <span>Escribe los detalles para que la IA localice el artículo en TCGplayer</span>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      <div className="relative">
                        <Input
                          placeholder="ej: Charizard ex 199/165, Booster Box 151..."
                          value={textQuery}
                          onChange={(e) => setTextQuery(e.target.value)}
                          className="h-11 text-xs font-bold uppercase placeholder:text-muted-foreground/50 border-border pr-10"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              analyzeItemByText();
                            }
                          }}
                        />
                        {isSearchingSuggestions && (
                          <div className="absolute right-3 top-3.5">
                            <RefreshCw className="w-4 h-4 animate-spin text-yellow-500" />
                          </div>
                        )}

                        {/* Real-time Autocomplete Suggestions Dropdown */}
                        {suggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-12 z-50 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-h-72 overflow-y-auto overflow-x-hidden p-2 space-y-1">
                            <p className="text-[9px] font-black uppercase text-muted-foreground/70 px-2 py-1 tracking-wider border-b border-border/20 mb-1.5 flex items-center justify-between">
                              <span>Sugerencias de Cartas Pokémon</span>
                              <span className="text-[8px] font-bold text-yellow-500 animate-pulse">Selecciona para cargar</span>
                            </p>
                            {suggestions.map((card) => (
                              <button
                                key={card.id}
                                type="button"
                                onClick={() => {
                                  const finalItem: Partial<PokemonItem> = {
                                    type: card.type,
                                    name: card.name,
                                    set: card.set,
                                    cardNumber: card.cardNumber,
                                    rarity: card.rarity,
                                    tcgplayerPrice: card.tcgplayerPrice,
                                    imageUrl: card.imageUrl,
                                    quantity: 1,
                                    condition: card.type === 'sealed' ? 'Sealed' : 'NM',
                                    notes: `Identificado con precisión mediante autocompletado inteligente. Expansión: ${card.set}.`,
                                    language: card.language || 'Inglés'
                                  };
                                  setEditingItem(finalItem);
                                  setOriginalEnglishPrice(card.tcgplayerPrice);
                                  setIsScanOpen(false);
                                  setIsResultOpen(true);
                                  setTextQuery('');
                                  setSuggestions([]);
                                }}
                                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 text-left transition-all border border-transparent hover:border-slate-700 group"
                              >
                                <div className="w-10 h-14 bg-slate-950 rounded border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                                  {card.imageUrl ? (
                                    <img 
                                      src={convertDirectImageUrl(card.imageUrl)} 
                                      alt={card.name} 
                                      className="w-full h-full object-contain transition-transform group-hover:scale-110"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        (e.target as any).src = 'https://images.pokemontcg.io/logo.png';
                                      }}
                                    />
                                  ) : (
                                    <Sparkles className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <p className="text-xs font-black text-white truncate uppercase group-hover:text-yellow-500 transition-colors">
                                      {card.name}
                                    </p>
                                    <span className="text-[10px] font-black text-emerald-400 shrink-0 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                      ${card.tcgplayerPrice?.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[9px] text-slate-400 uppercase font-bold mt-1">
                                    <span className="truncate max-w-[130px] text-slate-200">{card.set}</span>
                                    <span>•</span>
                                    <span className="font-mono text-slate-300">{card.cardNumber}</span>
                                    {card.rarity && (
                                      <>
                                        <span>•</span>
                                        <span className="text-yellow-500 font-extrabold truncate max-w-[100px]">{card.rarity}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 py-1">
                        {['Charizard ex 199/165', 'Pikachu 160/159', 'Mew ex 232/091', 'Gengar VMAX 271/264', '151 Booster Box'].map((suggest) => (
                          <button
                            key={suggest}
                            type="button"
                            onClick={() => setTextQuery(suggest)}
                            className="text-[9px] font-bold uppercase px-2 py-1 rounded bg-muted/50 hover:bg-yellow-500/10 hover:text-yellow-500 transition-all border border-border"
                          >
                            {suggest}
                          </button>
                        ))}
                      </div>
                      <Button
                        onClick={analyzeItemByText}
                        disabled={isScanning}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-black uppercase text-xs h-11 tracking-wider flex items-center justify-center gap-2"
                      >
                        {isScanning ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> Buscando con Gemini...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" /> Buscar con IA TCG
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Captured Preview & Trigger Analysis */}
                {scanPreview && (
                  <div className="space-y-4">
                    <div className="relative aspect-square max-h-60 mx-auto bg-slate-950 rounded-xl overflow-hidden border border-border flex items-center justify-center p-3 shadow-md">
                      <img 
                        src={scanPreview} 
                        alt="Captured preview" 
                        className="max-h-full max-w-full object-contain rounded-lg"
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          setScanPreview(null);
                          if (activeTab === 'camera') startCamera(cameraFacing);
                        }}
                        className="absolute top-2.5 right-2.5 bg-slate-900/90 hover:bg-slate-900 text-white px-3 py-1.5 rounded-full text-[9px] font-black uppercase transition-all border border-white/10 shadow-lg"
                      >
                        Reintentar foto
                      </button>

                      {/* Corner Target Bracket lines for preview */}
                      <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-white/30" />
                      <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-white/30" />
                      <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-white/30" />
                      <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-white/30" />
                    </div>

                    <Button 
                      onClick={analyzeItem}
                      disabled={isScanning}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-black uppercase text-xs h-11 tracking-wider flex items-center justify-center gap-2"
                    >
                      {isScanning ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Analizando con Gemini TCG...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" /> Analizar con Gemini & Consultar Precios
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Helper status text when scanning */}
              {isScanning && (
                <div className="bg-muted/30 border border-border/40 rounded-lg p-3 text-center space-y-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider animate-pulse">
                  {activeTab === 'text' ? (
                    <>
                      <p className="text-yellow-500 font-black flex items-center justify-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Procesando búsqueda...</p>
                      <p className="text-slate-500 text-[9px]">Analizando expansiones y consultando tcgplayer...</p>
                    </>
                  ) : (
                    <>
                      <p className="text-yellow-500 font-black flex items-center justify-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Analizando imagen con IA...</p>
                      <p className="text-slate-500 text-[9px]">Extrayendo nombre de carta, set, número y precios en tiempo real...</p>
                    </>
                  )}
                </div>
              )}

              {/* Shortcuts badge for Mac Air Users */}
              {activeTab === 'camera' && cameraActive && !scanPreview && (
                <div className="hidden sm:flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground uppercase font-black tracking-wide bg-muted/20 p-2 rounded-lg border border-border/40">
                  <Keyboard className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Mac Air Shortcuts:</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-[8px] font-mono">[Espacio]</kbd> Capturar • 
                  <kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-[8px] font-mono">[R]</kbd> Reset • 
                  <kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-[8px] font-mono">[Enter]</kbd> Analizar
                </div>
              )}

              {scannerError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-bold uppercase flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{scannerError}</span>
                </div>
              )}
            </div>

            {/* COLUMN 2: SCANDEX HISTORY / SESSION LOGS (Span 5) */}
            <div className="lg:col-span-5 bg-muted/10 border border-border rounded-xl p-4 flex flex-col h-[380px] lg:h-[460px] min-h-[350px]">
              <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-foreground">Sesión de Escaneo</span>
                </div>
                {scanHistory.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setScanHistory([]);
                      localStorage.removeItem('scandex_recent_scans');
                    }}
                    className="h-6 text-[9px] font-black uppercase text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2"
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Limpiar
                  </Button>
                )}
              </div>

              {/* History scroll log */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 scrollbar-thin">
                {scanHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-muted-foreground border border-border/80">
                      <Smartphone className="w-5 h-5 text-muted-foreground/60" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-foreground">Historial vacío</p>
                      <p className="text-[9px] text-muted-foreground uppercase leading-relaxed max-w-[200px] mx-auto">
                        Toma fotos o busca con IA para registrar cartas en esta sesión.
                      </p>
                    </div>
                  </div>
                ) : (
                  scanHistory.map((item, index) => {
                    const isQuickAdded = quickAddedIds[item.id];
                    return (
                      <div 
                        key={item.id} 
                        className={cn(
                          "p-2.5 rounded-lg border bg-card hover:bg-muted/10 transition-all flex items-center gap-3 relative overflow-hidden group",
                          isQuickAdded ? "border-emerald-500/30 bg-emerald-500/[0.02]" : "border-border"
                        )}
                      >
                        {/* Thumbnail or Ball icon */}
                        <div className="w-12 h-16 bg-muted/30 rounded border border-border flex items-center justify-center overflow-hidden shrink-0">
                          {item.imageUrl ? (
                            <img 
                              src={convertDirectImageUrl(item.imageUrl)} 
                              alt={item.name} 
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="text-lg">⭐</div>
                          )}
                        </div>

                        {/* Card metadata */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-[9px] font-black font-mono text-muted-foreground uppercase">{item.cardNumber || 'Sealed'}</span>
                            <span className="text-[8px] font-black uppercase px-1 rounded bg-blue-100 text-blue-700 text-[8px]">
                              {item.language || 'Inglés'}
                            </span>
                          </div>
                          <h4 className="text-[11px] font-black uppercase tracking-tight text-foreground line-clamp-1">{item.name}</h4>
                          <p className="text-[9px] text-muted-foreground uppercase truncate font-bold">{item.set}</p>
                          
                          {/* Valuation price info */}
                          <div className="mt-1 flex flex-col gap-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-amber-500 font-mono">${Number(item.tcgplayerPrice).toFixed(2)}</span>
                              <span className="text-[9px] text-emerald-600 font-black font-mono">({fmt(item.tcgplayerPrice * usdtRate)})</span>
                            </div>
                            {item.collectrPrice ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-black text-indigo-500 font-mono">${item.collectrPrice.toFixed(2)} (C)</span>
                                <span className="text-[8px] text-indigo-400 font-bold font-mono">({fmt(item.collectrPrice * usdtRate)})</span>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Hover Overlay Action Triggers (Quick add vs Configure) */}
                        <div className="flex items-center gap-1.5 shrink-0 z-10">
                          {isQuickAdded ? (
                            <div className="h-7 px-2.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase flex items-center gap-1 border border-emerald-500/20">
                              <Check className="w-3.5 h-3.5" /> OK
                            </div>
                          ) : (
                            <>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => addScannedItemToCollectionDirectly(item.id, item)}
                                className="h-7 w-7 rounded-full bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-500 border-emerald-500/20 shadow-sm transition-colors"
                                title="Agregar Directo"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => {
                                  setEditingItem(item);
                                  setOriginalEnglishPrice(item.tcgplayerPrice);
                                  setIsScanOpen(false);
                                  setIsResultOpen(true);
                                }}
                                className="h-7 w-7 rounded-full bg-muted border-border hover:bg-foreground hover:text-background"
                                title="Editar & Agregar"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Scandex Collection Valuation stats */}
              <div className="border-t border-border pt-2.5 mt-3 text-center space-y-1">
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">
                  Total Sesión ({scanHistory.length} cartas)
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm font-black text-amber-500 font-mono">
                    ${scanHistory.reduce((sum, i) => sum + (Number(i.tcgplayerPrice) || 0), 0).toFixed(2)} USD
                  </span>
                  <span className="text-xs text-emerald-600 font-black font-mono">
                    ({fmt(scanHistory.reduce((sum, i) => sum + (Number(i.tcgplayerPrice) || 0), 0) * usdtRate)})
                  </span>
                </div>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>

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
                    <Label className="text-[10px] font-black uppercase text-yellow-600">Precio TCGplayer (USD)</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs text-muted-foreground">$</span>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={editingItem.tcgplayerPrice || ''}
                        onChange={(e) => setEditingItem(prev => ({ ...prev, tcgplayerPrice: Number(e.target.value) }))}
                        className="h-8 text-xs font-bold pl-6 font-mono bg-background text-yellow-600"
                      />
                    </div>
                    {/* Real-time COP conversion display */}
                    {editingItem.tcgplayerPrice ? (
                      <p className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5">
                        Equiv: {fmt(editingItem.tcgplayerPrice * usdtRate)}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">Precio Collectr (USD)</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs text-muted-foreground">$</span>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={editingItem.collectrPrice !== undefined && editingItem.collectrPrice !== null ? editingItem.collectrPrice : ''}
                        onChange={(e) => setEditingItem(prev => ({ ...prev, collectrPrice: e.target.value ? Number(e.target.value) : null }))}
                        className="h-8 text-xs font-bold pl-6 font-mono bg-background text-indigo-600 dark:text-indigo-400"
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
                            setEditingItem(prev => ({ ...prev, tcgplayerPrice: Number(preset.price.toFixed(2)) }));
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
        <DialogContent className="max-w-md bg-card border-none shadow-2xl p-6">
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
          <DialogFooter className="gap-2 pt-3 border-t border-border/60">
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirmation(null)}
              className="text-xs font-bold uppercase"
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmDelete}
              variant="destructive"
              className="text-xs font-black uppercase tracking-wider animate-pulse hover:animate-none"
            >
              Eliminar Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
