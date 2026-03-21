import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
    Layers,
    Tag,
    Plus,
    Trash2,
    ChevronRight,
    GripVertical,
    CheckCircle2,
    AlertCircle,
    Box,
    Search,
    Palette,
    ClipboardList
} from 'lucide-react';
import { useData, Variation } from '../contexts/DataContext';

const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95 }
};

const COLOR_OPTIONS = [
    { id: 'slate', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
    { id: 'blue', bg: 'bg-blue-100', text: 'text-blue-600', dot: 'bg-blue-400' },
    { id: 'purple', bg: 'bg-purple-100', text: 'text-purple-600', dot: 'bg-purple-400' },
    { id: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-600', dot: 'bg-emerald-400' },
    { id: 'rose', bg: 'bg-rose-100', text: 'text-rose-600', dot: 'bg-rose-400' },
    { id: 'amber', bg: 'bg-amber-100', text: 'text-amber-600', dot: 'bg-amber-400' },
    { id: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-600', dot: 'bg-indigo-400' },
    { id: 'pink', bg: 'bg-pink-100', text: 'text-pink-600', dot: 'bg-pink-400' },
];

export default function Personalizacoes() {
    const { data, updateCategories, updateVariations, updateOrderStatuses } = useData();
    const [selectedVarId, setSelectedVarId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showStatus, setShowStatus] = useState<'success' | 'error' | null>(null);
    const [activeSection, setActiveSection] = useState<'categories' | 'variations' | 'statuses'>('categories');

    const [catSearch, setCatSearch] = useState('');
    const [localCategories, setLocalCategories] = useState<string[]>(data.categories || []);
    const [localVariations, setLocalVariations] = useState<Variation[]>(data.variations || []);
    const [localStatuses, setLocalStatuses] = useState<{ name: string; color: string }[]>(data.order_statuses || []);
    
    const [newCategory, setNewCategory] = useState('');
    const [newVarName, setNewVarName] = useState('');
    const [newOption, setNewOption] = useState('');
    const [newStatusName, setNewStatusName] = useState('');
    const [selectedColor, setSelectedColor] = useState('slate');

    // Sync from context when it changes externally
    useEffect(() => {
        setLocalCategories(data.categories || []);
        setLocalVariations(data.variations || []);
        setLocalStatuses(data.order_statuses || []);
    }, [data.categories, data.variations, data.order_statuses]);

    // Instant/Auto Sync Effect
    useEffect(() => {
        const timeout = setTimeout(async () => {
            let changed = false;
            if (JSON.stringify(localCategories) !== JSON.stringify(data.categories)) changed = true;
            if (JSON.stringify(localVariations) !== JSON.stringify(data.variations)) changed = true;
            if (JSON.stringify(localStatuses) !== JSON.stringify(data.order_statuses)) changed = true;

            if (changed) {
                setIsSaving(true);
                try {
                    await Promise.all([
                        updateCategories(localCategories),
                        updateVariations(localVariations),
                        updateOrderStatuses(localStatuses)
                    ]);
                    setShowStatus('success');
                } catch (err) {
                    setShowStatus('error');
                } finally {
                    setIsSaving(false);
                    setTimeout(() => setShowStatus(null), 3000);
                }
            }
        }, 1000);
        return () => clearTimeout(timeout);
    }, [localCategories, localVariations, localStatuses]);

    const currentVariation = localVariations.find(v => v.id === selectedVarId);

    const filteredCategories = useMemo(() => {
        return localCategories.filter(c => c.toLowerCase().includes(catSearch.toLowerCase()));
    }, [localCategories, catSearch]);

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
                name: newVarName.trim().toUpperCase(),
                options: []
            };
            setLocalVariations([...localVariations, newVar]);
            setNewVarName('');
            setSelectedVarId(newVar.id);
        }
    };

    const removeVariation = (id: string) => {
        setLocalVariations(localVariations.filter(v => v.id !== id));
        if (selectedVarId === id) setSelectedVarId(null);
    };

    const addOption = () => {
        if (newOption.trim() && selectedVarId) {
            setLocalVariations(localVariations.map(v => 
                v.id === selectedVarId 
                ? { ...v, options: [...v.options, newOption.trim().toUpperCase()] }
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

    const addStatus = () => {
        if (newStatusName.trim() && !localStatuses.find(s => s.name.toUpperCase() === newStatusName.trim().toUpperCase())) {
            setLocalStatuses([...localStatuses, { name: newStatusName.trim(), color: selectedColor }]);
            setNewStatusName('');
        }
    };

    const removeStatus = (name: string) => {
        setLocalStatuses(localStatuses.filter(s => s.name !== name));
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
                        <Palette className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-950 dark:text-white tracking-tighter uppercase">Personalizações do Sistema</h1>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">Gestão de Estados, Categorias e Atributos</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-white/5 rounded-full border border-slate-100 dark:border-white/5">
                        <div className={`w-2 h-2 rounded-full ${isSaving ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            {isSaving ? 'Sincronizando...' : 'Sistema Sincronizado'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Unified Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Selector */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="glass rounded-[2rem] p-6 space-y-4">
                        <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-xl">
                            <button
                                onClick={() => setActiveSection('categories')}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === 'categories' ? 'bg-white dark:bg-white/10 text-purple-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                Categorias
                            </button>
                            <button
                                onClick={() => setActiveSection('variations')}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === 'variations' ? 'bg-white dark:bg-white/10 text-purple-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                Variações
                            </button>
                            <button
                                onClick={() => setActiveSection('statuses')}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === 'statuses' ? 'bg-white dark:bg-white/10 text-purple-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                Estados
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                            {activeSection === 'categories' ? (
                                <>
                                    <div className="relative mb-4">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={catSearch}
                                            onChange={(e) => setCatSearch(e.target.value)}
                                            placeholder="Filtrar categorias..."
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                        />
                                    </div>
                                    <div className="relative mb-4">
                                        <input
                                            type="text"
                                            value={newCategory}
                                            onChange={(e) => setNewCategory(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                                            placeholder="Nova categoria..."
                                            className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                        />
                                        <button onClick={addCategory} className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-500 hover:scale-110 transition-transform">
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <Reorder.Group axis="y" values={localCategories} onReorder={setLocalCategories} className="space-y-2">
                                        {filteredCategories.map((cat) => (
                                            <Reorder.Item 
                                                key={cat} 
                                                value={cat}
                                                className="flex items-center justify-between p-3 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl group hover:border-purple-200 transition-all cursor-grab active:cursor-grabbing"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-400" />
                                                    <span className="font-bold text-xs text-slate-700 dark:text-slate-200">{cat}</span>
                                                </div>
                                                <button onClick={() => removeCategory(cat)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </Reorder.Item>
                                        ))}
                                    </Reorder.Group>
                                </>
                            ) : activeSection === 'variations' ? (
                                <>
                                    <div className="relative mb-4">
                                        <input
                                            type="text"
                                            value={newVarName}
                                            onChange={(e) => setNewVarName(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => e.key === 'Enter' && addVariation()}
                                            placeholder="Ex: TAMANHOS..."
                                            className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                        />
                                        <button onClick={addVariation} className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-500 hover:scale-110 transition-transform">
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <Reorder.Group axis="y" values={localVariations} onReorder={setLocalVariations} className="space-y-2">
                                        {localVariations.map((v) => (
                                            <Reorder.Item 
                                                key={v.id} 
                                                value={v}
                                                onClick={() => setSelectedVarId(v.id)}
                                                className={`flex items-center justify-between p-3 border rounded-xl group transition-all cursor-grab active:cursor-grabbing ${selectedVarId === v.id ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-700 dark:text-slate-200 hover:border-purple-200'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <GripVertical className={`w-3.5 h-3.5 ${selectedVarId === v.id ? 'text-white/40' : 'text-slate-300'}`} />
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] ${selectedVarId === v.id ? 'bg-white/20' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-500'}`}>
                                                        {v.options.length}
                                                    </div>
                                                    <span className="font-black text-[10px] tracking-tight truncate">{v.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeVariation(v.id);
                                                        }} 
                                                        className={`p-1 transition-colors ${selectedVarId === v.id ? 'text-white/60 hover:text-white' : 'text-slate-300 hover:text-rose-500'}`}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <ChevronRight className={`w-3.5 h-3.5 ${selectedVarId === v.id ? 'text-white' : 'text-slate-300'}`} />
                                                </div>
                                            </Reorder.Item>
                                        ))}
                                    </Reorder.Group>
                                </>
                            ) : (
                                <>
                                    <div className="relative mb-4 space-y-3">
                                        <input
                                            type="text"
                                            value={newStatusName}
                                            onChange={(e) => setNewStatusName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addStatus()}
                                            placeholder="Novo estado (ex: Pago)..."
                                            className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            {COLOR_OPTIONS.map(color => (
                                                <button
                                                    key={color.id}
                                                    onClick={() => setSelectedColor(color.id)}
                                                    className={`w-6 h-6 rounded-full border-2 transition-all ${color.dot} ${selectedColor === color.id ? 'ring-2 ring-purple-500 ring-offset-2 scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                                />
                                            ))}
                                        </div>
                                        <button 
                                            onClick={addStatus} 
                                            className="w-full py-2 bg-purple-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-purple-500/20 hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Adicionar Estado
                                        </button>
                                    </div>
                                    <Reorder.Group axis="y" values={localStatuses} onReorder={setLocalStatuses} className="space-y-2">
                                        {localStatuses.map((s) => {
                                            const colorConfig = COLOR_OPTIONS.find(c => c.id === s.color) || COLOR_OPTIONS[0];
                                            return (
                                                <Reorder.Item 
                                                    key={s.name} 
                                                    value={s}
                                                    className="flex items-center justify-between p-3 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl group hover:border-purple-200 transition-all cursor-grab active:cursor-grabbing"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-400" />
                                                        <div className={`w-2 h-2 rounded-full ${colorConfig.dot}`} />
                                                        <span className={`font-black text-[10px] uppercase tracking-wider ${colorConfig.text}`}>{s.name}</span>
                                                    </div>
                                                    <button onClick={() => removeStatus(s.name)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </Reorder.Item>
                                            );
                                        })}
                                    </Reorder.Group>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Detail View */}
                <div className="lg:col-span-8">
                    <AnimatePresence mode="wait">
                        {activeSection === 'variations' && selectedVarId ? (
                            <motion.div
                                key={`detail-${selectedVarId}`}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="glass rounded-[2.5rem] p-8 h-full"
                            >
                                <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-white/5 pb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-600">
                                            <Box className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{currentVariation?.name}</h2>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Configuração de Opções Disponíveis</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="max-w-md">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Adicionar Nova Opção (Ex: XL, Vermelho)</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newOption}
                                                onChange={(e) => setNewOption(e.target.value.toUpperCase())}
                                                onKeyDown={(e) => e.key === 'Enter' && addOption()}
                                                placeholder="..."
                                                className="flex-1 px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-xs"
                                            />
                                            <button onClick={addOption} className="px-5 bg-purple-600 text-white rounded-xl shadow-lg hover:bg-purple-700 transition-all">
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    <Reorder.Group 
                                        axis="y" 
                                        values={currentVariation?.options || []} 
                                        onReorder={(newOpts) => {
                                            if (selectedVarId) {
                                                setLocalVariations(localVariations.map(v => 
                                                    v.id === selectedVarId ? { ...v, options: newOpts } : v
                                                ));
                                            }
                                        }}
                                        className="flex flex-col gap-2 pt-4 overflow-y-auto max-h-[400px] custom-scrollbar"
                                    >
                                        {currentVariation?.options.map((opt, idx) => (
                                            <Reorder.Item 
                                                key={opt}
                                                value={opt}
                                                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl group hover:border-purple-300 transition-all cursor-grab active:cursor-grabbing"
                                            >
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <GripVertical className="w-3 h-3 text-slate-300 flex-shrink-0" />
                                                    <span className="font-bold text-[10px] text-slate-700 dark:text-slate-200 truncate">{opt}</span>
                                                </div>
                                                <button onClick={() => removeOption(idx)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </Reorder.Item>
                                        ))}
                                    </Reorder.Group>

                                    {(!currentVariation?.options || currentVariation.options.length === 0) && (
                                        <div className="text-center py-20 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[2rem]">
                                            <Box className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhuma opção adicionada</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : activeSection === 'statuses' ? (
                            <motion.div
                                key="status-promo"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center text-center p-12 bg-blue-500/5 rounded-[2.5rem] border-2 border-dashed border-blue-500/10"
                            >
                                <ClipboardList className="w-16 h-16 text-blue-500/20 mb-6" />
                                <h3 className="text-xl font-black text-blue-600/60 uppercase tracking-tighter">Estados de Encomenda</h3>
                                <p className="text-xs font-bold text-slate-400 max-w-sm mt-4 leading-relaxed">
                                    Personalize os estados das suas encomendas e as cores correspondentes. 
                                    Estas definições refletem-se automaticamente nos filtros e na gestão de vendas.
                                </p>
                            </motion.div>
                        ) : activeSection === 'categories' ? (
                            <motion.div
                                key="cat-promo"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center text-center p-12 bg-rose-500/5 rounded-[2.5rem] border-2 border-dashed border-rose-500/10"
                            >
                                <Tag className="w-16 h-16 text-rose-500/20 mb-6" />
                                <h3 className="text-xl font-black text-rose-600/60 uppercase tracking-tighter">Gestão de Categorias</h3>
                                <p className="text-xs font-bold text-slate-400 max-w-sm mt-4 leading-relaxed">
                                    As categorias permitem organizar seus produtos (Vestidos, Camisolas, etc). 
                                    Adicione nomes à esquerda para atualizar automaticamente os filtros do sistema.
                                </p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="var-promo"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center text-center p-12 bg-purple-500/5 rounded-[2.5rem] border-2 border-dashed border-purple-500/10"
                            >
                                <Layers className="w-16 h-16 text-purple-500/20 mb-6" />
                                <h3 className="text-xl font-black text-purple-600/60 uppercase tracking-tighter">Selecione uma Variação</h3>
                                <p className="text-xs font-bold text-slate-400 max-w-sm mt-4 leading-relaxed">
                                    Selecione uma variação à esquerda para gerir seus tamanhos, cores ou outros atributos específicos.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
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
