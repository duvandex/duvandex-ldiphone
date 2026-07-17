import { Product, Debtor, Liability } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  // --- DUVAN STOCK ---
  { id: 'd1', name: 'Google Pixel 7 Pro', imei: '352419787953443', investor: 'Duvan', purchaseDate: '2026-04-01', purchasePrice: 919000, status: 'stock', quantity: 1 },
  { id: 'd2', name: 'Crypto activos', imei: '', investor: 'Duvan', purchaseDate: '2026-04-01', purchasePrice: 360000, status: 'stock', quantity: 1 },
  { id: 'd4', name: 'DINERO EN CUENTAS', investor: 'Duvan', purchaseDate: '2026-04-01', purchasePrice: 4730000, status: 'stock', quantity: 1 },
  { id: 'd5', name: 'POWER BANK XIAOMI', investor: 'Duvan', purchaseDate: '2026-04-01', purchasePrice: 40000, status: 'stock', quantity: 1 },
  { id: 'd6', name: '14 PRO 256 GB B', provider: 'MARIA G', investor: 'Duvan', purchaseDate: '2026-04-01', purchasePrice: 1550000, status: 'stock', quantity: 1 },
  { id: 'd7', name: 'IPHONE 16 PRO 128 GN SIM FISCA', imei: '355162990375296', investor: 'Duvan', purchaseDate: '2026-04-01', purchasePrice: 2500000, status: 'stock', quantity: 1 },
  { id: 'd8', name: 'GOOGLE PIXEL 8 PRO 256 GB', provider: 'EBAY', investor: 'Duvan', purchaseDate: '2026-04-01', purchasePrice: 1199000, status: 'stock', quantity: 1 },
  { id: 'd9', name: 'Samsung Galaxy Tab S7 128 GB', investor: 'Duvan', purchaseDate: '2026-04-01', purchasePrice: 977000, status: 'stock', quantity: 2, initialQuantity: 2 },
  { id: 'd10', name: 'Cargadores Ugreen 30W Robot', investor: 'Duvan', purchaseDate: '2026-04-01', purchasePrice: 65000, salePrice: 110000, status: 'stock', quantity: 4, initialQuantity: 7 },
  { id: 'd11', name: 'Cable Ugreen 100W', investor: 'Duvan', purchaseDate: '2026-04-01', purchasePrice: 30000, salePrice: 50000, status: 'stock', quantity: 7, initialQuantity: 8 },
  { id: 'd12', name: 'Vidrio normal', investor: 'Duvan', purchaseDate: '2026-04-01', purchasePrice: 1700, salePrice: 10000, status: 'stock', quantity: 18, initialQuantity: 20 },
  { id: 'd13', name: 'Vidrio antiespia', investor: 'Duvan', purchaseDate: '2026-04-01', purchasePrice: 2000, salePrice: 20000, status: 'stock', quantity: 18, initialQuantity: 20 },
  { id: 'd14', name: 'GOOGLE PIXEL WATCH 2', investor: 'Duvan', purchaseDate: '2026-04-01', purchasePrice: 220000, status: 'stock', quantity: 1 },
  { id: 'd15', name: 'GOOGLE PIXEL BUDS 2 PRO', investor: 'Duvan', purchaseDate: '2026-04-01', purchasePrice: 372000, status: 'stock', quantity: 1 },
  { id: 'd16', name: 'CARGADORES GAN NIU', investor: 'Duvan', purchaseDate: '2026-04-01', purchasePrice: 15000, status: 'stock', quantity: 6, initialQuantity: 6 },
  { id: 'd17', name: 'Airpods serie 4 original', investor: 'Duvan', purchaseDate: '2026-04-01', purchasePrice: 248500, status: 'stock', quantity: 2, initialQuantity: 2 },
  { id: 'd18', name: 'IPHONE 17 PRO MAX 256GB', imei: '353314497722759', investor: 'Duvan', purchaseDate: '2026-04-22', purchasePrice: 4900000, status: 'stock', quantity: 1 },
  { id: 'd19', name: 'GOOGLE PIXEL 8 PRO 128 GB AZUL', imei: '358951610609283', investor: 'Duvan', purchaseDate: '2026-04-22', purchasePrice: 1100000, status: 'stock', quantity: 1 },
  
  // --- JOHANA STOCK ---
  { id: 'j1', name: 'iPhone 13 Perdido', investor: 'Johana', purchaseDate: '2026-04-01', purchasePrice: 1350000, status: 'stock', quantity: 1 },
  { id: 'j2', name: 'iPhone 14 Pro 512 GB', investor: 'Johana', purchaseDate: '2026-04-01', purchasePrice: 1850000, status: 'stock', quantity: 1 },
  { id: 'j3', name: 'iPhone 13 Pro Max 128 GB', investor: 'Johana', purchaseDate: '2026-04-02', purchasePrice: 1700000, status: 'stock', quantity: 1 },
  { id: 'j4', name: 'iPhone 12 Pro Max', investor: 'Johana', purchaseDate: '2026-04-01', purchasePrice: 1400000, status: 'stock', quantity: 1 },
  { id: 'j5', name: 'Saldo a favor Bancolombia', investor: 'Johana', purchaseDate: '2026-04-02', purchasePrice: 0, status: 'stock', quantity: 1 },
  { id: 'j6', name: 'IPAD A 16', provider: 'MARIA G', investor: 'Johana', purchaseDate: '2026-04-17', purchasePrice: 1250000, status: 'stock', quantity: 1 },
  { id: 'j7', name: 'ADRES CHALLA', investor: 'Johana', purchaseDate: '2026-04-21', purchasePrice: 900000, status: 'stock', quantity: 1 },
  { id: 'j8', name: 'iPhone 15 Pro 256 GB', provider: 'MARIA G', investor: 'Johana', purchaseDate: '2026-04-01', purchasePrice: 2200000, status: 'stock', quantity: 1 },

  // --- LINA STOCK ---
  { id: 'l1', name: 'SALDO BANCOLOMBIA', investor: 'Lina', purchaseDate: '2026-04-10', purchasePrice: 1200000, status: 'stock', quantity: 1 },
  { id: 'l2', name: 'IPHONE 13', provider: 'EBAY', investor: 'Lina', purchaseDate: '2026-04-10', purchasePrice: 1200000, status: 'stock', quantity: 1 },
  { id: 'l3', name: 'GOOGLE PIXEL 8 PRO 256 GB', provider: 'EBAY', investor: 'Lina', purchaseDate: '2026-04-15', purchasePrice: 1193000, status: 'stock', quantity: 1 },

  // --- SANTIAGO STOCK ---
  { id: 's1', name: 'iPhone 14 lila 128 GB (87%)', investor: 'Santiago', purchaseDate: '2026-04-01', purchasePrice: 1360000, status: 'stock', quantity: 1 },
  { id: 's2', name: 'SALDO BANCOLOMBIA', investor: 'Santiago', purchaseDate: '2026-04-01', purchasePrice: 424000, status: 'stock', quantity: 1 },

  // --- SANTA MARIA STOCK ---
  { id: 'sm1', name: 'BANCOLOMBIA', investor: 'Santa Maria', purchaseDate: '2026-04-01', purchasePrice: 1105000, status: 'stock', quantity: 1 },

  // --- THOMAS STOCK ---
  { id: 't1', name: 'BANCOLOMBIA', investor: 'Thomas', purchaseDate: '2026-04-01', purchasePrice: 372000, status: 'stock', quantity: 1 },

  // --- POOL STOCK ---
  { id: 'p1', name: 'iPhone 13 256 GB Azul (Shared Pool)', investor: 'Pool', purchaseDate: '2026-04-01', purchasePrice: 1200000, status: 'stock', quantity: 1 },
  { id: 'p2', name: 'iPhone 13 256 GB Verde (Shared Pool)', investor: 'Pool', purchaseDate: '2026-04-01', purchasePrice: 1200000, status: 'stock', quantity: 1 },

  // --- SOLD PRODUCTS ---
  { id: 'sold-2', name: 'Auriculares Motorola BUDS', investor: 'Duvan', purchaseDate: '2026-04-01', purchasePrice: 80000, salePrice: 150000, status: 'sold', saleDate: '2026-04-15', invoiceNumber: 'FAC-002', quantity: 7 },
  { id: 'sold-3', name: 'iPhone 16 PM 256 GB', investor: 'Duvan', purchaseDate: '2026-04-01', purchasePrice: 3200000, salePrice: 3500000, status: 'sold', saleDate: '2026-04-12', buyer: 'DANIEL', invoiceNumber: 'FAC-003', quantity: 1 },
  { id: 'sold-4', name: 'iPhone 16 Pro Max Rosado', investor: 'Duvan', purchaseDate: '2026-04-14', purchasePrice: 3000000, salePrice: 3600000, status: 'sold', saleDate: '2026-04-13', invoiceNumber: 'FAC-004', quantity: 1 },
  { id: 'sold-5', name: 'NUBIA NEO 3GT', investor: 'Duvan', purchaseDate: '2026-04-15', purchasePrice: 770000, salePrice: 900000, status: 'sold', saleDate: '2026-04-15', invoiceNumber: 'FAC-005', quantity: 1 },
  { id: 'sold-6', name: 'Cable original apple', investor: 'Duvan', purchaseDate: '2026-04-15', purchasePrice: 30000, salePrice: 50000, status: 'sold', saleDate: '2026-04-17', buyer: 'daniel', invoiceNumber: 'FAC-006', quantity: 1 },
  { id: 'sold-7', name: 'arreglo telefono armando', investor: 'Duvan', purchaseDate: '2026-04-15', purchasePrice: 0, salePrice: 107000, status: 'sold', saleDate: '2026-04-17', invoiceNumber: 'FAC-007', quantity: 1 },
  { id: 'sold-8', name: 'tablet arreglo vanessa', investor: 'Duvan', purchaseDate: '2026-04-15', purchasePrice: 0, salePrice: 75000, status: 'sold', saleDate: '2026-04-17', invoiceNumber: 'FAC-008', quantity: 1 },
  { id: 'sold-9', name: 'IPAD A 16 128 GB', investor: 'Duvan', purchaseDate: '2026-04-17', purchasePrice: 1250000, salePrice: 1500000, status: 'sold', saleDate: '2026-04-17', buyer: 'MARIA', invoiceNumber: 'FAC-009', quantity: 1 },
  { id: 'sold-10', name: 'BATERIA UGREEN', investor: 'Duvan', purchaseDate: '2026-04-15', purchasePrice: 167000, salePrice: 200000, status: 'sold', saleDate: '2026-04-15', invoiceNumber: 'FAC-010', quantity: 1 },
  { id: 'sold-14', name: 'iPhone 15 Pro 256 GB', investor: 'Duvan', purchaseDate: '2026-04-01', purchasePrice: 2116000, salePrice: 2200000, status: 'sold', saleDate: '2026-04-22', buyer: 'MARIA G', invoiceNumber: 'FAC-014', quantity: 1 },
  
  { id: 'sold-11', name: 'Samsung S24 Plus', investor: 'Johana', purchaseDate: '2026-04-01', purchasePrice: 1800000, salePrice: 1100000, status: 'sold', saleDate: '2026-04-01', invoiceNumber: 'FAC-011', quantity: 1 },
  { id: 'sold-12', name: 'iPhone 16 Pro 256 GB', imei: '3.52657E+14', investor: 'Johana', purchaseDate: '2026-04-01', purchasePrice: 2850000, salePrice: 3050000, status: 'sold', saleDate: '2026-04-21', buyer: 'MARIA GABRIELA', invoiceNumber: 'FAC-012', quantity: 1 },
  { id: 'sold-13', name: 'IPHONE 13', imei: '351055800056599', investor: 'Lina', purchaseDate: '2026-04-10', purchasePrice: 840000, salePrice: 1200000, status: 'sold', saleDate: '2026-04-10', buyer: 'DANIEL', invoiceNumber: 'FAC-013', quantity: 1 },
];

