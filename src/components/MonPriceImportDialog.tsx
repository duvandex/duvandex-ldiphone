import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Upload, FileJson, FileText, AlertCircle, Check, Loader2, Info } from 'lucide-react';
import Papa from 'papaparse';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface MonPriceItem {
  id?: string;
  name: string;
  set: string;
  cardNumber?: string;
  price: number;
  quantity: number;
  condition?: string;
  language?: string;
  type?: 'card' | 'sealed';
}

interface MatchResult {
  importItem: MonPriceItem;
  existingId?: string;
  existingPrice?: number;
  existingName?: string;
  matched: boolean;
  selected: boolean;
}

interface MonPriceImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventory: any[];
  onImportComplete: () => void;
}

export function MonPriceImportDialog({ open, onOpenChange, inventory, onImportComplete }: MonPriceImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      parseFile(selectedFile);
    }
  };

  const normalize = (text: string) => text?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';

  const parseFile = (file: File) => {
    setParsing(true);
    setMatches([]);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const content = e.target?.result as string;
      let items: MonPriceItem[] = [];

      try {
        if (file.name.endsWith('.json')) {
          const json = JSON.parse(content);
          // Adjust based on common export patterns
          const rawItems = Array.isArray(json) ? json : (json.items || json.data || []);
          items = rawItems.map((ri: any) => ({
            name: ri.name || ri.Name || ri.itemName || '',
            set: ri.set || ri.Set || ri.setName || ri.expansion || '',
            cardNumber: ri.cardNumber || ri.number || ri.collectorNumber || ri["Card Number"] || '',
            price: Number(ri.price || ri.Price || ri.marketPrice || ri.value || 0),
            quantity: Number(ri.quantity || ri.Quantity || ri.count || 1),
            condition: ri.condition || ri.Condition || 'NM',
            language: ri.language || ri.Language || 'Inglés',
            type: (ri.type?.toLowerCase().includes('sealed') || ri.category?.toLowerCase().includes('sealed')) ? 'sealed' : 'card'
          }));
        } else {
          // CSV Parsing
          Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              items = results.data.map((ri: any) => ({
                name: ri.name || ri.Name || ri.itemName || '',
                set: ri.set || ri.Set || ri.setName || ri.expansion || '',
                cardNumber: ri.cardNumber || ri.number || ri.collectorNumber || ri["Card Number"] || '',
                price: Number(ri.price || ri.Price || ri.marketPrice || ri.value || 0),
                quantity: Number(ri.quantity || ri.Quantity || ri.count || 1),
                condition: ri.condition || ri.Condition || 'NM',
                language: ri.language || ri.Language || 'Inglés',
                type: (ri.type?.toLowerCase().includes('sealed') || ri.category?.toLowerCase().includes('sealed')) ? 'sealed' : 'card'
              }));
              processMatches(items);
            },
            error: (err) => {
              setError(`Error al leer CSV: ${err.message}`);
              setParsing(false);
            }
          });
          return; // Papa.parse is async
        }
        processMatches(items);
      } catch (err) {
        setError("Error al procesar el archivo. Asegúrate de que el formato sea correcto.");
        setParsing(false);
      }
    };

    reader.readAsText(file);
  };

  const processMatches = (items: MonPriceItem[]) => {
    const results: MatchResult[] = items.map(item => {
      // Find match in inventory: name + set + cardNumber
      const match = inventory.find(inv => 
        normalize(inv.name) === normalize(item.name) && 
        normalize(inv.set) === normalize(item.set) &&
        (item.cardNumber ? normalize(inv.cardNumber || '') === normalize(item.cardNumber) : true)
      );

      return {
        importItem: item,
        existingId: match?.id,
        existingPrice: match?.marketPrice,
        existingName: match?.name,
        matched: !!match,
        selected: true
      };
    });

    setMatches(results);
    setParsing(false);
  };

  const handleImport = async () => {
    setImporting(true);
    let successCount = 0;
    
    try {
      const selectedMatches = matches.filter(m => m.selected);
      
      for (const match of selectedMatches) {
        const id = match.existingId || `mon-${Math.random().toString(36).substr(2, 9)}`;
        const docRef = doc(db, 'pokemon_inventory', id);
        
        const payload: any = {
          name: match.importItem.name,
          set: match.importItem.set,
          cardNumber: match.importItem.cardNumber || '',
          marketPrice: match.importItem.price,
          quantity: match.importItem.quantity,
          condition: match.importItem.condition || 'NM',
          language: match.importItem.language || 'Inglés',
          type: match.importItem.type || 'card',
          lastPriceUpdate: {
            source: 'MonPrice',
            date: new Date().toISOString(),
            previousPrice: match.existingPrice || 0
          }
        };

        if (!match.existingId) {
          payload.id = id;
          payload.dateAdded = new Date().toISOString().split('T')[0];
          payload.imageUrl = 'https://images.pokemontcg.io/logo.png'; // Fallback
        }

        await setDoc(docRef, payload, { merge: true });

        // Sync with main products
        const productRef = doc(db, 'products', id);
        await setDoc(productRef, {
          id,
          name: payload.name,
          category: 'POKEMON TCG',
          salePrice: payload.marketPrice,
          quantity: payload.quantity,
          purchaseDate: payload.dateAdded || new Date().toISOString().split('T')[0],
          investor: 'Duvan',
          description: `${payload.set} - ${payload.cardNumber} (${payload.condition}) - Imp. MonPrice`,
          status: payload.quantity > 0 ? 'stock' : 'out_of_stock'
        }, { merge: true });

        successCount++;
      }

      onImportComplete();
      onOpenChange(false);
      setMatches([]);
      setFile(null);
    } catch (err) {
      setError("Error al importar algunos artículos.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-500" /> Importar MonPrice
          </DialogTitle>
          <DialogDescription className="text-xs font-bold uppercase tracking-wide">
            Sincroniza precios y stock desde tus exportaciones de la App MonPrice.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2">
          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:bg-indigo-500/5 hover:border-indigo-500/40 transition-all cursor-pointer group"
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json,.csv"
                className="hidden"
              />
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-base font-black uppercase">Sube tu archivo MonPrice</h3>
              <p className="text-muted-foreground text-xs mt-2 uppercase max-w-sm mx-auto">
                Selecciona el archivo .JSON o .CSV exportado desde tu aplicación de escaneo.
              </p>
              <div className="mt-6 flex justify-center gap-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase bg-muted/40 px-3 py-1.5 rounded-full">
                  <FileJson className="w-3.5 h-3.5" /> JSON Support
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase bg-muted/40 px-3 py-1.5 rounded-full">
                  <FileText className="w-3.5 h-3.5" /> CSV Support
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded flex items-center justify-center">
                    {file.name.endsWith('.json') ? <FileJson className="w-5 h-5 text-indigo-500" /> : <FileText className="w-5 h-5 text-indigo-500" />}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setMatches([]); }} className="text-[10px] font-bold uppercase">
                  Cambiar
                </Button>
              </div>

              {parsing ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Procesando y mapeando campos...</p>
                </div>
              ) : error ? (
                <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl flex items-center gap-3 text-rose-500">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-bold uppercase">{error}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black uppercase tracking-tight">Vista Previa de Importación</h4>
                      <Badge variant="outline" className="text-[9px] font-bold uppercase px-2 py-0.5">
                        {matches.length} Artículos detectados
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setMatches(prev => prev.map(m => ({ ...m, selected: true })))}
                        className="h-7 text-[9px] font-black uppercase"
                      >
                        Seleccionar Todo
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setMatches(prev => prev.map(m => ({ ...m, selected: false })))}
                        className="h-7 text-[9px] font-black uppercase"
                      >
                        Deseleccionar Todo
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border overflow-x-auto overflow-y-auto max-h-[40vh]">
                    <Table>
                      <TableHeader className="bg-muted/40 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Articulo</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Set</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-center">Estado</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Precio Act.</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right text-indigo-500">Nuevo Precio</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right">Cant.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {matches.map((match, idx) => (
                          <TableRow key={idx} className={match.matched ? "bg-emerald-500/[0.02]" : ""}>
                            <TableCell className="p-2">
                              <Checkbox 
                                checked={match.selected} 
                                onCheckedChange={(val) => {
                                  const next = [...matches];
                                  next[idx].selected = !!val;
                                  setMatches(next);
                                }}
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <p className="text-[11px] font-black uppercase leading-tight truncate max-w-[150px]">{match.importItem.name}</p>
                              {match.importItem.cardNumber && <p className="text-[9px] text-muted-foreground font-mono">#{match.importItem.cardNumber}</p>}
                            </TableCell>
                            <TableCell className="py-2 text-[10px] font-bold text-muted-foreground uppercase truncate max-w-[100px]">
                              {match.importItem.set}
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              {match.matched ? (
                                <Badge className="bg-emerald-500 text-white text-[8px] font-black uppercase px-1.5 py-0">Encontrado</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[8px] font-black uppercase px-1.5 py-0">Nuevo</Badge>
                              )}
                            </TableCell>
                            <TableCell className="py-2 text-right text-[10px] font-mono font-bold">
                              {match.existingPrice ? `$${match.existingPrice.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="py-2 text-right text-[10px] font-mono font-black text-indigo-500">
                              ${match.importItem.price.toFixed(2)}
                            </TableCell>
                            <TableCell className="py-2 text-right text-[10px] font-mono font-bold">
                              {match.importItem.quantity}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-6 border-t border-border bg-muted/20">
          <div className="flex items-center gap-3 w-full sm:justify-between">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-bold">
              <Info className="w-3.5 h-3.5" />
              <span>Matching por Nombre + Set + N° de Carta</span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-xs font-black uppercase">
                Cancelar
              </Button>
              <Button 
                disabled={importing || matches.filter(m => m.selected).length === 0} 
                onClick={handleImport}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs px-8 tracking-wider flex items-center gap-2"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {importing ? "Importando..." : `Importar ${matches.filter(m => m.selected).length} Artículos`}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
