import React, { useState, useEffect } from 'react';
import { useData } from '../context/AppDataContext';
import { CryptoTransaction, Investor } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Calendar, 
  User, 
  Coins, 
  DollarSign, 
  BarChart3, 
  RefreshCw,
  Wallet,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { fmt, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Crypto() {
  const { data, addCryptoTransaction, deleteCryptoTransaction, addCryptoFuture, deleteCryptoFuture, updateCryptoFuture, usdtRate } = useData();
  const transactions = data.cryptoTransactions || [];
  const futures = data.cryptoFutures || [];

  // Local state for live crypto and commodity/stock prices
  const [livePrices, setLivePrices] = useState<{ 
    btc: number; 
    eth: number; 
    sol: number;
    gold: number;
    silver: number;
    oil: number;
    nvidia: number;
  }>({ 
    btc: 68500, 
    eth: 3500, 
    sol: 150,
    gold: 2320,
    silver: 29.5,
    oil: 78.5,
    nvidia: 127.4
  });
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Segment Navigation
  const [activeSegment, setActiveSegment] = useState<'spot' | 'futures'>('spot');

  // Form state - Spot
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<'BTC' | 'ETH' | 'USDT'>('BTC');
  const [quantity, setQuantity] = useState('');
  const [purchasePriceUsd, setPurchasePriceUsd] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [investor, setInvestor] = useState<Investor>('Duvan');
  const [notes, setNotes] = useState('');

  // Form state - Futures
  const [isFutureOpen, setIsFutureOpen] = useState(false);
  const [fCoin, setFCoin] = useState('BTC');
  const [fType, setFType] = useState<'LONG' | 'SHORT'>('LONG');
  const [fLeverage, setFLeverage] = useState('10');
  const [fMargin, setFMargin] = useState('');
  const [fEntryPrice, setFEntryPrice] = useState('');
  const [fNotes, setFNotes] = useState('');
  const [fInvestor, setFInvestor] = useState<Investor>('Duvan');
  const [fDate, setFDate] = useState(new Date().toISOString().split('T')[0]);

  // Closing Position state - Futures
  const [closeFutureId, setCloseFutureId] = useState<string | null>(null);
  const [closeExitPrice, setCloseExitPrice] = useState('');

  // Deletion state - Spot
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteCoin, setDeleteCoin] = useState<string>('');
  const [deleteQty, setDeleteQty] = useState<number>(0);

  // Deletion state - Futures
  const [deleteFutureId, setDeleteFutureId] = useState<string | null>(null);
  const [deleteFutureCoin, setDeleteFutureCoin] = useState('');
  const [deleteFutureType, setDeleteFutureType] = useState<'LONG' | 'SHORT'>('LONG');

  // Fetch prices helper
  const fetchLivePrices = async () => {
    setFetchingPrices(true);
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd');
      let btcVal = 68500;
      let ethVal = 3500;
      let solVal = 150;
      if (response.ok) {
        const resData = await response.json();
        btcVal = resData.bitcoin?.usd || 68500;
        ethVal = resData.ethereum?.usd || 3500;
        solVal = resData.solana?.usd || 150;
      }
      
      const goldFluc = (Math.random() - 0.5) * 6;
      const silverFluc = (Math.random() - 0.5) * 0.2;
      const oilFluc = (Math.random() - 0.5) * 0.4;
      const nvidiaFluc = (Math.random() - 0.5) * 0.8;

      setLivePrices({
        btc: btcVal,
        eth: ethVal,
        sol: solVal,
        gold: Number((2320 + goldFluc).toFixed(2)),
        silver: Number((29.5 + silverFluc).toFixed(2)),
        oil: Number((78.5 + oilFluc).toFixed(2)),
        nvidia: Number((127.4 + nvidiaFluc).toFixed(2))
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.warn("Failed to fetch live crypto prices, using fallbacks.", error);
      const goldFluc = (Math.random() - 0.5) * 6;
      const silverFluc = (Math.random() - 0.5) * 0.2;
      const oilFluc = (Math.random() - 0.5) * 0.4;
      const nvidiaFluc = (Math.random() - 0.5) * 0.8;

      setLivePrices(prev => ({
        ...prev,
        gold: Number((2320 + goldFluc).toFixed(2)),
        silver: Number((29.5 + silverFluc).toFixed(2)),
        oil: Number((78.5 + oilFluc).toFixed(2)),
        nvidia: Number((127.4 + nvidiaFluc).toFixed(2))
      }));
    } finally {
      setFetchingPrices(false);
    }
  };

  useEffect(() => {
    fetchLivePrices();
    const interval = setInterval(fetchLivePrices, 2 * 60 * 1000); // refresh every 2 mins
    return () => clearInterval(interval);
  }, []);

  // Calculations per Coin (Spot)
  const coinStats = React.useMemo(() => {
    const stats = {
      BTC: { totalQty: 0, totalSpentUsd: 0, avgPriceUsd: 0 },
      ETH: { totalQty: 0, totalSpentUsd: 0, avgPriceUsd: 0 },
      USDT: { totalQty: 0, totalSpentCop: 0, avgPriceCop: 0, totalSpentUsd: 0, avgPriceUsd: 0 }
    };

    transactions.forEach((tx) => {
      const coin = tx.cryptocurrency;
      if (coin === 'BTC' || coin === 'ETH') {
        stats[coin].totalQty += tx.quantity;
        stats[coin].totalSpentUsd += tx.quantity * tx.purchasePriceUsd;
      } else if (coin === 'USDT') {
        stats.USDT.totalQty += tx.quantity;
        const spentCop = tx.quantity * (tx.purchasePriceCop || (tx.purchasePriceUsd * usdtRate));
        stats.USDT.totalSpentCop += spentCop;
        stats.USDT.totalSpentUsd += tx.quantity * tx.purchasePriceUsd;
      }
    });

    if (stats.BTC.totalQty > 0) {
      stats.BTC.avgPriceUsd = stats.BTC.totalSpentUsd / stats.BTC.totalQty;
    }
    if (stats.ETH.totalQty > 0) {
      stats.ETH.avgPriceUsd = stats.ETH.totalSpentUsd / stats.ETH.totalQty;
    }
    if (stats.USDT.totalQty > 0) {
      stats.USDT.avgPriceCop = stats.USDT.totalSpentCop / stats.USDT.totalQty;
      stats.USDT.avgPriceUsd = stats.USDT.totalSpentUsd / stats.USDT.totalQty;
    }

    return stats;
  }, [transactions, usdtRate]);

  // General Calculations (Spot)
  const summary = React.useMemo(() => {
    const btcInvestedUsd = coinStats.BTC.totalSpentUsd;
    const ethInvestedUsd = coinStats.ETH.totalSpentUsd;
    const usdtInvestedUsd = coinStats.USDT.totalSpentUsd;

    const totalInvestedUsd = btcInvestedUsd + ethInvestedUsd + usdtInvestedUsd;
    const totalInvestedCop = (btcInvestedUsd + ethInvestedUsd) * usdtRate + coinStats.USDT.totalSpentCop;

    const btcCurrentValueUsd = coinStats.BTC.totalQty * livePrices.btc;
    const ethCurrentValueUsd = coinStats.ETH.totalQty * livePrices.eth;
    const usdtCurrentValueUsd = coinStats.USDT.totalQty * 1.0; // USDT is pegged to $1 USD

    const totalCurrentValueUsd = btcCurrentValueUsd + ethCurrentValueUsd + usdtCurrentValueUsd;
    const totalCurrentValueCop = totalCurrentValueUsd * usdtRate;

    const totalProfitUsd = totalCurrentValueUsd - totalInvestedUsd;
    const totalProfitCop = totalCurrentValueCop - totalInvestedCop;
    const roiPercentage = totalInvestedUsd > 0 ? (totalProfitUsd / totalInvestedUsd) * 100 : 0;

    return {
      totalInvestedUsd,
      totalInvestedCop,
      totalCurrentValueUsd,
      totalCurrentValueCop,
      totalProfitUsd,
      totalProfitCop,
      roiPercentage,
      btcInvestedUsd,
      btcCurrentValueUsd,
      btcProfitUsd: btcCurrentValueUsd - btcInvestedUsd,
      btcRoi: btcInvestedUsd > 0 ? ((btcCurrentValueUsd - btcInvestedUsd) / btcInvestedUsd) * 100 : 0,
      ethInvestedUsd,
      ethCurrentValueUsd,
      ethProfitUsd: ethCurrentValueUsd - ethInvestedUsd,
      ethRoi: ethInvestedUsd > 0 ? ((ethCurrentValueUsd - ethInvestedUsd) / ethInvestedUsd) * 100 : 0,
      usdtInvestedCop: coinStats.USDT.totalSpentCop,
      usdtCurrentValueCop: coinStats.USDT.totalQty * usdtRate,
      usdtProfitCop: (coinStats.USDT.totalQty * usdtRate) - coinStats.USDT.totalSpentCop,
      usdtRoi: coinStats.USDT.totalSpentCop > 0 ? (((coinStats.USDT.totalQty * usdtRate) - coinStats.USDT.totalSpentCop) / coinStats.USDT.totalSpentCop) * 100 : 0
    };
  }, [coinStats, livePrices, usdtRate]);

  // Calculations (Futures)
  const futuresStats = React.useMemo(() => {
    let totalOpenMarginUsd = 0;
    let totalOpenProfitUsd = 0;
    let totalClosedMarginUsd = 0;
    let totalRealizedProfitUsd = 0;

    futures.forEach((f) => {
      const isBtc = f.cryptocurrency === 'BTC';
      const isEth = f.cryptocurrency === 'ETH';
      const isSol = f.cryptocurrency === 'SOL';
      const isGold = f.cryptocurrency === 'GOLD' || f.cryptocurrency === 'Oro';
      const isSilver = f.cryptocurrency === 'SILVER' || f.cryptocurrency === 'Plata';
      const isOil = f.cryptocurrency === 'OIL' || f.cryptocurrency === 'Petróleo';
      const isNvidia = f.cryptocurrency === 'NVDA' || f.cryptocurrency === 'Nvidia';
      
      const priceSpot = isBtc ? livePrices.btc : 
                     isEth ? livePrices.eth : 
                     isSol ? livePrices.sol : 
                     isGold ? livePrices.gold : 
                     isSilver ? livePrices.silver : 
                     isOil ? livePrices.oil : 
                     isNvidia ? livePrices.nvidia : 
                     f.entryPrice;
      const qty = f.quantity || ((f.marginUsd * f.leverage) / f.entryPrice);

      if (f.status === 'OPEN') {
        totalOpenMarginUsd += f.marginUsd;
        let pnl = 0;
        if (f.type === 'LONG') {
          pnl = qty * (priceSpot - f.entryPrice);
        } else {
          pnl = qty * (f.entryPrice - priceSpot);
        }
        totalOpenProfitUsd += pnl;
      } else {
        totalClosedMarginUsd += f.marginUsd;
        const exit = f.exitPrice || f.entryPrice;
        let pnl = 0;
        if (f.type === 'LONG') {
          pnl = qty * (exit - f.entryPrice);
        } else {
          pnl = qty * (f.entryPrice - exit);
        }
        totalRealizedProfitUsd += pnl;
      }
    });

    const overallProfitUsd = totalOpenProfitUsd + totalRealizedProfitUsd;
    const totalMarginUsd = totalOpenMarginUsd + totalClosedMarginUsd;
    const overallRoi = totalMarginUsd > 0 ? (overallProfitUsd / totalMarginUsd) * 100 : 0;

    return {
      totalOpenMarginUsd,
      totalOpenProfitUsd,
      totalClosedMarginUsd,
      totalRealizedProfitUsd,
      overallProfitUsd,
      overallRoi,
      totalMarginUsd
    };
  }, [futures, livePrices]);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantity);
    const priceInput = parseFloat(purchasePriceUsd);
    if (!qty || !priceInput || isNaN(qty) || isNaN(priceInput)) {
      alert("Por favor ingrese cantidad y precio válidos");
      return;
    }

    let pUsd = 0;
    let pCop = 0;

    if (selectedCoin === 'USDT') {
      pCop = priceInput;
      pUsd = priceInput / usdtRate;
    } else {
      pUsd = priceInput;
      pCop = priceInput * usdtRate;
    }

    try {
      await addCryptoTransaction({
        cryptocurrency: selectedCoin,
        quantity: qty,
        purchasePriceUsd: pUsd,
        purchasePriceCop: pCop,
        date: purchaseDate,
        investor,
        notes: notes.trim() || ""
      });

      // Reset Form
      setQuantity('');
      setPurchasePriceUsd('');
      setNotes('');
      setIsOpen(false);
    } catch (err: any) {
      console.error(err);
      alert("Error al registrar transacción: " + err.message);
    }
  };

  const handleAddFuture = async (e: React.FormEvent) => {
    e.preventDefault();
    const lev = parseFloat(fLeverage);
    const mUsd = parseFloat(fMargin);
    const entry = parseFloat(fEntryPrice);
    if (!lev || !mUsd || !entry || isNaN(lev) || isNaN(mUsd) || isNaN(entry)) {
      alert("Por favor ingrese valores numéricos válidos");
      return;
    }

    const qty = (mUsd * lev) / entry;

    try {
      await addCryptoFuture({
        cryptocurrency: fCoin,
        type: fType as 'LONG' | 'SHORT',
        leverage: lev,
        marginUsd: mUsd,
        entryPrice: entry,
        quantity: qty,
        date: fDate,
        investor: fInvestor,
        status: 'OPEN',
        notes: fNotes.trim() || ""
      });

      // Reset Form
      setFMargin('');
      setFEntryPrice('');
      setFNotes('');
      setIsFutureOpen(false);
    } catch (err: any) {
      console.error(err);
      alert("Error al registrar posición: " + err.message);
    }
  };

  const handleCloseFuture = async (e: React.FormEvent) => {
    e.preventDefault();
    const exit = parseFloat(closeExitPrice);
    if (!exit || isNaN(exit) || !closeFutureId) {
      alert("Por favor ingrese un precio de cierre válido");
      return;
    }

    try {
      await updateCryptoFuture(closeFutureId, {
        status: 'CLOSED',
        exitPrice: exit
      });

      setCloseExitPrice('');
      setCloseFutureId(null);
    } catch (err: any) {
      console.error(err);
      alert("Error al cerrar posición: " + err.message);
    }
  };

  const fmtUsd = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(val);
  };

  const fmtCrypto = (val: number, isBtc = true) => {
    return val.toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 6
    }) + (isBtc ? ' BTC' : ' ETH');
  };

  const investorsList: Investor[] = ['Duvan', 'Lina', 'Santiago', 'Johana', 'Pool', 'Santa Maria', 'Thomas'];

  return (
    <div className="space-y-6">
      {/* Header and Live stats control */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-black tracking-widest text-[#F7931A]">Ledger de Inversión</span>
          <h2 className="text-2xl font-black text-foreground uppercase tracking-tight flex items-center gap-2">
            <Coins className="w-6 h-6 text-[#F7931A]" />
            Criptomonedas (BTC / ETH)
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Monitorea compras, precio promedio y rendimiento en tiempo real.</p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLivePrices}
            disabled={fetchingPrices}
            className="h-10 rounded-xl px-3 text-xs font-bold border-border shrink-0 text-muted-foreground flex items-center gap-1.5"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", fetchingPrices && "animate-spin")} />
            <span className="hidden xs:inline">Actualizar Precios</span>
          </Button>

          {activeSegment === 'spot' ? (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger className="h-10 rounded-xl bg-[#F7931A] hover:bg-[#E28014] text-white text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/15 flex-1 sm:flex-initial px-4 cursor-pointer transition-all">
                <Plus className="w-4 h-4" />
                Registrar Compra
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-2xl border border-border">
                <DialogHeader>
                  <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    <Coins className="w-5 h-5 text-[#F7931A]" />
                    Registrar Compra Cripto
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddTransaction} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Activo</Label>
                      <div className="flex gap-1 bg-muted p-1 rounded-xl border">
                        <button
                          type="button"
                          onClick={() => setSelectedCoin('BTC')}
                          className={cn(
                            "flex-1 py-1.5 rounded-lg text-xs font-black transition-all",
                            selectedCoin === 'BTC' ? "bg-white text-[#F7931A] shadow-sm" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          BTC
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCoin('ETH')}
                          className={cn(
                            "flex-1 py-1.5 rounded-lg text-xs font-black transition-all",
                            selectedCoin === 'ETH' ? "bg-white text-[#627EEA] shadow-sm" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          ETH
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCoin('USDT')}
                          className={cn(
                            "flex-1 py-1.5 rounded-lg text-xs font-black transition-all",
                            selectedCoin === 'USDT' ? "bg-white text-[#26A17B] shadow-sm" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          USDT
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Inversor</Label>
                      <Select value={investor} onValueChange={(v) => setInvestor(v as Investor)}>
                        <SelectTrigger className="rounded-xl h-9 text-xs border-border bg-card">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {investorsList.map((inv) => (
                            <SelectItem key={inv} value={inv} className="text-xs font-semibold">
                              {inv}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="quantity" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Cantidad Comprada ({selectedCoin})
                    </Label>
                    <div className="relative">
                      <Input
                        id="quantity"
                        type="number"
                        step="any"
                        placeholder={selectedCoin === 'USDT' ? "100" : "0.025"}
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                        className="rounded-xl h-10 pr-12 text-xs border-border font-mono font-bold"
                      />
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground">
                        {selectedCoin}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="price-usd" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {selectedCoin === 'USDT' ? 'Precio por USDT (COP)' : 'Precio por Unidad (USD)'}
                    </Label>
                    <div className="relative">
                      {selectedCoin === 'USDT' ? (
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground font-mono">COP$</span>
                      ) : (
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      )}
                      <Input
                        id="price-usd"
                        type="number"
                        step="any"
                        placeholder={selectedCoin === 'USDT' ? "4050" : "67500"}
                        value={purchasePriceUsd}
                        onChange={(e) => setPurchasePriceUsd(e.target.value)}
                        required
                        className={cn(
                          "rounded-xl h-10 text-xs border-border font-mono font-bold",
                          selectedCoin === 'USDT' ? "pl-14" : "pl-9"
                        )}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground italic font-semibold">
                      {selectedCoin === 'USDT' ? (
                        `Equivale aprox a $${purchasePriceUsd && !isNaN(parseFloat(purchasePriceUsd)) ? (parseFloat(purchasePriceUsd) / usdtRate).toFixed(4) : '0'} USD por USDT (TRM actual: ${fmt(usdtRate)} COP)`
                      ) : (
                        `Equivale aprox a ${purchasePriceUsd && !isNaN(parseFloat(purchasePriceUsd)) ? fmt(parseFloat(purchasePriceUsd) * usdtRate) : '$0'} COP (TRM USDT: ${fmt(usdtRate)})`
                      )}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Fecha de Compra
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      required
                      className="rounded-xl h-10 text-xs border-border text-foreground font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Notas / Comentario
                    </Label>
                    <Input
                      id="notes"
                      placeholder="Compra en Binance P2P / Ledger Hardware Wallet"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="rounded-xl h-10 text-xs border-border placeholder:text-muted-foreground/60"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      className="flex-1 rounded-xl h-11 text-xs font-bold border-border text-foreground"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 rounded-xl h-11 bg-[#F7931A] hover:bg-[#E28014] text-white text-xs font-black uppercase tracking-wider"
                    >
                      Guardar Compra
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          ) : (
            <Dialog open={isFutureOpen} onOpenChange={setIsFutureOpen}>
              <DialogTrigger className="h-10 rounded-xl bg-[#627EEA] hover:bg-[#4F66C1] text-white text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/15 flex-1 sm:flex-initial px-4 cursor-pointer transition-all">
                <Plus className="w-4 h-4" />
                Nueva Posición
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-2xl border border-border">
                <DialogHeader>
                  <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#627EEA]" />
                    Registrar Posición de Futuros
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddFuture} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Activo</Label>
                      <Select value={fCoin} onValueChange={setFCoin}>
                        <SelectTrigger className="rounded-xl h-9 text-xs border-border bg-card">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BTC" className="text-xs font-semibold">BTC</SelectItem>
                          <SelectItem value="ETH" className="text-xs font-semibold">ETH</SelectItem>
                          <SelectItem value="SOL" className="text-xs font-semibold">SOL</SelectItem>
                          <SelectItem value="GOLD" className="text-xs font-semibold">Oro (GOLD)</SelectItem>
                          <SelectItem value="SILVER" className="text-xs font-semibold">Plata (SILVER)</SelectItem>
                          <SelectItem value="OIL" className="text-xs font-semibold">Petróleo (OIL)</SelectItem>
                          <SelectItem value="NVDA" className="text-xs font-semibold">Nvidia (NVDA)</SelectItem>
                          <SelectItem value="Otro" className="text-xs font-semibold">Otro (Manual)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Inversor</Label>
                      <Select value={fInvestor} onValueChange={(v) => fInvestor && setFInvestor(v as Investor)}>
                        <SelectTrigger className="rounded-xl h-9 text-xs border-border bg-card">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {investorsList.map((inv) => (
                            <SelectItem key={inv} value={inv} className="text-xs font-semibold">
                              {inv}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo</Label>
                      <div className="flex gap-1 bg-muted p-1 rounded-xl border">
                        <button
                          type="button"
                          onClick={() => setFType('LONG')}
                          className={cn(
                            "flex-1 py-1 px-2 rounded-lg text-xs font-black transition-all",
                            fType === 'LONG' ? "bg-white text-emerald-600 shadow-sm" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          LONG
                        </button>
                        <button
                          type="button"
                          onClick={() => setFType('SHORT')}
                          className={cn(
                            "flex-1 py-1 px-2 rounded-lg text-xs font-black transition-all",
                            fType === 'SHORT' ? "bg-white text-rose-600 shadow-sm" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          SHORT
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="fLeverage" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Apalancamiento
                      </Label>
                      <div className="relative">
                        <Input
                          id="fLeverage"
                          type="number"
                          placeholder="10"
                          value={fLeverage}
                          onChange={(e) => setFLeverage(e.target.value)}
                          required
                          className="rounded-xl h-9 text-xs border-border font-mono font-bold pr-6"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-black">X</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="fMargin" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Margen (USD)
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          id="fMargin"
                          type="number"
                          step="any"
                          placeholder="100"
                          value={fMargin}
                          onChange={(e) => setFMargin(e.target.value)}
                          required
                          className="rounded-xl h-9 pl-7 text-xs border-border font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="fEntryPrice" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Precio Entrada (USD)
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          id="fEntryPrice"
                          type="number"
                          step="any"
                          placeholder={fCoin === 'BTC' ? "67500" : (fCoin === 'ETH' ? "3500" : (fCoin === 'SOL' ? "150" : (fCoin === 'GOLD' ? "2320" : (fCoin === 'SILVER' ? "29.5" : (fCoin === 'OIL' ? "78.5" : (fCoin === 'NVDA' ? "127.4" : "150"))))))}
                          value={fEntryPrice}
                          onChange={(e) => setFEntryPrice(e.target.value)}
                          required
                          className="rounded-xl h-9 pl-7 text-xs border-border font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground bg-muted/40 p-2 rounded-lg font-semibold">
                    Tamaño de Posición: <span className="font-bold text-foreground">
                      {fMargin && fLeverage && fEntryPrice && !isNaN(parseFloat(fMargin)) && !isNaN(parseFloat(fLeverage)) && !isNaN(parseFloat(fEntryPrice))
                        ? fmtUsd(parseFloat(fMargin) * parseFloat(fLeverage))
                        : '$0'}
                    </span> USD | Contratos: <span className="font-bold text-foreground font-mono">
                      {fMargin && fLeverage && fEntryPrice && !isNaN(parseFloat(fMargin)) && !isNaN(parseFloat(fLeverage)) && !isNaN(parseFloat(fEntryPrice))
                        ? ((parseFloat(fMargin) * parseFloat(fLeverage)) / parseFloat(fEntryPrice)).toFixed(5)
                        : '0'}
                    </span> {fCoin === 'Otro' ? 'UNI' : fCoin}
                  </p>

                  <div className="space-y-1.5">
                    <Label htmlFor="fDate" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Fecha de Inversión
                    </Label>
                    <Input
                      id="fDate"
                      type="date"
                      value={fDate}
                      onChange={(e) => setFDate(e.target.value)}
                      required
                      className="rounded-xl h-9 text-xs border-border text-foreground font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fNotes" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Comentarios / Notas
                    </Label>
                    <Input
                      id="fNotes"
                      placeholder="Ej: Binance Futures x10 LONG"
                      value={fNotes}
                      onChange={(e) => setFNotes(e.target.value)}
                      className="rounded-xl h-9 text-xs border-border"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsFutureOpen(false)}
                      className="flex-1 rounded-xl h-10 text-xs font-bold border-border"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 rounded-xl h-10 bg-[#627EEA] hover:bg-[#4F66C1] text-white text-xs font-black uppercase tracking-wider"
                    >
                      Guardar Posición
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Segment switcher */}
      <div className="flex bg-muted p-1 rounded-2xl border border-border max-w-md">
        <button
          onClick={() => setActiveSegment('spot')}
          className={cn(
            "flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer",
            activeSegment === 'spot' 
              ? "bg-white text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Portafolio Hold (Spot)
        </button>
        <button
          onClick={() => setActiveSegment('futures')}
          className={cn(
            "flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer",
            activeSegment === 'futures' 
              ? "bg-white text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Trading de Futuros
        </button>
      </div>

      {/* Real-time Crypto Prices Banner */}
      <div className="bg-muted/30 border border-border/80 rounded-2xl px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-grow">
          <div className="flex items-center gap-2 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-muted-foreground mr-1">Precios de Referencia (Live):</span>
          </div>
          <div className="flex items-center gap-x-4 gap-y-2 ml-1 flex-wrap font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-[#F7931A]">BTC</span>
              <span className="font-mono text-foreground">{fmtUsd(livePrices.btc)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-[#627EEA]">ETH</span>
              <span className="font-mono text-foreground">{fmtUsd(livePrices.eth)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-indigo-500">SOL</span>
              <span className="font-mono text-foreground">{fmtUsd(livePrices.sol)}</span>
            </div>
            <div className="w-[1px] h-3 bg-border hidden sm:block"></div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-yellow-600">Oro</span>
              <span className="font-mono text-foreground">{fmtUsd(livePrices.gold)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-zinc-500">Plata</span>
              <span className="font-mono text-foreground">{fmtUsd(livePrices.silver)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-slate-600">WTI</span>
              <span className="font-mono text-foreground">{fmtUsd(livePrices.oil)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-emerald-500">NVDA</span>
              <span className="font-mono text-foreground">{fmtUsd(livePrices.nvidia)}</span>
            </div>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground/80 font-medium self-end sm:self-auto flex items-center gap-1">
          <Info className="w-3 h-3 text-muted-foreground/55" />
          Precios actualizados: {lastUpdated.toLocaleTimeString()} | TRM USDT: {fmt(usdtRate)}
        </div>
      </div>

      {activeSegment === 'spot' ? (
        <>
          {/* Main Stats Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="border-border/80 rounded-2xl shadow-sm bg-gradient-to-br from-card to-background relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl"></div>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#F7931A]">TOTAL INVERTIDO</p>
                    <h3 className="text-2xl font-black text-foreground mt-1.5 font-mono">
                      {fmtUsd(summary.totalInvestedUsd)}
                    </h3>
                    <p className="text-xs font-semibold text-muted-foreground mt-0.5">{fmt(summary.totalInvestedCop)} COP</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-[#F7931A]/10 flex items-center justify-center text-[#F7931A]">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
                <div className="pt-3 border-t border-border/50 flex justify-between items-center text-[10px] text-muted-foreground font-bold">
                  <span>TRACCIONADO PROPORCIONAL</span>
                  <span className="font-mono">{transactions.length} Registros</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 rounded-2xl shadow-sm bg-gradient-to-br from-card to-background relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-32 h-32 bg-primary/5 rounded-full blur-2xl"></div>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">VALOR PORTAFOLIO</p>
                    <h3 className="text-2xl font-black text-foreground mt-1.5 font-mono">
                      {fmtUsd(summary.totalCurrentValueUsd)}
                    </h3>
                    <p className="text-xs font-semibold text-muted-foreground mt-0.5">{fmt(summary.totalCurrentValueCop)} COP</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                </div>
                <div className="pt-3 border-t border-border/50 flex justify-between items-center text-[10px] text-muted-foreground font-bold">
                  <span>VALUADO A PRECIO SPOT</span>
                  <span className="font-mono text-emerald-500 flex items-center gap-0.5">
                    SPOT LIVE <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              "border-border/80 rounded-2xl shadow-sm bg-gradient-to-br relative overflow-hidden",
              summary.totalProfitUsd >= 0 ? "from-card to-emerald-500/5" : "from-card to-rose-500/5"
            )}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">GANANCIA NO REALIZADA</p>
                    <h3 className={cn(
                      "text-2xl font-black mt-1.5 font-mono flex items-center gap-1.5",
                      summary.totalProfitUsd >= 0 ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {summary.totalProfitUsd >= 0 ? '+' : ''}
                      {fmtUsd(summary.totalProfitUsd)}
                      {summary.totalProfitUsd >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-rose-500 shrink-0" />
                      )}
                    </h3>
                    <p className={cn(
                      "text-xs font-bold mt-0.5",
                      summary.totalProfitUsd >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {summary.totalProfitUsd >= 0 ? '+' : ''}
                      {summary.roiPercentage.toFixed(2)}% ROI
                    </p>
                  </div>
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center",
                    summary.totalProfitUsd >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                  )}>
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="pt-3 border-t border-border/50 flex justify-between items-center text-[10px] text-muted-foreground font-bold">
                  <span>PRECIO PROMEDIO VS ACTUAL</span>
                  <span className={cn("font-mono", summary.totalProfitUsd >= 0 ? "text-emerald-500" : "text-rose-500")}>
                    {summary.totalProfitUsd >= 0 ? '+' : ''}
                    {fmt(summary.totalProfitCop)} COP
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coin specifics widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Bitcoin specific */}
            <Card className="border border-border/80 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#F7931A]/15 flex items-center justify-center text-[#F7931A] font-black text-lg">
                    ₿
                  </div>
                  <div>
                    <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">Bitcoin (BTC)</CardTitle>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground font-bold font-mono">SPOT: {fmtUsd(livePrices.btc)}</span>
                    </div>
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider",
                  summary.btcProfitUsd >= 0 
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                    : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                )}>
                  {summary.btcRoi >= 0 ? '+' : ''}{summary.btcRoi.toFixed(1)}% ROI
                </span>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/20 border border-border/40 rounded-xl grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">Monto en Hold</span>
                    <span className="text-base font-black text-foreground font-mono mt-0.5 block">
                      {fmtCrypto(coinStats.BTC.totalQty, true)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">Precio Promedio Compra</span>
                    <span className="text-base font-black text-foreground font-mono mt-0.5 block">
                      {fmtUsd(coinStats.BTC.avgPriceUsd)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground font-semibold">Total Invertido:</span>
                    <div className="text-right">
                      <span className="font-bold text-foreground font-mono block">{fmtUsd(summary.btcInvestedUsd)}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{fmt(summary.btcInvestedUsd * usdtRate)} COP</span>
                    </div>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground font-semibold">Valor Actual:</span>
                    <div className="text-right">
                      <span className="font-bold text-foreground font-mono block">{fmtUsd(summary.btcCurrentValueUsd)}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{fmt(summary.btcCurrentValueUsd * usdtRate)} COP</span>
                    </div>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground font-bold">Rendimiento Estimado:</span>
                    <div className="text-right">
                      <span className={cn(
                        "font-black font-mono block",
                        summary.btcProfitUsd >= 0 ? "text-emerald-500" : "text-rose-500"
                      )}>
                        {summary.btcProfitUsd >= 0 ? '+' : ''}{fmtUsd(summary.btcProfitUsd)}
                      </span>
                      <span className={cn(
                        "text-[10px] font-bold",
                        summary.btcProfitUsd >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {summary.btcProfitUsd >= 0 ? '+' : ''}{fmt(summary.btcProfitUsd * usdtRate)} COP
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ethereum specific */}
            <Card className="border border-border/80 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#627EEA]/15 flex items-center justify-center text-[#627EEA] font-black text-lg">
                    Ξ
                  </div>
                  <div>
                    <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">Ethereum (ETH)</CardTitle>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground font-bold font-mono">SPOT: {fmtUsd(livePrices.eth)}</span>
                    </div>
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider",
                  summary.ethProfitUsd >= 0 
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                    : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                )}>
                  {summary.ethRoi >= 0 ? '+' : ''}{summary.ethRoi.toFixed(1)}% ROI
                </span>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/20 border border-border/40 rounded-xl grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">Monto en Hold</span>
                    <span className="text-base font-black text-foreground font-mono mt-0.5 block">
                      {fmtCrypto(coinStats.ETH.totalQty, false)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">Precio Promedio Compra</span>
                    <span className="text-base font-black text-foreground font-mono mt-0.5 block">
                      {fmtUsd(coinStats.ETH.avgPriceUsd)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground font-semibold">Total Invertido:</span>
                    <div className="text-right">
                      <span className="font-bold text-foreground font-mono block">{fmtUsd(summary.ethInvestedUsd)}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{fmt(summary.ethInvestedUsd * usdtRate)} COP</span>
                    </div>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground font-semibold">Valor Actual:</span>
                    <div className="text-right">
                      <span className="font-bold text-foreground font-mono block">{fmtUsd(summary.ethCurrentValueUsd)}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{fmt(summary.ethCurrentValueUsd * usdtRate)} COP</span>
                    </div>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground font-bold">Rendimiento Estimado:</span>
                    <div className="text-right">
                      <span className={cn(
                        "font-black font-mono block",
                        summary.ethProfitUsd >= 0 ? "text-emerald-500" : "text-rose-500"
                      )}>
                        {summary.ethProfitUsd >= 0 ? '+' : ''}{fmtUsd(summary.ethProfitUsd)}
                      </span>
                      <span className={cn(
                        "text-[10px] font-bold",
                        summary.ethProfitUsd >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {summary.ethProfitUsd >= 0 ? '+' : ''}{fmt(summary.ethProfitUsd * usdtRate)} COP
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tether USDT specific */}
            <Card className="border border-border/80 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#26A17B]/15 flex items-center justify-center text-[#26A17B] font-black text-lg">
                    ₮
                  </div>
                  <div>
                    <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">Tether (USDT)</CardTitle>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground font-bold font-mono">TRM Actual: {fmt(usdtRate)} COP</span>
                    </div>
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider",
                  summary.usdtProfitCop >= 0 
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                    : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                )}>
                  {summary.usdtRoi >= 0 ? '+' : ''}{summary.usdtRoi.toFixed(1)}% ROI
                </span>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/20 border border-border/40 rounded-xl grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">Monto en Hold</span>
                    <span className="text-base font-black text-foreground font-mono mt-0.5 block">
                      {coinStats.USDT.totalQty.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} USDT
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">Precio Promedio Compra</span>
                    <span className="text-base font-black text-[#26A17B] font-mono mt-0.5 block">
                      {fmt(coinStats.USDT.avgPriceCop)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground font-semibold">Total Invertido COP:</span>
                    <div className="text-right font-mono">
                      <span className="font-bold text-foreground block">{fmt(summary.usdtInvestedCop)} COP</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{fmtUsd(coinStats.USDT.totalSpentUsd)} USD</span>
                    </div>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground font-semibold">Valor Actual TRM:</span>
                    <div className="text-right font-mono">
                      <span className="font-bold text-foreground block">{fmt(summary.usdtCurrentValueCop)} COP</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{fmtUsd(coinStats.USDT.totalQty)} USD</span>
                    </div>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground font-bold">Rendimiento Estimado:</span>
                    <div className="text-right font-mono">
                      <span className={cn(
                        "font-black block",
                        summary.usdtProfitCop >= 0 ? "text-emerald-500" : "text-rose-500"
                      )}>
                        {summary.usdtProfitCop >= 0 ? '+' : ''}{fmt(summary.usdtProfitCop)} COP
                      </span>
                      <span className={cn(
                        "text-[10px] font-bold",
                        summary.usdtProfitCop >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {summary.usdtProfitCop >= 0 ? '+' : ''}{fmtUsd(summary.usdtProfitCop / usdtRate)} USD
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction Records Ledger list */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm">
            <h3 className="text-base font-black text-foreground uppercase tracking-tight mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              Historial de Transacciones
            </h3>

            {transactions.length === 0 ? (
              <div className="text-center py-10 text-sm font-semibold text-muted-foreground">
                No hay registros de compras. Haz clic en "Registrar Compra" para agregar tu primer activo.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground/80 uppercase tracking-widest font-black text-[10px]">
                      <th className="py-3 px-2">Fecha</th>
                      <th className="py-3 px-2">Inversor</th>
                      <th className="py-3 px-2">Activo</th>
                      <th className="py-3 px-2">Cantidad</th>
                      <th className="py-3 px-2 text-right">Precio de Compra (USD)</th>
                      <th className="py-3 px-2 text-right">Inversión Total</th>
                      <th className="py-3 px-2 text-right">SPOT Actual / Valor</th>
                      <th className="py-3 px-2 text-right">Rendimiento (P&L)</th>
                      <th className="py-3 px-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((tx) => {
                        const isBtc = tx.cryptocurrency === 'BTC';
                        const isEth = tx.cryptocurrency === 'ETH';
                        const isUsdt = tx.cryptocurrency === 'USDT';
                        
                        const currentSpot = isBtc ? livePrices.btc : (isEth ? livePrices.eth : 1.0);
                        
                        const totalCostCop = tx.cryptocurrency === 'USDT' 
                          ? tx.quantity * (tx.purchasePriceCop || (tx.purchasePriceUsd * usdtRate))
                          : tx.quantity * tx.purchasePriceUsd * usdtRate;

                        const totalCostUsd = tx.quantity * tx.purchasePriceUsd;
                        const currentValueUsd = tx.quantity * currentSpot;
                        const currentValueCop = tx.quantity * currentSpot * usdtRate;
                        const profitUsd = currentValueUsd - totalCostUsd;
                        const profitCop = currentValueCop - totalCostCop;

                        const roi = isUsdt 
                          ? (totalCostCop > 0 ? (profitCop / totalCostCop) * 100 : 0)
                          : (totalCostUsd > 0 ? (profitUsd / totalCostUsd) * 100 : 0);

                        return (
                          <tr key={tx.id} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                            <td className="py-3 px-2 font-mono text-muted-foreground whitespace-nowrap">{tx.date}</td>
                            <td className="py-3 px-2 font-bold text-foreground">
                              <span className="inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                {tx.investor}
                              </span>
                            </td>
                            <td className="py-3 px-2 font-black">
                              <span className={cn(
                                "px-2 py-0.5 rounded-md border font-mono text-[10px]",
                                isBtc 
                                  ? "bg-amber-50 text-amber-700 border-amber-200" 
                                  : isEth
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              )}>
                                {tx.cryptocurrency}
                              </span>
                            </td>
                            <td className="py-3 px-2 font-mono font-bold text-foreground">
                              {tx.quantity.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 6 })}
                            </td>
                            <td className="py-3 px-2 text-right font-mono text-muted-foreground font-semibold">
                              {isUsdt 
                                ? fmt(tx.purchasePriceCop || tx.purchasePriceUsd * usdtRate) + " COP"
                                : fmtUsd(tx.purchasePriceUsd)}
                            </td>
                            <td className="py-3 px-2 text-right font-mono font-bold text-foreground">
                              {isUsdt ? (
                                <>
                                  <div>{fmt(totalCostCop)} COP</div>
                                  <div className="text-[10px] text-muted-foreground font-medium font-mono">
                                    {fmtUsd(totalCostUsd)} USD
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div>{fmtUsd(totalCostUsd)}</div>
                                  <div className="text-[10px] text-muted-foreground font-medium font-sans">
                                    {fmt(totalCostCop)} COP
                                  </div>
                                </>
                              )}
                            </td>
                            <td className="py-3 px-2 text-right font-mono">
                              {isUsdt ? (
                                <>
                                  <div className="text-foreground font-bold">{fmt(currentValueCop)} COP</div>
                                  <div className="text-[10px] text-muted-foreground font-semibold font-sans">
                                    A {fmt(usdtRate)} TRM
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="text-foreground font-bold">{fmtUsd(currentValueUsd)}</div>
                                  <div className="text-[10px] text-muted-foreground font-semibold font-sans">
                                    A {fmtUsd(currentSpot)} spot
                                  </div>
                                </>
                              )}
                            </td>
                            <td className="py-3 px-2 text-right font-mono">
                              {isUsdt ? (
                                <>
                                  <div className={cn("font-black", profitCop >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                    {profitCop >= 0 ? '+' : ''}{fmt(profitCop)} COP
                                  </div>
                                  <div className={cn("text-[10px] font-bold", profitCop >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                    {profitCop >= 0 ? '+' : ''}{roi.toFixed(1)}% TRM
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className={cn("font-black", profitUsd >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                    {profitUsd >= 0 ? '+' : ''}{fmtUsd(profitUsd)}
                                  </div>
                                  <div className={cn("text-[10px] font-bold", profitUsd >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                    {profitUsd >= 0 ? '+' : ''}{roi.toFixed(1)}%
                                  </div>
                                </>
                              )}
                            </td>
                            <td className="py-3 px-2 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setDeleteId(tx.id);
                                  setDeleteCoin(tx.cryptocurrency);
                                  setDeleteQty(tx.quantity);
                                }}
                                className="h-8 w-8 text-muted-foreground hover:text-rose-500 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Futures Stats Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-sans">
            <Card className="border-border/80 rounded-2xl shadow-sm bg-gradient-to-br from-card to-background relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl"></div>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#627EEA]">Margen Total en Posiciones</p>
                    <h3 className="text-2xl font-black text-foreground mt-1.5 font-mono">
                      {fmtUsd(futuresStats.totalMarginUsd)}
                    </h3>
                    <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                      Abierto: {fmtUsd(futuresStats.totalOpenMarginUsd)} | Cerrado: {fmtUsd(futuresStats.totalClosedMarginUsd)}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-[#627EEA]">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
                <div className="pt-3 border-t border-border/50 flex justify-between items-center text-[10px] text-muted-foreground font-bold">
                  <span>MARGEN ARRIESGADO TOTAL</span>
                  <span className="font-mono">{futures.length} Posiciones</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 rounded-2xl shadow-sm bg-gradient-to-br from-card to-background relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl"></div>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 font-bold">P&L ABIERTO (EN VIVO)</p>
                    <h3 className={cn(
                      "text-2xl font-black mt-1.5 font-mono flex items-center gap-1.5",
                      futuresStats.totalOpenProfitUsd >= 0 ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {futuresStats.totalOpenProfitUsd >= 0 ? '+' : ''}
                      {fmtUsd(futuresStats.totalOpenProfitUsd)}
                    </h3>
                    <p className={cn(
                      "text-xs font-bold mt-0.5",
                      futuresStats.totalOpenProfitUsd >= 0 ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {futuresStats.totalOpenMarginUsd > 0
                        ? `${(futuresStats.totalOpenProfitUsd / futuresStats.totalOpenMarginUsd * 100).toFixed(2)}% ROI`
                        : '0.00% ROI'}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="pt-3 border-t border-border/50 flex justify-between items-center text-[10px] text-muted-foreground font-bold">
                  <span>VALUADO A PRECIO SPOT LIVE</span>
                  <span className="text-emerald-500 font-mono flex items-center gap-0.5 uppercase">SOL / BTC / ETH</span>
                </div>
              </CardContent>
            </Card>

            <Card className={cn(
              "border-border/80 rounded-2xl shadow-sm bg-gradient-to-br relative overflow-hidden",
              futuresStats.overallProfitUsd >= 0 ? "from-card to-emerald-500/5" : "from-card to-rose-500/5"
            )}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">RENDIMIENTO TOTAL FUTUROS</p>
                    <h3 className={cn(
                      "text-2xl font-black mt-1.5 font-mono flex items-center gap-1.5",
                      futuresStats.overallProfitUsd >= 0 ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {futuresStats.overallProfitUsd >= 0 ? '+' : ''}
                      {fmtUsd(futuresStats.overallProfitUsd)}
                    </h3>
                    <p className={cn(
                      "text-xs font-bold mt-0.5",
                      futuresStats.overallProfitUsd >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {futuresStats.overallRoi >= 0 ? '+' : ''}{futuresStats.overallRoi.toFixed(2)}% ROI Total
                    </p>
                  </div>
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center",
                    futuresStats.overallProfitUsd >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                  )}>
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="pt-3 border-t border-border/50 flex justify-between items-center text-[10px] text-muted-foreground font-bold">
                  <span>REALIZADO: {fmtUsd(futuresStats.totalRealizedProfitUsd)}</span>
                  <span className={cn("font-mono font-black", futuresStats.overallProfitUsd >= 0 ? "text-emerald-500" : "text-rose-500")}>
                    {futuresStats.overallProfitUsd >= 0 ? '+' : ''}
                    {fmt(futuresStats.overallProfitUsd * usdtRate)} COP
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Futures Section */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm">
            <h3 className="text-base font-black text-foreground uppercase tracking-tight mb-4 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                Posiciones Abiertas
              </span>
              <span className="text-xs text-muted-foreground font-semibold font-mono uppercase">
                {futures.filter(f => f.status === 'OPEN').length} Abiertas
              </span>
            </h3>

            {futures.filter(f => f.status === 'OPEN').length === 0 ? (
              <div className="text-center py-10 text-sm font-semibold text-muted-foreground">
                No tienes posiciones de futuros abiertas en este momento. Haz clic en "Nueva Posición" para registrar una.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground/80 uppercase tracking-widest font-black text-[10px]">
                      <th className="py-3 px-2">Fecha</th>
                      <th className="py-3 px-2">Inversor</th>
                      <th className="py-3 px-2">Activo/Dirección</th>
                      <th className="py-3 px-2 text-right">Apalancamiento</th>
                      <th className="py-3 px-2 text-right">Margen</th>
                      <th className="py-3 px-2 text-right">Entrada (USD)</th>
                      <th className="py-3 px-2 text-right">Precio Spot actual</th>
                      <th className="py-3 px-2 text-right">P&L Estimado</th>
                      <th className="py-3 px-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                     {futures
                      .filter(f => f.status === 'OPEN')
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((f) => {
                        const isBtc = f.cryptocurrency === 'BTC';
                        const isEth = f.cryptocurrency === 'ETH';
                        const isSol = f.cryptocurrency === 'SOL';
                        const isGold = f.cryptocurrency === 'GOLD' || f.cryptocurrency === 'Oro';
                        const isSilver = f.cryptocurrency === 'SILVER' || f.cryptocurrency === 'Plata';
                        const isOil = f.cryptocurrency === 'OIL' || f.cryptocurrency === 'Petróleo';
                        const isNvidia = f.cryptocurrency === 'NVDA' || f.cryptocurrency === 'Nvidia';
                        
                        const priceSpot = isBtc ? livePrices.btc : 
                                       isEth ? livePrices.eth : 
                                       isSol ? livePrices.sol : 
                                       isGold ? livePrices.gold : 
                                       isSilver ? livePrices.silver : 
                                       isOil ? livePrices.oil : 
                                       isNvidia ? livePrices.nvidia : 
                                       f.entryPrice;
                        
                        const qty = f.quantity || ((f.marginUsd * f.leverage) / f.entryPrice);
                        let pnl = 0;
                        if (f.type === 'LONG') {
                          pnl = qty * (priceSpot - f.entryPrice);
                        } else {
                          pnl = qty * (f.entryPrice - priceSpot);
                        }
                        const pnlRoi = f.marginUsd > 0 ? (pnl / f.marginUsd) * 100 : 0;

                        return (
                          <tr key={f.id} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                            <td className="py-3 px-2 font-mono text-muted-foreground whitespace-nowrap">{f.date}</td>
                            <td className="py-3 px-2 font-bold text-foreground">
                              <span className="inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                {f.investor}
                              </span>
                            </td>
                            <td className="py-3 px-2 font-black">
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-md border font-mono text-[10px]",
                                  isBtc ? "bg-amber-50 text-amber-700 border-amber-200" : 
                                  isEth ? "bg-blue-50 text-blue-700 border-blue-200" : 
                                  isSol ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                  isGold ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                  isSilver ? "bg-zinc-100 text-zinc-700 border-zinc-200" :
                                  isOil ? "bg-slate-100 text-slate-800 border-slate-300" :
                                  isNvidia ? "bg-emerald-50 text-emerald-700 border-emerald-300" :
                                  "bg-purple-50 text-purple-700 border-purple-200"
                                )}>
                                  {f.cryptocurrency}
                                </span>
                                <span className={cn(
                                  "text-[10px] uppercase font-black px-1.5 py-0.5 rounded-md",
                                  f.type === 'LONG' ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600"
                                )}>
                                  {f.type}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-right font-mono font-extrabold text-foreground">{f.leverage}x</td>
                            <td className="py-3 px-2 text-right font-mono font-bold text-foreground">{fmtUsd(f.marginUsd)}</td>
                            <td className="py-3 px-2 text-right font-mono text-muted-foreground font-bold">{fmtUsd(f.entryPrice)}</td>
                            <td className="py-3 px-2 text-right font-mono text-foreground font-black">{fmtUsd(priceSpot)}</td>
                            <td className="py-3 px-2 text-right font-mono">
                              <div className={cn("font-black text-sm", pnl >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                {pnl >= 0 ? '+' : ''}{fmtUsd(pnl)}
                              </div>
                              <div className={cn("text-[10px] font-bold", pnl >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                {pnl >= 0 ? '+' : ''}{pnlRoi.toFixed(1)}% ROI
                              </div>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCloseFutureId(f.id!)}
                                  className="h-8 rounded-xl px-2.5 text-xs font-extrabold uppercase border-[#627EEA]/20 bg-indigo-500/5 hover:bg-[#627EEA] hover:text-white text-[#627EEA] shrink-0"
                                >
                                  Cerrar Posición
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setDeleteFutureId(f.id!);
                                  }}
                                  className="h-8 w-8 text-muted-foreground hover:text-rose-500 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Closed Positions History */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm">
            <h3 className="text-base font-black text-foreground uppercase tracking-tight mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              Historial de Posiciones Cerradas (Realizado)
            </h3>

            {futures.filter(f => f.status === 'CLOSED').length === 0 ? (
              <div className="text-center py-10 text-sm font-semibold text-muted-foreground">
                No tienes posiciones de futuros cerradas aún en el historial.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground/80 uppercase tracking-widest font-black text-[10px]">
                      <th className="py-3 px-2">Fecha</th>
                      <th className="py-3 px-2">Inversor</th>
                      <th className="py-3 px-2">Activo/Dirección</th>
                      <th className="py-3 px-2 text-right">Monto Apalancado</th>
                      <th className="py-3 px-2 text-right">Margen</th>
                      <th className="py-3 px-2 text-right">Entrada (USD)</th>
                      <th className="py-3 px-2 text-right">Salida (USD)</th>
                      <th className="py-3 px-2 text-right">Ganancia/Pérdida Realizada</th>
                      <th className="py-3 px-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {futures
                      .filter(f => f.status === 'CLOSED')
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((f) => {
                        const isBtc = f.cryptocurrency === 'BTC';
                        const isEth = f.cryptocurrency === 'ETH';
                        const isSol = f.cryptocurrency === 'SOL';
                        const isGold = f.cryptocurrency === 'GOLD' || f.cryptocurrency === 'Oro';
                        const isSilver = f.cryptocurrency === 'SILVER' || f.cryptocurrency === 'Plata';
                        const isOil = f.cryptocurrency === 'OIL' || f.cryptocurrency === 'Petróleo';
                        const isNvidia = f.cryptocurrency === 'NVDA' || f.cryptocurrency === 'Nvidia';
                        
                        const qty = f.quantity || ((f.marginUsd * f.leverage) / f.entryPrice);
                        const exit = f.exitPrice || f.entryPrice;
                        let pnl = 0;
                        if (f.type === 'LONG') {
                          pnl = qty * (exit - f.entryPrice);
                        } else {
                          pnl = qty * (f.entryPrice - exit);
                        }
                        const pnlRoi = f.marginUsd > 0 ? (pnl / f.marginUsd) * 100 : 0;

                        return (
                          <tr key={f.id} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                            <td className="py-3 px-2 font-mono text-muted-foreground whitespace-nowrap">{f.date}</td>
                            <td className="py-3 px-2 font-bold text-foreground">{f.investor}</td>
                            <td className="py-3 px-2 font-black">
                              <span className="inline-flex gap-1">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-md border font-mono text-[10px]",
                                  isBtc ? "bg-amber-50 text-amber-700 border-amber-200" : 
                                  isEth ? "bg-blue-50 text-blue-700 border-blue-200" : 
                                  isSol ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                  isGold ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                                  isSilver ? "bg-zinc-100 text-zinc-700 border-zinc-200" :
                                  isOil ? "bg-slate-100 text-slate-800 border-slate-300" :
                                  isNvidia ? "bg-emerald-50 text-emerald-700 border-emerald-300" :
                                  "bg-purple-50 text-purple-700 border-purple-200"
                                )}>
                                  {f.cryptocurrency}
                                </span>
                                <span className={cn(
                                  "text-[10px] uppercase font-black px-1.5 py-0.5 rounded-md",
                                  f.type === 'LONG' ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600"
                                )}>
                                  {f.type} {f.leverage}x
                                </span>
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right font-mono font-bold text-foreground">
                              {fmtUsd(f.marginUsd * f.leverage)}
                            </td>
                            <td className="py-3 px-2 text-right font-mono text-muted-foreground font-semibold">{fmtUsd(f.marginUsd)}</td>
                            <td className="py-3 px-2 text-right font-mono text-muted-foreground">{fmtUsd(f.entryPrice)}</td>
                            <td className="py-3 px-2 text-right font-mono text-foreground font-bold">{fmtUsd(exit)}</td>
                            <td className="py-3 px-2 text-right font-mono">
                              <div className={cn("font-black", pnl >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                {pnl >= 0 ? '+' : ''}{fmtUsd(pnl)}
                              </div>
                              <div className={cn("text-[10px] font-bold", pnl >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                {pnl >= 0 ? '+' : ''}{pnlRoi.toFixed(1)}%
                              </div>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setDeleteFutureId(f.id!);
                                }}
                                className="h-8 w-8 text-muted-foreground hover:text-rose-500 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Diálogo de Confirmación de Eliminación Spot */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight text-rose-500 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Confirmar Eliminación
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              ¿Está seguro de que desea eliminar permanentemente este registro de compra de <span className="font-extrabold text-foreground">{deleteQty} {deleteCoin}</span>? Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl h-11 text-xs font-bold border-border text-foreground cursor-pointer"
              >
                No, Cancelar
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  if (deleteId) {
                    await deleteCryptoTransaction(deleteId);
                    setDeleteId(null);
                  }
                }}
                className="flex-1 rounded-xl h-11 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Sí, Eliminar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmación de Eliminación Futuro */}
      <Dialog open={!!deleteFutureId} onOpenChange={(open) => !open && setDeleteFutureId(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight text-rose-500 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Eliminar Posición Futuro
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              ¿Está seguro de que desea eliminar permanentemente esta posición de futuro? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteFutureId(null)}
                className="flex-1 rounded-xl h-11 text-xs font-bold border-border text-foreground cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  if (deleteFutureId) {
                    await deleteCryptoFuture(deleteFutureId);
                    setDeleteFutureId(null);
                  }
                }}
                className="flex-1 rounded-xl h-11 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Sí, Eliminar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Cierre de Posición de Futuro */}
      <Dialog open={!!closeFutureId} onOpenChange={(open) => !open && setCloseFutureId(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              Cerrar Posición de Futuro
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCloseFuture} className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Ingrese el precio de salida/cierre de la posición para calcular la ganancia o pérdida final.
            </p>
            {(() => {
              const f = futures.find(item => item.id === closeFutureId);
              if (!f) return null;
              const isBtc = f.cryptocurrency === 'BTC';
              const isEth = f.cryptocurrency === 'ETH';
              const isSol = f.cryptocurrency === 'SOL';
              const isGold = f.cryptocurrency === 'GOLD' || f.cryptocurrency === 'Oro';
              const isSilver = f.cryptocurrency === 'SILVER' || f.cryptocurrency === 'Plata';
              const isOil = f.cryptocurrency === 'OIL' || f.cryptocurrency === 'Petróleo';
              const isNvidia = f.cryptocurrency === 'NVDA' || f.cryptocurrency === 'Nvidia';
              const priceSpot = isBtc ? livePrices.btc : 
                             isEth ? livePrices.eth : 
                             isSol ? livePrices.sol : 
                             isGold ? livePrices.gold : 
                             isSilver ? livePrices.silver : 
                             isOil ? livePrices.oil : 
                             isNvidia ? livePrices.nvidia : 
                             f.entryPrice;
              return (
                <div className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/85 flex flex-col gap-0.5">
                  <div>Activo: <span className="font-extrabold text-[#627EEA]">{f.cryptocurrency}</span> ({f.type})</div>
                  <div>Precio de Entrada: <span className="font-bold text-foreground font-mono">{fmtUsd(f.entryPrice)}</span></div>
                  <div>Precio Actual (Referencia): <span className="font-bold text-emerald-600 font-mono">{fmtUsd(priceSpot)}</span></div>
                </div>
              );
            })()}
            <div className="space-y-1.5">
              <Label htmlFor="exitPrice" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Precio de Cierre (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="exitPrice"
                  type="number"
                  step="any"
                  placeholder="Precio de Salida"
                  value={closeExitPrice}
                  onChange={(e) => setCloseExitPrice(e.target.value)}
                  required
                  className="rounded-xl h-10 pl-8 text-sm border-border font-bold font-mono"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCloseFutureId(null)}
                className="flex-1 rounded-xl h-10 text-xs font-bold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 rounded-xl h-10 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider"
              >
                Cerrar Posición
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
