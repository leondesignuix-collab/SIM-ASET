import React, { useState } from 'react';
import { User } from '../types';
import { Church, Lock, User as UserIcon, Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react';

interface LoginProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
  isDarkMode: boolean;
  appLogo?: string | null;
}

export default function Login({ users, onLoginSuccess, isDarkMode, appLogo }: LoginProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    // Simulate validation with minor security feeling latency
    setTimeout(() => {
      const sanitizedUsername = usernameInput.trim().toLowerCase();
      const sanitizedPassword = passwordInput.trim();

      if (!sanitizedUsername || !sanitizedPassword) {
        setErrorMsg('Username dan password harus diisi');
        setIsSubmitting(false);
        return;
      }

      // Check users database
      const matchedUser = users.find(u => {
        const uName = (u.username || '').toLowerCase();
        const uPass = u.password || '123'; // fallback default
        return uName === sanitizedUsername && uPass === sanitizedPassword;
      });

      if (matchedUser) {
        onLoginSuccess(matchedUser);
      } else {
        setErrorMsg('Username atau password salah! Silakan coba lagi.');
      }
      setIsSubmitting(false);
    }, 450);
  };

  return (
    <div id="login-container" className="min-h-screen w-full flex bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* Left side: Image (Visible on large screens) */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-primary-900">
        {/* Background Image - user uploaded image via public folder */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-10000 hover:scale-105"
          style={{ backgroundImage: `url('/login-bg.jpg')` }}
        ></div>
        
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary-950/90 via-primary-900/40 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary-900/50 to-transparent"></div>
        
        <div className="absolute bottom-12 left-12 right-12 text-white z-10 animate-fade-in">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/20">
            <Church className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold font-display drop-shadow-md leading-tight">
            Penatausahaan Aset <br/> Paroki Pringwulung
          </h2>
          <p className="text-lg lg:text-xl mt-4 font-light drop-shadow-md text-white/90 max-w-xl">
            Sistem informasi manajemen terpadu untuk pencatatan, pemantauan, dan pemeliharaan inventaris Gereja Santo Yohanes Rasul.
          </p>
        </div>
      </div>
      
      {/* Right side: Login Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 sm:p-12 lg:p-16 relative">
        {/* Ambient background for mobile only */}
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-60 lg:hidden"></div>
        
        <div className="w-full max-w-md relative z-10 animate-fade-in">
          
          {/* Upper Brand Icon & Title (Mobile & Desktop) */}
          <div className="mb-12 text-center lg:text-left">
            <h2 className="text-4xl font-bold text-slate-800 dark:text-slate-100">
              Welcome!
            </h2>
            <p className="text-l text-slate-500 dark:text-slate-400 mt-2">
              Silakan masuk ke akun Anda untuk mengakses Aplikasi.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/45 text-rose-850 dark:text-rose-300 rounded-xl border border-rose-100 dark:border-rose-900/60 text-xs flex items-start gap-3 animate-pulse">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <div className="pt-0.5">
                <span className="font-bold block mb-0.5 text-sm">Gagal Masuk</span>
                {errorMsg}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Username field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 font-mono">
                Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <UserIcon className="h-4 w-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Masukkan username Anda"
                  className="block w-full pl-10 pr-4 py-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-sans placeholder-slate-400 shadow-sm"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
                  Kata Sandi
                </label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan kata sandi Anda"
                  className="block w-full pl-10 pr-11 py-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-sans placeholder-slate-400 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  title={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full mt-2 py-3.5 px-4 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 border border-primary-700 shadow-lg shadow-primary-500/20 cursor-pointer ${
                isSubmitting ? 'opacity-70 pointer-events-none' : ''
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                  <span>MEMVERIFIKASI...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Masuk Workspace</span>
                </>
              )}
            </button>
          </form>

          {/* Footer info */}
          <div className="mt-12 text-center lg:text-left text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            <p>© {new Date().getFullYear()} DIBERDAYAKAN oleh TIM ASET PAROKI</p>
          </div>
        </div>
      </div>
    </div>
  );
}
