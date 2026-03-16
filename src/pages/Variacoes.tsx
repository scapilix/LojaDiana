import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Layers,
    Tag,
    Plus,
    Trash2,
    ArrowLeft,
    Save,
    ChevronRight,
    GripVertical,
    CheckCircle2,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { useData, Variation } from '../contexts/DataContext';

const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95 }
};

type ViewState = 'main' | 'categories' | 'variations' | 'variation_detail';

export default function Variacoes() {
    const { data, updateCategories, updateVariations } = useData();
    const [view, setView] = useState<ViewState>('main');
    const [selectedVarId, setSelectedVarId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showStatus, setShowStatus] = useState<'success' | 'error' | null>(null);

    // Local states
    const [localCategories, setLocalCategories] = useState<string[]>(data.categories || []);
    const [localVariations, setLocalVariations] = useState<Variation[]>(data.variations || []);
    
    const [newCategory, setNewCategory] = useState('');
    const [newVarName, setNewVarName] = useState('');
    const [newOption, setNewOption] = useState('');

    const currentVariation = localVariations.find(v => v.id === selectedVarId);

    // Handlers
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await Promise.all([
                updateCategories(localCategories),
                updateVariations(localVariations)
            ]);
            setShowStatus('success');
        } catch (err) {
            setShowStatus('error');
        } finally {
            setIsSaving(false);
            setTimeout(() => setShowStatus(null), 3000);
        }
    };

    const addCategory = () => {
        if (newCategory.trim() && !localCategories.includes(newCategory.trim())) {
            setLocalCategories([...localCategories, newCategory.trim()]);
            setNewCategory('');
        }
    };

    const removeCategory = (cat: string) => {
        setLocalCategories(localCategories.filter(c => c !== cat));
    };

    const addVariation = () => {
        if (newVarName.trim()) {
            const newVar: Variation = {
                id: Date.now().toString(),
                name: newVarName.trim(),
                options: []
            };
            setLocalVariations([...localVariations, newVar]);
            setNewVarName('');
        }
    };

    const removeVariation = (id: string) => {
        setLocalVariations(localVariations.filter(v => v.id !== id));
    };

    const addOption = () => {
        if (newOption.trim() && selectedVarId) {
            setLocalVariations(localVariations.map(v => 
                v.id === selectedVarId 
                ? { ...v, options: [...v.options, newOption.trim()] }
                : v
            ));
            setNewOption('');
        }
    };

    const removeOption = (idx: number) => {
        if (selectedVarId) {
            setLocalVariations(localVariations.map(v => 
                v.id === selectedVarId 
                ? { ...v, options: v.options.filter((_, i) => i !== idx) }
                : v
            ));
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
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-purple-100 dark:border-white/10 shadow-xl shadow-purple-500/5">
                        <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-950 dark:text-white tracking-tighter uppercase">Variáveis de Catálogo</h1>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">Gestão de Categorias e Variações</p>
                    </div>
                </div>

                <div className="flex gap-3">
                   {view !== 'main' && (
                        <button
                            onClick={() => {
                                if (view === 'variation_detail') setView('variations');
                                else setView('main');
                            }}
                            className="px-4 py-3 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-white transition-all"
                        >
                            <ArrowLeft className="w-4 h-4" /> Voltar
                        </button>
                   )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-3 bg-purple-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Salvar Alterações
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="glass rounded-[2.5rem] p-8 min-h-[500px] overflow-hidden">
                <AnimatePresence mode="wait">
                    {view === 'main' && (
                        <motion.div
                            key="main"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="h-full flex flex-col items-center justify-center gap-6 py-20"
                        >
                            <button
                                onClick={() => setView('categories')}
                                className="w-full max-w-sm py-8 bg-rose-100/50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-3xl text-rose-600 dark:text-rose-400 font-black text-xl tracking-widest uppercase hover:scale-[1.02] transition-all shadow-lg active:scale-95 flex flex-col items-center gap-2"
                            >
                                <Tag className="w-8 h-8 mb-2" />
                                CATEGORIAS
                            </button>
                            <button
                                onClick={() => setView('variations')}
                                className="w-full max-w-sm py-8 bg-purple-100/50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-3xl text-purple-600 dark:text-purple-400 font-black text-xl tracking-widest uppercase hover:scale-[1.02] transition-all shadow-lg active:scale-95 flex flex-col items-center gap-2"
                            >
                                <Layers className="w-8 h-8 mb-2" />
                                VARIAÇÕES
                            </button>
                        </motion.div>
                    )}

                    {view === 'categories' && (
                        <motion.div
                            key="categories"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-6">
                                <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500">
                                    <Tag className="w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Gestão de Categorias</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Categoria</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newCategory}
                                            onChange={(e) => setNewCategory(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                                            placeholder="Vestidos, Camisolas, etc..."
                                            className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-rose-500 transition-all font-bold"
                                        />
                                        <button onClick={addCategory} className="p-4 bg-rose-500 text-white rounded-2xl hover:bg-rose-600 transition-all shadow-lg">
                                            <Plus className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categorias Atuais ({localCategories.length})</label>
                                    <div className="flex flex-col gap-2">
                                        {localCategories.map((cat) => (
                                            <div key={cat} className="flex items-center justify-between p-4 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl group hover:border-rose-200 transition-all">
                                                <span className="font-bold text-slate-700 dark:text-slate-200">{cat}</span>
                                                <button onClick={() => removeCategory(cat)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {localCategories.length === 0 && (
                                            <div className="text-center py-10 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhuma categoria criada</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {view === 'variations' && (
                        <motion.div
                            key="variations"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-6">
                                <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-500">
                                    <Layers className="w-6 h-6" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Gestão de Variações</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Criar Nova Variação (Ex: CORES)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newVarName}
                                            onChange={(e) => setNewVarName(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => e.key === 'Enter' && addVariation()}
                                            placeholder="CORES, TAMANHOS, MATERIAL..."
                                            className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold placeholder:text-[10px]"
                                        />
                                        <button onClick={addVariation} className="px-5 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-all shadow-lg flex items-center gap-2 font-black text-[10px] uppercase">
                                            <Plus className="w-4 h-4" /> CRIAR
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Variações Ativas ({localVariations.length})</label>
                                    <div className="flex flex-col gap-2">
                                        {localVariations.map((v) => (
                                            <div 
                                                key={v.id} 
                                                className="flex items-center justify-between p-4 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl group hover:border-purple-200 transition-all cursor-pointer"
                                                onClick={() => {
                                                    setSelectedVarId(v.id);
                                                    setView('variation_detail');
                                                }}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-500 font-bold">
                                                        {v.options.length}
                                                    </div>
                                                    <span className="font-black text-sm text-slate-700 dark:text-slate-200 tracking-tight">{v.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeVariation(v.id);
                                                        }} 
                                                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                                </div>
                                            </div>
                                        ))}
                                        {localVariations.length === 0 && (
                                            <div className="text-center py-10 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhuma variação criada</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {view === 'variation_detail' && currentVariation && (
                        <motion.div
                            key="variation_detail"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                                <button onClick={() => setView('variations')} className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-slate-200">
                                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                                </button>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{currentVariation.name}</h2>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Configuração de Opções</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adicionar Opção à {currentVariation.name}</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newOption}
                                            onChange={(e) => setNewOption(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addOption()}
                                            placeholder="Ex: PRETO, AZUL, TAM-M..."
                                            className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold"
                                        />
                                        <button onClick={addOption} className="p-4 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-all shadow-lg">
                                            <Plus className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Opções Disponíveis ({currentVariation.options.length})</label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {currentVariation.options.map((opt, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl group hover:border-purple-200 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <GripVertical className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <span className="font-bold text-slate-700 dark:text-slate-200 uppercase">{opt}</span>
                                                </div>
                                                <button onClick={() => removeOption(idx)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Status Toast */}
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
                            {showStatus === 'success' ? 'Alterações sincronizadas!' : 'Erro ao salvar'}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
