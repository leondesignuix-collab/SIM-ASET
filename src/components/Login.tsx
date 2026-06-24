import React, { useState } from 'react';
import { User } from '../types';
import { Church, Lock, User as UserIcon, Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react';

interface LoginProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
  isDarkMode: boolean;
}

export default function Login({ users, onLoginSuccess, isDarkMode }: LoginProps) {
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
    <div id="login-container" className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300">
      
      {/* Decorative ambient background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-60"></div>
      
      <div className="w-full max-w-md relative z-10 animate-fade-in">
        
        {/* Upper Brand Icon & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 bg-primary-600 dark:bg-primary-500 rounded-2xl items-center justify-center text-white shadow-xl shadow-primary-500/20 mb-3.5 transition-transform hover:rotate-3">
            <Church className="w-8 h-8" />
          </div>
          <h1 className="font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white font-display">
            SIMAS GEREJA
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mt-1">
            Sistem Penatausahaan Aset Paroki Pringwulung
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 md:p-8 transition-all">
          
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary-500" />
              Masuk ke Workspace
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Gunakan akun operator paroki Anda yang terdaftar di bawah ini.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/45 text-rose-850 dark:text-rose-300 rounded-xl border border-rose-100 dark:border-rose-900/60 text-xs flex items-start gap-2.5 animate-pulse">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div>
                <span className="font-bold">Gagal Masuk: </span>
                {errorMsg}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Username field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Masukkan username anda (e.g. romo)"
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/80 transition-all font-sans placeholder-slate-450 dark:placeholder-slate-500"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Masukkan password anda"
                  className="block w-full pl-9 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/80 transition-all font-sans placeholder-slate-450 dark:placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
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
              className={`w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-primary-700 shadow-md shadow-primary-500/10 cursor-pointer ${
                isSubmitting ? 'opacity-70 pointer-events-none' : ''
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-transparent animate-spin"></div>
                  <span>MEMVERIFIKASI...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>MASUK SEKARANG</span>
                </>
              )}
            </button>
          </form>

        </div>

        {/* Footer info */}
        <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-6 font-mono">
          KEPENGURUSAN GEREJA SANTO YOHANES RASUL PRINGWULUNG
        </p>
      </div>
    </div>
  );
}
