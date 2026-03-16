import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings as SettingsIcon,
    Plus,
    Trash2,
    Save,
    Tag,
    Store,
    MessageCircle,
    Instagram,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Camera,
    Image as ImageIcon
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { uploadToSupabase } from '../lib/upload';

const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
};

export default function Settings() {
    const { data, updateAppSettings } = useData();
    const [isSaving, setIsSaving] = useState(false);
    const [showStatus, setShowStatus] = useState<'success' | 'error' | null>(null);

    // General Settings Local State
    const [generalSettings, setGeneralSettings] = useState({
        storeName: data.appSettings?.storeName || '',
        whatsapp: data.appSettings?.whatsapp || '',
        instagram: data.appSettings?.instagram || '',
        heroImages: data.appSettings?.heroImages || ['', '', '']
    });

    const [isUploading, setIsUploading] = useState<number | null>(null);

    // Handlers
    const handleSaveGeneral = async () => {
        setIsSaving(true);
        try {
            await updateAppSettings(generalSettings);
            setShowStatus('success');
        } catch (err) {
            setShowStatus('error');
        } finally {
            setIsSaving(false);
            setTimeout(() => setShowStatus(null), 3000);
        }
    };

    const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(index);
            const url = await uploadToSupabase(file, 'loja_hero');
            if (url) {
                const newHeroImages = [...generalSettings.heroImages];
                newHeroImages[index] = url;
                setGeneralSettings({ ...generalSettings, heroImages: newHeroImages });
            }
        } catch (error) {
            console.error('Error uploading hero image:', error);
            alert('Erro ao carregar imagem');
        } finally {
            setIsUploading(null);
        }
    };

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-6"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-purple-100 dark:border-white/10 shadow-xl shadow-purple-500/5">
                        <SettingsIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-950 dark:text-white tracking-tighter uppercase">Configurações</h1>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">Gestão do Sistema & Preferências</p>
                    </div>
                </div>

                <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <button
                        className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                    >
                        Loja & Contactos
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key="general"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="glass p-8 rounded-[2rem]"
                    >
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        <Store className="w-5 h-5 text-purple-500" /> Configurações Gerais
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Personalize os detalhes da sua loja e informações de contacto.</p>
                                </div>
                                <button
                                    onClick={handleSaveGeneral}
                                    disabled={isSaving}
                                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    Salvar Configurações
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <Store className="w-3 h-3 text-purple-500" /> Nome da Loja
                                        </label>
                                        <input
                                            type="text"
                                            value={generalSettings.storeName}
                                            onChange={(e) => setGeneralSettings({ ...generalSettings, storeName: e.target.value })}
                                            className="w-full px-5 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bold text-sm"
                                            placeholder="Ex: Minha Loja Fashion"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contactos & Social</label>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="relative">
                                                <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                                <input
                                                    type="text"
                                                    value={generalSettings.whatsapp}
                                                    onChange={(e) => setGeneralSettings({ ...generalSettings, whatsapp: e.target.value })}
                                                    className="w-full pl-12 pr-5 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm"
                                                    placeholder="WhatsApp (ex: 351912345678)"
                                                />
                                            </div>
                                            <div className="relative">
                                                <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500" />
                                                <input
                                                    type="text"
                                                    value={generalSettings.instagram}
                                                    onChange={(e) => setGeneralSettings({ ...generalSettings, instagram: e.target.value })}
                                                    className="w-full pl-12 pr-5 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none transition-all font-bold text-sm"
                                                    placeholder="Link do Instagram"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>


                                <div className="space-y-6 md:col-span-2">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                <ImageIcon className="w-3 h-3 text-purple-500" /> Imagens do Vídeo (Hero)
                                            </label>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">3 Imagens Máx.</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                            {[0, 1, 2].map((i) => (
                                                <div key={i} className="space-y-2">
                                                    <div className="relative aspect-[3/4] sm:aspect-video rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-white/10 group cursor-pointer overflow-hidden flex items-center justify-center transition-all hover:border-purple-400 dark:hover:border-purple-500/50 hover:bg-purple-50 dark:hover:bg-purple-500/5 shadow-sm">
                                                        {generalSettings.heroImages[i] ? (
                                                            <>
                                                                <img src={generalSettings.heroImages[i]} alt={`Hero ${i + 1}`} className="w-full h-full object-cover" />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const newImgs = [...generalSettings.heroImages];
                                                                            newImgs[i] = '';
                                                                            setGeneralSettings({ ...generalSettings, heroImages: newImgs });
                                                                        }}
                                                                        className="p-2 bg-rose-500 rounded-xl hover:bg-rose-600 transition-colors shadow-lg"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                                                                {isUploading === i ? (
                                                                    <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                                                                ) : (
                                                                    <Camera className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                                                                )}
                                                                <div className="space-y-1">
                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Slot {i + 1}</span>
                                                                    <span className="text-[8px] font-bold text-slate-300 dark:text-slate-700 uppercase">3840x2160 Recomendado</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => handleHeroImageUpload(e, i)}
                                                            disabled={isUploading !== null}
                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

            <AnimatePresence>
                {showStatus && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl border ${showStatus === 'success'
                            ? 'bg-emerald-500/90 text-white border-emerald-400/50'
                            : 'bg-rose-500/90 text-white border-rose-400/50'
                            } z-50`}
                    >
                        {showStatus === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span className="font-black uppercase tracking-widest text-xs">
                            {showStatus === 'success' ? 'Configurações guardadas!' : 'Erro ao salvar'}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
