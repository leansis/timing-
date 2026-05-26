import React, { useState, useRef } from 'react';
import { Lock, User, LogIn, AlertCircle } from 'lucide-react';
import { auth } from '@/src/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
  const failCount = useRef(0);

  const isLockedOut = Date.now() < lockoutUntil;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) {
      const secs = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setError(`Demasiados intentos. Espera ${secs} segundos.`);
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      failCount.current = 0;
      onLogin();
    } catch (err: any) {
      failCount.current += 1;
      if (failCount.current >= MAX_ATTEMPTS) {
        setLockoutUntil(Date.now() + LOCKOUT_SECONDS * 1000);
        setError(`Demasiados intentos fallidos. Cuenta bloqueada ${LOCKOUT_SECONDS} segundos.`);
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError(`Credenciales incorrectas. Intento ${failCount.current}/${MAX_ATTEMPTS}.`);
      } else if (err.code === 'auth/invalid-email') {
        setError('El formato del correo electrónico no es válido.');
      } else {
        setError('Ocurrió un error al intentar acceder. Por favor, inténtalo más tarde.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f6f7f8] font-sans relative overflow-hidden">
      {/* Círculos decorativos de fondo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-100/50 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50/50 rounded-full blur-3xl" />

      <div className="w-full max-w-md p-8 relative z-10">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/20 p-8 space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto shadow-md mb-4">
              <LogIn className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Acceso Timing</h1>
            <p className="text-sm font-medium text-slate-500 leading-relaxed">Proyecto de Mejora Continua</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-orange-600 transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-600 transition-all placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-orange-600 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-600 transition-all placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold animate-in slide-in-from-top-2 duration-300">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-md hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Entrar
                  <LogIn size={16} />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 flex justify-center">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">© 2026 SGS Timing Systems</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
