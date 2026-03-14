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
    Image as ImageIcon,
    Palette
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { uploadToSupabase } from '../lib/upload';

const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
};

export default function Settings() {
    const { data, updateCategories, updateSizes, updateColors, updateAppSettings } = useData();
    const [activeTab, setActiveTab] = useState<'categories' | 'general'>('categories');
    const [isSaving, setIsSaving] = useState(false);
    const [showStatus, setShowStatus] = useState<'success' | 'error' | null>(null);

    // Categories Local State
    const [categories, setCategories] = useState<string[]>(data.categories || []);
    const [newCategory, setNewCategory] = useState('');

    // Sizes Local State
    const [sizes, setSizes] = useState<string[]>(data.sizes || []);
    const [newSize, setNewSize] = useState('');

    // Colors Local State
    const [colors, setColors] = useState<string[]>(data.colors || []);
    const [newColor, setNewColor] = useState('');

    // General Settings Local State
    const [generalSettings, setGeneralSettings] = useState({
        storeName: data.appSettings?.storeName || '',
        whatsapp: data.appSettings?.whatsapp || '',
        instagram: data.appSettings?.instagram || '',
        heroImages: data.appSettings?.heroImages || ['', '', ''],
        themeId: data.appSettings?.themeId || 'clean'
    });

    const [isUploading, setIsUploading] = useState<number | null>(null);

    // Handlers
    const handleAddListItem = (setter: any, list: string[], newItem: string, resetter: any) => {
        if (newItem.trim() && !list.includes(newItem.trim())) {
            setter([...list, newItem.trim()]);
            resetter('');
        }
    };
    const handleRemoveListItem = (setter: any, list: string[], item: string) => {
        setter(list.filter(c => c !== item));
    };

    const handleSaveCatalogVars = async () => {
        setIsSaving(true);
        try {
            await Promise.all([
                updateCategories(categories),
                updateSizes(sizes),
                updateColors(colors)
            ]);
            setShowStatus('success');
        } catch (err) {
            setShowStatus('error');
        } finally {
            setIsSaving(false);
            setTimeout(() => setShowStatus(null), 3000);
        }
    };

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
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Configurações</h1>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Gestão do Sistema & Preferências</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 p-1 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-purple-100 dark:border-white/10 w-fit">
                    <button
                        onClick={() => setActiveTab('categories')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'categories'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5'
                            }`}
                    >
                        Variáveis & Catálogo
                    </button>
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'general'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5'
                            }`}
                    >
                        Loja & Contactos
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <AnimatePresence mode="wait">
                    {activeTab === 'categories' ? (
                        <motion.div
                            key="categories"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="glass p-8 rounded-[2rem]"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        <Tag className="w-5 h-5 text-purple-500" /> Variáveis & Catálogo
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Configure Categorias, Tamanhos e Cores disponíveis para a loja.</p>
                                </div>
                                <button
                                    onClick={handleSaveCatalogVars}
                                    disabled={isSaving}
                                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    Salvar Alterações
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                {/* Categorias */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Categoria</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newCategory}
                                                onChange={(e) => setNewCategory(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddListItem(setCategories, categories, newCategory, setNewCategory)}
                                                placeholder="Ex: Malhas, Calçado..."
                                                className="flex-1 px-5 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bold text-sm"
                                            />
                                            <button
                                                onClick={() => handleAddListItem(setCategories, categories, newCategory, setNewCategory)}
                                                className="p-3 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-2xl hover:bg-purple-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <Plus className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mt-4">Lista de Categorias ({categories.length})</label>
                                    <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-white/5 min-h-[120px] max-h-[200px] overflow-y-auto custom-scrollbar flex flex-wrap gap-2 content-start">
                                        {categories.length === 0 ? (
                                            <div className="w-full text-center text-slate-400 text-[10px] uppercase font-bold py-4">Nenhuma categoria</div>
                                        ) : (
                                            categories.map((cat) => (
                                                <motion.div key={cat} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-white/5 border border-purple-100 dark:border-white/10 rounded-xl shadow-sm group">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{cat}</span>
                                                    <button onClick={() => handleRemoveListItem(setCategories, categories, cat)} className="p-1 hover:text-rose-500 text-slate-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Tamanhos */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Novo Tamanho</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newSize}
                                                onChange={(e) => setNewSize(e.target.value.toUpperCase())}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddListItem(setSizes, sizes, newSize, setNewSize)}
                                                placeholder="Ex: S, M, L, XL, 38..."
                                                className="flex-1 px-5 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm"
                                            />
                                            <button
                                                onClick={() => handleAddListItem(setSizes, sizes, newSize, setNewSize)}
                                                className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <Plus className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mt-4">Lista de Tamanhos ({sizes.length})</label>
                                    <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-white/5 min-h-[120px] max-h-[200px] overflow-y-auto custom-scrollbar flex flex-wrap gap-2 content-start">
                                        {sizes.length === 0 ? (
                                            <div className="w-full text-center text-slate-400 text-[10px] uppercase font-bold py-4">Nenhum tamanho</div>
                                        ) : (
                                            sizes.map((sz) => (
                                                <motion.div key={sz} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl shadow-sm group">
                                                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{sz}</span>
                                                    <button onClick={() => handleRemoveListItem(setSizes, sizes, sz)} className="p-1 hover:text-rose-500 text-slate-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Cores */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Cor</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newColor}
                                                onChange={(e) => setNewColor(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddListItem(setColors, colors, newColor, setNewColor)}
                                                placeholder="Ex: Azul, Rosa, Branco..."
                                                className="flex-1 px-5 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm"
                                            />
                                            <button
                                                onClick={() => handleAddListItem(setColors, colors, newColor, setNewColor)}
                                                className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <Plus className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mt-4">Lista de Cores ({colors.length})</label>
                                    <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-white/5 min-h-[120px] max-h-[200px] overflow-y-auto custom-scrollbar flex flex-wrap gap-2 content-start">
                                        {colors.length === 0 ? (
                                            <div className="w-full text-center text-slate-400 text-[10px] uppercase font-bold py-4">Nenhuma cor</div>
                                        ) : (
                                            colors.map((c) => (
                                                <motion.div key={c} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl shadow-sm group">
                                                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400 capitalize">{c}</span>
                                                    <button onClick={() => handleRemoveListItem(setColors, colors, c)} className="p-1 hover:text-rose-500 text-slate-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4 flex flex-col justify-center">
                                    <div className="p-4 bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl border border-purple-100/50 dark:border-purple-800/20">
                                        <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold leading-relaxed">
                                            💡 Categorias, Tamanhos e Cores adicionados aqui ficam disponíveis globalmente para todos os produtos. Na janela de edição do artigo, o administrador escolhe quais destas opções se aplicam àquele artigo específico.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="general"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
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

                                {/* Appearance Section */}
                                <div className="space-y-6 md:col-span-2">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <Palette className="w-3 h-3 text-purple-500" /> Aparência & Tema
                                        </label>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            {[
                                                { id: 'clean', label: 'Clean', desc: 'Minimalista & Profissional', color: 'bg-[#1e293b]' },
                                                { id: 'colorido', label: 'Colorido', desc: 'Vibrante & Dinâmico', color: 'bg-[#3b0764]' },
                                                { id: 'dark', label: 'Dark', desc: 'Moderno & Elegante', color: 'bg-black' }
                                            ].map((theme) => (
                                                <button
                                                    key={theme.id}
                                                    onClick={() => setGeneralSettings({ ...generalSettings, themeId: theme.id as any })}
                                                    className={`relative p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-2 group ${generalSettings.themeId === theme.id 
                                                        ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-900/10' 
                                                        : 'border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900/50 hover:border-purple-200'
                                                    }`}
                                                >
                                                    <div className={`w-full h-2 rounded-full ${theme.color} mb-1 shadow-inner`} />
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 dark:text-white">{theme.label}</p>
                                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">{theme.desc}</p>
                                                    </div>
                                                    {generalSettings.themeId === theme.id && (
                                                        <div className="absolute top-3 right-3">
                                                            <CheckCircle2 className="w-4 h-4 text-purple-600" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
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
                    )}
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
