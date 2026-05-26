import React, { useState } from 'react';
import { X, UserPlus, Trash2, Mail, Shield, ShieldCheck, ShieldAlert, Loader2, Plus } from 'lucide-react';
import { findUserByEmail, ProjectCollaborator } from '@/src/lib/firestoreService';

interface ShareModalProps {
    projectId: string;
    ownerId: string;
    collaborators: { [uid: string]: ProjectCollaborator | 'editor' | 'viewer' };
    onClose: () => void;
    onUpdate: (newCollaborators: { [uid: string]: ProjectCollaborator | 'editor' | 'viewer' }) => void;
}

const ShareModal: React.FC<ShareModalProps> = ({
    ownerId,
    collaborators,
    onClose,
    onUpdate
}) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'editor' | 'viewer'>('viewer');
    const [viewMode, setViewMode] = useState<'admin' | 'client'>('admin');
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAddCollaborator = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsSearching(true);
        setError(null);

        try {
            const userProfile = await findUserByEmail(email.trim());

            if (!userProfile) {
                setError('El usuario no existe. Debe registrarse en la aplicación primero.');
                return;
            }

            if (userProfile.uid === ownerId) {
                setError('No puedes invitar al propietario del proyecto.');
                return;
            }

            if (collaborators[userProfile.uid]) {
                setError('Este usuario ya tiene acceso al proyecto.');
                return;
            }

            const updated = { ...collaborators, [userProfile.uid]: { role, viewMode } };
            onUpdate(updated);
            setEmail('');
            setError(null);
        } catch (err) {
            console.error(err);
            setError('Error al buscar el usuario.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleRemoveCollaborator = (uid: string) => {
        const updated = { ...collaborators };
        delete updated[uid];
        onUpdate(updated);
    };

    const handleRoleChange = (uid: string, newRole: 'editor' | 'viewer') => {
        const current = collaborators[uid];
        const currentViewMode = typeof current === 'object' ? (current as any).viewMode : 'admin';
        const updated = { ...collaborators, [uid]: { role: newRole, viewMode: currentViewMode } };
        onUpdate(updated);
    };

    const handleViewModeChange = (uid: string, newViewMode: 'admin' | 'client') => {
        const current = collaborators[uid];
        const currentRole = typeof current === 'object' ? (current as any).role : (current as 'editor' | 'viewer');
        const updated = { ...collaborators, [uid]: { role: currentRole, viewMode: newViewMode } };
        onUpdate(updated);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-orange-100 text-orange-600 rounded-2xl">
                            <UserPlus size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 tracking-tight">Compartir Proyecto</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gestionar colaboradores</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    <form onSubmit={handleAddCollaborator} className="space-y-3">
                        <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Invitar por Email</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="usuario@ejemplo.com"
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm focus:border-orange-500 focus:ring-0 transition-all font-medium"
                                />
                            </div>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
                                className="bg-slate-50 border-2 border-slate-100 rounded-2xl text-[10px] focus:border-orange-500 focus:ring-0 px-2 cursor-pointer font-bold text-slate-700"
                            >
                                <option value="viewer">LECTOR</option>
                                <option value="editor">EDITOR</option>
                            </select>
                            <select
                                value={viewMode}
                                onChange={(e) => setViewMode(e.target.value as 'admin' | 'client')}
                                className="bg-slate-50 border-2 border-slate-100 rounded-2xl text-[10px] focus:border-orange-500 focus:ring-0 px-2 cursor-pointer font-bold text-slate-700"
                            >
                                <option value="admin">VISTA ADMIN</option>
                                <option value="client">VISTA CLIENTE</option>
                            </select>
                            <button
                                type="submit"
                                disabled={isSearching || !email}
                                className="p-2.5 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 disabled:opacity-50 transition-all shadow-lg shadow-orange-200"
                            >
                                {isSearching ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                            </button>
                        </div>
                        {error && <p className="text-[11px] font-bold text-red-500 bg-red-50 p-2 rounded-xl flex items-center gap-2"><ShieldAlert size={14} /> {error}</p>}
                    </form>

                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest ml-1">Colaboradores con Acceso</h3>
                        {Object.keys(collaborators).length === 0 ? (
                            <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aún no has compartido este proyecto</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {Object.entries(collaborators).map(([uid, collab]) => {
                                    const currentRole = typeof collab === 'object' ? (collab as any).role : collab;
                                    const currentViewMode = typeof collab === 'object' ? (collab as any).viewMode : 'admin';

                                    return (
                                        <div key={uid} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-white hover:border-slate-200 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl ${currentRole === 'editor' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600'}`}>
                                                    {currentRole === 'editor' ? <ShieldCheck size={16} /> : <Shield size={16} />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-900 truncate max-w-[120px]">ID: {uid.substring(0, 8)}...</span>
                                                    <div className="flex gap-1.5 mt-0.5">
                                                        <span className="text-[8px] font-black uppercase text-slate-500 bg-slate-200/50 px-1.5 rounded-md">
                                                            {currentRole === 'editor' ? 'Editor' : 'Lector'}
                                                        </span>
                                                        <span className={`text-[8px] font-black uppercase px-1.5 rounded-md ${currentViewMode === 'client' ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                                            {currentViewMode === 'client' ? 'Vista Cliente' : 'Vista Admin'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col gap-1">
                                                    <select
                                                        value={currentRole}
                                                        onChange={(e) => handleRoleChange(uid, e.target.value as 'editor' | 'viewer')}
                                                        className="bg-transparent border-none text-[8px] font-black uppercase text-slate-500 focus:ring-0 cursor-pointer p-0"
                                                    >
                                                        <option value="viewer">LECTOR</option>
                                                        <option value="editor">EDITOR</option>
                                                    </select>
                                                    <select
                                                        value={currentViewMode}
                                                        onChange={(e) => handleViewModeChange(uid, e.target.value as 'admin' | 'client')}
                                                        className="bg-transparent border-none text-[8px] font-black uppercase text-slate-600 focus:ring-0 cursor-pointer p-0"
                                                    >
                                                        <option value="admin">VISTA ADMIN</option>
                                                        <option value="client">VISTA CLIENTE</option>
                                                    </select>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveCollaborator(uid)}
                                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                    >
                        Listo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareModal;
