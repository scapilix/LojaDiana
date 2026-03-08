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
    Loader2
} from 'lucide-react';
import { useData } from '../contexts/DataContext';

const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
};

export default function Settings() {
    const { data, updateCategories, updateAppSettings } = useData();
    const [activeTab, setActiveTab] = useState<'categories' | 'general'>('categories');
    const [isSaving, setIsSaving] = useState(false);
    const [showStatus, setShowStatus] = useState<'success' | 'error' | null>(null);

    // Categories Local State
    const [categories, setCategories] = useState<string[]>(data.categories || []);
    const [newCategory, setNewCategory] = useState('');

    // General Settings Local State
    const [generalSettings, setGeneralSettings] = useState({
        storeName: data.appSettings?.storeName || '',
        whatsapp: data.appSettings?.whatsapp || '',
        instagram: data.appSettings?.instagram || ''
    });

    const handleAddCategory = () => {
        if (newCategory.trim() && !categories.includes(newCategory.trim())) {
            setCategories([...categories, newCategory.trim()]);
            setNewCategory('');
        }
    };

    const handleRemoveCategory = (cat: string) => {
        setCategories(categories.filter(c => c !== cat));
    };

    const handleSaveCategories = async () => {
        setIsSaving(true);
        try {
            await updateCategories(categories);
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

                <div className="flex gap-2 p-1 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-purple-100 dark:border-white/10 w-fit">
                    <button
                        onClick={() => setActiveTab('categories')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'categories'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5'
                            }`}
                    >
                        Categorias
                    </button>
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'general'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-white/5'
                            }`}
                    >
                        Geral
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
                                        <Tag className="w-5 h-5 text-purple-500" /> Gestão de Categorias
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Crie as categorias para organizar o seu catálogo de produtos.</p>
                                </div>
                                <button
                                    onClick={handleSaveCategories}
                                    disabled={isSaving}
                                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    Salvar Alterações
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Categoria</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newCategory}
                                                onChange={(e) => setNewCategory(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                                                placeholder="Ex: Malhas, Calçado..."
                                                className="flex-1 px-5 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bold text-sm"
                                            />
                                            <button
                                                onClick={handleAddCategory}
                                                className="p-3 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-2xl hover:bg-purple-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <Plus className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl border border-purple-100/50 dark:border-purple-800/20">
                                        <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold leading-relaxed">
                                            💡 As categorias criadas aqui ficarão disponíveis como opções no formulário de cadastro de produtos da Base de Itens.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lista de Categorias ({categories.length})</label>
                                    <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-white/5 min-h-[200px] flex flex-wrap gap-2 content-start">
                                        {categories.length === 0 ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center py-8 text-slate-400 gap-2 grayscale opacity-50">
                                                <Tag className="w-8 h-8" />
                                                <span className="text-[10px] font-black uppercase">Nenhuma categoria criada</span>
                                            </div>
                                        ) : (
                                            categories.map((cat) => (
                                                <motion.div
                                                    key={cat}
                                                    initial={{ scale: 0.8, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    className="flex items-center gap-2 pl-4 pr-2 py-2 bg-white dark:bg-white/5 border border-purple-100 dark:border-white/10 rounded-xl shadow-sm group"
                                                >
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{cat}</span>
                                                    <button
                                                        onClick={() => handleRemoveCategory(cat)}
                                                        className="p-1.5 hover:bg-rose-500 hover:text-white rounded-lg text-slate-400 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </motion.div>
                                            ))
                                        )}
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
