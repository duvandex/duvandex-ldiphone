import React, { useState, useEffect } from 'react';
import { 
  onSnapshot, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  runTransaction,
  query,
  where,
  orderBy,
  limit,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, handleFirestoreError } from '../lib/firebase';
import { AppData, Product, Debtor, Liability, Expense, Investor, PaymentMethod, FinancialAccount, CryptoTransaction, CryptoFuture } from '../types';
import { INITIAL_PRODUCTS, INITIAL_DEBTORS, INITIAL_LIABILITIES } from '../constants';

export function useAppData() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<AppData>({
    products: [],
    debtors: [],
    liabilities: [],
    invoiceCounter: 15,
    accounts: [],
    expenses: [],
    cryptoTransactions: [],
    cryptoFutures: [],
    settings: {
      companyName: 'LDIPHONE',
      warrantyTerms: 'La garantía cubre defectos de fábrica. No cubre daños por humedad, golpes o mal uso.',
      defaultWarrantyMonths: 3,
      paymentMethods: []
    }
  });
  const [loading, setLoading] = useState(true);
  const [usdtRate, setUsdtRate] = useState<number>(4000);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [searchedProduct, setSearchedProduct] = useState<Product | null>(null);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=cop');
        if (!response.ok) throw new Error('API response not ok');
        const data = await response.json();
        if (data.tether && data.tether.cop) {
          setUsdtRate(data.tether.cop);
        }
      } catch (err) {
        console.warn("Error fetching USDT rate, using fallback", err);
        // Fallback to a reasonable default if API fails
        setUsdtRate(prev => prev || 4000);
      }
    };
    fetchRate();
    const interval = setInterval(fetchRate, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleQuotaError = (err: any) => {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota')) {
      setIsQuotaExceeded(true);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    let unsubProducts: () => void;

    if (user) {
      // ADMIN: See EVERYTHING
      const qAll = query(collection(db, 'products'), limit(1000));
      unsubProducts = onSnapshot(qAll, (snapshot) => {
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setData(prev => ({ ...prev, products }));
        setLoading(false);
        setIsQuotaExceeded(false);
      }, (err) => {
        console.error("All Products error:", err);
        handleQuotaError(err);
        setLoading(false);
      });
    } else {
      // PUBLIC: See all products (we filter in Catalog.tsx)
      const qPublic = query(collection(db, 'products'), limit(500));
      unsubProducts = onSnapshot(qPublic, (snapshot) => {
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setData(prev => ({ ...prev, products }));
        setLoading(false);
        setIsQuotaExceeded(false);
      }, (err) => {
        console.error("Public Products error:", err);
        handleQuotaError(err);
        setLoading(false);
      });
    }

    return () => unsubProducts && unsubProducts();
  }, [user]);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'app_settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const snapData = snapshot.data();
        setData(prev => ({ 
          ...prev, 
          invoiceCounter: snapData.invoiceCounter || prev.invoiceCounter,
          settings: {
            companyName: snapData.companyName || prev.settings.companyName,
            companyLogo: snapData.companyLogo,
            warrantyTerms: snapData.warrantyTerms || prev.settings.warrantyTerms,
            defaultWarrantyMonths: snapData.defaultWarrantyMonths || prev.settings.defaultWarrantyMonths,
            paymentMethods: snapData.paymentMethods || [],
          }
        }));
      }
      setIsQuotaExceeded(false);
    }, handleQuotaError);

    if (!user) return () => unsubSettings();

    const unsubDebtors = onSnapshot(collection(db, 'debtors'), (snapshot) => {
      const debtors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Debtor));
      setData(prev => ({ ...prev, debtors }));
      setIsQuotaExceeded(false);
    }, handleQuotaError);

    const unsubLiabilities = onSnapshot(collection(db, 'liabilities'), (snapshot) => {
      const liabilities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Liability));
      setData(prev => ({ ...prev, liabilities }));
      setIsQuotaExceeded(false);
    }, handleQuotaError);

    const unsubAccounts = onSnapshot(collection(db, 'accounts'), (snapshot) => {
      const accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialAccount));
      setData(prev => ({ ...prev, accounts }));
      setIsQuotaExceeded(false);
    }, handleQuotaError);

    const unsubExpenses = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      setData(prev => ({ ...prev, expenses }));
      setIsQuotaExceeded(false);
    }, handleQuotaError);

    const unsubCrypto = onSnapshot(collection(db, 'crypto_transactions'), (snapshot) => {
      const cryptoTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CryptoTransaction));
      setData(prev => ({ ...prev, cryptoTransactions }));
      setIsQuotaExceeded(false);
    }, handleQuotaError);

    const unsubCryptoFutures = onSnapshot(collection(db, 'crypto_futures'), (snapshot) => {
      const cryptoFutures = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CryptoFuture));
      setData(prev => ({ ...prev, cryptoFutures }));
      setIsQuotaExceeded(false);
    }, handleQuotaError);

    return () => {
      unsubDebtors && unsubDebtors();
      unsubLiabilities && unsubLiabilities();
      unsubAccounts && unsubAccounts();
      unsubExpenses && unsubExpenses();
      unsubCrypto && unsubCrypto();
      unsubCryptoFutures && unsubCryptoFutures();
      unsubSettings && unsubSettings();
    };
  }, [user]);

  const initializeDatabase = async () => {
    if (!user || user.email !== 'duvanmarinj@gmail.com') return;
    
    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        // Init Settings
        transaction.set(doc(db, 'app_settings', 'global'), { 
          invoiceCounter: 15,
          companyName: 'LDIPHONE',
          warrantyTerms: 'La garantía cubre defectos de fábrica. No cubre daños por humedad, golpes o mal uso.',
          defaultWarrantyMonths: 3
        });

        // Init Accounts
        const investors: Investor[] = ['Duvan', 'Lina', 'Santiago', 'Johana', 'Pool', 'Santa Maria', 'Thomas'];
        const methods: PaymentMethod[] = ['Efectivo', 'Bancolombia', 'Nequi', 'Banco de Bogota', 'Cripto (USDT)'];
        
        investors.forEach(inv => {
          methods.forEach(met => {
            if (met === 'Cripto (USDT)' && inv !== 'Duvan') return;
            const id = `${inv}-${met}`;
            transaction.set(doc(db, 'accounts', id), {
              id,
              investor: inv,
              method: met,
              name: met,
              balance: 0
            });
          });
        });

        // Init Data from constants
        INITIAL_PRODUCTS.forEach(p => {
          transaction.set(doc(db, 'products', p.id), p);
        });
        INITIAL_DEBTORS.forEach(d => {
          transaction.set(doc(db, 'debtors', d.id), d);
        });
        INITIAL_LIABILITIES.forEach(l => {
          transaction.set(doc(db, 'liabilities', l.id), l);
        });
      });
      alert('Base de datos inicializada con éxito.');
    } catch (err) {
      console.error("Error initializing DB", err);
      alert('Error al inicializar: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    try {
      const id = Math.random().toString(36).substr(2, 9);
      const docRef = doc(db, 'products', id);
      const newProduct: Product = {
        ...product,
        id,
        initialQuantity: product.quantity,
        status: product.status || 'stock',
      };

      await runTransaction(db, async (transaction) => {
        // Collect all potential account references to read FIRST
        const accountOps: { ref: any, amount: number, id: string, investor?: Investor, method?: PaymentMethod }[] = [];
        
        if (newProduct.purchaseSources && newProduct.purchaseSources.length > 0) {
          for (const src of newProduct.purchaseSources) {
            const [inv, met] = src.accountId.split('-');
            accountOps.push({
              ref: doc(db, 'accounts', src.accountId),
              amount: src.amount,
              id: src.accountId,
              investor: inv as Investor,
              method: met as PaymentMethod
            });
          }
        } else if (newProduct.coInvestors && newProduct.coInvestors.length > 0) {
          for (const co of newProduct.coInvestors) {
            const methodUsed = co.method || newProduct.purchaseMethod || 'Efectivo';
            const accountId = `${co.investor}-${methodUsed}`;
            const totalCOP = (newProduct.purchasePrice * newProduct.quantity) * (co.percentage / 100);
            const amount = methodUsed === 'Cripto (USDT)' ? totalCOP / usdtRate : totalCOP;
            accountOps.push({ 
              ref: doc(db, 'accounts', accountId), 
              amount, 
              id: accountId, 
              investor: co.investor, 
              method: methodUsed 
            });
          }
        } else {
          const methodUsed = newProduct.purchaseMethod || 'Efectivo';
          const accountId = `${newProduct.investor}-${methodUsed}`;
          const totalCOP = newProduct.purchasePrice * newProduct.quantity;
          const amount = methodUsed === 'Cripto (USDT)' ? totalCOP / usdtRate : totalCOP;
          accountOps.push({ 
            ref: doc(db, 'accounts', accountId), 
            amount, 
            id: accountId, 
            investor: newProduct.investor, 
            method: methodUsed 
          });
        }

        // 1. Perform all READS
        const accountSnapshots = await Promise.all(accountOps.map(op => transaction.get(op.ref)));

        // 2. Perform all WRITES
        accountOps.forEach((op, idx) => {
          const accountDoc = accountSnapshots[idx];
          if (accountDoc.exists()) {
            const currentBalance = (accountDoc.data() as any).balance || 0;
            transaction.update(op.ref, { balance: currentBalance - op.amount });
          } else {
            transaction.set(op.ref, {
              id: op.id,
              investor: op.investor,
              method: op.method,
              name: op.method,
              balance: -op.amount
            });
          }
        });

        transaction.set(docRef, newProduct);
      });
    } catch (err) {
      handleFirestoreError(err, 'create', 'products');
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product> & { sellQuantity?: number; amountToBalance?: number }) => {
    try {
      await runTransaction(db, async (transaction) => {
        const productRef = doc(db, 'products', id);
        const productDoc = await transaction.get(productRef); // READ
        if (!productDoc.exists()) return;
        const product = productDoc.data() as Product;

        const settingsRef = doc(db, 'app_settings', 'global');
        const settingsDoc = await transaction.get(settingsRef); // READ

        const sellQty = updates.sellQuantity || 1;
        
        // Financial logic: how much money is entering NOW?
        let incomeAmount = 0;
        const saleMethod = updates.saleMethod || product.saleMethod || 'Efectivo';

        if (updates.status === 'sold') {
          // If it was reserved, we only add the PENDING balance. 
          // If it was stock, we add the TOTAL sale price.
          const totalPrice = (updates.salePrice || product.salePrice || 0) * sellQty;
          const alreadyPaid = product.status === 'reserved' ? (product.reservationAmount || 0) : 0;
          incomeAmount = totalPrice - alreadyPaid;
        } else if (updates.amountToBalance) {
          // Explicit amount being added (like a new reservation installment)
          incomeAmount = updates.amountToBalance;
        }

        const adjustedIncome = saleMethod === 'Cripto (USDT)' ? incomeAmount / usdtRate : incomeAmount;
        const incomeOps: { ref: any, amount: number, id: string, investor: Investor, method: PaymentMethod }[] = [];

        if (incomeAmount > 0) {
          const targetInvestor = product.investor || 'Duvan'; // Fallback to Duvan if investor missing
          if (product.coInvestors && product.coInvestors.length > 0) {
            for (const co of product.coInvestors) {
              const accountId = `${co.investor}-${saleMethod}`;
              const share = adjustedIncome * (co.percentage / 100);
              incomeOps.push({ ref: doc(db, 'accounts', accountId), amount: share, id: accountId, investor: co.investor, method: saleMethod });
            }
          } else {
            const accountId = `${targetInvestor}-${saleMethod}`;
            incomeOps.push({ ref: doc(db, 'accounts', accountId), amount: adjustedIncome, id: accountId, investor: targetInvestor, method: saleMethod });
          }
        }

        // Perform all READS for accounts
        const incomeSnapshots = await Promise.all(incomeOps.map(op => transaction.get(op.ref)));

        // --- WRITES ---
        let finalInvoiceNumber = updates.invoiceNumber;
        if (updates.status === 'sold' && !finalInvoiceNumber) {
          const currentCounter = settingsDoc.exists() ? (settingsDoc.data() as any).invoiceCounter || 1 : 1;
          finalInvoiceNumber = `FAC-${String(currentCounter).padStart(3, '0')}`;
          transaction.set(settingsRef, { invoiceCounter: currentCounter + 1 }, { merge: true });
        }

        const cleanObject = (obj: any) => {
          const newObj: any = {};
          Object.keys(obj).forEach(key => {
            if (obj[key] !== undefined) {
              newObj[key] = obj[key];
            }
          });
          return newObj;
        };

        if (updates.status === 'sold') {
          const currentQty = product.quantity || 1;
          const isSalePartial = sellQty < currentQty;

          if (isSalePartial) {
            transaction.update(productRef, {
              quantity: currentQty - sellQty,
              status: product.status // Keep it status (could be stock or reserved)
            });

            const newSoldId = Math.random().toString(36).substr(2, 9);
            const soldEntry: Product = cleanObject({
              ...product,
              id: newSoldId,
              status: 'sold',
              quantity: sellQty,
              salePrice: updates.salePrice ?? product.salePrice,
              saleDate: updates.saleDate ?? new Date().toISOString().split('T')[0],
              buyer: updates.buyer ?? product.buyer ?? '',
              invoiceNumber: finalInvoiceNumber,
              saleMethod: updates.saleMethod ?? product.saleMethod ?? 'Efectivo',
              originalProductId: id,
            });
            transaction.set(doc(db, 'products', newSoldId), soldEntry);
          } else {
            const { sellQuantity, amountToBalance, ...updatesToSend } = updates;
            const finalUpdates = cleanObject({ ...updatesToSend, invoiceNumber: finalInvoiceNumber });
            transaction.update(productRef, finalUpdates);
          }
        } else {
          const { sellQuantity, amountToBalance, ...updatesToSend } = updates;
          transaction.update(productRef, cleanObject(updatesToSend));
        }

        // Apply account updates
        incomeOps.forEach((op, idx) => {
          const accountDoc = incomeSnapshots[idx];
          if (accountDoc.exists()) {
            const currentBalance = (accountDoc.data() as any).balance || 0;
            transaction.update(op.ref, { balance: currentBalance + op.amount });
          } else {
            transaction.set(op.ref, {
              id: op.id,
              investor: op.investor,
              method: op.method,
              name: op.method,
              balance: op.amount
            });
          }
        });
      });
    } catch (err) {
      handleFirestoreError(err, 'update', `products/${id}`);
    }
  };

  const processBulkSale = async (items: {
    productId: string;
    salePrice: number;
    sellQuantity: number;
    discount?: number;
    discountType?: 'fixed' | 'percentage';
    warrantyMonths: number;
    warrantyExpiration: string;
  }[], commonData: {
    buyer: string;
    saleDate: string;
    saleMethod: PaymentMethod;
  }) => {
    try {
      await runTransaction(db, async (transaction) => {
        // --- 1. ALL READS FIRST ---
        
        // Settings read
        const settingsRef = doc(db, 'app_settings', 'global');
        const settingsDoc = await transaction.get(settingsRef);
        
        // Products read
        const productRefs = items.map(item => doc(db, 'products', item.productId));
        const productSnapshots = await Promise.all(productRefs.map(ref => transaction.get(ref)));
        
        // Identify all unique accounts needed from products
        const uniqueAccountIds = new Set<string>();
        for (const snap of productSnapshots) {
          if (!snap.exists()) continue;
          const product = snap.data() as Product;
          const targetInvestors = (product.coInvestors?.length ? product.coInvestors : [{ investor: product.investor }]);
          
          for (const co of targetInvestors) {
            uniqueAccountIds.add(`${co.investor}-${commonData.saleMethod}`);
          }
        }

        // Accounts read
        const accountRefs = Array.from(uniqueAccountIds).map(id => doc(db, 'accounts', id));
        const accountSnapshots = await Promise.all(accountRefs.map(ref => transaction.get(ref)));
        const accountMap = new Map(accountSnapshots.map((snap, i) => [Array.from(uniqueAccountIds)[i], snap]));

        // --- 2. LOGIC AND WRITES ---

        const currentCounter = settingsDoc.exists() ? (settingsDoc.data() as any).invoiceCounter || 1 : 1;
        const invoiceNumber = `FAC-${String(currentCounter).padStart(3, '0')}`;
        
        // Track account balance changes
        const accountBalanceUpdates = new Map<string, number>();

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const productSnap = productSnapshots[i];
          if (!productSnap.exists()) continue;
          const product = productSnap.data() as Product;
          
          let finalPrice = item.salePrice;
          let discountValuePerUnit = 0;
          if (item.discount && item.discount > 0) {
            if (item.discountType === 'percentage') {
              discountValuePerUnit = item.salePrice * (item.discount / 100);
              finalPrice = item.salePrice - discountValuePerUnit;
            } else {
              discountValuePerUnit = item.discount;
              finalPrice = item.salePrice - discountValuePerUnit;
            }
          }

          const incomeCOP = finalPrice * item.sellQuantity;
          const alreadyPaid = product.status === 'reserved' ? (product.reservationAmount || 0) : 0;
          const pendingIncome = incomeCOP - alreadyPaid;
          
          if (pendingIncome > 0) {
            const adjustedIncome = commonData.saleMethod === 'Cripto (USDT)' ? pendingIncome / usdtRate : pendingIncome;
            const targetInvestors = (product.coInvestors?.length ? product.coInvestors : [{ investor: product.investor, percentage: 100 }]);

            for (const co of targetInvestors) {
              const accountId = `${co.investor}-${commonData.saleMethod}`;
              const share = adjustedIncome * (co.percentage / 100);
              accountBalanceUpdates.set(accountId, (accountBalanceUpdates.get(accountId) || 0) + share);
            }
          }

          const currentQty = product.quantity || 1;
          const isSalePartial = item.sellQuantity < currentQty;

          if (isSalePartial) {
            transaction.update(productRefs[i], {
              quantity: currentQty - item.sellQuantity,
            });

            const newSoldId = Math.random().toString(36).substr(2, 9);
            const soldEntry = {
              ...product,
              id: newSoldId,
              status: 'sold',
              quantity: item.sellQuantity,
              salePrice: finalPrice,
              saleDate: commonData.saleDate,
              buyer: commonData.buyer,
              invoiceNumber: invoiceNumber,
              saleMethod: commonData.saleMethod,
              warrantyMonths: item.warrantyMonths,
              warrantyExpiration: item.warrantyExpiration,
              discount: item.discount,
              discountType: item.discountType,
              originalProductId: item.productId,
              warrantyTerms: data.settings.warrantyTerms,
            };
            transaction.set(doc(db, 'products', newSoldId), soldEntry);
          } else {
            transaction.update(productRefs[i], {
              status: 'sold',
              salePrice: finalPrice,
              saleDate: commonData.saleDate,
              buyer: commonData.buyer,
              invoiceNumber: invoiceNumber,
              saleMethod: commonData.saleMethod,
              warrantyMonths: item.warrantyMonths,
              warrantyExpiration: item.warrantyExpiration,
              discount: item.discount,
              discountType: item.discountType,
              warrantyTerms: data.settings.warrantyTerms,
            });
          }
        }

        // Apply Account writes
        for (const [accountId, balanceChange] of accountBalanceUpdates.entries()) {
          const accSnap = accountMap.get(accountId);
          const [inv, met] = accountId.split('-');
          if (accSnap && accSnap.exists()) {
            transaction.update(accSnap.ref, { balance: (accSnap.data() as any).balance + balanceChange });
          } else {
            transaction.set(doc(db, 'accounts', accountId), {
              id: accountId,
              investor: inv,
              method: met,
              name: met,
              balance: balanceChange
            });
          }
        }

        // Increment Invoice Counter
        transaction.update(settingsRef, { invoiceCounter: currentCounter + 1 });
      });
    } catch (err) {
      handleFirestoreError(err, 'write', 'bulk_sale');
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    try {
      const id = Math.random().toString(36).substr(2, 9);
      const expenseRef = doc(db, 'expenses', id);
      const accountId = `${expense.investor}-${expense.method}`;
      const accountRef = doc(db, 'accounts', accountId);

      await runTransaction(db, async (transaction) => {
        // --- 1. LECTURAS (GETS) ---
        const accountDoc = await transaction.get(accountRef);

        // --- 2. ESCRITURAS ---
        transaction.set(expenseRef, { ...expense, id });
        const adjustedAmount = expense.method === 'Cripto (USDT)' ? expense.amount / usdtRate : expense.amount;

        if (accountDoc.exists()) {
          transaction.update(accountRef, {
            balance: accountDoc.data().balance - adjustedAmount
          });
        } else {
          transaction.set(accountRef, {
            id: accountId,
            investor: expense.investor,
            method: expense.method,
            name: expense.method,
            balance: -adjustedAmount
          });
        }
      });
    } catch (err) {
      handleFirestoreError(err, 'create', 'expenses');
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        // --- 1. LECTURAS (GETS) ---
        const expenseRef = doc(db, 'expenses', id);
        const expenseDoc = await transaction.get(expenseRef);
        if (!expenseDoc.exists()) return;

        const expense = expenseDoc.data() as Expense;
        const adjustedAmount = expense.method === 'Cripto (USDT)' ? expense.amount / usdtRate : expense.amount;

        const accountRef = doc(db, 'accounts', `${expense.investor}-${expense.method}`);
        const accountDoc = await transaction.get(accountRef);

        // --- 2. ESCRITURAS ---
        transaction.delete(expenseRef);
        if (accountDoc.exists()) {
          transaction.update(accountRef, {
            balance: accountDoc.data().balance + adjustedAmount
          });
        }
      });
    } catch (err) {
      handleFirestoreError(err, 'delete', `expenses/${id}`);
    }
  };

  const updateAccountBalance = async (accountId: string, newBalance: number) => {
    try {
      const accountRef = doc(db, 'accounts', accountId);
      const [investor, method] = accountId.split('-');
      await setDoc(accountRef, { 
        balance: newBalance,
        investor,
        method,
        name: method,
        id: accountId
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, 'update', `accounts/${accountId}`);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', `products/${id}`);
    }
  };

  const addDebtor = async (debtor: Omit<Debtor, 'id'>) => {
    try {
      const id = Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'debtors', id), { ...debtor, id });
    } catch (err) {
      handleFirestoreError(err, 'create', 'debtors');
    }
  };

  const addPayment = async (debtorId: string, amount: number) => {
    try {
      const debtorRef = doc(db, 'debtors', debtorId);
      await runTransaction(db, async (transaction) => {
        const dDoc = await transaction.get(debtorRef);
        if (!dDoc.exists()) return;
        
        const d = dDoc.data() as Debtor;
        const newPayments = [...d.payments, amount];
        const totalPaid = newPayments.reduce((a, b) => a + b, 0);
        transaction.update(debtorRef, {
          payments: newPayments,
          status: totalPaid >= d.totalAmount ? 'paid' : 'pending',
        });
      });
    } catch (err) {
      handleFirestoreError(err, 'update', `debtors/${debtorId}`);
    }
  };

  const deleteDebtor = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'debtors', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', `debtors/${id}`);
    }
  };

  const updateDebtor = async (id: string, updates: Partial<Debtor>) => {
    try {
      await updateDoc(doc(db, 'debtors', id), updates);
    } catch (err) {
      handleFirestoreError(err, 'update', `debtors/${id}`);
    }
  };

  const addLiability = async (liability: Omit<Liability, 'id'>) => {
    try {
      const id = Math.random().toString(36).substr(2, 9);
      const paymentHistory = liability.payments.map(amount => ({
        amount,
        date: new Date().toISOString(),
      }));
      await setDoc(doc(db, 'liabilities', id), { ...liability, paymentHistory, id });
    } catch (err) {
      handleFirestoreError(err, 'create', 'liabilities');
    }
  };

  const addLiabilityPayment = async (liabilityId: string, amount: number, description?: string) => {
    try {
      const libRef = doc(db, 'liabilities', liabilityId);
      await runTransaction(db, async (transaction) => {
        const lDoc = await transaction.get(libRef);
        if (!lDoc.exists()) return;

        const l = lDoc.data() as Liability;
        const legacyPayments = l.payments || [];
        const newPayments = [...legacyPayments, amount];
        const currentHist = l.paymentHistory || legacyPayments.map(amt => ({ amount: amt, date: new Date().toISOString() }));
        const newPaymentHistory = [...currentHist, { amount, date: new Date().toISOString(), description: description || '' }];
        const totalPaid = newPayments.reduce((a, b) => a + b, 0);
        transaction.update(libRef, {
          payments: newPayments,
          paymentHistory: newPaymentHistory,
          status: totalPaid >= l.totalAmount ? 'paid' : 'pending',
        });
      });
    } catch (err) {
      handleFirestoreError(err, 'update', `liabilities/${liabilityId}`);
    }
  };

  const deleteLiability = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'liabilities', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', `liabilities/${id}`);
    }
  };

  const updateLiability = async (id: string, updates: Partial<Liability>) => {
    try {
      await updateDoc(doc(db, 'liabilities', id), updates);
    } catch (err) {
      handleFirestoreError(err, 'update', `liabilities/${id}`);
    }
  };

  const updateSettings = async (updates: Partial<AppData['settings']>) => {
    try {
      await setDoc(doc(db, 'app_settings', 'global'), updates, { merge: true });
    } catch (err) {
      handleFirestoreError(err, 'update', 'app_settings/global');
    }
  };

  const fetchProductById = async (productId: string) => {
    try {
      const snap = await getDoc(doc(db, 'products', productId));
      if (snap.exists()) {
        const prod = { id: snap.id, ...snap.data() } as Product;
        setSearchedProduct(prod);
        return prod;
      }
      return null;
    } catch (err) {
      console.error("Error fetching product by ID", err);
      return null;
    }
  };

  const findProductPublicly = async (search: string) => {
    try {
      setLoading(true);
      // 1. Try by ID
      const direct = await getDoc(doc(db, 'products', search));
      if (direct.exists()) {
        const prod = { id: direct.id, ...direct.data() } as Product;
        setSearchedProduct(prod);
        setLoading(false);
        return prod;
      }

      // 2. Try by Invoice
      const qInv = query(collection(db, 'products'), where('invoiceNumber', '==', search), limit(1));
      const snapInv = await getDocs(qInv);
      if (!snapInv.empty) {
        const prod = { id: snapInv.docs[0].id, ...snapInv.docs[0].data() } as Product;
        setSearchedProduct(prod);
        setLoading(false);
        return prod;
      }

      // 3. Try by IMEI
      const qImei = query(collection(db, 'products'), where('imei', '==', search), limit(1));
      const snapImei = await getDocs(qImei);
      if (!snapImei.empty) {
        const prod = { id: snapImei.docs[0].id, ...snapImei.docs[0].data() } as Product;
        setSearchedProduct(prod);
        setLoading(false);
        return prod;
      }

      setSearchedProduct(null);
      setLoading(false);
      return null;
    } catch (err) {
      console.error("Error searching product", err);
      setLoading(false);
      return null;
    }
  };

  const generateInvoiceNumber = async () => {
    const num = data.invoiceCounter || 1;
    try {
      await setDoc(doc(db, 'app_settings', 'global'), { invoiceCounter: num + 1 }, { merge: true });
      return `FAC-${String(num).padStart(3, '0')}`;
    } catch (err) {
      console.error("Error generating invoice number", err);
      return `FAC-${Date.now().toString().slice(-6)}`; // Fallback simple if Firestore fails
    }
  };

  const undoSale = async (saleId: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        // --- 1. LECTURAS (GETS) ---
        const saleRef = doc(db, 'products', saleId);
        const saleDoc = await transaction.get(saleRef);
        if (!saleDoc.exists()) return;

        const sale = saleDoc.data() as Product;
        if (sale.status !== 'sold') return;

        let originalDoc = null;
        let originalRef = null;
        if (sale.originalProductId) {
          originalRef = doc(db, 'products', sale.originalProductId);
          originalDoc = await transaction.get(originalRef);
        }

        let accountDoc = null;
        let accountRef = null;
        if (sale.saleMethod && sale.salePrice && sale.saleMethod !== 'none') {
          const targetInvestor = sale.investor || 'Duvan';
          const accountId = `${targetInvestor}-${sale.saleMethod}`;
          accountRef = doc(db, 'accounts', accountId);
          accountDoc = await transaction.get(accountRef);
        }

        // --- 2. ESCRITURAS ---
        
        // Restaurar el stock
        if (sale.originalProductId && originalRef) {
          if (originalDoc && originalDoc.exists()) {
            const original = originalDoc.data() as Product;
            transaction.update(originalRef, {
              quantity: (original.quantity || 0) + (sale.quantity || 1),
              status: 'stock'
            });
            transaction.delete(saleRef);
          } else {
            transaction.update(saleRef, {
              status: 'stock',
              salePrice: null,
              saleDate: null,
              buyer: null,
              invoiceNumber: null,
              saleMethod: null,
              originalProductId: null
            });
          }
        } else {
          transaction.update(saleRef, {
            status: 'stock',
            salePrice: null,
            saleDate: null,
            buyer: null,
            invoiceNumber: null,
            saleMethod: null
          });
        }

        // Revertir el dinero de las cuentas
        if (accountRef && accountDoc && accountDoc.exists()) {
          const amount = (sale.salePrice || 0) * (sale.quantity || 1);
          const adjustedAmountValue = sale.saleMethod === 'Cripto (USDT)' ? amount / usdtRate : amount;
          transaction.update(accountRef, {
            balance: accountDoc.data().balance - adjustedAmountValue
          });
        }
      });
    } catch (err) {
      handleFirestoreError(err, 'delete', `sales/${saleId}`);
    }
  };

  const addCryptoTransaction = async (tx: Omit<CryptoTransaction, 'id'>) => {
    try {
      const id = Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'crypto_transactions', id), { ...tx, id });
    } catch (err) {
      handleFirestoreError(err, 'create', 'crypto_transactions');
    }
  };

  const deleteCryptoTransaction = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'crypto_transactions', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', `crypto_transactions/${id}`);
    }
  };

  const addCryptoFuture = async (future: Omit<CryptoFuture, 'id'>) => {
    try {
      const id = Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'crypto_futures', id), { ...future, id });
    } catch (err) {
      handleFirestoreError(err, 'create', 'crypto_futures');
    }
  };

  const deleteCryptoFuture = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'crypto_futures', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', `crypto_futures/${id}`);
    }
  };

  const updateCryptoFuture = async (id: string, updates: Partial<CryptoFuture>) => {
    try {
      await updateDoc(doc(db, 'crypto_futures', id), updates);
    } catch (err) {
      handleFirestoreError(err, 'update', `crypto_futures/${id}`);
    }
  };

  return React.useMemo(() => ({
    data,
    user,
    loading,
    addProduct,
    updateProduct,
    processBulkSale,
    deleteProduct,
    undoSale,
    addDebtor,
    addPayment,
    deleteDebtor,
    addLiability,
    addLiabilityPayment,
    deleteLiability,
    updateLiability,
    addExpense,
    deleteExpense,
    addCryptoTransaction,
    deleteCryptoTransaction,
    addCryptoFuture,
    deleteCryptoFuture,
    updateCryptoFuture,
    updateAccountBalance,
    updateSettings,
    generateInvoiceNumber,
    initializeDatabase,
    updateDebtor,
    usdtRate,
    isQuotaExceeded,
    findProductPublicly,
    searchedProduct,
  }), [data, user, loading, usdtRate, isQuotaExceeded, searchedProduct]);
}
