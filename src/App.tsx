/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Asset, 
  User, 
  INITIAL_ASSETS, 
  INITIAL_USERS, 
  MaintenanceLog, 
  AssetMutation, 
  AssetDocument,
  generateNoSeriFinal,
  calculateStraightLineDepreciation,
  JENIS_ASET_MAP,
  LETAK_RUANG_MAP,
  TERITORI_MAP,
  PERUNTUKAN_MAP,
  KODE_NAMA_BARANG_MAP,
  BIDANG_MAP
} from './types';
import {
  getAllAssetsFromFirebase,
  saveAssetToFirebase,
  deleteAssetFromFirebase,
  getAllUsersFromFirebase,
  saveUserToFirebase,
  deleteUserFromFirebase,
  syncAllAssetsToFirebase,
  syncAllUsersToFirebase
} from './firebaseUtils';
import DashboardTab from './components/DashboardTab';
import AssetListTab from './components/AssetListTab';
import QrScanTab from './components/QrScanTab';
import BulkImportTab from './components/BulkImportTab';
import MasterDataTab from './components/MasterDataTab';
import AccountSettingsTab from './components/AccountSettingsTab';
import AssetModal from './components/AssetModal';
import Login from './components/Login';

import { 
  LayoutDashboard, 
  ClipboardList, 
  Scan, 
  FileSpreadsheet, 
  UserCheck, 
  Clock, 
  Church, 
  Lock, 
  ShieldCheck,
  Compass,
  Database,
  ChevronLeft,
  ChevronRight,
  Settings,
  Sun,
  Moon,
  LogOut
} from 'lucide-react';

