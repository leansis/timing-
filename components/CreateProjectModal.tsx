import React, { useState } from 'react';
import { X, FolderKanban, Loader2 } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string) => Promise<void>;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [projectTitle, setProjectTitle] = useState('PROYECTO TIMING');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim()) {
      setError('El nombre del proyecto es obligatorio.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onCreate(projectTitle.trim());
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al crear el proyecto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-2xl w-full max-w-md relative z-10 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors"
            title="Cerrar"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <FolderKanban size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight font-display">Nuevo Proyecto de Timing</h2>
              <p className="text-[10px] text-orange-100 font-medium tracking-wider uppercase mt-0.5">Asistente de Configuración</p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 select-none">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5 font-display">
              Nombre de la Planificación / Proyecto
            </label>
            <div className="relative group">
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => {
                  setProjectTitle(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="PROYECTO TIMING"
                required
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl text-[13px] font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 transition-all font-sans"
              />
            </div>
            <p className="text-[9px] text-slate-400 font-medium italic mt-1 leading-relaxed">
              * El nombre predefinido es &quot;PROYECTO TIMING&quot;. Puedes modificarlo si lo deseas.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-red-50 text-red-600 font-bold text-[10px] rounded-xl border border-red-100 uppercase tracking-wider">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 font-bold text-[10px] uppercase tracking-widest text-white shadow-md shadow-orange-500/10 rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <span>Crear Proyecto</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
