import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Printer, Share2, CheckCircle2, ChevronLeft, ShieldCheck, Smartphone, Download } from 'lucide-react';
import { useData } from '../context/AppDataContext';
import { fmt, cn } from '../lib/utils';
import Logo from './Logo';

export default function InvoiceView({ isPublic = false }: { isPublic?: boolean }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data, findProductPublicly, searchedProduct } = useData();
  
  const [selectedId, setSelectedId] = useState<string>(id || searchParams.get('id') || '');
  const [imeiSearch, setImeiSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    const element = document.getElementById('invoice-document');
    if (!element) return;

    setDownloading(true);

    // Color converting utilities
    const oklabToRgbValues = (L: number, a: number, b: number, A: number): string => {
      const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
      const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
      const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

      const l = Math.pow(Math.max(0, l_), 3);
      const m = Math.pow(Math.max(0, m_), 3);
      const s = Math.pow(Math.max(0, s_), 3);

      const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
      const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
      const b_co = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

      const dscr = (c: number): number => {
        return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
      };

      const R = Math.max(0, Math.min(255, Math.round(dscr(r) * 255)));
      const G = Math.max(0, Math.min(255, Math.round(dscr(g) * 255)));
      const B = Math.max(0, Math.min(255, Math.round(dscr(b_co) * 255)));

      if (A === 1) {
        return `rgb(${R}, ${G}, ${B})`;
      } else {
        return `rgba(${R}, ${G}, ${B}, ${A})`;
      }
    };

    const oklchToRgb = (oklchStr: string): string | null => {
      const formatRegex = /oklch\(\s*([\d\.]+%?)(?:\s+|(?:\s*,\s*))([\d\.]+%?)(?:\s+|(?:\s*,\s*))([\d\.]+(?:deg|rad|turn)?)(?:\s*[\/,\s]\s*([\d\.]+%?))?\s*\)/i;
      const match = oklchStr.match(formatRegex);
      if (!match) return null;

      const L = match[1].endsWith('%') ? parseFloat(match[1]) / 100 : parseFloat(match[1]);
      const C = match[2].endsWith('%') ? parseFloat(match[2]) / 100 : parseFloat(match[2]);
      const H_val = parseFloat(match[3]);
      const H_unit = match[3].replace(/[\d\.]+/g, '').trim().toLowerCase();
      
      let H = H_val;
      if (H_unit === 'rad') {
        H = H_val * (180 / Math.PI);
      } else if (H_unit === 'turn') {
        H = H_val * 360;
      }

      const A = match[4] ? (match[4].endsWith('%') ? parseFloat(match[4]) / 100 : parseFloat(match[4])) : 1;

      const h_rad = H * Math.PI / 180;
      const a = C * Math.cos(h_rad);
      const b = C * Math.sin(h_rad);

      return oklabToRgbValues(L, a, b, A);
    };

    const oklabToRgb = (oklabStr: string): string | null => {
      const formatRegex = /oklab\(\s*([\d\.]+%?)(?:\s+|(?:\s*,\s*))(-?[\d\.]+%?)(?:\s+|(?:\s*,\s*))(-?[\d\.]+%?)(?:\s*[\/,\s]\s*([\d\.]+%?))?\s*\)/i;
      const match = oklabStr.match(formatRegex);
      if (!match) return null;

      const L = match[1].endsWith('%') ? parseFloat(match[1]) / 100 : parseFloat(match[1]);
      const a = match[2].endsWith('%') ? parseFloat(match[2]) / 100 : parseFloat(match[2]);
      const b = match[3].endsWith('%') ? parseFloat(match[3]) / 100 : parseFloat(match[3]);
      const A = match[4] ? (match[4].endsWith('%') ? parseFloat(match[4]) / 100 : parseFloat(match[4])) : 1;

      return oklabToRgbValues(L, a, b, A);
    };

    const convertUnsupportedColors = (val: string): string => {
      if (!val || typeof val !== 'string') return val;
      
      let result = val;
      
      // Match oklch(...) occurrences
      const oklchMatches = result.match(/oklch\([^)]+\)/gi);
      if (oklchMatches) {
        for (const match of oklchMatches) {
          const converted = oklchToRgb(match) || '#1e293b';
          result = result.replace(match, converted);
        }
      }
      
      // Match oklab(...) occurrences
      const oklabMatches = result.match(/oklab\([^)]+\)/gi);
      if (oklabMatches) {
        for (const match of oklabMatches) {
          const converted = oklabToRgb(match) || '#1e293b';
          result = result.replace(match, converted);
        }
      }

      // Match light-dark(...) occurrences
      const lightDarkMatches = result.match(/light-dark\([^)]+\)/gi);
      if (lightDarkMatches) {
        for (const match of lightDarkMatches) {
          const inner = match.substring(11, match.length - 1);
          const parts = inner.split(',');
          const lightVal = parts[0] ? parts[0].trim() : '#1e293b';
          result = result.replace(match, lightVal);
        }
      }

      // Final sanity fallback for any remaining unsupported functions
      if (result.includes('oklch(') || result.includes('oklab(') || result.includes('light-dark(')) {
        return '#1e293b';
      }
      
      return result;
    };

    // Robust, balanced oklch, oklab, and light-dark converter for stylesheets
    const replaceColorFunctions = (css: string): string => {
      let cleaned = css;
      
      // 1. Extract light-dark color functions and replace them with their light-theme first argument
      let index = cleaned.indexOf('light-dark(');
      let count = 0;
      while (index !== -1 && count < 1000) {
        count++;
        let openPn = 1;
        let j = index + 11;
        let innerText = '';
        while (j < cleaned.length && openPn > 0) {
          if (cleaned[j] === '(') openPn++;
          else if (cleaned[j] === ')') openPn--;
          if (openPn > 0) {
            innerText += cleaned[j];
          }
          j++;
        }
        const firstArg = innerText.split(',')[0].trim();
        cleaned = cleaned.substring(0, index) + firstArg + cleaned.substring(j);
        index = cleaned.indexOf('light-dark(');
      }

      // 2. Convert oklch with an index tracker to prevent infinite loops
      let searchOffset = 0;
      index = cleaned.indexOf('oklch(', searchOffset);
      count = 0;
      while (index !== -1 && count < 1000) {
        count++;
        let openPn = 1;
        let j = index + 6;
        while (j < cleaned.length && openPn > 0) {
          if (cleaned[j] === '(') openPn++;
          else if (cleaned[j] === ')') openPn--;
          j++;
        }
        const oklchText = cleaned.substring(index, j);
        const rgbText = oklchToRgb(oklchText) || '#1e293b';
        cleaned = cleaned.substring(0, index) + rgbText + cleaned.substring(j);
        searchOffset = index + rgbText.length;
        index = cleaned.indexOf('oklch(', searchOffset);
      }

      // 3. Convert oklab with an index tracker to prevent infinite loops
      searchOffset = 0;
      index = cleaned.indexOf('oklab(', searchOffset);
      count = 0;
      while (index !== -1 && count < 1000) {
        count++;
        let openPn = 1;
        let j = index + 6;
        while (j < cleaned.length && openPn > 0) {
          if (cleaned[j] === '(') openPn++;
          else if (cleaned[j] === ')') openPn--;
          j++;
        }
        const oklabText = cleaned.substring(index, j);
        const rgbText = oklabToRgb(oklabText) || '#1e293b';
        cleaned = cleaned.substring(0, index) + rgbText + cleaned.substring(j);
        searchOffset = index + rgbText.length;
        index = cleaned.indexOf('oklab(', searchOffset);
      }

      return cleaned;
    };

    // Clean up active document's stylesheets and proxy window.getComputedStyle during PDF generation
    const cleanUpOklchStyles = async () => {
      const originalSheets = Array.from(document.styleSheets);
      const tempStyles: HTMLStyleElement[] = [];
      const disabledOriginals: CSSStyleSheet[] = [];

      for (const sheet of originalSheets) {
        try {
          let sheetCss = '';
          try {
            const rules = sheet.cssRules || sheet.rules;
            if (rules) {
              for (let i = 0; i < rules.length; i++) {
                sheetCss += rules[i].cssText + '\n';
              }
            }
          } catch (ruleError) {
            console.warn('CORS restriction on styleSheet, will fallback to raw fetch if needed', ruleError);
          }

          // If same-origin extraction yielded nothing or failed, we can try to fetch it if it has an href
          if (!sheetCss && sheet.href) {
            try {
              const res = await fetch(sheet.href);
              sheetCss = await res.text();
            } catch (fetchError) {
              console.warn(`Failed to fetch sheet from href: ${sheet.href}`, fetchError);
            }
          }

          if (sheetCss && (sheetCss.includes('oklch') || sheetCss.includes('oklab') || sheetCss.includes('light-dark'))) {
            const cleanedCss = replaceColorFunctions(sheetCss);
            
            // Create temporary stylesheet with cleaned CSS
            const tempStyle = document.createElement('style');
            tempStyle.type = 'text/css';
            tempStyle.innerHTML = cleanedCss;
            document.head.appendChild(tempStyle);
            tempStyles.push(tempStyle);

            // Disable original stylesheet
            sheet.disabled = true;
            disabledOriginals.push(sheet);
          }
        } catch (e) {
          console.warn('Error processing styleSheet:', e);
        }
      }

      // Proxy window.getComputedStyle to dynamically handle any remaining computed styles
      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = function (elt, pseudoElt) {
        const style = originalGetComputedStyle(elt, pseudoElt);
        return new Proxy(style, {
          get(target, prop) {
            try {
              if (prop === 'getPropertyValue') {
                return function(propertyName: string) {
                  try {
                    const val = target.getPropertyValue(propertyName);
                    if (typeof val === 'string' && (val.includes('oklch(') || val.includes('oklab(') || val.includes('light-dark('))) {
                      return convertUnsupportedColors(val);
                    }
                    return val;
                  } catch (e) {
                    return '';
                  }
                };
              }
              const val = (target as any)[prop];
              if (typeof val === 'string' && (val.includes('oklch(') || val.includes('oklab(') || val.includes('light-dark('))) {
                return convertUnsupportedColors(val);
              }
              if (typeof val === 'function') {
                return val.bind(target);
              }
              return val;
            } catch (err) {
              return (target as any)[prop];
            }
          }
        }) as any;
      };

      return () => {
        // Restore original stylesheets
        for (const sheet of disabledOriginals) {
          try {
            sheet.disabled = false;
          } catch (err) {
            // Ignore issues re-enabling
          }
        }
        // Remove temporary style tags
        for (const temp of tempStyles) {
          temp.remove();
        }

        // Restore window.getComputedStyle
        window.getComputedStyle = originalGetComputedStyle;
      };
    };

    const executeDownload = async () => {
      // @ts-ignore
      const html2pdf = window.html2pdf;
      if (!html2pdf) {
        setDownloading(false);
        return;
      }

      const opt = {
        margin:       [4, 6, 4, 6], // in mm for highly compact letter page fit
        filename:     `Factura_${mainProduct.invoiceNumber || 'Sin_Numero'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          onclone: (clonedDoc: Document) => {
            // Safe inline sanitization of cloned style nodes
            const styles = clonedDoc.querySelectorAll('style');
            styles.forEach(style => {
              if (style.textContent) {
                style.textContent = replaceColorFunctions(style.textContent);
              }
            });
            // Ensure no main-page navigation tabs or dialog objects bleed into the clone
            const nav = clonedDoc.querySelector('nav');
            if (nav) nav.remove();
          }
        },
        jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' }
      };

      let restoreStyles = () => {};
      try {
        restoreStyles = await cleanUpOklchStyles();
      } catch (e) {
        console.warn('Style clean up failed, continuing download path...', e);
      }

      // Temporarily apply print classes to force single page structure
      element.classList.add('pdf-rendering');

      html2pdf().set(opt).from(element).save().then(() => {
        element.classList.remove('pdf-rendering');
        restoreStyles();
        setDownloading(false);
      }).catch((err: any) => {
        console.error('Error rendering PDF:', err);
        element.classList.remove('pdf-rendering');
        restoreStyles();
        setDownloading(false);
      });
    };

    // @ts-ignore
    if (window.html2pdf) {
      await executeDownload();
    } else {
      const loadScript = (url: string, onFallback: () => void) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = async () => {
          await executeDownload();
        };
        script.onerror = () => {
          console.warn(`Failed to load html2pdf script from: ${url}`);
          script.remove();
          onFallback();
        };
        document.head.appendChild(script);
      };

      // Try primary CDN (cdnjs), then fallback to jsdelivr, then unpkg
      loadScript(
        'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
        () => {
          loadScript(
            'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js',
            () => {
              loadScript(
                'https://unpkg.com/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js',
                () => {
                  console.error('Failed to load html2pdf script from all CDNs');
                  setDownloading(false);
                }
              );
            }
          );
        }
      );
    }
  };

  // Sync selectedId with URL param and fetch if needed
  useEffect(() => {
    const tid = id || searchParams.get('id');
    if (tid) {
      setSelectedId(tid);
      // If not in memory, fetch it
      const found = data.products.find(p => p.id === tid);
      if (!found) {
        findProductPublicly(tid);
      }
    }
  }, [id, searchParams, data.products]);

  // Auto-detect product by IMEI
  useEffect(() => {
    if (imeiSearch.length >= 8) {
      const found = data.products.find(p => p.status === 'sold' && p.imei === imeiSearch);
      if (found) {
        setSelectedId(found.id);
      } else {
        // Search in DB
        findProductPublicly(imeiSearch);
      }
    }
  }, [imeiSearch, data.products]);

  // If public, we might be getting data from a 'd' param (Base64 encoded)
  const publicDataParam = searchParams.get('d');
  let publicInvoiceData = null;
  if (isPublic && publicDataParam) {
    try {
      publicInvoiceData = JSON.parse(decodeURIComponent(escape(atob(publicDataParam))));
    } catch (e) {
      console.error('Error decoding public invoice data', e);
    }
  }

  const currentProduct = publicInvoiceData || data.products.find(p => p.id === selectedId) || (searchedProduct?.id === selectedId ? searchedProduct : null) || searchedProduct;

  const invoiceProducts = React.useMemo(() => {
    if (!currentProduct) return [];
    if (!currentProduct.invoiceNumber) return [currentProduct];
    
    const related = data.products.filter(p => 
      p.status === 'sold' && 
      p.invoiceNumber === currentProduct.invoiceNumber && 
      p.saleDate === currentProduct.saleDate
    );
    
    return related.length > 0 ? related : [currentProduct];
  }, [currentProduct, data.products]);

  const mainProduct = invoiceProducts[0];

  const generatePublicLink = () => {
    if (!currentProduct) return '';
    return `${window.location.origin}/view-invoice/${currentProduct.id}`;
  };

  const publicLink = generatePublicLink();

  const handleCopy = () => {
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const pricing = React.useMemo(() => {
    return invoiceProducts.reduce((acc, p) => {
      const finalUnitPrice = p.salePrice || 0;
      const qty = p.quantity || 1;
      let baseUnitPrice = finalUnitPrice;
      
      if (p.discount && p.discount > 0) {
        if (p.discountType === 'percentage') {
          baseUnitPrice = finalUnitPrice / (1 - (p.discount / 100));
        } else {
          baseUnitPrice = finalUnitPrice + p.discount;
        }
      }
      
      const subtotal = baseUnitPrice * qty;
      const total = finalUnitPrice * qty;
      const disc = subtotal - total;
      
      return {
        subtotal: acc.subtotal + subtotal,
        total: acc.total + total,
        discount: acc.discount + disc
      };
    }, { subtotal: 0, total: 0, discount: 0 });
  }, [invoiceProducts]);

  if (!mainProduct) {
    if (isPublic) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 space-y-4">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center text-rose-600">
            <Smartphone className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black uppercase tracking-tight">Factura no encontrada</h1>
          <p className="text-muted-foreground text-sm text-center max-w-xs">Lo sentimos, no pudimos encontrar los detalles de esta factura.</p>
          <Button variant="outline" onClick={() => navigate('/catalog')}>Volver al Catálogo</Button>
        </div>
      );
    }
    return <div className="p-8 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs">Cargando detalles de factura...</div>;
  }

  return (
    <div className={cn("max-w-2xl mx-auto space-y-6 pb-12", isPublic ? "p-4 md:pt-8" : "")}>
      {isPublic && (
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="print:hidden">
          <ChevronLeft className="w-4 h-4 mr-1" /> Volver
        </Button>
      )}
      {!isPublic && (
        <Card className="border-none shadow-sm print:hidden bg-card text-card-foreground">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Generar Factura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label className="text-foreground">Escanear/Buscar IMEI</Label>
                <Input 
                  placeholder="Ingrese IMEI para detectar..." 
                  value={imeiSearch}
                  onChange={(e) => setImeiSearch(e.target.value)}
                  className="bg-muted border-none text-foreground"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-foreground">Seleccionar Venta Manual</Label>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger className="bg-muted border-none text-foreground">
                    <SelectValue placeholder="Selecciona un producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.products.filter(p => p.status === 'sold').map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.invoiceNumber} — {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {mainProduct ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Invoice Document */}
          <Card id="invoice-document" className="border-none shadow-lg overflow-hidden bg-card text-card-foreground print:shadow-none print:border print:bg-white print:text-black">
            <CardContent className="p-8 space-y-8">
              {/* Header */}
              <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 pb-2">
                <div className="flex flex-col items-center md:items-start gap-3">
                  <Logo size="xl" />
                  <div className="space-y-1 text-center md:text-left">
                    <h1 className="text-2xl font-black tracking-tighter text-foreground leading-none uppercase print:text-black">{data.settings.companyName || 'LDIPHONE ACCESORIOS'}</h1>
                    <div className="text-[11px] text-slate-800 dark:text-slate-200 font-extrabold uppercase tracking-wide leading-none mt-1 print:text-black">
                      DUVAN DARIO MARIN JARAMILLO
                    </div>
                    <div className="text-[9px] text-muted-foreground font-semibold">
                      C.C. 1128401809 | Persona Natural
                    </div>
                    <div className="text-[9px] text-muted-foreground font-medium">
                      Dirección: Carrera 108 #107B 17, Apartadó, Antioquia
                    </div>
                  </div>
                </div>

                {/* MinTIC Authorized Box */}
                <div className="bg-slate-50 border border-slate-100 dark:bg-slate-900 dark:border-slate-800 p-4 rounded-2xl max-w-xs text-left text-[9px] space-y-1 bg-opacity-70 print:bg-slate-50 print:border-slate-200">
                  <div className="flex items-center gap-1.5 text-[#f15a24] font-black tracking-wider uppercase mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#f15a24]" />
                    <span>REGISTRO MINTIC</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 font-extrabold text-[9px] uppercase leading-tight">Distribuidor Autorizado de Celulares</p>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Auto. No: <span className="font-bold text-slate-900 dark:text-white">0000003130</span></p>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">NUV: <span className="font-bold text-slate-900 dark:text-white">00000024390</span></p>
                  <p className="text-slate-400 dark:text-slate-500 font-medium text-[8px] italic">Socio Regulado - Res. MinTIC 5050/2016 Col.</p>
                </div>
              </div>

              <Separator className="bg-border print:bg-slate-200" />

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-y-4 text-xs">
                <div className="space-y-1">
                  <div className="text-[9px] uppercase font-bold text-muted-foreground">Factura N°</div>
                  <div className="font-bold text-sm text-foreground print:text-black">{mainProduct.invoiceNumber}</div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="text-[9px] uppercase font-bold text-muted-foreground">Fecha</div>
                  <div className="font-medium text-foreground print:text-black">{mainProduct.saleDate || new Date().toLocaleDateString()}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[9px] uppercase font-bold text-muted-foreground">Cliente</div>
                  <div className="font-semibold text-foreground print:text-black">{mainProduct.buyer || 'Consumidor Final'}</div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="text-[9px] uppercase font-bold text-muted-foreground">Estado</div>
                  <div className="text-emerald-600 font-bold uppercase tracking-tighter">Pagado</div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-4">
                <div className="grid grid-cols-12 text-[10px] uppercase font-black tracking-widest text-muted-foreground px-2">
                  <div className="col-span-6">Descripción</div>
                  <div className="col-span-2 text-center">Cant.</div>
                  <div className="col-span-4 text-right">Total</div>
                </div>
                <div className="space-y-2">
                  {invoiceProducts.map((p, idx) => {
                    const finalUnitPrice = p.salePrice || 0;
                    let baseUnitPrice = finalUnitPrice;
                    if (p.discount && p.discount > 0) {
                      if (p.discountType === 'percentage') {
                        baseUnitPrice = finalUnitPrice / (1 - (p.discount / 100));
                      } else {
                        baseUnitPrice = finalUnitPrice + p.discount;
                      }
                    }
                    return (
                      <div key={idx} className="grid grid-cols-12 items-center bg-muted/50 p-4 rounded-2xl border border-border print:bg-slate-50 print:border-slate-100 shadow-sm">
                        <div className="col-span-6">
                          <div className="text-sm font-black text-foreground print:text-black">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground font-black mt-1 uppercase tracking-widest opacity-60">IMEI: {p.imei || 'No registrado'}</div>
                        </div>
                        <div className="col-span-2 text-center text-xs font-black text-foreground print:text-black">
                          x{p.quantity || 1}
                        </div>
                        <div className="col-span-4 text-right font-black text-sm text-foreground print:text-black tabular-nums">
                          {fmt(baseUnitPrice * (p.quantity || 1))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-end pt-4">
                <div className="w-full max-w-[200px] space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground uppercase font-black tracking-widest text-[9px]">Subtotal</span>
                    <span className="font-mono text-foreground print:text-black">{fmt(pricing.subtotal)}</span>
                  </div>
                  {pricing.discount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-rose-500 uppercase font-black tracking-widest text-[9px]">Descuento</span>
                      <span className="font-mono text-rose-500">-{fmt(pricing.discount)}</span>
                    </div>
                  )}
                  <Separator className="bg-border print:bg-slate-200" />
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold uppercase text-foreground print:text-black">Total</span>
                    <span className="text-xl font-black tracking-tighter text-foreground print:text-black">{fmt(pricing.total)}</span>
                  </div>
                </div>
              </div>

              {/* Warranty Box */}
              <div className="bg-secondary text-secondary-foreground rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-widest">
                  <ShieldCheck className="w-4 h-4" />
                  Garantía y Condiciones
                </div>
                <div className="space-y-3">
                  <div className="text-[10px] font-black bg-foreground/10 w-fit px-3 py-1 rounded-full text-foreground uppercase tracking-widest print:bg-black/10 print:text-black">
                    Vigencia: {mainProduct.warrantyMonths || data.settings.defaultWarrantyMonths} Meses 
                    {mainProduct.warrantyExpiration && ` (Hasta: ${mainProduct.warrantyExpiration})`}
                  </div>
                  <div className="text-[9px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-medium border-l-2 border-emerald-500/30 pl-3">
                    {mainProduct.warrantyTerms || data.settings.warrantyTerms}
                  </div>
                </div>
              </div>

              {/* MinTIC Legal Verification Stamp */}
              <div className="bg-[#f15a24]/5 border border-[#f15a24]/10 rounded-2xl p-5 space-y-3 print:bg-slate-50/50 print:border-slate-200">
                <div className="flex items-center gap-2 text-[#f15a24] font-black text-xs uppercase tracking-widest">
                  <ShieldCheck className="w-4 h-4 text-[#f15a24]" />
                  Autorización Legal de Venta MinTIC
                </div>
                <div className="text-[9px] text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
                  <p className="font-semibold text-justify">
                    De conformidad con el Decreto 1630 de 2011, la Resolución CRC 4584 de 2014 y la Resolución 5050 de 2016 compilada por el Ministerio de Tecnologías de la Información y las Comunicaciones (MinTIC), el establecimiento <strong>LDIPHONE ACCESORIOS</strong> representado por <strong>DUVAN DARIO MARIN JARAMILLO</strong> con Cédula de Ciudadanía <strong>C.C. 1128401809</strong> se encuentra plenamente AUTORIZADO bajo el <strong className="text-[#f15a24]">Número Único de Verificación N° 00000024390</strong> y Número de Autorización <strong className="text-[#f15a24]">0000003130</strong> de fecha 23 de Diciembre de 2022 para comercializar Equipos Terminales Móviles aptos en Colombia de manera legal y certificada.
                  </p>
                  <p className="text-[8px] text-slate-400 font-mono italic">
                    Código de Expediente MinTIC: 990035057 | Dirección de Registro: Carrera 108 #107B 17, Apartadó, Antioquia, Colombia.
                  </p>
                </div>
              </div>

              {/* QR and Footer */}
              <div className="flex flex-col items-center space-y-4 pt-4">
                {publicLink ? (
                  <>
                    <div className="p-3 bg-white border border-border rounded-2xl shadow-sm dark:bg-slate-100">
                      <QRCodeSVG value={publicLink} size={100} level="H" />
                    </div>
                    <div className="text-center space-y-1">
                      <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Escanea para ver en línea</div>
                      <div className="text-[8px] text-muted-foreground/60 font-mono break-all max-w-[240px]">{publicLink}</div>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                    <div className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">Error de Enlace</div>
                    <div className="text-[9px] text-rose-500 mt-1">No se pudo generar el enlace para ver en línea.</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 justify-center print:hidden">
            {!isPublic && (
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full border-border text-foreground" 
                onClick={handleCopy}
                disabled={!publicLink}
              >
                {copied ? <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copiado' : 'Copiar Link'}
              </Button>
            )}

            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full border-[#f15a24]/20 hover:border-[#f15a24]/50 text-foreground bg-amber-50/10 hover:bg-amber-500/5 transition-all" 
              onClick={handleDownloadPDF}
              disabled={downloading}
            >
              <Download className={cn("w-4 h-4 mr-2 text-[#f15a24]", downloading ? "animate-bounce" : "")} />
              {downloading ? 'Descargando...' : 'Descargar PDF'}
            </Button>

            <Button variant="outline" size="sm" className="rounded-full border-border text-foreground" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            
            {!isPublic && (
              <Button 
                size="sm" 
                className="rounded-full bg-primary text-primary-foreground" 
                disabled={!publicLink}
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: 'Factura LDIPHONE', url: publicLink });
                  } else {
                    handleCopy();
                  }
                }}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Compartir
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground print:hidden">
          Selecciona una venta para ver la factura
        </div>
      )}
    </div>
  );
}