export default function App() {
  // State management
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('sim_aset_is_authenticated') === 'true';
  });

  const [assets, setAssets] = useState<Asset[]>(() => {
    const cachedData = localStorage.getItem('sim_aset_paroki_data');
    let rawAssets = INITIAL_ASSETS;
    if (cachedData) {
      try {
        rawAssets = JSON.parse(cachedData);
      } catch (err) {
        rawAssets = INITIAL_ASSETS;
      }
    }
    // Refresh calculations dynamically on boot to ensure exact system policies
    return rawAssets.map(asset => {
      const depr = calculateStraightLineDepreciation(
        asset.hargaPembelian,
        asset.nilaiResidu,
        asset.umurManfaat,
        asset.tanggalPerolehan
      );
      return {
        ...asset,
        nilaiBuku: depr.nilaiBuku,
        biayaPenyusutan: depr.biayaPenyusutan
      };
    });
  });

  const [isLoading, setIsLoading] = useState(true);

  // Load from Firebase on Mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const remoteAssets = await getAllAssetsFromFirebase();
        if (remoteAssets && remoteAssets.length > 0) {
          setAssets(remoteAssets.map(asset => {
            const depr = calculateStraightLineDepreciation(
              asset.hargaPembelian,
              asset.nilaiResidu,
              asset.umurManfaat,
              asset.tanggalPerolehan
            );
            return {
              ...asset,
              nilaiBuku: depr.nilaiBuku,
              biayaPenyusutan: depr.biayaPenyusutan
            };
          }));
        } else {
          // Initialize Firebase with local default state
          syncAllAssetsToFirebase(assets).catch(console.error);
        }

        const remoteUsers = await getAllUsersFromFirebase();
        if (remoteUsers && remoteUsers.length > 0) {
          setUsers(remoteUsers.map(user => {
            const defaultValue = INITIAL_USERS.find(iu => iu.id === user.id || iu.email === user.email);
            return {
              ...user,
              username: user.username || defaultValue?.username || user.email.split('@')[0],
              password: user.password || defaultValue?.password || '123'
            };
          }));
        } else {
          // Initialize Firebase with local default state
          syncAllUsersToFirebase(users).catch(console.error);
        }
        setIsLoading(false);
      } catch (err) {
        console.error("fetch error", err);
        setIsLoading(false);
      }
    };
    fetchData();
  }, []); // Only on mount

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const cached = localStorage.getItem('sim_aset_current_user');
    const parsed = cached ? JSON.parse(cached) : INITIAL_USERS[0];
    const defaultValue = INITIAL_USERS.find(iu => iu.id === parsed.id || iu.email === parsed.email);
    return {
      ...parsed,
      username: parsed.username || defaultValue?.username || parsed.email.split('@')[0],
      password: parsed.password || defaultValue?.password || '123'
    };
  });
  const [users, setUsers] = useState<User[]>(() => {
    const cachedUsers = localStorage.getItem('sim_aset_registered_users');
    let rawUsers = INITIAL_USERS;
    if (cachedUsers) {
      try {
        const parsed = JSON.parse(cachedUsers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rawUsers = parsed;
        }
      } catch (err) {
        rawUsers = INITIAL_USERS;
      }
    }
    // Gabungkan dengan kredensial default dari INITIAL_USERS untuk mengatasi data legacy cache
    return rawUsers.map(user => {
      const defaultValue = INITIAL_USERS.find(iu => iu.id === user.id || iu.email === user.email);
      return {
        ...user,
        username: user.username || defaultValue?.username || user.email.split('@')[0],
        password: user.password || defaultValue?.password || '123'
      };
    });
  });

  const [appLogo, setAppLogo] = useState<string | null>(() => {
    return localStorage.getItem('sim_aset_paroki_logo');
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assets' | 'qr' | 'import' | 'master' | 'account'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    const cached = localStorage.getItem('sim_aset_sidebar_collapsed');
    return cached === 'true';
  });
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const cached = localStorage.getItem('sim_aset_theme');
    return cached === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sim_aset_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sim_aset_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const nextVal = !prev;
      localStorage.setItem('sim_aset_sidebar_collapsed', String(nextVal));
      return nextVal;
    });
  };
  
  // Specific scanner viewport loaded asset
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);

  // Time clock display
  const [currentTime, setCurrentTime] = useState<string>('');

  // Stateful Master Data Maps
  const [jenisAsetMap, setJenisAsetMap] = useState<Record<string, string>>(() => {
    const cached = localStorage.getItem('sim_aset_paroki_jenis_aset');
    return cached ? JSON.parse(cached) : JENIS_ASET_MAP;
  });
  const [letakRuangMap, setLetakRuangMap] = useState<Record<string, string>>(() => {
    const cached = localStorage.getItem('sim_aset_paroki_letak_ruang');
    return cached ? JSON.parse(cached) : LETAK_RUANG_MAP;
  });
  const [teritoriMap, setTeritoriMap] = useState<Record<string, string>>(() => {
    const cached = localStorage.getItem('sim_aset_paroki_teritori');
    return cached ? JSON.parse(cached) : TERITORI_MAP;
  });
  const [peruntukanMap, setPeruntukanMap] = useState<Record<string, string>>(() => {
    const cached = localStorage.getItem('sim_aset_paroki_peruntukan');
    return cached ? JSON.parse(cached) : PERUNTUKAN_MAP;
  });
  const [kodeNamaBarangMap, setKodeNamaBarangMap] = useState<Record<string, string>>(() => {
    const cached = localStorage.getItem('sim_aset_paroki_kode_nama_barang');
    return cached ? JSON.parse(cached) : KODE_NAMA_BARANG_MAP;
  });
  const [bidangMap, setBidangMap] = useState<Record<string, string>>(() => {
    const cached = localStorage.getItem('sim_aset_paroki_bidang');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Object.keys(parsed).length > 0) return parsed;
    }
    return BIDANG_MAP;
  });

  // 1. Persist to localStorage whenever assets modify
  useEffect(() => {
    localStorage.setItem('sim_aset_paroki_data', JSON.stringify(assets));
  }, [assets]);

  // Persist master maps to localStorage
  useEffect(() => {
    localStorage.setItem('sim_aset_paroki_jenis_aset', JSON.stringify(jenisAsetMap));
  }, [jenisAsetMap]);

  useEffect(() => {
    localStorage.setItem('sim_aset_paroki_letak_ruang', JSON.stringify(letakRuangMap));
  }, [letakRuangMap]);

  useEffect(() => {
    localStorage.setItem('sim_aset_paroki_teritori', JSON.stringify(teritoriMap));
  }, [teritoriMap]);

  useEffect(() => {
    localStorage.setItem('sim_aset_paroki_peruntukan', JSON.stringify(peruntukanMap));
  }, [peruntukanMap]);

  useEffect(() => {
    localStorage.setItem('sim_aset_paroki_kode_nama_barang', JSON.stringify(kodeNamaBarangMap));
  }, [kodeNamaBarangMap]);

  useEffect(() => {
    localStorage.setItem('sim_aset_paroki_bidang', JSON.stringify(bidangMap));
  }, [bidangMap]);

  useEffect(() => {
    localStorage.setItem('sim_aset_registered_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (appLogo) {
      localStorage.setItem('sim_aset_paroki_logo', appLogo);
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = appLogo;
      }
    } else {
      localStorage.removeItem('sim_aset_paroki_logo');
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = '/vite.svg'; // Default fallback
      }
    }
  }, [appLogo]);

  // 3. Dynamic ticking clock matching local times & server Z-time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handler: Select operator in RBAC switcher
  const handleOperatorChange = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('sim_aset_current_user', JSON.stringify(user));
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('sim_aset_current_user', JSON.stringify(user));
    localStorage.setItem('sim_aset_is_authenticated', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('sim_aset_is_authenticated');
    setIsAuthenticated(false);
  };

  const handleUpdateCurrentUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('sim_aset_current_user', JSON.stringify(updatedUser));
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    saveUserToFirebase(updatedUser).catch(console.error);
  };

  const handleAddUser = (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
    saveUserToFirebase(newUser).catch(console.error);
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    deleteUserFromFirebase(userId).catch(console.error);
  };

  // Actions: Add new Asset
  const handleAddAsset = (newAsset: Asset) => {
    const nextAssets = [newAsset, ...assets];
    setAssets(nextAssets);
    saveAssetToFirebase(newAsset).catch(console.error);
  };

  // Actions: Update existing Asset
  const handleUpdateAsset = (updatedAsset: Asset) => {
    const nextAssets = assets.map(a => a.id === updatedAsset.id ? updatedAsset : a);
    setAssets(nextAssets);
    saveAssetToFirebase(updatedAsset).catch(console.error);
    
    // update scan focus if it was active
    if (scannedAsset && scannedAsset.id === updatedAsset.id) {
      setScannedAsset(updatedAsset);
    }
    if (selectedAsset && selectedAsset.id === updatedAsset.id) {
      setSelectedAsset(updatedAsset);
    }
  };

  // Actions: Delete Asset
  const handleDeleteAsset = (id: string) => {
    const nextAssets = assets.filter(a => a.id !== id);
    setAssets(nextAssets);
    deleteAssetFromFirebase(id).catch(console.error);

    if (scannedAsset && scannedAsset.id === id) {
      setScannedAsset(null);
    }
    if (selectedAsset && selectedAsset.id === id) {
      setSelectedAsset(null);
    }
  };

  // Actions: Delete Multiple Assets
  const handleDeleteAssets = (ids: string[]) => {
    setAssets(prev => prev.filter(a => !ids.includes(a.id)));
    ids.forEach(id => deleteAssetFromFirebase(id).catch(console.error));


    if (scannedAsset && ids.includes(scannedAsset.id)) {
      setScannedAsset(null);
    }
    if (selectedAsset && ids.includes(selectedAsset.id)) {
      setSelectedAsset(null);
    }
  };

  // Actions: Add maintenance service record to asset
  const handleAddMaintenanceLog = (assetId: string, log: MaintenanceLog) => {
    const nextAssets = assets.map(asset => {
      if (asset.id === assetId) {
        const logs = asset.maintenanceLogs ? [...asset.maintenanceLogs, log] : [log];
        // Sort logs descending (latest first)
        logs.sort((a, b) => new Date(b.tanggalServis).getTime() - new Date(a.tanggalServis).getTime());
        const updatedAsset = {
          ...asset,
          maintenanceLogs: logs,
          kondisiBarang: 'BAIK' as const, // Automatically restoring condition to BAIK after service logging!
          updatedAt: new Date().toISOString()
        };
        saveAssetToFirebase(updatedAsset).catch(console.error);
        return updatedAsset;
      }
      return asset;
    });

    setAssets(nextAssets);

    // Refresh active focuses
    const found = nextAssets.find(a => a.id === assetId);
    if (found) {
      if (scannedAsset && scannedAsset.id === assetId) setScannedAsset(found);
      if (selectedAsset && selectedAsset.id === assetId) setSelectedAsset(found);
    }
  };

  // Actions: Add physical relocation log (Mutation)
  const handleAddMutation = (assetId: string, mutation: AssetMutation) => {
    const nextAssets = assets.map(asset => {
      if (asset.id === assetId) {
        // Dynamic resegmentation of final serial code according to the level-5 room change!
        const nextCode = generateNoSeriFinal({
          ...asset,
          letakRuang: mutation.ruangTujuan
        });

        const updatedDepr = calculateStraightLineDepreciation(
          asset.hargaPembelian,
          asset.nilaiResidu,
          asset.umurManfaat,
          asset.tanggalPerolehan
        );

        const mutList = asset.mutations ? [mutation, ...asset.mutations] : [mutation];

        const updatedAsset = {
          ...asset,
          letakRuang: mutation.ruangTujuan, // update room penempatan
          noSeriFinal: nextCode, // update automatic serial identifier
          nilaiBuku: updatedDepr.nilaiBuku,
          mutations: mutList,
          updatedAt: new Date().toISOString()
        };
        saveAssetToFirebase(updatedAsset).catch(console.error);
        return updatedAsset;
      }
      return asset;
    });

    setAssets(nextAssets);

    // Refresh active focuses
    const found = nextAssets.find(a => a.id === assetId);
    if (found) {
      if (scannedAsset && scannedAsset.id === assetId) setScannedAsset(found);
      if (selectedAsset && selectedAsset.id === assetId) setSelectedAsset(found);
    }
  };

  // Actions: Attach digital scanned proof document
  const handleAddDocument = (assetId: string, doc: AssetDocument) => {
    const nextAssets = assets.map(asset => {
      if (asset.id === assetId) {
        const docList = asset.documents ? [doc, ...asset.documents] : [doc];
        const updatedAsset = {
          ...asset,
          documents: docList,
          updatedAt: new Date().toISOString()
        };
        saveAssetToFirebase(updatedAsset).catch(console.error);
        return updatedAsset;
      }
      return asset;
    });

    setAssets(nextAssets);

    const found = nextAssets.find(a => a.id === assetId);
    if (found) {
      if (scannedAsset && scannedAsset.id === assetId) setScannedAsset(found);
      if (selectedAsset && selectedAsset.id === assetId) setSelectedAsset(found);
    }
  };

  // Actions: Excel worksheet bulk append or overwrite
  const handleImportAssets = (importedList: Asset[], replaceExisting?: boolean) => {
    // Deduplicate the incoming imported list itself (first one wins to avoid internal duplicates)
    const uniqueImportedMap = new Map<string, Asset>();
    importedList.forEach(asset => {
      const code = asset.noSeriFinal.trim();
      if (!uniqueImportedMap.has(code)) {
        uniqueImportedMap.set(code, asset);
      }
    });
    const uniqueImported = Array.from(uniqueImportedMap.values());

    if (replaceExisting) {
      setAssets(uniqueImported);
      syncAllAssetsToFirebase(uniqueImported).catch(console.error);
    } else {
      // For appending, use a Map to merge existing and imported assets, preventing any duplicate No Seri Final
      const mergedMap = new Map<string, Asset>();
      // First, seed with existing assets
      assets.forEach(asset => {
        mergedMap.set(asset.noSeriFinal.trim(), asset);
      });
      // Then overwrite or add imported assets
      uniqueImported.forEach(asset => {
        mergedMap.set(asset.noSeriFinal.trim(), asset);
      });
      
      const nextAssets = Array.from(mergedMap.values());
      setAssets(nextAssets);
      syncAllAssetsToFirebase(nextAssets).catch(console.error);
    }
  };

  const handleClearAllAssets = () => {
    // Delete all assets sequentially (or keep it simple, overwrite or delete)
    // Note: for production, bulk delete in Firebase is better handled by a batch, but this is a helper.
    assets.forEach(asset => deleteAssetFromFirebase(asset.id).catch(console.error));
    setAssets([]);
  };

  const handleInspectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
  };

  const handleInspectAssetInScanner = (asset: Asset) => {
    setScannedAsset(asset);
    setActiveTab('qr');
    // scroll scanning camera into view if on mobile
    const scannerEl = document.getElementById('dashboard-container');
    if (scannerEl) {
      scannerEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!isAuthenticated) {
    return (
      <Login 
        users={users} 
        onLoginSuccess={handleLoginSuccess}
        isDarkMode={isDarkMode}
        appLogo={appLogo}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased font-sans">
      
      {/* 1. Left Sidebar Navigation Panel */}
      <aside className={`w-full ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'} bg-white dark:bg-slate-900 flex flex-col border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shrink-0 select-none md:sticky md:top-0 md:h-screen transition-all duration-300 ease-in-out z-20`}>
        
        {/* Sidebar Header Brand segment */}
        <div className={`p-4 border-b border-slate-200 dark:border-slate-800 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} transition-all`}>
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2.5 animate-fade-in shrink-0">
              {appLogo ? (
                <img src={appLogo} alt="Logo" className="w-8.5 h-8.5 rounded-lg object-contain bg-white shrink-0" />
              ) : (
                <div className="w-8.5 h-8.5 bg-primary-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary-500/20 shrink-0">
                  <Church className="w-5 h-5" />
                </div>
              )}
              <div>
                <h1 className="font-bold text-slate-900 dark:text-white tracking-tight text-xs md:text-sm font-display">SIMAS Gereja</h1>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest leading-none mt-0.5">Paroki Pringwulung</p>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary-500/20 shrink-0 cursor-pointer" onClick={toggleSidebar} title="SIMAS Gereja (Perbesar)">
              {appLogo ? (
                <img src={appLogo} alt="Logo" className="w-full h-full rounded-lg object-contain bg-white" />
              ) : (
                <Church className="w-5 h-5" />
              )}
            </div>
          )}
          
          {/* Collapse trigger button */}
          <button 
            type="button"
            onClick={toggleSidebar}
            className={`hidden md:flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors ${isSidebarCollapsed ? 'ml-0' : ''}`}
            title={isSidebarCollapsed ? "Expand Sidebar (Perbesar menu)" : "Collapse Sidebar (Kecilkan menu)"}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Sidebar Menu sections */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {!isSidebarCollapsed && (
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3 px-2">Menu Utama</div>
          )}
          
          <button
            onClick={() => setActiveTab('dashboard')}
            title="Dashboard Rekapitulasi"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'gap-3 py-2.5 px-3'} rounded-lg text-[11px] font-bold uppercase tracking-wider transition ${
              activeTab === 'dashboard'
                ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 border-l-4 border-primary-500 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-primary-500 shrink-0" />
            {!isSidebarCollapsed && <span>Dashboard</span>}
          </button>

          <button
            onClick={() => setActiveTab('assets')}
            title={`Register Aset (${assets.length})`}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'gap-3 py-2.5 px-3'} rounded-lg text-[11px] font-bold uppercase tracking-wider transition relative ${
              activeTab === 'assets'
                ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 border-l-4 border-primary-500 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-primary-500 shrink-0" />
            {!isSidebarCollapsed ? (
              <span>Register Aset ({assets.length})</span>
            ) : (
              <span className="absolute top-1 right-2 bg-primary-600 text-white font-mono text-[8px] px-1 rounded-full">{assets.length}</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            title="Pantau & QR Scanner Hub"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3 text-primary-500 hover:bg-slate-100 dark:hover:bg-slate-800' : 'gap-3 py-2.5 px-3'} rounded-lg text-[11px] font-bold uppercase tracking-wider transition ${
              activeTab === 'qr'
                ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 border-l-4 border-primary-500 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Scan className="w-4 h-4 text-primary-500 shrink-0" />
            {!isSidebarCollapsed && <span>Scanner & QR Booth</span>}
          </button>

          <button
            onClick={() => setActiveTab('import')}
            title="Unggah Lembar Kerja Excel"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'gap-3 py-2.5 px-3'} rounded-lg text-[11px] font-bold uppercase tracking-wider transition ${
              activeTab === 'import'
                ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 border-l-4 border-primary-500 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-primary-500 shrink-0" />
            {!isSidebarCollapsed && <span>Unggah Massal</span>}
          </button>

          <button
            onClick={() => setActiveTab('master')}
            title="Konfigurasi Master Data"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'gap-3 py-2.5 px-3'} rounded-lg text-[11px] font-bold uppercase tracking-wider transition ${
              activeTab === 'master'
                ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 border-l-4 border-primary-500 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4 text-primary-500 shrink-0" />
            {!isSidebarCollapsed && <span>Master Data</span>}
          </button>

          <button
            onClick={() => setActiveTab('account')}
            title="Pengaturan Akun"
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center py-3' : 'gap-3 py-2.5 px-3'} rounded-lg text-[11px] font-bold uppercase tracking-wider transition ${
              activeTab === 'account'
                ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 border-l-4 border-primary-500 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4 text-primary-500 shrink-0" />
            {!isSidebarCollapsed && <span>Pengaturan Akun</span>}
          </button>

          {!isSidebarCollapsed ? (
            <div className="border-t border-slate-200 dark:border-slate-800/60 my-4 pt-3">
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Kredensial Operator</div>
              </div>
              <div className="px-2 py-2 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-850 space-y-1.5 text-[10px]/snug text-slate-600 dark:text-slate-400 font-mono">
                <div className="text-slate-400 dark:text-slate-500">EMAIL:</div>
                <div className="text-primary-600 dark:text-primary-450 truncate font-semibold">{currentUser.email}</div>
                <div className="text-slate-400 dark:text-slate-500 pt-1">HAK AKSES:</div>
                <div className="text-slate-900 dark:text-white">
                  {currentUser.role === 'SUPER_ADMIN' ? 'SUPER CONTROL' : currentUser.role === 'KOORDINATOR_TIM' ? `TIM: ${currentUser.kategoriAkses}` : 'LIHAT SAJA'}
                </div>
              </div>
            </div>
          ) : (
            <div className="border-t border-slate-200 dark:border-slate-800/60 my-4 pt-3 flex flex-col items-center gap-2">
              <div className="w-7 h-7 bg-slate-100 dark:bg-slate-950 text-primary-600 dark:text-primary-400 border border-slate-200 dark:border-slate-800 font-bold font-mono rounded-full flex items-center justify-center text-[10px] transition-transform hover:scale-105 cursor-pointer" title={`Operator: ${currentUser.name}`}>
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'O'}
              </div>
            </div>
          )}
        </nav>

        {/* Sidebar Footer RBAC Operator Switcher */}
        {!isSidebarCollapsed && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
            <div className="flex flex-col gap-2">
              <span className="text-[9px] text-slate-500 font-bold uppercase">Ganti Operator Sesi:</span>
              <select
                value={currentUser.id}
                onChange={(e) => handleOperatorChange(e.target.value)}
                className="w-full text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
              >
                {users.map(user => (
                  <option key={user.id} value={user.id} className="text-slate-800 bg-white">
                    {user.name} ({user.role === 'SUPER_ADMIN' ? 'SUPER' : user.role === 'KOORDINATOR_TIM' ? 'TIM' : 'VIEWER'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

      </aside>

      {/* 2. Right Main Layout Viewport Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Header navigation with Clock indicator */}
        <header className="h-16 bg-white border-b border-slate-200 flex flex-col md:flex-row items-center justify-between px-6 gap-3 shrink-0 py-3 md:py-0 sticky top-0 z-10 shadow-sm">
          
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Pringwulung Live Workspace</span>
            <span className="text-slate-300 text-sm hidden md:inline">|</span>
            {/* Clock display */}
            <div className="text-[11px] text-slate-500 font-mono font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-primary-500 shrink-0" />
              <span>{currentTime || 'Mempersiapkan jam...'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Global High-Contrast Style Theme Toggle */}
            <button
              type="button"
              onClick={() => setIsDarkMode(prev => !prev)}
              className="p-1 px-2.5 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer text-[10px] font-bold uppercase shadow-sm font-mono bg-slate-50 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-amber-400"
              title={isDarkMode ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap (Kontras Tinggi)"}
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500 animate-[spin_10s_linear_infinite]" />
                  <span>TERANG</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>K. TINGGI (GELAP)</span>
                </>
              )}
            </button>

            <span className="text-[10px] font-mono text-slate-450 uppercase">AKTIF: <strong className="text-slate-700 font-bold font-sans">{currentUser.name}</strong></span>
            
            {currentUser.role === 'SUPER_ADMIN' ? (
              <span className="bg-primary-50 text-primary-700 px-2.5 py-1 rounded text-[10px] uppercase font-bold border border-primary-100 flex items-center gap-1 shadow-sm font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-primary-500" />
                DITERAL ADMIN
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-[10px] uppercase font-bold border border-slate-200 flex items-center gap-1 font-mono">
                <Lock className="w-3 h-3 text-slate-400" />
                AKSES TERBATAS
              </span>
            )}

            {/* Logout Action Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-1 px-2.5 rounded-lg border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-900/70 dark:text-rose-300 flex items-center gap-1.5 transition-all cursor-pointer text-[10px] font-bold uppercase shadow-sm font-mono"
              title="Keluar dari Aplikasi (Logout)"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span>KELUAR</span>
            </button>
          </div>

        </header>

        {/* Tab content area container */}
        <main className="flex-1 p-4 md:p-6 space-y-6">
          
          {activeTab === 'dashboard' && (
            <DashboardTab
              assets={assets}
              onSelectAsset={handleInspectAssetInScanner}
              jenisAsetMap={jenisAsetMap}
            />
          )}

          {activeTab === 'assets' && (
            <AssetListTab
              assets={assets}
              currentUser={currentUser}
              onAddAsset={handleAddAsset}
              onUpdateAsset={handleUpdateAsset}
              onDeleteAsset={handleDeleteAsset}
              onDeleteAssets={handleDeleteAssets}
              onSelectAsset={handleInspectAsset}
              jenisAsetMap={jenisAsetMap}
              letakRuangMap={letakRuangMap}
              teritoriMap={teritoriMap}
              peruntukanMap={peruntukanMap}
              kodeNamaBarangMap={kodeNamaBarangMap}
              bidangMap={bidangMap}
            />
          )}

          {activeTab === 'qr' && (
            <QrScanTab
              assets={assets}
              scannedAsset={scannedAsset}
              onSetScannedAsset={setScannedAsset}
              onAddMaintenanceLog={handleAddMaintenanceLog}
              onAddMutation={handleAddMutation}
              onAddDocument={handleAddDocument}
              jenisAsetMap={jenisAsetMap}
              letakRuangMap={letakRuangMap}
            />
          )}

          {activeTab === 'import' && (
            <BulkImportTab
              onImportAssets={handleImportAssets}
              onClearAllAssets={handleClearAllAssets}
              assetsLength={assets.length}
              jenisAsetMap={jenisAsetMap}
              letakRuangMap={letakRuangMap}
              teritoriMap={teritoriMap}
              peruntukanMap={peruntukanMap}
              kodeNamaBarangMap={kodeNamaBarangMap}
            />
          )}

          {activeTab === 'master' && (
            <MasterDataTab
              currentUser={currentUser}
              assets={assets}
              setAssets={setAssets}
              jenisAsetMap={jenisAsetMap}
              setJenisAsetMap={setJenisAsetMap}
              letakRuangMap={letakRuangMap}
              setLetakRuangMap={setLetakRuangMap}
              teritoriMap={teritoriMap}
              setTeritoriMap={setTeritoriMap}
              peruntukanMap={peruntukanMap}
              setPeruntukanMap={setPeruntukanMap}
              kodeNamaBarangMap={kodeNamaBarangMap}
              setKodeNamaBarangMap={setKodeNamaBarangMap}
              bidangMap={bidangMap}
              setBidangMap={setBidangMap}
            />
          )}

          {activeTab === 'account' && (
            <AccountSettingsTab
              currentUser={currentUser}
              onUpdateCurrentUser={handleUpdateCurrentUser}
              bidangMap={bidangMap}
              users={users}
              onAddUser={handleAddUser}
              onDeleteUser={handleDeleteUser}
              assets={assets}
              appLogo={appLogo}
              setAppLogo={setAppLogo}
            />
          )}

        </main>

        {/* Dynamic bottom layout signature footer */}
        <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-[10px] font-mono text-slate-400 mt-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <span>© 1998 - 2026 KEPENGURUSAN GEREJA SANTO YOHANES RASUL PRINGWULUNG.</span>
          <span className="text-[9px] bg-slate-50 px-2.5 py-1 rounded border inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary-500" />
            HIGH DENSITY DATA ENGINE • RECALCULATED SECURE STATE
          </span>
        </footer>

      </div>

      {/* Global Inspectors asset details Overlay Modal */}
      {selectedAsset && (
        <AssetModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          jenisAsetMap={jenisAsetMap}
          letakRuangMap={letakRuangMap}
          teritoriMap={teritoriMap}
          peruntukanMap={peruntukanMap}
          kodeNamaBarangMap={kodeNamaBarangMap}
          bidangMap={bidangMap}
        />
      )}

    </div>
  );
}
