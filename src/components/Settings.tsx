import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useData } from '../context/AppDataContext';
import { useCloudinary } from '../hooks/useCloudinary';
import { Building2, ShieldCheck, Camera, Save, RefreshCcw, Image as ImageIcon, Moon, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../hooks/useTheme';

export default function Settings() {
  const { data, updateSettings } = useData();
  const { theme, toggleTheme } = useTheme();
  const { uploadImage, uploading: cloudUploading } = useCloudinary();
  const [formData, setFormData] = useState({
    companyName: '',
    warrantyTerms: '',
    defaultWarrantyMonths: 0,
    companyLogo: ''
  });

  // Sync internal state with app data when it loads or changes
  React.useEffect(() => {
    if (data.settings) {
      setFormData({
        companyName: data.settings.companyName || '',
        warrantyTerms: data.settings.warrantyTerms || '',
        defaultWarrantyMonths: data.settings.defaultWarrantyMonths || 0,
        companyLogo: data.settings.companyLogo || ''
      });
    }
  }, [data.settings]);

  const [loading, setLoading] = useState(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      try {
        const url = await uploadImage(file, 'ldiphone/settings');
        setFormData(prev => ({ ...prev, companyLogo: url }));
      } catch (err) {
        console.error(err);
        alert("Error al subir imagen");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateSettings(formData);
      alert("Configuración guardada correctamente");
    } catch (err) {
      console.error(err);
      alert("Error al guardar la configuración");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">Configuración</h1>
          <p className="text-muted-foreground font-medium">Personaliza la información de tu empresa y garantía</p>
        </div>
      </div>

      {/* Appearance Quick Toggle */}
      <Card className="border-none shadow-premium bg-card">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-black uppercase tracking-tight text-foreground">Apariencia</h3>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Alternar entre modo claro y oscuro</p>
          </div>
          <Button 
            variant="outline" 
            onClick={toggleTheme}
            className="rounded-full w-14 h-14 border-2 hover:bg-accent transition-all"
          >
            {theme === 'dark' ? <Sun className="w-6 h-6 text-amber-400" /> : <Moon className="w-6 h-6 text-blue-600" />}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Info */}
        <Card className="border-none shadow-premium bg-card">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <CardTitle className="text-lg font-black uppercase tracking-tight">Datos de la Empresa</CardTitle>
            </div>
            <CardDescription>Esta información se mostrará en las facturas y el catálogo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de la Empresa</Label>
              <Input 
                value={formData.companyName}
                onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Ej: LDIPHONE"
                className="h-11 font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label>Foto de Perfil / Logo</Label>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden group">
                  {formData.companyLogo ? (
                    <img src={formData.companyLogo} alt="Preview" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-400" />
                  )}
                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <Camera className="w-6 h-6 text-white" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-bold text-slate-700 uppercase">Logo Institucional</p>
                  <p className="text-[10px] text-slate-500">Se recomienda formato cuadrado (PNG o JPG). Máximo 2MB.</p>
                  <Button 
                    variant="outline" 
                    size="xs" 
                    className="mt-2"
                    onClick={() => setFormData(prev => ({ ...prev, companyLogo: '' }))}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warranty Settings */}
        <Card className="border-none shadow-premium bg-card">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-rose-50 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-rose-600" />
              </div>
              <CardTitle className="text-lg font-black uppercase tracking-tight">Política de Garantía</CardTitle>
            </div>
            <CardDescription>Configura los términos legales y tiempos predeterminados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tiempo de Garantía por Defecto (Meses)</Label>
              <Input 
                type="number"
                value={formData.defaultWarrantyMonths}
                onChange={e => setFormData(prev => ({ ...prev, defaultWarrantyMonths: parseInt(e.target.value) || 0 }))}
                className="h-11 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label>Términos y Condiciones</Label>
              <Textarea 
                value={formData.warrantyTerms}
                onChange={e => setFormData(prev => ({ ...prev, warrantyTerms: e.target.value }))}
                placeholder="Escribe aquí los términos legales..."
                className="min-h-[150px] text-xs leading-relaxed"
              />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 justify-end rounded-b-xl border-t border-border p-4">
            <Button 
              disabled={loading}
              onClick={handleSave}
              className="bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs px-8"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </motion.div>
  );
}
