import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Settings as SettingsIcon,
    Trash2,
    Save,
    Store,
    MessageCircle,
    Instagram,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Camera,
    Image as ImageIcon,
    UserPlus,
    UserCircle,
    Key,
    Shield,
    CreditCard,
    Smartphone,
    XCircle,
    Lock as LockIcon
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
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
        iban: data.appSettings?.iban || '',
        mbway: data.appSettings?.mbway || '',
        heroImages: data.appSettings?.heroImages || ['', '', ''],
        cancellationReasons: data.appSettings?.cancellationReasons || []
    });

    const [isUploading, setIsUploading] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'users'>('general');
    
    // User Management State
    const [users, setUsers] = useState<any[]>([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', pin: '', role: 'Vendedor' });
    const [editingUserId, setEditingUserId] = useState<string | number | null>(null);
    const [editPassword, setEditPassword] = useState('');
    const [editingPinUserId, setEditingPinUserId] = useState<string | number | null>(null);
    const [editPin, setEditPin] = useState('');
    const { user: currentUser } = useAuth();

    // Handlers
    const fetchUsers = async () => {
        const { data: usersData } = await supabase.from('loja_users').select('*');
        if (usersData) setUsers(usersData);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAddUser = async () => {
        if (!newUser.username || !newUser.password || !newUser.pin) return;
        const { error } = await supabase.from('loja_users').insert([newUser]);
        if (!error) {
            fetchUsers();
            setNewUser({ username: '', password: '', pin: '', role: 'Vendedor' });
            setShowStatus('success');
        } else {
            setShowStatus('error');
        }
    };

    const handleDeleteUser = async (id: string | number) => {
        if (id === currentUser?.id) {
            alert('Não pode remover o seu próprio utilizador!');
            return;
        }
        if (confirm('Tem a certeza que deseja remover este utilizador?')) {
            const { error } = await supabase.from('loja_users').delete().eq('id', id);
            if (!error) {
                fetchUsers();
                setShowStatus('success');
            }
        }
    };
    const handleUpdatePassword = async (id: string | number) => {
        if (!editPassword) return;
        const { error } = await supabase.from('loja_users').update({ password: editPassword }).eq('id', id);
        if (!error) {
            fetchUsers();
            setEditingUserId(null);
            setEditPassword('');
            setShowStatus('success');
        } else {
            setShowStatus('error');
        }
    };

    const handleUpdatePin = async (id: string | number) => {
        if (!editPin) return;
        const { error } = await supabase.from('loja_users').update({ pin: editPin }).eq('id', id);
        if (!error) {
            fetchUsers();
            setEditingPinUserId(null);
            setEditPin('');
            setShowStatus('success');
        } else {
            setShowStatus('error');
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

    const [newReason, setNewReason] = useState('');

    const handleAddReason = () => {
        if (!newReason.trim()) return;
        setGeneralSettings(prev => ({
            ...prev,
            cancellationReasons: [...(prev.cancellationReasons || []), newReason.trim()]
        }));
        setNewReason('');
    };

    const handleRemoveReason = (index: number) => {
        setGeneralSettings(prev => ({
            ...prev,
            cancellationReasons: prev.cancellationReasons.filter((_, i) => i !== index)
        }));
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
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === 'general' 
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
                            : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-white/5'
                        }`}
                    >
                        Loja & Contactos
                    </button>
                    {currentUser?.role === 'Admin' && (
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                activeTab === 'users' 
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
                                : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-white/5'
                            }`}
                        >
                            Utilizadores
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <AnimatePresence mode="wait">
                    {activeTab === 'general' ? (
                        <motion.div
                            key="general"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="glass p-8 rounded-[2rem]"
                        >
                            {/* ... existing General Settings content ... */}
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
                                            <div className="relative">
                                                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500" />
                                                <input
                                                    type="text"
                                                    value={generalSettings.iban}
                                                    onChange={(e) => setGeneralSettings({ ...generalSettings, iban: e.target.value })}
                                                    className="w-full pl-12 pr-5 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bold text-sm"
                                                    placeholder="IBAN para Pagamento"
                                                />
                                            </div>
                                            <div className="relative">
                                                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                                                <input
                                                    type="text"
                                                    value={generalSettings.mbway}
                                                    onChange={(e) => setGeneralSettings({ ...generalSettings, mbway: e.target.value })}
                                                    className="w-full pl-12 pr-5 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm"
                                                    placeholder="Telemóvel MBWay"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                                <AlertCircle className="w-3 h-3 text-rose-500" /> Motivos de Cancelamento
                                            </label>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newReason}
                                                    onChange={(e) => setNewReason(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && handleAddReason()}
                                                    placeholder="Novo motivo (ex: Erro no pedido)"
                                                    className="flex-1 px-4 py-2.5 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none transition-all font-bold text-xs"
                                                />
                                                <button
                                                    onClick={handleAddReason}
                                                    className="px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 transition-all"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 gap-2">
                                                {generalSettings.cancellationReasons?.map((reason, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10 group">
                                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{reason}</span>
                                                        <button
                                                            onClick={() => handleRemoveReason(idx)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {(!generalSettings.cancellationReasons || generalSettings.cancellationReasons.length === 0) && (
                                                    <div className="text-center py-6 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-2xl">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum motivo definido</p>
                                                    </div>
                                                )}
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
                    ) : (
                        <motion.div
                            key="users"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="space-y-6"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Add User Form */}
                                <div className="glass p-8 rounded-[2rem] h-fit">
                                    <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 mb-6 uppercase tracking-tighter">
                                        <UserPlus className="w-5 h-5 text-purple-500" /> Novo Utilizador
                                    </h2>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Utilizador</label>
                                            <div className="relative">
                                                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    value={newUser.username}
                                                    onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                                                    className="w-full pl-12 pr-5 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bold text-sm"
                                                    placeholder="Nome de utilizador"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Palavra-passe (Login)</label>
                                            <div className="relative">
                                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="password"
                                                    value={newUser.password}
                                                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                                    className="w-full pl-12 pr-5 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bold text-sm"
                                                    placeholder="Acesso ao portal"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código (PIN) Autorização</label>
                                            <div className="relative">
                                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="password"
                                                    value={newUser.pin}
                                                    onChange={(e) => setNewUser({...newUser, pin: e.target.value})}
                                                    className="w-full pl-12 pr-5 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bold text-sm"
                                                    placeholder="Cancelamentos e Trocas"
                                                    maxLength={6}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo / Role</label>
                                            <div className="relative">
                                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <select
                                                    value={newUser.role}
                                                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                                                    className="w-full pl-12 pr-5 py-3 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bold text-sm appearance-none cursor-pointer"
                                                >
                                                    <option value="Vendedor">Vendedor</option>
                                                    <option value="Admin">Administrador</option>
                                                </select>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleAddUser}
                                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                                        >
                                            <UserPlus className="w-3.5 h-3.5" />
                                            Criar Utilizador
                                        </button>
                                    </div>
                                </div>

                                {/* Users List */}
                                <div className="lg:col-span-2 glass p-8 rounded-[2rem]">
                                    <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center justify-between mb-8 uppercase tracking-tighter">
                                        <div className="flex items-center gap-2">
                                            <Shield className="w-5 h-5 text-purple-500" /> Lista de Utilizadores
                                        </div>
                                        <span className="text-[10px] bg-purple-100 dark:bg-purple-500/10 text-purple-600 px-3 py-1 rounded-full">{users.length} ATIVOS</span>
                                    </h2>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {users.map((u) => (
                                            <div key={u.id} className="p-5 bg-white/50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 flex items-center justify-between group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-purple-50 dark:bg-purple-500/10 rounded-2xl flex items-center justify-center font-black text-purple-600 text-sm">
                                                        {u.username.substring(0, 1).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-950 dark:text-white text-sm uppercase tracking-tight">{u.username}</p>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                                u.role === 'Admin' 
                                                                ? 'bg-rose-500 text-white' 
                                                                : 'bg-emerald-500 text-white'
                                                            }`}>
                                                                {u.role}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {editingUserId === u.id ? (
                                                        <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                                                            <input
                                                                type="password"
                                                                value={editPassword}
                                                                onChange={(e) => setEditPassword(e.target.value)}
                                                                className="w-24 px-3 py-2 bg-white dark:bg-slate-900 border-2 border-purple-500 rounded-xl outline-none text-[11px] font-black"
                                                                placeholder="Novo Login"
                                                                autoFocus
                                                            />
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={() => handleUpdatePassword(u.id)}
                                                                    className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                                                                >
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingUserId(null);
                                                                        setEditPassword('');
                                                                    }}
                                                                    className="p-2 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-lg hover:text-rose-500"
                                                                >
                                                                    <XCircle className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : editingPinUserId === u.id ? (
                                                        <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                                                            <input
                                                                type="password"
                                                                value={editPin}
                                                                onChange={(e) => setEditPin(e.target.value)}
                                                                className="w-24 px-3 py-2 bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-xl outline-none text-[11px] font-black"
                                                                placeholder="Novo PIN"
                                                                autoFocus
                                                                maxLength={6}
                                                            />
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={() => handleUpdatePin(u.id)}
                                                                    className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                                                                >
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingPinUserId(null);
                                                                        setEditPin('');
                                                                    }}
                                                                    className="p-2 bg-slate-100 dark:bg-white/5 text-slate-400 rounded-lg hover:text-rose-500"
                                                                >
                                                                    <XCircle className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingUserId(u.id);
                                                                    setEditPassword('');
                                                                }}
                                                                className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-purple-600 rounded-xl border border-transparent hover:border-purple-200 transition-all font-black text-[9px] uppercase tracking-widest"
                                                                title="Editar Login"
                                                            >
                                                                <LockIcon className="w-3.5 h-3.5 text-purple-500" />
                                                                ACESSO
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingPinUserId(u.id);
                                                                    setEditPin('');
                                                                }}
                                                                className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-emerald-600 rounded-xl border border-transparent hover:border-emerald-200 transition-all font-black text-[9px] uppercase tracking-widest"
                                                                title="Editar PIN"
                                                            >
                                                                <Key className="w-3.5 h-3.5 text-emerald-500" />
                                                                PIN
                                                            </button>
                                                            {u.id !== currentUser?.id && (
                                                                <button
                                                                    onClick={() => handleDeleteUser(u.id)}
                                                                    className="p-2.5 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-rose-500 rounded-xl transition-all"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
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