export const INITIAL_DEBTORS: Debtor[] = [
  { id: 'deb-1', name: 'Diana (IPAD)', description: 'Pendiente IPAD', totalAmount: 1300000, payments: [500000], status: 'pending' },
  { id: 'deb-2', name: 'Jose Ignacio', description: 'UGREEN', totalAmount: 95000, payments: [50000], status: 'pending' },
  { id: 'deb-3', name: 'ISABELA', description: '', totalAmount: 110000, payments: [], status: 'pending' },
  { id: 'deb-4', name: 'Sandra', description: 'MOTOROLA BUDS', totalAmount: 150000, payments: [], status: 'pending' },
  { id: 'deb-5', name: 'Sebastian Chala', description: '', totalAmount: 200000, payments: [], status: 'pending' },
  { id: 'deb-6', name: 'Julio CX', description: 'CELULAR', totalAmount: 100000, payments: [], status: 'pending' },
];

export const INITIAL_LIABILITIES: Liability[] = [
  { id: 'li-1', creditor: 'Omar', description: 'Deuda personal', totalAmount: 7400000, payments: [1300000], status: 'pending' },
  { id: 'li-2', creditor: 'Johana', description: 'Deuda por inversión', totalAmount: 4179000, payments: [], status: 'pending' },
  { id: 'li-3', creditor: 'Daniel', description: 'Deuda personal', totalAmount: 990000, payments: [], status: 'pending' },
];
