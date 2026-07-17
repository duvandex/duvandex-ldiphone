export type Investor = 'Duvan' | 'Lina' | 'Santiago' | 'Johana' | 'Pool' | 'Santa Maria' | 'Thomas';
export type PaymentMethod = 'Efectivo' | 'Bancolombia' | 'Nequi' | 'Banco de Bogota' | 'Cripto (USDT)' | 'none';

export interface CoInvestor {
  investor: Investor;
  percentage: number;
  method?: PaymentMethod;
}

export type Category = 'CELULARES' | 'TABLETS' | 'RELOJ INTELIGENTES' | 'AURICULARES' | 'ACCESORIOS' | 'Other';

export interface Product {
  id: string;
  name: string;
  category?: Category;
  imei?: string;
  provider?: string;
  investor: Investor;
  purchaseDate: string;
  purchasePrice: number; // Unit price for purchase
  salePrice?: number;    // Unit price for sale
  regularPrice?: number; // Original price before promotion
  status: 'stock' | 'sold' | 'reserved' | 'out_of_stock';
  saleDate?: string;
  buyer?: string;
  reservationAmount?: number;
  reservationDate?: string;
  reservationBuyer?: string;
  reservationPayments?: {
    amount: number;
    date: string;
    method: PaymentMethod;
  }[];
  invoiceNumber?: string;
  quantity: number;
  initialQuantity?: number;
  images?: string[]; // Max 4 image URLs (Cloudinary)
  purchaseMethod?: PaymentMethod;
  saleMethod?: PaymentMethod;
  warrantyMonths?: number;
  warrantyExpiration?: string;
  warrantyTerms?: string;
  customerName?: string;
  originalProductId?: string; // Reference to original product for partial sales
  description?: string;
  isExternal?: boolean; // If true, not counted in physical stock value, profit to Duvan
  coInvestors?: CoInvestor[]; // For split ownership
  discount?: number;
  discountType?: 'fixed' | 'percentage';
  purchaseSources?: { accountId: string; amount: number }[];
  hideInCatalog?: boolean;
}

export interface FinancialAccount {
  id: string; // Unique ID (e.g., "Duvan-Bancolombia")
  method: PaymentMethod;
  name: string;
  balance: number;
  investor: Investor;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  category: string;
  investor: Investor;
}

export interface Debtor {
  id: string;
  name: string;
  description?: string;
  totalAmount: number;
  payments: number[];
  status: 'pending' | 'paid';
}

export interface LiabilityPayment {
  amount: number;
  date: string;
  description?: string;
}

export interface Liability {
  id: string;
  creditor: string;
  description: string;
  totalAmount: number;
  payments: number[];
  paymentHistory?: LiabilityPayment[];
  status: 'pending' | 'paid';
}

export interface AppSettings {
  companyName: string;
  companyLogo?: string; // Cloudinary URL
  warrantyTerms: string;
  defaultWarrantyMonths: number;
  paymentMethods?: string[]; // Cloudinary URLs
}

export interface CryptoTransaction {
  id: string;
  cryptocurrency: 'BTC' | 'ETH' | 'USDT';
  quantity: number;
  purchasePriceUsd: number;
  purchasePriceCop?: number;
  date: string;
  investor: Investor;
  notes?: string;
}

export interface CryptoFuture {
  id: string;
  cryptocurrency: string; // e.g. 'BTC', 'ETH', 'SOL'
  type: 'LONG' | 'SHORT';
  leverage: number;
  entryPrice: number;
  marginUsd: number;
  quantity: number; // position size in coins (or calculated as marginUsd * leverage / entryPrice)
  date: string;
  investor: Investor;
  status: 'OPEN' | 'CLOSED';
  exitPrice?: number;
  notes?: string;
}

export interface AppData {
  products: Product[];
  debtors: Debtor[];
  liabilities: Liability[];
  invoiceCounter: number;
  accounts: FinancialAccount[];
  expenses: Expense[];
  settings: AppSettings;
  cryptoTransactions: CryptoTransaction[];
  cryptoFutures?: CryptoFuture[];
}
