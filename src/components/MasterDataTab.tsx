/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, Asset, JENIS_ASET_MAP, LETAK_RUANG_MAP, TERITORI_MAP, PERUNTUKAN_MAP, KODE_NAMA_BARANG_MAP, generateNoSeriFinal } from '../types';
import { 
  Database, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  RotateCcw, 
  RefreshCw,
  Info, 
  Lock, 
  ShieldCheck, 
  Check, 
  X, 
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  MapPin,
  Compass,
  Briefcase,
  Tag
} from 'lucide-react';

interface MasterDataTabProps {
  currentUser: User;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  jenisAsetMap: Record<string, string>;
  setJenisAsetMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  letakRuangMap: Record<string, string>;
  setLetakRuangMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  teritoriMap: Record<string, string>;
  setTeritoriMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  peruntukanMap: Record<string, string>;
  setPeruntukanMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  kodeNamaBarangMap: Record<string, string>;
  setKodeNamaBarangMap: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export default function MasterDataTab({
  currentUser,
  assets,
  setAssets,
  jenisAsetMap,
  setJenisAsetMap,
  letakRuangMap,
  setLetakRuangMap,
  teritoriMap,
  setTeritoriMap,
  peruntukanMap,
  setPeruntukanMap,
  kodeNamaBarangMap,
  setKodeNamaBarangMap
}: MasterDataTabProps) {
  // Navigation tabs for the Master Data categories
  const [subTab, setSubTab] = useState<'jenis' | 'teritori' | 'ruang' | 'peruntukan' | 'kodeBarang'>('jenis');
  const [searchQuery, setSearchQuery] = useState('');

  // Editor form states
  const [editingCode, setEditingCode] = useState<string | null>(null); // Under edit if not null
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Custom non-blocking modal states
  const [deleteRef, setDeleteRef] = useState<{ code: string; name: string } | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState(false);

  const isReadOnly = currentUser.role !== 'SUPER_ADMIN';

  // Get current active map based on subtab
  const currentMap = (() => {
    switch (subTab) {
      case 'jenis': return jenisAsetMap;
      case 'ruang': return letakRuangMap;
      case 'teritori': return teritoriMap;
      case 'peruntukan': return peruntukanMap;
      case 'kodeBarang': return kodeNamaBarangMap;
    }
  })();

  const setMapState = (() => {
    switch (subTab) {
      case 'jenis': return setJenisAsetMap;
      case 'ruang': return setLetakRuangMap;
      case 'teritori': return setTeritoriMap;
      case 'peruntukan': return setPeruntukanMap;
      case 'kodeBarang': return setKodeNamaBarangMap;
    }
  })();

  const originalMapBaseline = (() => {
    switch (subTab) {
      case 'jenis': return JENIS_ASET_MAP;
      case 'ruang': return LETAK_RUANG_MAP;
      case 'teritori': return TERITORI_MAP;
      case 'peruntukan': return PERUNTUKAN_MAP;
      case 'kodeBarang': return KODE_NAMA_BARANG_MAP;
    }
  })();

  const subTabLabel = (() => {
    switch (subTab) {
      case 'jenis': return 'Level 1: Jenis Aset';
      case 'teritori': return 'Level 3: Teritori';
      case 'ruang': return 'Level 5: Letak Ruang';
      case 'peruntukan': return 'Level 4: Peruntukan';
      case 'kodeBarang': return 'Level 7: Kode Nama Barang';
    }
  })();

  const getSubTabIcon = () => {
    switch (subTab) {
      case 'jenis': return <Layers className="w-4 h-4 text-primary-600 font-bold" />;
      case 'ruang': return <MapPin className="w-4 h-4 text-primary-600 font-bold" />;
      case 'teritori': return <Compass className="w-4 h-4 text-primary-600 font-bold" />;
      case 'peruntukan': return <Briefcase className="w-4 h-4 text-primary-600 font-bold" />;
      case 'kodeBarang': return <Tag className="w-4 h-4 text-primary-600 font-bold" />;
    }
  };

  // Compute active assets matching a specific code for the current category
  const getUsageCount = (code: string) => {
    return assets.filter(asset => {
      switch (subTab) {
        case 'jenis': return asset.jenisAset === code;
        case 'ruang': return asset.letakRuang === code;
        case 'teritori': return asset.teritori === code;
        case 'peruntukan': return asset.peruntukan === code;
        case 'kodeBarang': return asset.kodeNamaBarang === code;
        default: return false;
      }
    }).length;
  };

  // Filter items in active table based on search query
  const filteredItems = Object.entries(currentMap).filter(([code, name]) => {
    return code.toLowerCase().includes(searchQuery.toLowerCase()) || 
           name.toLowerCase().includes(searchQuery.toLowerCase());
  }).sort((a, b) => a[0].localeCompare(b[0])); // Sorted by code

  // Handle setting text inside editor fields
  const handleStartEdit = (code: string, name: string) => {
    if (isReadOnly) return;
    setEditingCode(code);
    setFormCode(code);
    setFormName(name);
    setFormError('');
    setSuccessMsg('');
  };

  // Cancel edit form
  const handleCancelForm = () => {
    setEditingCode(null);
    setFormCode('');
    setFormName('');
    setFormError('');
    setSuccessMsg('');
  };

  // Reset form messages
  const clearMessages = () => {
    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  // Submit master item insertion or replacement
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    const codeClean = formCode.trim().toUpperCase();
    const nameClean = formName.trim();

    if (!codeClean || !nameClean) {
      setFormError('Kode dan deskripsi wajib diisi.');
      return;
    }

    // Code validation: strictly alphanumeric or symbol dots
    if (!/^[a-zA-Z0-9.-]+$/.test(codeClean)) {
      setFormError('Kode hanya boleh mengandung alfanumerik, titik(.), atau strip(-).');
      return;
    }

    // If editing, check for conflicts if code changed
    if (editingCode !== null && editingCode !== codeClean) {
      if (currentMap[codeClean]) {
        setFormError(`Gagal merubah kode: Kode baru "${codeClean}" sudah digunakan oleh referensi lain.`);
        return;
      }
    } else if (editingCode === null) {
      // Adding new record
      if (currentMap[codeClean]) {
        setFormError(`Kode "${codeClean}" sudah dipakai oleh referensi master lain.`);
        return;
      }
    }

    // Synchronously count affected assets to display accurate real-time status
    const targetCodeForFilter = editingCode || codeClean;
    const matchingAssets = assets.filter(asset => {
      if (subTab === 'jenis') return asset.jenisAset === targetCodeForFilter;
      if (subTab === 'ruang') return asset.letakRuang === targetCodeForFilter;
      if (subTab === 'teritori') return asset.teritori === targetCodeForFilter;
      if (subTab === 'peruntukan') return asset.peruntukan === targetCodeForFilter;
      if (subTab === 'kodeBarang') return asset.kodeNamaBarang === targetCodeForFilter;
      return false;
    });
    const syncCount = matchingAssets.length;

    // Apply background synchronization update to all existing assets in the application state
    setAssets(prevAssets => {
      return prevAssets.map(asset => {
        let isAssetDirty = false;
        const nextAsset = { ...asset };

        // 1. If Code was changed, propagate renaming of standard fields
        if (editingCode && editingCode !== codeClean) {
          if (subTab === 'jenis' && asset.jenisAset === editingCode) {
            nextAsset.jenisAset = codeClean;
            isAssetDirty = true;
          } else if (subTab === 'ruang' && asset.letakRuang === editingCode) {
            nextAsset.letakRuang = codeClean;
            isAssetDirty = true;
          } else if (subTab === 'teritori' && asset.teritori === editingCode) {
            nextAsset.teritori = codeClean;
            isAssetDirty = true;
          } else if (subTab === 'peruntukan' && asset.peruntukan === editingCode) {
            nextAsset.peruntukan = codeClean;
            isAssetDirty = true;
          } else if (subTab === 'kodeBarang' && asset.kodeNamaBarang === editingCode) {
            nextAsset.kodeNamaBarang = codeClean;
            isAssetDirty = true;
          }

          // Propagate to room histories (mutations) if letakRuang changed!
          if (subTab === 'ruang' && asset.mutations) {
            nextAsset.mutations = asset.mutations.map(m => {
              let mUpdated = false;
              const nextM = { ...m };
              if (m.ruangAsal === editingCode) {
                nextM.ruangAsal = codeClean;
                mUpdated = true;
              }
              if (m.ruangTujuan === editingCode) {
                nextM.ruangTujuan = codeClean;
                mUpdated = true;
              }
              if (mUpdated) isAssetDirty = true;
              return mUpdated ? nextM : m;
            });
          }
        }

        // 2. Check if asset belongs to updated master item to touch its updatedAt & regenerate serials
        const belongsToMaster = 
          (subTab === 'jenis' && asset.jenisAset === (editingCode || codeClean)) ||
          (subTab === 'ruang' && asset.letakRuang === (editingCode || codeClean)) ||
          (subTab === 'teritori' && asset.teritori === (editingCode || codeClean)) ||
          (subTab === 'peruntukan' && asset.peruntukan === (editingCode || codeClean)) ||
          (subTab === 'kodeBarang' && asset.kodeNamaBarang === (editingCode || codeClean));

        if (belongsToMaster) {
          nextAsset.updatedAt = new Date().toISOString();
          if (isAssetDirty) {
            nextAsset.noSeriFinal = generateNoSeriFinal(nextAsset);
          }
          return nextAsset;
        }

        return asset;
      });
    });

    // Apply change to code reference map state
    setMapState(prev => {
      const nextMap = { ...prev };
      
      if (editingCode && editingCode !== codeClean) {
        delete nextMap[editingCode];
      }
      nextMap[codeClean] = nameClean;
      return nextMap;
    });

    const oldLabel = editingCode ? currentMap[editingCode] : '';
    const labelChanged = oldLabel !== nameClean;
    const codeChanged = editingCode !== null && editingCode !== codeClean;

    let syncMessage = '';
    if (codeChanged) {
      syncMessage = `✓ Sinkronisasi berhasil! Kode diubah ke [${codeClean}]. ${syncCount} unit aset diselaraskan otomatis ke kode serial baru di Register & Dashboard.`;
    } else if (labelChanged) {
      syncMessage = `✓ Sinkronisasi berhasil! Label "${nameClean}" diperbarui. Dashboard & Register langsung dikoordinasikan untuk ${syncCount} unit aset terkait.`;
    } else {
      syncMessage = `✓ Data Baru: Referensi [${codeClean}] "${nameClean}" berhasil ditambahkan di Master Data.`;
    }

    setSuccessMsg(syncMessage);
    handleCancelForm();
    clearMessages();
  };

  // Handle master row removal code
  const handleDeleteItem = (code: string, name: string) => {
    if (isReadOnly) return;

    const usage = getUsageCount(code);
    if (usage > 0) {
      setFormError(`Gereja mengunci kode [${code}] ${name} karena sedang digunakan oleh ${usage} unit aset aktif. Silakan edit atau kosongkan aset tersebut terlebih dahulu.`);
      return;
    }

    setDeleteRef({ code, name });
  };

  // Re-establish baseline
  const handleRestoreDefaults = () => {
    if (isReadOnly) return;
    setRestoreConfirm(true);
  };

  return (
    <div className="space-y-6" id="master-data-container">
      
      {/* Tab Header Banner */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
            <Database className="w-4.5 h-4.5 text-primary-600 animate-pulse" />
            Pengelolaan Master Data Referensi Paroki
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Kelola parameter identifikasi kode standardisasi Keuskupan. Perubahan di sini langsung berintegrasi dengan serialisasi Register Aset, Qr-Scanner, dan Form Pendaftaran Baru.
          </p>
        </div>

        {/* Restore Defaults button */}
        {!isReadOnly && (
          <button
            onClick={handleRestoreDefaults}
            className="bg-white text-slate-600 hover:text-slate-800 border border-slate-200 text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 font-semibold transition hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-nowrap self-stretch md:self-auto justify-center"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            Restorasi Default
          </button>
        )}
      </div>

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-1 gap-1">
        <button
          onClick={() => { setSubTab('jenis'); handleCancelForm(); }}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-lg text-[11px] font-bold uppercase transition cursor-pointer ${
            subTab === 'jenis' 
              ? 'bg-primary-600 text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Level 1: </span>Jenis Aset
        </button>

        <button
          onClick={() => { setSubTab('teritori'); handleCancelForm(); }}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-lg text-[11px] font-bold uppercase transition cursor-pointer ${
            subTab === 'teritori' 
              ? 'bg-primary-600 text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Level 3: </span>Teritori
        </button>
        
        <button
          onClick={() => { setSubTab('ruang'); handleCancelForm(); }}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-lg text-[11px] font-bold uppercase transition cursor-pointer ${
            subTab === 'ruang' 
              ? 'bg-primary-600 text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Level 5: </span>Letak Ruang
        </button>

        <button
          onClick={() => { setSubTab('peruntukan'); handleCancelForm(); }}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 rounded-lg text-[11px] font-bold uppercase transition cursor-pointer ${
            subTab === 'peruntukan' 
              ? 'bg-primary-600 text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Level 4: </span>Peruntukan
        </button>

        <button
          onClick={() => { setSubTab('kodeBarang'); handleCancelForm(); }}
          className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 py-3 rounded-lg text-[11px] font-bold uppercase transition cursor-pointer ${
            subTab === 'kodeBarang' 
              ? 'bg-primary-600 text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Level 7: </span>Nama Barang
        </button>
      </div>

      {/* Success Banner Alert */}
      {successMsg && (
        <div className="bg-primary-50 text-primary-800 p-4 border border-primary-100 rounded-xl text-xs flex items-center gap-2 animate-fade-in font-medium">
          <Check className="w-4 h-4 text-primary-600" />
          {successMsg}
        </div>
      )}

      {/* Split List Control Panel Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Side: Table of master codes (8 cols) */}
        <div className="md:col-span-8 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            
            {/* Search segment */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                {getSubTabIcon()}
                <span className="text-xs font-bold text-slate-800 uppercase tracking-widest leading-none pt-0.5">{subTabLabel}</span>
              </div>

              {/* Dynamic search input widget */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Cari kode atau nama..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs p-2.5 pl-9 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Records List Table */}
            <div className="flex-1 overflow-x-auto">
              {filteredItems.length === 0 ? (
                <div className="py-16 text-center">
                  <Info className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Tidak ada kode referensi ditemukan.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-100 text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3.5 w-24">Kode</th>
                      <th className="px-6 py-3.5">Nama Deskriptif</th>
                      <th className="px-6 py-3.5 text-center w-28 text-nowrap">Aset Terkait</th>
                      {!isReadOnly && <th className="px-6 py-3.5 text-right w-24">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredItems.map(([code, name]) => {
                      const count = getUsageCount(code);
                      return (
                        <tr key={code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition duration-150">
                          {/* Code */}
                          <td className="px-6 py-4 font-mono font-bold text-slate-800">
                            <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200">
                              {code}
                            </span>
                          </td>
                          {/* Descriptive Name */}
                          <td className="px-6 py-4 font-medium text-slate-800">
                            {name}
                          </td>
                          {/* Active reference count */}
                          <td className="px-6 py-3 text-center">
                            {count > 0 ? (
                              <span className="inline-block bg-primary-50 text-primary-700 border border-primary-100 font-mono font-bold text-[10px] px-2 py-0.5 rounded-full">
                                {count} unit
                              </span>
                            ) : (
                              <span className="inline-block bg-slate-100 text-slate-400 font-mono text-[9px] px-1.5 py-0.5 rounded">
                                kosong
                              </span>
                            )}
                          </td>
                          {/* Action Items */}
                          {!isReadOnly && (
                            <td className="px-6 py-3 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => handleStartEdit(code, name)}
                                  title="Ubah deskripsi"
                                  className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition cursor-pointer"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(code, name)}
                                  title="Hapus referensi"
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Display count footer info */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-400 font-mono flex justify-between items-center">
              <span>Menampilkan {filteredItems.length} referensi standar.</span>
              <span>Dikonfigurasi {Object.keys(currentMap).length} total.</span>
            </div>
          </div>
        </div>

        {/* Right Side: Addition / Editing form editor (4 cols) */}
        <div className="md:col-span-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            
            {/* Card Header title */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/60 flex items-center gap-2">
              {editingCode ? (
                <>
                  <Edit className="w-4 h-4 text-primary-600 animate-pulse" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-widest pl-0.5">Ubah Referensi</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-primary-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-widest pl-0.5">Tambah Master</span>
                </>
              )}
            </div>

            {/* Form controls */}
            {isReadOnly ? (
              <div className="p-6 text-center space-y-4">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 border border-slate-200">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-700 block uppercase tracking-wide">Akses Terkunci</span>
                  <p className="text-[11px] text-slate-450 leading-relaxed px-2">
                    Sesi operator Anda berstatus **Koordinator** atau **Viewer**. Anda tidak diizinkan merekayasa master data standar milik paroki. Hanya **Super Admin** yang memiliki hak akses penuh untuk menambah, mengubah, atau menghapus master data ini.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitForm} className="p-5 space-y-4 text-xs">
                {formError && (
                  <div className="bg-red-50 text-red-800 p-3 rounded-lg border border-red-100 font-medium flex gap-1.5 items-start">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Code Field Entry */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Kode Unik Referensi</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 403 atau 01"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono uppercase"
                  />
                  {editingCode !== null && (
                    <span className="text-[9px] text-amber-600 font-bold block mt-1 leading-normal">
                      ⚠️ Anda dapat mengubah kode ini! Melakukan perubahan otomatis akan menyelaraskan ulang seluruh serial / No Seri Aset terdaftar secara realtime.
                    </span>
                  )}
                </div>

                {/* Name / Description field */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Deskripsi / Nama Standar</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="Contoh: Sound System Utama"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>

                {/* Auditing Alerts warning */}
                {editingCode && getUsageCount(editingCode) > 0 && (
                  <div className="bg-amber-50 rounded-lg border border-amber-200 p-3 text-[10px] text-amber-800 space-y-1 font-medium">
                    <span className="font-bold flex items-center gap-1 uppercase block text-[9px] tracking-wide text-amber-700">
                      <AlertTriangle className="w-3.5 h-3.5" /> peringatan relasi register
                    </span>
                    <p className="leading-relaxed text-[10px]">
                      Perubahan teks deskriptif standar ini akan langsung mengubah nama klasifikasi bagi **{getUsageCount(editingCode)}** unit aset yang saat ini terdaftar memakai kode **[{editingCode}]**.
                    </p>
                  </div>
                )}

                {/* Actions Button container */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  {editingCode !== null && (
                    <button
                      type="button"
                      onClick={handleCancelForm}
                      className="flex-1 bg-white border border-slate-200 font-semibold py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      Batal
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg transition shadow active:scale-98 cursor-pointer"
                  >
                    {editingCode ? 'Ubah Standard' : 'Tambah Baru'}
                  </button>
                </div>
              </form>
            )}
          </div>
          
          {/* Helpful documentation widget under card */}
          <div className="bg-primary-50/50 rounded-xl p-4 border border-primary-100 text-[11px] text-slate-600 space-y-1.5 mt-4">
            <span className="font-bold text-primary-900 block flex items-center gap-1">
              <Info className="w-4 h-4 text-primary-600 shrink-0" />
              Sistem Penomoran Hirarki [Level]
            </span>
            <p className="leading-relaxed">
              Standardisasi nomor seri visual paroki diturunkan dari segmen hirarkal: 
              <span className="block mt-1 bg-white p-1.5 rounded font-mono text-[9px] border border-primary-100 text-slate-500">
                [JenisAset]-[Tahun]-[Teritori]-[LetakRuang]-[Peruntukan]-[KodeNamaBarang]
              </span>
              Misalnya, kode <strong>403-2020-1-8-1-17</strong> mengindikasikan Jenis Aset <strong>403</strong> (Peralatan Elektronik), diperoleh tahun <strong>2020</strong>, ditempatkan di Teritori <strong>1</strong> (Paroki), tepatnya Letak Ruang <strong>8</strong> (Gudang/Ruang Liturgi), diperuntukkan bagi <strong>1</strong> (Gereja Utama), dengan Kode Nama Barang <strong>17</strong>.
            </p>
          </div>
        </div>

      </div>

      {/* ⚠️ DIALOG KONFIRMASI DELETE MASTER REFERENSI KUSTOM */}
      {deleteRef && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-6 space-y-4 animate-fade-in text-left">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Hapus Referensi Master</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus kode referensi berikut dari master data? Seluruh input register baru tidak akan lagi menampilkan referensi ini sebagai pilihan drop-down.
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-mono space-y-1.5 text-slate-700">
              <div><span className="text-slate-400 font-bold block mb-0.5">KATEGORI TABEL:</span> {subTabLabel}</div>
              <div><span className="text-slate-400 font-bold block mb-0.5">KODE REFERENSI:</span> <span className="bg-slate-100 px-1 py-0.5 text-red-700 rounded font-bold font-mono">{deleteRef.code}</span></div>
              <div><span className="text-slate-400 font-bold block mb-0.5">DESKRIPSI LABEL:</span> {deleteRef.name}</div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteRef(null)}
                className="flex-1 bg-white hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 font-semibold text-xs py-2.5 rounded-lg border border-slate-200 transition cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={() => {
                  setMapState(prev => {
                    const nextMap = { ...prev };
                    delete nextMap[deleteRef.code];
                    return nextMap;
                  });
                  setSuccessMsg(`✓ Berhasil menghapus kode referensi [${deleteRef.code}].`);
                  setDeleteRef(null);
                  clearMessages();
                }}
                className="flex-1 bg-rose-650 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-2.5 rounded-lg shadow-md transition cursor-pointer"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ DIALOG KONFIRMASI RESTORE DEFAULT BASELINE KUSTOM */}
      {restoreConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-6 space-y-4 animate-fade-in text-left">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Pulihkan Data Standar</h3>
            </div>
            
            <p className="text-xs text-slate-650 leading-relaxed">
              Apakah Anda ingin memulihkan semua master data tabel <strong>{subTabLabel}</strong> ini ke setelan standar bawaan keuskupan/paroki? Tindakan ini akan menimpa data buatan kustom Anda pada tabel ini.
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRestoreConfirm(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 font-semibold text-xs py-2.5 rounded-lg border border-slate-200 transition cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={() => {
                  setMapState(originalMapBaseline);
                  setSuccessMsg('✓ Database referensi dipulihkan ke bawaan standar.');
                  setRestoreConfirm(false);
                  handleCancelForm();
                  clearMessages();
                }}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs py-2.5 rounded-lg shadow-md transition cursor-pointer"
              >
                Ya, Pulihkan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
