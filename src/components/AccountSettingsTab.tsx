/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, Role, Asset, TERITORI_MAP, PERUNTUKAN_MAP, LETAK_RUANG_MAP, KODE_NAMA_BARANG_MAP } from '../types';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Save, 
  Sliders, 
  Layers, 
  ShieldCheck, 
  Lock, 
  Check, 
  AlertTriangle,
  Users,
  UserPlus,
  Trash2,
  LockKeyhole,
  Database
} from 'lucide-react';

interface AccountSettingsTabProps {
  currentUser: User;
  onUpdateCurrentUser: (updatedUser: User) => void;
  jenisAsetMap: Record<string, string>;
  users: User[];
  onAddUser: (newUser: User) => void;
  onDeleteUser: (userId: string) => void;
  assets: Asset[];
}

export default function AccountSettingsTab({
  currentUser,
  onUpdateCurrentUser,
  jenisAsetMap,
  users = [],
  onAddUser,
  onDeleteUser,
  assets
}: AccountSettingsTabProps) {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [role, setRole] = useState<Role>(currentUser.role);
  const [kategoriAkses, setKategoriAkses] = useState(currentUser.kategoriAkses || '403');
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sesi pendaftaran operator baru oleh Super Admin
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('KOORDINATOR_TIM');
  const [newUserKategoriAkses, setNewUserKategoriAkses] = useState('403');
  const [userSuccessMsg, setUserSuccessMsg] = useState('');
  const [userErrorMsg, setUserErrorMsg] = useState('');
  const [deleteUserRef, setDeleteUserRef] = useState<{ id: string; name: string } | null>(null);

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserSuccessMsg('');
    setUserErrorMsg('');

    if (!newUserName.trim()) {
      setUserErrorMsg('Nama lengkap pengguna tidak boleh kosong.');
      return;
    }

    if (!newUserUsername.trim() || !newUserPassword.trim()) {
      setUserErrorMsg('Username dan password pengguna tidak boleh kosong.');
      return;
    }

    if (!newUserEmail.trim() || !newUserEmail.includes('@')) {
      setUserErrorMsg('Harap masukkan alamat email paroki yang valid.');
      return;
    }

    const emailLower = newUserEmail.trim().toLowerCase();
    const usernameLower = newUserUsername.trim().toLowerCase();
    
    // Validasi duplikasi email atau username
    if (users.some(u => u.email.toLowerCase() === emailLower)) {
      setUserErrorMsg('Email tersebut sudah terdaftar di sistem untuk operator lain.');
      return;
    }
    if (users.some(u => (u.username || '').toLowerCase() === usernameLower)) {
      setUserErrorMsg('Username tersebut sudah digunakan oleh operator lain.');
      return;
    }

    const newUser: User = {
      id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: newUserName.trim(),
      email: emailLower,
      username: usernameLower,
      password: newUserPassword.trim(),
      role: newUserRole,
      kategoriAkses: newUserRole === 'KOORDINATOR_TIM' ? newUserKategoriAkses : undefined
    };

    onAddUser(newUser);
    
    // Reset form pendaftaran
    setNewUserName('');
    setNewUserUsername('');
    setNewUserPassword('');
    setNewUserEmail('');
    setNewUserRole('KOORDINATOR_TIM');
    setNewUserKategoriAkses('403');
    
    setUserSuccessMsg(`✓ Pengguna "${newUser.name}" berhasil didaftarkan sebagai operator paroki!`);
    setTimeout(() => {
      setUserSuccessMsg('');
    }, 4500);
  };

  const handleDeleteUserClick = (userId: string, userName: string) => {
    if (userId === currentUser.id) {
      setUserErrorMsg('Anda tidak dapat menghapus akun operator diri sendiri yang sedang aktif.');
      return;
    }
    setDeleteUserRef({ id: userId, name: userName });
  };

  const handleConfirmDeleteUser = () => {
    if (!deleteUserRef) return;
    onDeleteUser(deleteUserRef.id);
    setUserSuccessMsg(`✓ Hak akses operator "${deleteUserRef.name}" telah berhasil dicabut.`);
    setDeleteUserRef(null);
    setTimeout(() => {
      setUserSuccessMsg('');
    }, 4500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Nama lengkap tidak boleh kosong.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Harap masukkan alamat email paroki yang valid.');
      return;
    }

    const updatedUser: User = {
      ...currentUser,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      kategoriAkses: role === 'KOORDINATOR_TIM' ? kategoriAkses : undefined
    };

    onUpdateCurrentUser(updatedUser);
    setSuccessMsg('✓ Profil akun operator berhasil disimpan dan disinkronkan ke sesi!');
    
    // Clear success banner dynamically
    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  // Get first letter of name for the profile badge
  const initial = name ? name.toUpperCase().charAt(0) : 'U';

  // Describe actual RBAC clearance based on simulated role selection
  const getRoleBadgeClasses = (r: Role) => {
    switch (r) {
      case 'SUPER_ADMIN':
        return 'bg-primary-50 text-primary-800 border-primary-200';
      case 'KOORDINATOR_TIM':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'PETUGAS_VIEWER':
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-6" id="account-settings-container">
      
      {/* Tab Banner Header */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
          <Sliders className="w-4.5 h-4.5 text-primary-650" />
          Pengaturan Akun Operator Sesi
        </h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Ubah informasi identitas administrator, sesuaikan hak akses (RBAC Simulator), dan koordinasi batasan otorisasi penulisan.
        </p>
      </div>

      {successMsg && (
        <div className="bg-primary-50 text-primary-800 p-4 border border-primary-100 rounded-xl text-xs flex items-center gap-2 animate-fade-in font-semibold">
          <ShieldCheck className="w-5 h-5 text-primary-600 shrink-0" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 text-red-800 p-4 border border-red-100 rounded-xl text-xs flex items-center gap-2 animate-fade-in font-semibold">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Profile Card Summary & Permission matrix */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Visual Profile Avatar Box */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center space-y-4">
            <div className="relative inline-block">
              <div className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center text-white text-3xl font-extrabold shadow-md mx-auto tracking-wide ring-4 ring-primary-50 text-center select-none">
                {initial}
              </div>
              <span className={`absolute bottom-0 right-0 border px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm ${getRoleBadgeClasses(currentUser.role)}`}>
                {currentUser.role === 'SUPER_ADMIN' ? 'SUPER' : currentUser.role === 'KOORDINATOR_TIM' ? 'TIM' : 'VIEWER'}
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-sm leading-snug">{currentUser.name}</h3>
              <p className="text-[11.5px] font-mono text-slate-400 font-medium leading-none">{currentUser.email}</p>
            </div>

            <div className="border-t border-slate-100 pt-4 text-left">
              <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-2">Izin Saat Ini:</span>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  {currentUser.role !== 'PETUGAS_VIEWER' ? (
                    <span className="w-4.5 h-4.5 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-[10px]">✓</span>
                  ) : (
                    <span className="w-4.5 h-4.5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-[10px]">✕</span>
                  )}
                  <span className={currentUser.role !== 'PETUGAS_VIEWER' ? 'text-slate-750 font-medium' : 'text-slate-400 line-through'}>
                    Registrasi/Simpan Aset Baru
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {currentUser.role === 'SUPER_ADMIN' ? (
                    <span className="w-4.5 h-4.5 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-[10px]">✓</span>
                  ) : (
                    <span className="w-4.5 h-4.5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-[10px]">✕</span>
                  )}
                  <span className={currentUser.role === 'SUPER_ADMIN' ? 'text-slate-750 font-medium' : 'text-slate-400 line-through'}>
                    Pengeditan Penuh Database Master Data
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {currentUser.role === 'SUPER_ADMIN' ? (
                    <span className="w-4.5 h-4.5 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-[10px]">✓</span>
                  ) : (
                    <span className="w-4.5 h-4.5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-[10px]">✕</span>
                  )}
                  <span className={currentUser.role === 'SUPER_ADMIN' ? 'text-slate-750 font-medium' : 'text-slate-400 line-through'}>
                    Penghapusan Aset Terdaftar
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {currentUser.role === 'KOORDINATOR_TIM' ? (
                    <span className="w-4.5 h-4.5 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-[10px]">!</span>
                  ) : (
                    <span className="w-4.5 h-4.5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-[10px]">✕</span>
                  )}
                  <span className={currentUser.role === 'KOORDINATOR_TIM' ? 'text-slate-750 font-medium' : 'text-slate-400'}>
                    Terikat Kategori Khusus: <strong className="font-mono">{currentUser.kategoriAkses || 'Semua'}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* System Environment Information Box */}
          <div className="bg-slate-900 border border-slate-800 shadow-sm rounded-xl p-5 text-xs text-slate-300 font-mono space-y-3">
            <div className="font-bold text-white text-[10px] tracking-wider uppercase flex items-center gap-1.5 border-b border-slate-800 pb-2 justify-between">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4.5 h-4.5 text-primary-500" />
                Status Sistem & Data
              </div>
            </div>
            <div className="space-y-1.5 text-[11px] leading-snug">
              <div><span className="text-slate-500">ENVIRONMENT:</span> Sandbox Client</div>
              <div><span className="text-slate-500">SESSION CACHE:</span> LocalStorage Aktif</div>
              <div><span className="text-slate-500">TOTAL DATA ASET:</span> {assets.length} Item</div>
              <div><span className="text-slate-500">STATUS SECURITY:</span> SINKRON (SSL)</div>
            </div>
            <button
              type="button"
              onClick={() => {
                const dbData = {
                  assets,
                  users,
                  masterData: {
                    jenisAset: jenisAsetMap,
                    teritori: TERITORI_MAP,
                    peruntukan: PERUNTUKAN_MAP,
                    letakRuang: LETAK_RUANG_MAP,
                    kodeNamaBarang: KODE_NAMA_BARANG_MAP
                  },
                  timestamp: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(dbData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup_sim_aset_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-primary-400 font-bold py-2 rounded-lg border border-slate-700 flex items-center justify-center gap-2 transition"
            >
              <Database className="w-4 h-4" />
              Unduh Database (JSON)
            </button>
          </div>

        </div>

        {/* Account Edit Form (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 mb-5">
              Edit Metadata Akun & Peran Sesi
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              
              {/* Name Field Entry */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  Nama Lengkap Operator
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Romo Paroki, Pr."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-800 font-medium"
                />
              </div>

              {/* Email Field Entry */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Alamat Surat Elektronik (Email)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Contoh: romo@pringwulung.org"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-800 font-medium font-mono"
                />
              </div>

              {/* simulated RBAC field section */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  Level Otoritas Sesi (RBAC Simulator)
                </label>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Ubah level ini untuk menguji hak akses (RBAC). Mode <strong>Petugas Viewer</strong> mengaktifkan readonly, <strong>Superman</strong> memberi kontrol penuh.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  {/* Super Admin option */}
                  <label className={`border rounded-lg p-3 cursor-pointer flex flex-col gap-1.5 transition ${
                    role === 'SUPER_ADMIN' 
                      ? 'border-primary-500 bg-primary-50/40 text-primary-800' 
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}>
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold text-[11px] uppercase tracking-wide">Super Admin</span>
                      <input
                        type="radio"
                        name="auth-role"
                        value="SUPER_ADMIN"
                        checked={role === 'SUPER_ADMIN'}
                        onChange={() => setRole('SUPER_ADMIN')}
                        className="text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                      />
                    </div>
                    <span className="text-[10px] text-slate-450 leading-snug font-medium">Izin penulisan penuh database, pendaftaran baru, & master data.</span>
                  </label>

                  {/* Koordinator Tim option */}
                  <label className={`border rounded-lg p-3 cursor-pointer flex flex-col gap-1.5 transition ${
                    role === 'KOORDINATOR_TIM' 
                      ? 'border-primary-500 bg-primary-50/40 text-primary-805' 
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}>
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold text-[11px] uppercase tracking-wide">Koordinator</span>
                      <input
                        type="radio"
                        name="auth-role"
                        value="KOORDINATOR_TIM"
                        checked={role === 'KOORDINATOR_TIM'}
                        onChange={() => setRole('KOORDINATOR_TIM')}
                        className="text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                      />
                    </div>
                    <span className="text-[10px] text-slate-455 leading-snug font-medium">Pengeditan terbatas hanya untuk aset di bawah lingkup fungsi sasarannya.</span>
                  </label>

                  {/* Petugas Viewer option */}
                  <label className={`border rounded-lg p-3 cursor-pointer flex flex-col gap-1.5 transition ${
                    role === 'PETUGAS_VIEWER' 
                      ? 'border-primary-500 bg-primary-50/40 text-primary-800' 
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}>
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold text-[11px] uppercase tracking-wide">Viewer</span>
                      <input
                        type="radio"
                        name="auth-role"
                        value="PETUGAS_VIEWER"
                        checked={role === 'PETUGAS_VIEWER'}
                        onChange={() => setRole('PETUGAS_VIEWER')}
                        className="text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                      />
                    </div>
                    <span className="text-[10px] text-slate-455 leading-snug font-medium">Hanya lisensi pembaca. Modifikasi apa pun dinonaktifkan di sistem.</span>
                  </label>
                </div>
              </div>

              {/* Conditional Field: Kategori Akses for Koordinator Tim */}
              {role === 'KOORDINATOR_TIM' && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2.5 animate-fade-in">
                  <label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    Kategori Fungsi Terkoordinasi
                  </label>
                  <p className="text-[10.5px] text-slate-450 leading-relaxed">
                    Pilih kategori fungsi standardisasi yang akan dicakup untuk sesi operator ini:
                  </p>
                  
                  <select
                    value={kategoriAkses}
                    onChange={(e) => setKategoriAkses(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                  >
                    {Object.entries(jenisAsetMap).map(([code, name]) => (
                      <option key={code} value={code}>[{code}] {name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Submit panel buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 px-6 rounded-lg transition shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Simpan Perubahan Akun
                </button>
              </div>

            </form>
          </div>
        </div>

      </div>

      {/* 👥 MANAJEMEN PENGGUNA PAROKI - ONLY FOR SUPER ADMIN */}
      {currentUser.role === 'SUPER_ADMIN' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in" id="user-management-section">
          {/* Section banner header */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary-50 text-primary-700 rounded-lg">
                <Users className="w-5 h-5 shrink-0" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest text-left">Manajemen Akses Operator Paroki</h3>
                <p className="text-xs text-slate-500 text-left mt-0.5">Daftar pengguna dan konfigurasi izin RBAC paroki</p>
              </div>
            </div>
            <span className="bg-primary-100 text-primary-800 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider font-mono shadow-sm">
              Hak Akses: Super Admin
            </span>
          </div>

          <div className="p-6">
            
            {/* Feedback notifications */}
            {userSuccessMsg && (
              <div className="bg-primary-50 text-primary-800 p-3.5 border border-primary-100 rounded-lg text-xs flex items-center gap-2 font-semibold mb-5 animate-fade-in text-left">
                <ShieldCheck className="w-4 h-4 text-primary-600 shrink-0" />
                <span>{userSuccessMsg}</span>
              </div>
            )}

            {userErrorMsg && (
              <div className="bg-rose-50 text-rose-800 p-3.5 border border-rose-100 rounded-lg text-xs flex items-center gap-2 font-semibold mb-5 animate-fade-in text-left">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{userErrorMsg}</span>
                <button type="button" onClick={() => setUserErrorMsg('')} className="ml-auto text-rose-500 hover:text-rose-800 font-bold font-sans">✕</button>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              
              {/* LIST OF REGISTERED OPERATORS (7 cols) */}
              <div className="xl:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Daftar Operator Terdaftar ({users.length}):</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-3 w-[45%] text-left">Nama / Alamat Email</th>
                        <th className="px-4 py-3 text-left">Otoritas RBAC</th>
                        <th className="px-4 py-3 text-center w-16">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans" id="operators-list-table">
                      {users.map(u => {
                        const isSelf = u.id === currentUser.id;
                        
                        return (
                          <tr key={u.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition ${isSelf ? 'bg-primary-50/10' : ''}`}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 font-bold text-slate-600 border border-slate-200">
                                  {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div className="min-w-0 text-left">
                                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 leading-snug">
                                    <span className="truncate block max-w-[150px] sm:max-w-none">{u.name}</span>
                                    {isSelf && (
                                      <span className="bg-primary-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0">
                                        Anda
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono text-slate-400 text-[10px] truncate block max-w-[180px] sm:max-w-none">{u.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-left">
                              <div className="space-y-1">
                                {u.role === 'SUPER_ADMIN' ? (
                                  <span className="inline-flex items-center gap-1 bg-primary-50 border border-primary-200 text-primary-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono">
                                    <ShieldCheck className="w-3 h-3" />
                                    Super Admin
                                  </span>
                                ) : u.role === 'KOORDINATOR_TIM' ? (
                                  <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono">
                                    <Layers className="w-3 h-3" />
                                    Koordinator
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono">
                                    <Lock className="w-3 h-3 text-slate-400" />
                                    Viewer
                                  </span>
                                )}

                                {u.role === 'KOORDINATOR_TIM' && u.kategoriAkses && (
                                  <div className="text-[10px] font-medium text-slate-500 pl-1 leading-snug">
                                    Fungsi: <strong className="font-mono text-slate-650 font-bold">[{u.kategoriAkses}] {jenisAsetMap[u.kategoriAkses] || u.kategoriAkses}</strong>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isSelf ? (
                                <span className="text-slate-400 flex items-center justify-center p-1.5 cursor-not-allowed mx-auto" title="Sedang aktif digunakan">
                                  <LockKeyhole className="w-3.5 h-3.5 text-slate-350" />
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUserClick(u.id, u.name)}
                                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer flex items-center justify-center mx-auto active:scale-90"
                                  title={`Cabut akses operator "${u.name}"`}
                                >
                                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* REGISTER NEW USER FORM (5 cols) */}
              <div className="xl:col-span-5 bg-slate-50/70 p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-1">
                  <UserPlus className="w-4.5 h-4.5 text-primary-600 shrink-0" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest text-left">Pendaftaran Operator Baru</h4>
                </div>

                <form onSubmit={handleAddUserSubmit} className="space-y-4 text-xs font-sans">
                  
                  {/* Name field entry */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider flex items-center gap-1">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                      Nama Lengkap Operator
                    </label>
                    <input
                      type="text"
                      required
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Contoh: Heribertus Maryono"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-800 font-medium"
                    />
                  </div>

                  {/* Username & Password field entry */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        Username Login
                      </label>
                      <input
                        type="text"
                        required
                        value={newUserUsername}
                        onChange={(e) => setNewUserUsername(e.target.value)}
                        placeholder="Contoh: heri123"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-800 font-medium font-mono"
                      />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        Password
                      </label>
                      <input
                        type="text"
                        required
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Password kuat"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-800 font-medium font-mono"
                      />
                    </div>
                  </div>

                  {/* Email field entry */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      Alamat Email Paroki
                    </label>
                    <input
                      type="email"
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="Contoh: heribertus@pringwulung.org"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-800 font-medium font-mono"
                    />
                  </div>

                  {/* Role Type Selection */}
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      Level Otoritas Sasarannya (RBAC)
                    </label>
                    
                    <div className="flex flex-col gap-2 pt-1 text-left">
                      {/* Koordinator Tim */}
                      <label className={`border rounded-lg p-2.5 cursor-pointer flex items-center justify-between transition ${
                        newUserRole === 'KOORDINATOR_TIM'
                          ? 'border-primary-500 bg-primary-50/40 text-primary-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}>
                        <div className="flex flex-col text-left">
                          <span className="font-bold text-[10.5px] uppercase tracking-wide">Koordinator Tim</span>
                          <span className="text-[9.5px] text-slate-400 font-medium">Bisa edit hanya aset dalam kategori koordinasi</span>
                        </div>
                        <input
                          type="radio"
                          name="new-user-role"
                          value="KOORDINATOR_TIM"
                          checked={newUserRole === 'KOORDINATOR_TIM'}
                          onChange={() => setNewUserRole('KOORDINATOR_TIM')}
                          className="text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                        />
                      </label>

                      {/* Petugas Viewer */}
                      <label className={`border rounded-lg p-2.5 cursor-pointer flex items-center justify-between transition ${
                        newUserRole === 'PETUGAS_VIEWER'
                          ? 'border-primary-500 bg-primary-50/40 text-primary-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}>
                        <div className="flex flex-col text-left">
                          <span className="font-bold text-[10.5px] uppercase tracking-wide font-sans">Petugas Viewer</span>
                          <span className="text-[9.5px] text-slate-400 font-medium font-sans">Izin pembaca readonly (tidak bisa edit)</span>
                        </div>
                        <input
                          type="radio"
                          name="new-user-role"
                          value="PETUGAS_VIEWER"
                          checked={newUserRole === 'PETUGAS_VIEWER'}
                          onChange={() => setNewUserRole('PETUGAS_VIEWER')}
                          className="text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                        />
                      </label>

                      {/* Super Admin */}
                      <label className={`border rounded-lg p-2.5 cursor-pointer flex items-center justify-between transition ${
                        newUserRole === 'SUPER_ADMIN'
                          ? 'border-primary-500 bg-primary-50/40 text-primary-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}>
                        <div className="flex flex-col text-left">
                          <span className="font-bold text-[10.5px] uppercase tracking-wide font-sans">Super Admin</span>
                          <span className="text-[9.5px] text-slate-400 font-medium font-sans">Kontrol penuh database, pendaftaran & hapus</span>
                        </div>
                        <input
                          type="radio"
                          name="new-user-role"
                          value="SUPER_ADMIN"
                          checked={newUserRole === 'SUPER_ADMIN'}
                          onChange={() => setNewUserRole('SUPER_ADMIN')}
                          className="text-primary-600 focus:ring-primary-500 w-3.5 h-3.5"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Conditional: Kategori Akses for Koordinator Tim */}
                  {newUserRole === 'KOORDINATOR_TIM' && (
                    <div className="bg-white p-3 border border-slate-200 rounded-xl space-y-2 text-left animate-fade-in shadow-sm">
                      <label className="text-[10px] text-slate-450 uppercase font-bold tracking-wider flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        Pilih Bidang Kategori Koordinator
                      </label>
                      <select
                        value={newUserKategoriAkses}
                        onChange={(e) => setNewUserKategoriAkses(e.target.value)}
                        className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        {Object.entries(jenisAsetMap).map(([code, catName]) => (
                          <option key={code} value={code}>[{code}] {catName}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Add action button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg shadow-md transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 font-sans"
                    >
                      <UserPlus className="w-4 h-4" />
                      Tambah Pengguna Baru
                    </button>
                  </div>

                </form>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* ⚠️ DIALOG KONFIRMASI HAPUS OPERATOR KUSTOM */}
      {deleteUserRef && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-6 space-y-4 animate-fade-in text-left border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 bg-red-50 dark:bg-red-950/45 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wide">Pencabutan Akses Operator</h3>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Apakah Anda yakin ingin mencabut seluruh hak akses operator bagi pengguna ini? Operator tersebut tidak akan dapat login lagi menggunakan akun ini.
            </p>

            <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-150 dark:border-slate-800 text-xs font-mono space-y-1 text-slate-700 dark:text-slate-300">
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-bold block mb-0.5">NAMA OPERATOR:</span> 
                <span className="text-red-700 dark:text-rose-450 font-bold font-mono text-[13px]">{deleteUserRef.name}</span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteUserRef(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs py-2.5 rounded-lg border border-slate-205 dark:border-slate-700 transition cursor-pointer text-center"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2.5 rounded-lg shadow-md transition cursor-pointer text-center"
              >
                Cabut Izin Akses
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
