/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  Asset, 
  LETAK_RUANG_MAP, 
  JENIS_ASET_MAP, 
  formatRupiah, 
  calculateStraightLineDepreciation, 
  generateNoSeriFinal,
  MaintenanceLog, 
  AssetMutation, 
  AssetDocument 
} from '../types';
import { 
  Scan, 
  Camera, 
  CheckCircle, 
  Activity, 
  MessageSquare, 
  Calendar, 
  Wrench, 
  MapPin, 
  FileText, 
  Sparkles,
  Play,
  ArrowRight,
  Plus,
  Compass,
  AlertTriangle,
  Clock
} from 'lucide-react';

interface QrScanTabProps {
  assets: Asset[];
  scannedAsset: Asset | null;
  onSetScannedAsset: (asset: Asset | null) => void;
  onAddMaintenanceLog: (assetId: string, log: MaintenanceLog) => void;
  onAddMutation: (assetId: string, mutation: AssetMutation) => void;
  onAddDocument: (assetId: string, doc: AssetDocument) => void;
  jenisAsetMap?: Record<string, string>;
  letakRuangMap?: Record<string, string>;
}

export default function QrScanTab({
  assets,
  scannedAsset,
  onSetScannedAsset,
  onAddMaintenanceLog,
  onAddMutation,
  onAddDocument,
  jenisAsetMap,
  letakRuangMap
}: QrScanTabProps) {
  const jMap = jenisAsetMap || JENIS_ASET_MAP;
  const lMap = letakRuangMap || LETAK_RUANG_MAP;

  // Simulator states
  const [selectedSerial, setSelectedSerial] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  
  // Tabs within scanned asset details
  const [activeTab, setActiveTab] = useState<'maintenance' | 'mutations' | 'documents'>('maintenance');

  // Inline forms states
  const [showLogForm, setShowLogForm] = useState(false);
  const [showMutationForm, setShowMutationForm] = useState(false);
  const [showDocForm, setShowDocForm] = useState(false);

  // New Maintenance Log state
  const [logForm, setLogForm] = useState({
    tanggalServis: new Date().toISOString().split('T')[0],
    deskripsi: '',
    biaya: 500000,
    vendor: '',
    tanggalServisNext: ''
  });

  // New Mutation state
  const [mutForm, setMutForm] = useState({
    ruangTujuan: '03',
    keterangan: '',
    picName: ''
  });

  // New Doc state
  const [docForm, setDocForm] = useState({
    namaDokumen: '',
    fileUrl: ''
  });

  // Scan simulator execution
  const executeScan = (serialCode: string) => {
    if (!serialCode) return;
    setIsScanning(true);
    setScanMessage('Kamera diaktifkan... Mengunci fokus.');
    
    setTimeout(() => {
      setScanMessage('Memproses QR Code matrix...');
      
      setTimeout(() => {
        const found = assets.find(a => a.noSeriFinal === serialCode);
        if (found) {
          onSetScannedAsset(found);
          setScanMessage('✓ Scan Berhasil!');
          // reset forms
          setShowLogForm(false);
          setShowMutationForm(false);
          setShowDocForm(false);
        } else {
          onSetScannedAsset(null);
          setScanMessage('✗ Kegagalan Dekode: Nomor Seri tidak ditemukan!');
        }
        setIsScanning(false);
      }, 500);
    }, 700);
  };

  // Trigger from dropdown directly
  const handleDropdownSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedSerial(code);
    if (code) {
      executeScan(code);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      executeScan(manualCode.trim());
    }
  };

  // Generate a procedural mock QR matrix representation using SVG
  const qrMatrix = useMemo(() => {
    if (!scannedAsset) return null;
    const text = scannedAsset.noSeriFinal;
    // Simple hashing to build deterministic pseudo random code grid
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }

    const grid = [];
    // 8x8 QR block grid
    for (let r = 0; r < 8; r++) {
      const row = [];
      for (let c = 0; c < 8; c++) {
        // Corners are typical QR anchor patterns
        const isAnchor = 
          (r < 2 && c < 2) || 
          (r < 2 && c >= 6) || 
          (r >= 6 && c < 2);
        
        if (isAnchor) {
          row.push(true);
        } else {
          const val = ((hash >> (r * 8 + c)) & 1) === 1;
          row.push(val);
        }
      }
      grid.push(row);
    }
    return grid;
  }, [scannedAsset]);

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedAsset) return;
    if (!logForm.deskripsi.trim() || !logForm.vendor.trim()) {
      alert("Harap lengkapi semua bidang isian pemeliharaan.");
      return;
    }

    const newLog: MaintenanceLog = {
      id: `m-${Date.now()}`,
      assetId: scannedAsset.id,
      tanggalServis: logForm.tanggalServis,
      deskripsi: logForm.deskripsi,
      biaya: Number(logForm.biaya),
      vendor: logForm.vendor,
      tanggalServisNext: logForm.tanggalServisNext ? logForm.tanggalServisNext : undefined,
      createdAt: new Date().toISOString()
    };

    onAddMaintenanceLog(scannedAsset.id, newLog);
    alert("✓ Log Pemeliharaan berhasil dicatat!");
    setShowLogForm(false);
    setLogForm({
      tanggalServis: new Date().toISOString().split('T')[0],
      deskripsi: '',
      biaya: 300000,
      vendor: '',
      tanggalServisNext: ''
    });
  };

  const handleAddMut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedAsset) return;
    if (!mutForm.picName.trim()) {
      alert("Harap masukkan nama Penanggung Jawab (PIC).");
      return;
    }

    const newMutation: AssetMutation = {
      id: `mut-${Date.now()}`,
      assetId: scannedAsset.id,
      ruangAsal: scannedAsset.letakRuang,
      ruangTujuan: mutForm.ruangTujuan,
      tanggalMutasi: new Date().toISOString().split('T')[0],
      keterangan: mutForm.keterangan || undefined,
      picName: mutForm.picName
    };

    onAddMutation(scannedAsset.id, newMutation);
    // Alert the user that the location changed and therefore serial code automatically updated!
    const oldCode = scannedAsset.noSeriFinal;
    const newCode = generateNoSeriFinal({
      ...scannedAsset,
      letakRuang: mutForm.ruangTujuan
    });
    
    alert(`✓ Aset berhasil dimutasi!\nRuang Baru: ${lMap[mutForm.ruangTujuan]}\nNo Seri Baru: ${newCode}`);
    
    setShowMutationForm(false);
    setMutForm({
      ruangTujuan: '03',
      keterangan: '',
      picName: ''
    });
  };

  const handleAddDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedAsset) return;
    if (!docForm.namaDokumen.trim() || !docForm.fileUrl.trim()) {
      alert("Harap isikan judul dokumen dan nama filenya.");
      return;
    }

    const newDoc: AssetDocument = {
      id: `doc-${Date.now()}`,
      assetId: scannedAsset.id,
      namaDokumen: docForm.namaDokumen,
      fileUrl: docForm.fileUrl,
      createdAt: new Date().toISOString()
    };

    onAddDocument(scannedAsset.id, newDoc);
    alert("✓ Dokumen digital berhasil dilampirkan!");
    setShowDocForm(false);
    setDocForm({
      namaDokumen: '',
      fileUrl: ''
    });
  };

  // Recalculate straight-line statistics dynamically for scan view
  const deprValues = useMemo(() => {
    if (!scannedAsset) return null;
    return calculateStraightLineDepreciation(
      scannedAsset.hargaPembelian,
      scannedAsset.nilaiResidu,
      scannedAsset.umurManfaat,
      scannedAsset.tanggalPerolehan
    );
  }, [scannedAsset]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Simulation Scanner Panel (Left 4 cols) */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Scan className="w-4 h-4 text-emerald-600 animate-pulse" />
              Kamera Scan QR Simulator
            </h3>
            <p className="text-[11px] text-slate-400">Pindai label inventaris untuk menarik berkas data, depresiasi real-time, dan mutasi fisik [1, 2].</p>
          </div>

          {/* Virtual camera screen */}
          <div className="relative bg-slate-950 aspect-[4/3] rounded-xl overflow-hidden border border-slate-900 flex flex-col justify-between items-center p-3 text-center">
            
            {/* Overlay grid scan lines */}
            <div className="absolute inset-0 pointer-events-none border border-white/5 opacity-10 flex flex-col justify-around">
              <div className="border-b border-emerald-500 w-full animate-pulse"></div>
              <div className="border-b border-emerald-500 w-full"></div>
              <div className="border-b border-emerald-500 w-full animate-pulse"></div>
            </div>

            {/* Matrix target sight indicator */}
            <div className="absolute w-36 h-36 border-2 border-emerald-500 border-dashed rounded-lg animate-pulse flex items-center justify-center top-1/2 left-1/2 -ml-18 -mt-18">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
            </div>

            <div className="self-end bg-black/60 backdrop-blur text-white px-2.5 py-0.5 rounded text-[9px] font-mono select-none flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
              <span>VIDEO ACTIVE</span>
            </div>

            {isScanning ? (
              <div className="z-10 bg-black/80 px-4 py-2 rounded-lg text-xs font-medium text-white max-w-[80%] flex items-center gap-2">
                <Compass className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>{scanMessage}</span>
              </div>
            ) : scanMessage ? (
              <div className="z-10 bg-slate-900 px-4 py-2 rounded-lg text-xs font-semibold text-emerald-300 max-w-[80%] border border-slate-800">
                {scanMessage}
              </div>
            ) : (
              <div className="z-10 text-white/50 text-[10px] max-w-[80%] font-medium">
                Posisikan barcode stiker di hadapan modul pemindai.
              </div>
            )}

            <div className="self-start text-[8px] text-slate-500 font-mono tracking-tight text-left">
              FOCAL: SL-A8 // MODEL: PAROKI-PRING_V2
            </div>
          </div>

          {/* Simulating QR selecting dropdown list */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">1. Pilih Aset Gereja Terdaftar</label>
              <select 
                value={selectedSerial}
                onChange={handleDropdownSelect}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              >
                <option value="">-- Simulasi Dekat Kamera --</option>
                {assets.map(asset => (
                  <option key={asset.id} value={asset.noSeriFinal}>
                    [{asset.noSeriFinal}] {asset.uraian.slice(0, 30)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Manual Serial Code input search alternative */}
            <form onSubmit={handleManualSubmit} className="space-y-1 pt-1">
              <label className="text-[10px] text-slate-450 font-bold uppercase tracking-wider block">Atau Input No Seri Manual</label>
              <div className="flex gap-1">
                <input 
                  type="text" 
                  placeholder="Contoh: 403-2020-1-8-1-17"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="flex-1 text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 rounded-lg font-semibold flex items-center transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Informative alert explaining QR standards of dioceses */}
        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-[11px] text-emerald-950 flex gap-2.5">
          <AlertTriangle className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-emerald-900">Informasi Penomoran Seri</span>
            <p className="leading-relaxed text-slate-600">
              Setiap stiker fisik QR memuat segmentasi kode Level-1 s/d Level-7. Jika aset dipindahkan (mutasi), sistem melacak log pergerakan historis sekaligus memperbarui Level penempatan letak ruang pada string visual kode.
            </p>
          </div>
        </div>
      </div>

      {/* Scanned Details view and actions (Right 8 cols) */}
      <div className="lg:col-span-8">
        {!scannedAsset ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-16 text-center flex flex-col items-center justify-center h-full">
            <Camera className="w-12 h-12 text-slate-300 mb-3 animate-pulse" />
            <h4 className="text-sm font-bold text-slate-700">Menunggu Umpan QR Code</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Pilih salah satu spesimen aset gereja di kolom kiri dropdown atau ketik No Seri lengkap untuk mensimulasikan hasil pemindaian scanner.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
            
            {/* Scanned Asset Title Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <span className="bg-emerald-50 text-emerald-800 font-bold border border-emerald-100 text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                  HASIL SCAN AKTIF
                </span>
                <h3 className="text-base font-bold text-slate-900">{scannedAsset.uraian}</h3>
                <div className="text-xs text-slate-500 font-semibold flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{scannedAsset.noSeriFinal}</span>
                  <span className="text-slate-300">|</span>
                  <span>Qty: {scannedAsset.qty} {scannedAsset.satuan}</span>
                </div>
              </div>

              {/* Real QR code matching individual product */}
              <div className="bg-white p-2 text-slate-800 rounded-lg shadow-sm border border-slate-200 shrink-0 self-center flex items-center justify-center">
                <QRCodeCanvas
                  value={scannedAsset.noSeriFinal}
                  size={64}
                  level="H"
                  includeMargin={false}
                />
              </div>
            </div>

            {/* Grid of details: purchase and depreciation stats */}
            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-100 text-xs bg-slate-50/20">
              
              {/* Box 1: Perolehan */}
              <div className="bg-white p-3.5 rounded-lg space-y-1.5 border border-slate-200 shadow-sm">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Akuisisi Awal</span>
                <div className="font-semibold text-slate-800">{new Date(scannedAsset.tanggalPerolehan).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div className="text-slate-500">Harga: <span className="font-mono font-semibold text-slate-700">{formatRupiah(scannedAsset.hargaPembelian)}</span></div>
                {scannedAsset.qty > 1 && (
                  <div className="text-[10px] text-indigo-700 font-bold">Total: {formatRupiah(scannedAsset.hargaPembelian * scannedAsset.qty)}</div>
                )}
                <div className="text-slate-500">Tahun Buku: <span className="font-bold">{scannedAsset.tahun}</span></div>
              </div>

              {/* Box 2: Depresiasi stats */}
              <div className="bg-white p-3.5 rounded-lg space-y-1.5 border border-slate-200 shadow-sm animate-fade-in">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Profil Aktiva</span>
                <div className="text-slate-500 flex justify-between">
                  <span>Qty:</span>
                  <span className="font-bold text-slate-800">{scannedAsset.qty} {scannedAsset.satuan}</span>
                </div>
                <div className="text-slate-500 flex justify-between">
                  <span>Masa Manfaat:</span>
                  <span className="font-bold text-slate-800">{scannedAsset.umurManfaat} thn</span>
                </div>
                <div className="text-slate-500 flex justify-between">
                  <span>Penyusutan Unit:</span>
                  <span className="font-semibold text-slate-700 font-mono">{formatRupiah(deprValues?.biayaPenyusutan || 0)}/th</span>
                </div>
                {scannedAsset.qty > 1 && (
                  <div className="text-[10px] text-indigo-700 font-bold flex justify-between pt-0.5 border-t border-dashed border-slate-100">
                    <span>Total Penyusutan:</span>
                    <span>{formatRupiah((deprValues?.biayaPenyusutan || 0) * scannedAsset.qty)}/th</span>
                  </div>
                )}
              </div>

              {/* Box 3: Estimasi Nilai Buku Kini */}
              <div className="bg-emerald-50/40 p-3.5 rounded-lg space-y-1.5 border border-emerald-100/60 flex flex-col justify-center shadow-inner">
                <span className="text-[10px] text-emerald-700 uppercase tracking-wider block font-bold">Nilai Buku Real-Time</span>
                <div className="text-xs font-bold text-emerald-800 font-mono leading-tight">
                  Unit: <span className="text-slate-700 font-semibold">{formatRupiah(deprValues?.nilaiBuku || 0)}</span>
                </div>
                {scannedAsset.qty > 1 && (
                  <div className="text-sm font-bold text-emerald-950 font-mono tracking-tight leading-none pt-0.5">
                    Total: <span>{formatRupiah((deprValues?.nilaiBuku || 0) * scannedAsset.qty)}</span>
                  </div>
                )}
                <span className="text-[9px] text-emerald-600 block mt-1 font-medium">Sesuai kalkulasi tanggal berjalan [2, 10]</span>
              </div>
            </div>

            {/* Extra details (Location level metrics) */}
            <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-200 text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium text-slate-800">
                  [{scannedAsset.letakRuang}] {lMap[scannedAsset.letakRuang] || 'Tidak Diketahui'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium text-slate-800">
                  [{scannedAsset.jenisAset}] {jMap[scannedAsset.jenisAset] || 'Tidak Diketahui'}
                </span>
              </div>
            </div>

            {/* Tabs for Related Modules: Maintenance logs, Mutations, Documents */}
            <div className="flex bg-slate-100/50 border-b border-slate-200 text-xs">
              <button
                onClick={() => setActiveTab('maintenance')}
                className={`flex-1 py-3 text-center font-bold tracking-wide uppercase transition cursor-pointer ${
                  activeTab === 'maintenance' 
                    ? 'bg-white border-b-2 border-emerald-600 text-emerald-600' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Pemeliharaan ({scannedAsset.maintenanceLogs?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('mutations')}
                className={`flex-1 py-3 text-center font-bold tracking-wide uppercase transition cursor-pointer ${
                  activeTab === 'mutations' 
                    ? 'bg-white border-b-2 border-emerald-600 text-emerald-600' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Mutasi Letak ({scannedAsset.mutations?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`flex-1 py-3 text-center font-bold tracking-wide uppercase transition cursor-pointer ${
                  activeTab === 'documents' 
                    ? 'bg-white border-b-2 border-emerald-600 text-emerald-600' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Digital Dokumen ({scannedAsset.documents?.length || 0})
              </button>
            </div>

            {/* Tab content area */}
            <div className="flex-1 p-5 overflow-y-auto">
              {/* Tab 1: Maintenance logs list */}
              {activeTab === 'maintenance' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-emerald-600 animate-pulse" />
                      Riwayat Servis / Pemeliharaan Berkala
                    </h4>
                    <button
                      onClick={() => setShowLogForm(!showLogForm)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 inline-block transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Catat Servis
                    </button>
                  </div>

                  {/* Inline Maintenance record form */}
                  {showLogForm && (
                    <form onSubmit={handleAddLog} className="bg-slate-50 p-4 rounded-xl border border-emerald-100 space-y-3 animate-fade-in text-xs">
                      <div className="font-bold text-emerald-900 border-b pb-1">Pelaporan Servis Baru</div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold block">Tanggal Servis</label>
                          <input 
                            type="date"
                            required
                            value={logForm.tanggalServis}
                            onChange={(e) => setLogForm({...logForm, tanggalServis: e.target.value})}
                            className="bg-white border p-1.5 rounded w-full text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold block">Biaya Servis (Rp)</label>
                          <input 
                            type="number"
                            required
                            min="0"
                            value={logForm.biaya}
                            onChange={(e) => setLogForm({...logForm, biaya: Number(e.target.value)})}
                            className="bg-white border p-1.5 rounded w-full text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold block">Nama Vendor / Toko</label>
                          <input 
                            type="text"
                            required
                            placeholder="Melodia Musik Jogja"
                            value={logForm.vendor}
                            onChange={(e) => setLogForm({...logForm, vendor: e.target.value})}
                            className="bg-white border p-1.5 rounded w-full text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold block">Jadwal Servis Next (Opsional)</label>
                          <input 
                            type="date"
                            value={logForm.tanggalServisNext}
                            onChange={(e) => setLogForm({...logForm, tanggalServisNext: e.target.value})}
                            className="bg-white border p-1.5 rounded w-full text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold block">Keterangan Aktivitas Deskripsi</label>
                        <textarea
                          required
                          placeholder="Deskripsi pengerjaan pemeliharaan..."
                          value={logForm.deskripsi}
                          onChange={(e) => setLogForm({...logForm, deskripsi: e.target.value})}
                          rows={2}
                          className="bg-white border p-1.5 rounded w-full text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="flex justify-end gap-1.5 pt-1">
                        <button 
                          type="button" 
                          onClick={() => setShowLogForm(false)}
                          className="bg-white border px-3 py-1.5 rounded font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          Batal
                        </button>
                        <button 
                          type="submit"
                          className="bg-emerald-600 text-white px-3 py-1.5 rounded font-semibold hover:bg-emerald-700 shadow-sm cursor-pointer"
                        >
                          Kirim Log
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Log list Display */}
                  {!scannedAsset.maintenanceLogs || scannedAsset.maintenanceLogs.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      Aset ini belum pernah mencatatkan riwayat servis / pemeliharaan.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {scannedAsset.maintenanceLogs.map(log => (
                        <div key={log.id} className="bg-slate-50 border border-slate-100 p-3.5 rounded-lg text-xs space-y-1.5">
                          <div className="flex justify-between items-center text-slate-400">
                            <span className="font-bold text-slate-700 flex items-center gap-1">
                               <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              {log.vendor}
                            </span>
                            <span className="font-mono text-[10px]">
                              {new Date(log.tanggalServis).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed font-medium">{log.deskripsi}</p>
                          <div className="font-mono text-[10px] text-slate-500 flex justify-between items-center pt-1 border-t border-slate-100">
                            <span>Biaya: <strong className="text-slate-700">{formatRupiah(log.biaya)}</strong></span>
                            {log.tanggalServisNext && (
                              <span className="flex items-center gap-0.5 text-emerald-600 font-semibold bg-emerald-55/40 px-1.5 py-0.5 rounded">
                                <Clock className="w-3 h-3" />
                                Servis Next: {new Date(log.tanggalServisNext).toLocaleDateString('id-ID')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Mutations transfer logs */}
              {activeTab === 'mutations' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-emerald-600 animate-pulse" />
                      Log Mutasi Perpindahan Ruangan
                    </h4>
                    <button
                      onClick={() => setShowMutationForm(!showMutationForm)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 inline-block transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Ajukan Pemindahan (Mutasi)
                    </button>
                  </div>

                  {/* Inline Mutation Form */}
                  {showMutationForm && (
                    <form onSubmit={handleAddMut} className="bg-slate-50 p-4 rounded-xl border border-emerald-100 space-y-3 animate-fade-in text-xs">
                      <div className="font-bold text-emerald-950 border-b pb-1">Penugasan Mutasi Letak</div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold block">Ruang Saat Ini (Asal)</label>
                          <div className="bg-slate-200 p-1.5 rounded text-xs font-semibold text-slate-600 font-mono">
                            [{scannedAsset.letakRuang}] {lMap[scannedAsset.letakRuang] || 'Tidak Diketahui'}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-bold block">Ruangan Baru (Tujuan)</label>
                          <select 
                            value={mutForm.ruangTujuan}
                            onChange={(e) => setMutForm({...mutForm, ruangTujuan: e.target.value})}
                            className="bg-white border p-1 rounded w-full text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                          >
                            {Object.entries(lMap).map(([code, name]) => (
                              <option key={code} value={code}>[{code}] {name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold block">Nama Penanggung Jawab / PIC Mutasi</label>
                        <input 
                          type="text"
                          required
                          placeholder="Masukkan nama petugas pemindah..."
                          value={mutForm.picName}
                          onChange={(e) => setMutForm({...mutForm, picName: e.target.value})}
                          className="bg-white border p-1.5 rounded w-full text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold block">Catatan Tambahan (Keterangan)</label>
                        <input 
                          type="text"
                          placeholder="Alasan mutasi barang..."
                          value={mutForm.keterangan}
                          onChange={(e) => setMutForm({...mutForm, keterangan: e.target.value})}
                          className="bg-white border p-1.5 rounded w-full text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="flex justify-end gap-1.5 pt-1">
                        <button 
                          type="button" 
                          onClick={() => setShowMutationForm(false)}
                          className="bg-white border px-3 py-1.5 rounded font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          Batal
                        </button>
                        <button 
                          type="submit"
                          className="bg-emerald-600 text-white px-3 py-1.5 rounded font-semibold hover:bg-emerald-700 shadow-sm cursor-pointer"
                        >
                          Mutasi Aset
                        </button>
                      </div>

                    </form>
                  )}

                  {!scannedAsset.mutations || scannedAsset.mutations.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      Aset ini belum pernah mencatatkan log mutasi letak. Masih di pos aslinya.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {scannedAsset.mutations.map(mut => (
                        <div key={mut.id} className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs flex items-start gap-3">
                          <Compass className="w-5 h-5 text-emerald-600 mt-1 shrink-0 bg-emerald-50 p-1 rounded" />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-1 font-semibold text-slate-700">
                              <span>[{mut.ruangAsal}] {lMap[mut.ruangAsal] || 'Asal'}</span>
                              <ArrowRight className="w-3" />
                              <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">[{mut.ruangTujuan}] {lMap[mut.ruangTujuan] || 'Tujuan'}</span>
                            </div>
                            {mut.keterangan && <p className="text-slate-500 font-medium italic">"{mut.keterangan}"</p>}
                            <div className="text-[10px] text-slate-400 font-mono flex justify-between pt-1 border-t border-slate-100/50">
                              <span>PIC: <strong className="text-slate-600">{mut.picName}</strong></span>
                              <span>{new Date(mut.tanggalMutasi).toLocaleDateString('id-ID')}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Documents attachment list */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-600 animate-pulse" />
                      Arsip Digital Terkait (Sertifikat / Nota / Garansi)
                    </h4>
                    <button
                      onClick={() => setShowDocForm(!showDocForm)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 inline-block transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Tambah Bukti Dokumen
                    </button>
                  </div>

                  {/* Inline Document Form */}
                  {showDocForm && (
                    <form onSubmit={handleAddDoc} className="bg-slate-50 p-4 rounded-xl border border-emerald-100 space-y-3 animate-fade-in text-xs">
                      <div className="font-bold text-emerald-950 border-b pb-1">Unggah Digital Dokumen Bukti</div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold block">Judul / Nama Dokumen Bukti</label>
                        <input 
                          type="text"
                          required
                          placeholder="Nota Pembelian Toko Sumber Arto"
                          value={docForm.namaDokumen}
                          onChange={(e) => setDocForm({...docForm, namaDokumen: e.target.value})}
                          className="bg-white border p-1.5 rounded w-full text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-bold block">Masukkan Nama File / URL Virtual</label>
                        <input 
                          type="text"
                          required
                          placeholder="e.g. lampiran_nota_pembelian.pdf"
                          value={docForm.fileUrl}
                          onChange={(e) => setDocForm({...docForm, fileUrl: e.target.value})}
                          className="bg-white border p-1.5 rounded w-full text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
                        />
                      </div>

                      <div className="flex justify-end gap-1.5 pt-1">
                        <button 
                          type="button" 
                          onClick={() => setShowDocForm(false)}
                          className="bg-white border px-3 py-1.5 rounded font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          Batal
                        </button>
                        <button 
                          type="submit"
                          className="bg-emerald-600 text-white px-3 py-1.5 rounded font-semibold hover:bg-emerald-700 shadow-sm cursor-pointer"
                        >
                          Simpan Dokumen
                        </button>
                      </div>

                    </form>
                  )}

                  {!scannedAsset.documents || scannedAsset.documents.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      Aset ini belum pernah melampirkan file sertifikat atau bukti kepemilikan digital.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {scannedAsset.documents.map(doc => (
                        <div key={doc.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between text-xs hover:border-emerald-200 transition">
                          <div className="flex items-center gap-2 overflow-hidden mr-2">
                            <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                            <div className="overflow-hidden">
                              <span className="font-bold text-slate-700 block truncate">{doc.namaDokumen}</span>
                              <span className="text-[10px] font-mono text-slate-400 truncate block">{doc.fileUrl}</span>
                            </div>
                          </div>
                          <span className="text-[9px] bg-slate-200 px-1.5 py-0.5 rounded font-bold shrink-0 text-slate-600">
                            PDF / DOC
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
