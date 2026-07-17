import React, { useState, useEffect } from 'react';
// Version: 1.2.0 - Inventory Categories, External Products & Co-Investment Logic
// Optimized for deployment and automatic change detection.
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Package, Users, ShoppingCart, CreditCard, Receipt, TrendingDown, Wallet, ExternalLink, LogOut, Lock, Settings as SettingsIcon, Coins, Sparkles } from 'lucide-react';
import { cn } from './lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { Label } from './components/ui/label';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Investors from './components/Investors';
import Sales from './components/Sales';
import Debtors from './components/Debtors';
import Liabilities from './components/Liabilities';
import InvoiceView from './components/InvoiceView';
import Finance from './components/Finance';
import Catalog from './components/Catalog';
import WarrantyPage from './components/WarrantyPage';
import Settings from './components/Settings';
import Crypto from './components/Crypto';
import PokemonTCG from './components/PokemonTCG';
import { useTheme, ThemeProvider } from './hooks/useTheme';
import { AppDataProvider, useData } from './context/AppDataContext';
import { loginWithGoogle, logout, loginWithEmail } from './lib/firebase';

import Logo from './components/Logo';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      console.log("Intentando inicio de sesión para:", email);
      await loginWithEmail(email, password);
      console.log("Inicio de sesión exitoso");
    } catch (err: any) {
      console.error("Error de login detallado:", err);
      const errorCode = err.code || 'unknown';
      
      if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
        setError('Credenciales incorrectas. Revisa usuario y contraseña.');
      } else if (errorCode === 'auth/operation-not-allowed') {
        setError('El método de correo/contraseña no está habilitado en la consola de Firebase.');
      } else if (errorCode === 'auth/unauthorized-domain') {
        setError('Este dominio no está autorizado en Firestore. Agrégalo en Authentication -> Settings.');
      } else {
        setError(`Error (${errorCode}): ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="text-center space-y-1">
          <Logo size="lg" className="mb-4" />
          <CardTitle className="text-2xl font-black uppercase tracking-tight">Acceso Restringido</CardTitle>
          <p className="text-slate-500 text-sm">Ingresa con tu usuario y contraseña para sincronizar</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-rose-500 text-xs font-bold text-center">{error}</p>}
            
            <Button type="submit" disabled={loading} className="w-full bg-slate-900 h-11 text-base">
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </Button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500">O también</span></div>
            </div>

            <Button 
              type="button"
              onClick={loginWithGoogle} 
              disabled={loading}
              className="w-full bg-white text-slate-900 border border-slate-200 h-12 text-sm hover:bg-slate-50 relative group"
            >
              <div className="absolute left-4">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.94 0 3.68.67 5.05 1.97l3.77-3.77C18.54 1.15 15.48 0 12 0 7.31 0 3.25 2.69 1.25 6.64l4.41 3.42C6.71 7.23 9.13 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.8-.07-1.56-.19-2.27H12v4.51h6.47c-.28 1.48-1.13 2.74-2.4 3.58l3.74 2.9c2.18-2.02 3.44-4.99 3.44-8.72z" />
                  <path fill="#FBBC05" d="M5.66 14.71c-.26-.77-.41-1.6-.41-2.46s.15-1.69.41-2.46l-4.41-3.42C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.64l4.41-3.42z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.74-2.9c-1.1.74-2.51 1.17-4.19 1.17-3.23 0-5.96-2.18-6.94-5.11l-4.41 3.42C3.25 21.31 7.31 24 12 24z" />
                </svg>
              </div>
              Google
            </Button>

            <div className="pt-4 border-t text-center">
              <Link to="/catalog" className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest">
                Volver al Catálogo Público
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Navigation({ onLogout, user }: { onLogout: () => void, user: any }) {
  const location = useLocation();
  
  // Hide navigation on public routes ONLY if the user is not logged in
  const isPublicRoute = location.pathname === '/catalog' || location.pathname.startsWith('/warranty') || location.pathname.startsWith('/view-invoice');
  if (!user && isPublicRoute) {
    return null;
  }
  
  const navItems = [
    { path: '/', label: 'Resumen', icon: LayoutDashboard },
    { path: '/investors', label: 'Inversores', icon: Users },
    { path: '/inventory', label: 'Inventario', icon: Package },
    { path: '/pokemon', label: 'Pokémon TCG', icon: Sparkles },
    { path: '/sales', label: 'Ventas', icon: ShoppingCart },
    { path: '/finance', label: 'Cuentas/Gastos', icon: Wallet },
    { path: '/crypto', label: 'Criptomonedas', icon: Coins },
    { path: '/debtors', label: 'Cuentas x Cobrar', icon: CreditCard },
    { path: '/liabilities', label: 'Pasivos', icon: TrendingDown },
    { path: '/settings', label: 'Configuración', icon: SettingsIcon },
    { path: '/cat', label: 'Catálogo', icon: ExternalLink, external: true },
  ];

  return (
    <nav className="glass sticky top-0 z-50 px-4 py-2 flex items-center gap-1 border-b shadow-sm overflow-x-auto no-scrollbar print:hidden">
      <div className="pr-4 border-r border-slate-200 mr-2 flex items-center shrink-0">
        <Logo size="sm" />
      </div>
      <div className="flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          if (item.external) {
            return (
                <Link
                key={item.path}
                to="/catalog"
                className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm transition-all whitespace-nowrap btn-premium"
                >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
                </Link>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isActive ? "text-primary-foreground/80" : "text-muted-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </div>
      
      <button
        onClick={onLogout}
        className="ml-auto flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-rose-500 hover:bg-rose-50 transition-all whitespace-nowrap"
      >
        <LogOut className="w-3.5 h-3.5" />
        Salir
      </button>
    </nav>
  );
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="p-4 max-w-7xl mx-auto">
      {children}
    </main>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Sincronizando LDIPHONE...</p>
    </div>
  );
}

function QuotaWarning() {
  return (
    <div className="bg-amber-50 border-y border-amber-200 p-4 text-center animate-in fade-in slide-in-from-top duration-500 print:hidden">
      <div className="flex items-center justify-center gap-2 text-amber-800 text-sm font-bold uppercase tracking-wider">
        <Lock className="w-4 h-4" />
        <span>Límite de Acceso Diario Alcanzado</span>
      </div>
      <p className="text-amber-600 text-xs mt-1 max-w-lg mx-auto">
        No te preocupes, <strong>tus datos están seguros</strong>. Sin embargo, hemos alcanzado el límite de lecturas gratuitas permitidas para hoy. La aplicación volverá a funcionar normalmente mañana cuando se reinicie la cuota.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppDataProvider>
        <AppContent />
      </AppDataProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const appData = useData();
  const { user, loading, isQuotaExceeded } = appData;

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return <LoadingScreen />;
  }

  const isAuthenticated = !!user;

  return (
    <Router>
      <div className="min-h-screen font-sans">
        {isAuthenticated && <Navigation onLogout={handleLogout} user={user} />}
        {isQuotaExceeded && <QuotaWarning />}
        <Routes>
          {/* Public Routes */}
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/warranty" element={<WarrantyPage />} />
          <Route path="/warranty/:id" element={<WarrantyPage />} />
          <Route path="/view-invoice/:id" element={<InvoiceView isPublic />} />
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/" replace /> : <Login />
          } />
          
          {/* Admin Routes (Protected) */}
          <Route path="/" element={
            !isAuthenticated ? <Navigate to="/login" replace /> : <AdminLayout><Dashboard /></AdminLayout>
          } />
          <Route path="/investors" element={
            !isAuthenticated ? <Navigate to="/login" replace /> : <AdminLayout><Investors /></AdminLayout>
          } />
          <Route path="/inventory" element={
            !isAuthenticated ? <Navigate to="/login" replace /> : <AdminLayout><Inventory /></AdminLayout>
          } />
          <Route path="/sales" element={
            !isAuthenticated ? <Navigate to="/login" replace /> : <AdminLayout><Sales /></AdminLayout>
          } />
          <Route path="/finance" element={
            !isAuthenticated ? <Navigate to="/login" replace /> : <AdminLayout><Finance /></AdminLayout>
          } />
          <Route path="/pokemon" element={
            !isAuthenticated ? <Navigate to="/login" replace /> : <AdminLayout><PokemonTCG /></AdminLayout>
          } />
          <Route path="/crypto" element={
            !isAuthenticated ? <Navigate to="/login" replace /> : <AdminLayout><Crypto /></AdminLayout>
          } />
          <Route path="/debtors" element={
            !isAuthenticated ? <Navigate to="/login" replace /> : <AdminLayout><Debtors /></AdminLayout>
          } />
          <Route path="/liabilities" element={
            !isAuthenticated ? <Navigate to="/login" replace /> : <AdminLayout><Liabilities /></AdminLayout>
          } />
          <Route path="/invoice" element={
            !isAuthenticated ? <Navigate to="/login" replace /> : <AdminLayout><InvoiceView /></AdminLayout>
          } />
          <Route path="/settings" element={
            !isAuthenticated ? <Navigate to="/login" replace /> : <AdminLayout><Settings /></AdminLayout>
          } />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
        </Routes>
      </div>
    </Router>
  );
}
