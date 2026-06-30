/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Asset, 
  User, 
  JENIS_ASET_MAP, 
  TERITORI_MAP, 
  PERUNTUKAN_MAP, 
  LETAK_RUANG_MAP, 
  KODE_NAMA_BARANG_MAP,
  formatRupiah, 
  generateNoSeriFinal,
  calculateStraightLineDepreciation,
  generateQrValue,
  KondisiBarang
} from '../types';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Lock, 
  UserCheck, 
  X, 
  RefreshCw, 
  FileSpreadsheet,
  FileText,
  Info,
  Printer,
  Download,
  AlertTriangle
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AssetListTabProps {
  assets: Asset[];
  currentUser: User;
  onAddAsset: (newAsset: Asset) => void;
  onUpdateAsset: (updatedAsset: Asset) => void;
  onDeleteAsset: (id: string) => void;
  onDeleteAssets?: (ids: string[]) => void;
  onSelectAsset: (asset: Asset) => void;
  jenisAsetMap?: Record<string, string>;
  letakRuangMap?: Record<string, string>;
  teritoriMap?: Record<string, string>;
  peruntukanMap?: Record<string, string>;
  kodeNamaBarangMap?: Record<string, string>;
  bidangMap?: Record<string, string>;
}

export default function AssetListTab({
  assets,
  currentUser,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
  onDeleteAssets,
  onSelectAsset,
  jenisAsetMap,
  letakRuangMap,
  teritoriMap,
  peruntukanMap,
  kodeNamaBarangMap,
  bidangMap
}: AssetListTabProps) {
  const jMap = jenisAsetMap || JENIS_ASET_MAP;
  const lMap = letakRuangMap || LETAK_RUANG_MAP;
  const tMap = teritoriMap || TERITORI_MAP;
  const pMap = peruntukanMap || PERUNTUKAN_MAP;
  const kMap = kodeNamaBarangMap || KODE_NAMA_BARANG_MAP;
  const bMap = bidangMap || {};

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [selectedBidang, setSelectedBidang] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset pagination to first page when filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedLocation, selectedCondition, selectedBidang]);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState('');
  
  // Custom non-blocking modal states
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [permissionErrorMsg, setPermissionErrorMsg] = useState<string | null>(null);
  const [duplicateConfirmRef, setDuplicateConfirmRef] = useState<{ serialNum: string; createPayload: Asset } | null>(null);
  const [formErrorMsg, setFormErrorMsg] = useState<string | null>(null);
  
  // Custom checklist & bulk delete states
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkPrintModal, setShowBulkPrintModal] = useState(false);
  const [labelSize, setLabelSize] = useState<'standard' | 'compact'>('standard');
  
  // New Asset form data
  const [formData, setFormData] = useState({
    uraian: '',
    qty: 1,
    satuan: 'pcs',
    tanggalPerolehan: new Date().toISOString().split('T')[0],
    hargaPembelian: 15000000,
    jenisAset: '403', // default
    tahun: new Date().getFullYear(),
    teritori: '01',
    peruntukan: '01',
    letakRuang: '02',
    noUrutSejenis: '001',
    kodeNamaBarang: '1',
    umurManfaat: 5,
    nilaiResidu: 0,
    kondisiBarang: 'BAIK' as KondisiBarang,
    bidang: ''
  });

  // Check user permission
  const checkPermission = (assetBidang: string | undefined) => {
    if (currentUser.role === 'SUPER_ADMIN') return { permitted: true };
    if (currentUser.role === 'KOORDINATOR_TIM') {
      const isPermitted = currentUser.kategoriAkses === assetBidang;
      return { 
        permitted: isPermitted, 
        message: isPermitted 
          ? '' 
          : `Terkunci: Anda koordinator Bidang [${bMap[currentUser.kategoriAkses || ''] || currentUser.kategoriAkses}], tidak dapat merubah aset Bidang [${bMap[assetBidang || ''] || assetBidang || 'Kosong'}]` 
      };
    }
    return { permitted: false, message: 'Terkunci: Petugas Viewer tidak memiliki hak mengubah data.' };
  };

  // Preview automatic calculation on form changes
  const livePreview = useMemo(() => {
    const serial = generateNoSeriFinal({
      jenisAset: formData.jenisAset,
      teritori: formData.teritori,
      peruntukan: formData.peruntukan,
      letakRuang: formData.letakRuang,
      kodeNamaBarang: formData.kodeNamaBarang,
      noUrutSejenis: formData.noUrutSejenis
    });

    const valResult = calculateStraightLineDepreciation(
      formData.hargaPembelian,
      formData.nilaiResidu,
      formData.umurManfaat,
      formData.tanggalPerolehan
    );

    return {
      noSeriFinal: serial,
      ...valResult
    };
  }, [formData]);

  // Handle filter matching
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchSearch = 
        asset.uraian.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.noSeriFinal.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (jMap[asset.jenisAset] || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchCategory = selectedCategory === '' || asset.jenisAset === selectedCategory;
      const matchLocation = selectedLocation === '' || asset.letakRuang === selectedLocation;
      const matchCondition = selectedCondition === '' || asset.kondisiBarang === selectedCondition;
      const matchBidang = selectedBidang === '' || asset.bidang === selectedBidang;

      return matchSearch && matchCategory && matchLocation && matchCondition && matchBidang;
    });
  }, [assets, searchTerm, selectedCategory, selectedLocation, selectedCondition, selectedBidang, jMap]);

  // Pagination calculation
  const totalItems = filteredAssets.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = Math.max(1, Math.min(currentPage, totalPages));

  const paginatedAssets = useMemo(() => {
    const startIndex = (activePage - 1) * itemsPerPage;
    return filteredAssets.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAssets, activePage, itemsPerPage]);

  const handleOpenAddForm = () => {
    // Determine a safe category to default
    let defaultCat = '403';
    if (currentUser.role === 'KOORDINATOR_TIM' && currentUser.kategoriAkses) {
      defaultCat = currentUser.kategoriAkses;
    }

    setFormData({
      uraian: '',
      qty: 1,
      satuan: 'pcs',
      tanggalPerolehan: new Date().toISOString().split('T')[0],
      hargaPembelian: 10000000,
      jenisAset: defaultCat,
      tahun: new Date().getFullYear(),
      teritori: '01',
      peruntukan: '01',
      letakRuang: '04',
      noUrutSejenis: '001',
      kodeNamaBarang: '10',
      umurManfaat: 5,
      nilaiResidu: 1000000,
      kondisiBarang: 'BAIK'
    });
    setIsEditing(false);
    setFormErrorMsg(null);
    setShowForm(true);
  };

  const handleOpenEditForm = (asset: Asset) => {
    const perm = checkPermission(asset.bidang);
    if (!perm.permitted) {
      setPermissionErrorMsg(perm.message || 'Anda tidak diizinkan mengubah aset ini.');
      return;
    }

    setFormData({
      uraian: asset.uraian,
      qty: asset.qty,
      satuan: asset.satuan,
      tanggalPerolehan: asset.tanggalPerolehan,
      hargaPembelian: Number(asset.hargaPembelian),
      jenisAset: asset.jenisAset,
      tahun: asset.tahun,
      teritori: asset.teritori,
      peruntukan: asset.peruntukan,
      letakRuang: asset.letakRuang,
      noUrutSejenis: asset.noUrutSejenis,
      kodeNamaBarang: asset.kodeNamaBarang,
      umurManfaat: asset.umurManfaat,
      nilaiResidu: Number(asset.nilaiResidu),
      kondisiBarang: asset.kondisiBarang,
      bidang: asset.bidang || ''
    });
    setEditingId(asset.id);
    setIsEditing(true);
    setFormErrorMsg(null);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrorMsg(null);
    if (!formData.uraian.trim()) {
      setFormErrorMsg("Deskripsi / Uraian aset tidak boleh kosong.");
      return;
    }

    const { permitted, message } = checkPermission(formData.bidang);
    if (!permitted) {
      setFormErrorMsg(message || "Anda tidak memiliki wewenang menyimpan aset untuk kategori ini.");
      return;
    }

    // Recalculate depreciation details
    const depr = calculateStraightLineDepreciation(
      formData.hargaPembelian,
      formData.nilaiResidu,
      formData.umurManfaat,
      formData.tanggalPerolehan
    );

    const serialNum = generateNoSeriFinal({
      jenisAset: formData.jenisAset,
      teritori: formData.teritori,
      peruntukan: formData.peruntukan,
      letakRuang: formData.letakRuang,
      kodeNamaBarang: formData.kodeNamaBarang,
      noUrutSejenis: formData.noUrutSejenis
    });

    if (isEditing) {
      // Check if another asset already uses the same serial num
      const isDuplicate = assets.some(a => a.id !== editingId && a.noSeriFinal === serialNum);
      if (isDuplicate) {
        setFormErrorMsg(`Gagal menyimpan: Nomor Seri Final [${serialNum}] sudah terdaftar untuk aset lain di sistem database. Parameter kode dan Nomor Urut Sejenis harus unik.`);
        return;
      }

      const originalAsset = assets.find(a => a.id === editingId);
      const updated: Asset = {
        ...originalAsset!,
        uraian: formData.uraian,
        qty: Number(formData.qty),
        satuan: formData.satuan,
        tanggalPerolehan: formData.tanggalPerolehan,
        hargaPembelian: Number(formData.hargaPembelian),
        jenisAset: formData.jenisAset,
        tahun: Number(formData.tahun),
        teritori: formData.teritori,
        peruntukan: formData.peruntukan,
        letakRuang: formData.letakRuang,
        noUrutSejenis: formData.noUrutSejenis,
        kodeNamaBarang: formData.kodeNamaBarang,
        noSeriFinal: serialNum,
        umurManfaat: Number(formData.umurManfaat),
        nilaiResidu: Number(formData.nilaiResidu),
        nilaiBuku: depr.nilaiBuku,
        biayaPenyusutan: depr.biayaPenyusutan,
        kondisiBarang: formData.kondisiBarang,
        bidang: formData.bidang,
        updatedAt: new Date().toISOString()
      };
      onUpdateAsset(updated);
    } else {
      const isDuplicate = assets.some(a => a.noSeriFinal === serialNum);
      if (isDuplicate) {
        setFormErrorMsg(`Gagal mendaftarkan: Nomor Seri Final [${serialNum}] sudah terdaftar di sistem database. Harap ganti Nomor Urut Sejenis atau parameter kode lainnya.`);
        return;
      }

      const created: Asset = {
        id: `as-${Date.now()}`,
        uraian: formData.uraian,
        qty: Number(formData.qty),
        satuan: formData.satuan,
        tanggalPerolehan: formData.tanggalPerolehan,
        hargaPembelian: Number(formData.hargaPembelian),
        jenisAset: formData.jenisAset,
        tahun: Number(formData.tahun),
        teritori: formData.teritori,
        peruntukan: formData.peruntukan,
        letakRuang: formData.letakRuang,
        noUrutSejenis: formData.noUrutSejenis,
        kodeNamaBarang: formData.kodeNamaBarang,
        noSeriFinal: serialNum,
        umurManfaat: Number(formData.umurManfaat),
        nilaiResidu: Number(formData.nilaiResidu),
        nilaiBuku: depr.nilaiBuku,
        biayaPenyusutan: depr.biayaPenyusutan,
        kondisiBarang: formData.kondisiBarang,
        bidang: formData.bidang,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        maintenanceLogs: [],
        mutations: [],
        documents: []
      };

      onAddAsset(created);
    }

    setShowForm(false);
  };

  const handleDelete = (asset: Asset) => {
    const perm = checkPermission(asset.bidang);
    if (!perm.permitted) {
      setPermissionErrorMsg(perm.message || 'Anda tidak diizinkan menghapus aset ini.');
      return;
    }

    setAssetToDelete(asset);
  };

  const handleToggleAll = () => {
    const filteredIds = filteredAssets.map(a => a.id);
    const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedAssetIds.includes(id));
    if (allFilteredSelected) {
      setSelectedAssetIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedAssetIds(prev => {
        const union = new Set([...prev, ...filteredIds]);
        return Array.from(union);
      });
    }
  };

  const handleToggleOne = (id: string) => {
    setSelectedAssetIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const selectedAssets = useMemo(() => {
    return assets.filter(a => selectedAssetIds.includes(a.id));
  }, [assets, selectedAssetIds]);

  const bulkDeleteGroups = useMemo(() => {
    const deletable: Asset[] = [];
    const locked: Asset[] = [];
    
    selectedAssets.forEach(asset => {
      const perm = checkPermission(asset.bidang);
      if (perm.permitted) {
        deletable.push(asset);
      } else {
        locked.push(asset);
      }
    });
    
    return { deletable, locked };
  }, [selectedAssets, currentUser]);

  const handleExecuteBulkDelete = () => {
    if (onDeleteAssets && bulkDeleteGroups.deletable.length > 0) {
      const idsToDelete = bulkDeleteGroups.deletable.map(a => a.id);
      onDeleteAssets(idsToDelete);
      // Clear selected list
      setSelectedAssetIds(prev => prev.filter(id => !idsToDelete.includes(id)));
    }
    setShowBulkDeleteConfirm(false);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedLocation('');
    setSelectedCondition('');
    setSelectedBidang('');
  };

  const handleExportCSV = () => {
    const escapeCSV = (val: string | number | undefined | null): string => {
      if (val === undefined || val === null) return '';
      const text = String(val);
      if (text.includes(',') || text.includes('"') || text.includes('\n') || text.includes('\r')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const csvHeaders = [
      'No Seri Final',
      'Uraian / Deskripsi',
      'Qty',
      'Satuan',
      'Tanggal Perolehan',
      'Tahun',
      'Harga Pembelian (IDR)',
      'Kategori Kode',
      'Kategori',
      'Teritori Kode',
      'Teritori',
      'Peruntukan Kode',
      'Peruntukan',
      'Letak Ruangan Kode',
      'Letak Ruangan',
      'Kondisi Barang',
      'Umur Manfaat (Tahun)',
      'Nilai Residu (IDR)',
      'Nilai Buku Saat Ini (IDR)',
      'Penyusutan Tahunan (IDR)'
    ];

    const csvRows = filteredAssets.map(asset => {
      const catLabel = jMap[asset.jenisAset] || '';
      const teriLabel = tMap[asset.teritori] || '';
      const peruntukanLabel = pMap[asset.peruntukan] || '';
      const ruangLabel = lMap[asset.letakRuang] || '';

      return [
        escapeCSV(asset.noSeriFinal),
        escapeCSV(asset.uraian),
        escapeCSV(asset.qty),
        escapeCSV(asset.satuan),
        escapeCSV(asset.tanggalPerolehan),
        escapeCSV(asset.tahun),
        escapeCSV(asset.hargaPembelian),
        escapeCSV(asset.jenisAset),
        escapeCSV(catLabel),
        escapeCSV(asset.teritori),
        escapeCSV(teriLabel),
        escapeCSV(asset.peruntukan),
        escapeCSV(peruntukanLabel),
        escapeCSV(asset.letakRuang),
        escapeCSV(ruangLabel),
        escapeCSV(asset.kondisiBarang),
        escapeCSV(asset.umurManfaat),
        escapeCSV(asset.nilaiResidu),
        escapeCSV(asset.nilaiBuku),
        escapeCSV(asset.biayaPenyusutan)
      ].join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const timeStr = today.toLocaleTimeString('id-ID').replace(/:/g, '-');
    
    link.href = url;
    link.download = `register-aset-pringwulung_${dateStr}_${timeStr}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const timeStr = today.toLocaleTimeString('id-ID').replace(/:/g, '-');
    
    doc.setFontSize(16);
    doc.text('Laporan Daftar Aset', 14, 20);
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${dateStr} ${timeStr}`, 14, 26);

    const tableColumn = [
      'No Seri',
      'Uraian',
      'Qty',
      'Satuan',
      'Kategori',
      'Lokasi',
      'Kondisi',
      'Harga Beli',
      'Nilai Buku'
    ];

    const tableRows = filteredAssets.map(asset => {
      const catLabel = jMap[asset.jenisAset] || '';
      const ruangLabel = lMap[asset.letakRuang] || '';
      
      return [
        asset.noSeriFinal,
        asset.uraian,
        asset.qty,
        asset.satuan,
        catLabel,
        ruangLabel,
        asset.kondisiBarang,
        formatRupiah(asset.hargaPembelian),
        formatRupiah(asset.nilaiBuku)
      ];
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 32,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] }
    });

    doc.save(`Laporan_Aset_${dateStr}_${timeStr}.pdf`);
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Strip */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Main search */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text" 
              placeholder="Cari berdasarkan uraian barang, No Seri Final, atau kategori..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 bg-slate-50/50"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportPDF}
              type="button"
              title="Ekspor daftar aset tersaring ke file PDF"
              className="bg-white hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-705 text-slate-700 hover:text-primary-700 border border-slate-200 px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-primary-600" />
              <span>Ekspor PDF</span>
            </button>
            <button
              onClick={handleExportCSV}
              type="button"
              title="Ekspor daftar aset tersaring ke file CSV"
              className="bg-white hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-705 text-slate-700 hover:text-primary-700 border border-slate-200 px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-primary-600" />
              <span>Ekspor CSV</span>
            </button>

            {currentUser.role !== 'PETUGAS_VIEWER' ? (
              <button
                onClick={handleOpenAddForm}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Aset Baru
              </button>
            ) : (
              <div className="bg-slate-100 text-slate-500 text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 font-medium border border-slate-200">
                <Lock className="w-3.5 h-3.5" />
                Mode Lihat-Saja
              </div>
            )}
          </div>
        </div>

        {/* Filters panel */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium animate-pulse">
            <Filter className="w-3.5 h-3.5 text-primary-500" />
            <span>Saring:</span>
          </div>

          {/* Category Dropdown */}
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-none rounded-md px-2.5 py-1.5 text-slate-600 dark:text-slate-200 font-medium cursor-pointer max-w-[200px] text-xs focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Semua Kategori</option>
            {Object.entries(jMap).map(([code, name]) => (
              <option key={code} value={code}>[{code}] {name}</option>
            ))}
          </select>

          {/* Location Dropdown */}
          <select 
            value={selectedLocation} 
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 border-none rounded-md px-2.5 py-1.5 text-slate-600 font-medium cursor-pointer text-xs focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Semua Ruangan</option>
            {Object.entries(lMap).map(([code, name]) => (
              <option key={code} value={code}>[{code}] {name}</option>
            ))}
          </select>

          {/* Bidang Dropdown */}
          <select 
            value={selectedBidang} 
            onChange={(e) => setSelectedBidang(e.target.value)}
            className="bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 border-none rounded-md px-2.5 py-1.5 text-slate-600 font-medium cursor-pointer text-xs focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Semua Bidang</option>
            {Object.entries(bMap).map(([code, name]) => (
              <option key={code} value={code}>[{code}] {name}</option>
            ))}
          </select>

          {/* Condition Dropdown */}
          <select 
            value={selectedCondition} 
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 border-none rounded-md px-2.5 py-1.5 text-slate-600 font-medium cursor-pointer text-xs focus:ring-1 focus:ring-primary-500"
          >
            <option value="">Semua Kondisi</option>
            <option value="BAIK">Baik</option>
            <option value="RUSAK_RINGAN">Rusak Ringan</option>
            <option value="RUSAK_BERAT">Rusak Berat</option>
          </select>

          {(selectedCategory || selectedLocation || selectedCondition || selectedBidang || searchTerm) && (
            <button 
              onClick={resetFilters}
              className="text-primary-600 font-bold hover:text-primary-800 underline uppercase tracking-wider text-[10px] pl-1 cursor-pointer"
            >
              Ulangi Pencarian
            </button>
          )}

          <div className="ml-auto text-slate-400 text-[11px] font-mono">
            Ditemukan: <span className="font-bold text-primary-650">{filteredAssets.length}</span> / {assets.length} unit
          </div>
        </div>
      </div>

      {/* Main Asset Grid/Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {selectedAssetIds.length > 0 && (
          <div className="bg-slate-900 text-slate-100 px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3 text-xs animate-fade-in font-sans">
            <div className="flex items-center gap-3">
              <span className="bg-primary-500 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px] tracking-wide shrink-0">
                {selectedAssetIds.length} UNIT DIPILIH
              </span>
              <span className="text-slate-400 font-medium">
                {currentUser.role !== 'PETUGAS_VIEWER' 
                  ? `Sistem label & penghapusan massal. ${bulkDeleteGroups.deletable.length} unit dapat dihapus.`
                  : `Cetak label QR massal untuk aset yang terpilih.`
                }
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedAssetIds([])}
                className="text-slate-400 hover:text-white font-medium px-2.5 py-1.5 rounded hover:bg-slate-800 transition cursor-pointer"
              >
                Batal Saring
              </button>

              <button
                type="button"
                onClick={() => setShowBulkPrintModal(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow"
              >
                <Printer className="w-3.5 h-3.5 animate-bounce" />
                Cetak Label Massal ({selectedAssetIds.length})
              </button>

              {currentUser.role !== 'PETUGAS_VIEWER' && (
                <button
                  type="button"
                  onClick={() => {
                    if (bulkDeleteGroups.deletable.length === 0) {
                      setPermissionErrorMsg("Tidak ada unit aset dari daftar terpilih yang sesuai dengan hak akses (kategori bidang tugas) tim Anda.");
                    } else {
                      setShowBulkDeleteConfirm(true);
                    }
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Massal ({bulkDeleteGroups.deletable.length})
                </button>
              )}
            </div>
          </div>
        )}

        {filteredAssets.length === 0 ? (
          <div className="py-16 text-center">
            <Info className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-705 text-slate-700">Aset Tidak Ditemukan</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Gunakan kata kunci pencarian lain atau klik tombol "Ulangi Pencarian" untuk mengembalikan filter data inventaris.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50/70 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="pl-6 pr-2 py-3.5 w-10 text-center select-none">
                    <input 
                      type="checkbox"
                      checked={filteredAssets.length > 0 && filteredAssets.every(a => selectedAssetIds.includes(a.id))}
                      onChange={handleToggleAll}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer w-3.5 h-3.5"
                    />
                  </th>
                  <th className="px-6 py-3.5">No. Seri Final [Level 1-6]</th>
                  <th className="px-6 py-3.5">Uraian / Penempatan</th>
                  <th className="px-6 py-3.5">Kondisi</th>
                  <th className="px-6 py-3.5">Biaya Perolehan</th>
                  <th className="px-6 py-3.5">Akumulasi Depresiasi</th>
                  <th className="px-6 py-3.5">Nilai Buku Aktual</th>
                  <th className="px-6 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody id="assets-table-body" className="divide-y divide-slate-100 text-xs text-slate-600">
                {paginatedAssets.map(asset => {
                  const oVal = Number(asset.hargaPembelian) || 0;
                  const bVal = Number(asset.nilaiBuku) || 0;
                  const residu = Number(asset.nilaiResidu) || 0;
                  
                  // Compute dynamic progress bar for depreciation status
                  const totalDepreciable = oVal - residu;
                  const currentDepreciated = oVal - bVal;
                  
                  // Percentage of the depreciated amount (0% to 100%)
                  const dPercent = totalDepreciable > 0 
                  ? Math.min((currentDepreciated / totalDepreciable) * 100, 100) 
                  : 0;

                  const rLabel = lMap[asset.letakRuang] || `Ruang ${asset.letakRuang}`;
                  const cLabel = jMap[asset.jenisAset] || `Jenis ${asset.jenisAset}`;
                  const isChecked = selectedAssetIds.includes(asset.id);

                  return (
                    <tr 
                      key={asset.id} 
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition group border-b border-transparent hover:border-primary-100 ${
                        isChecked ? 'bg-primary-50/10' : ''
                      }`}
                    >
                      <td className="pl-6 pr-2 py-4 text-center select-none">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleOne(asset.id)}
                          className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer w-3.5 h-3.5"
                        />
                      </td>
                      {/* Column 1: Serial Code */}
                      <td className="px-6 py-4">
                        <span 
                          onClick={() => onSelectAsset(asset)}
                          className="font-mono text-xs text-primary-600 hover:text-primary-700 font-bold decoration-dashed hover:underline cursor-pointer tracking-tight"
                        >
                          {asset.noSeriFinal}
                        </span>
                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          Tahun: {asset.tahun} | Qty: {asset.qty} {asset.satuan}
                        </div>
                      </td>

                      {/* Column 2: Name & Space */}
                      <td className="px-6 py-4 max-w-xs">
                        <div 
                          onClick={() => onSelectAsset(asset)}
                          className="font-semibold text-slate-800 text-xs hover:text-primary-600 cursor-pointer transition break-words"
                        >
                          {asset.uraian}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium mt-0.5 flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono text-[9px]">{asset.letakRuang}</span>
                            <span>{rLabel}</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-400 shrink-0">({cLabel})</span>
                          </div>
                          {asset.bidang && (
                            <div className="text-[10px] text-slate-500 truncate" title={bMap[asset.bidang] || asset.bidang}>
                              <span className="font-bold text-slate-600">Bidang:</span> {bMap[asset.bidang] || asset.bidang}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Column 3: Physical Condition */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          asset.kondisiBarang === 'BAIK' ? 'bg-primary-50 text-primary-700 border border-primary-100' :
                          asset.kondisiBarang === 'RUSAK_RINGAN' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 
                          'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          {asset.kondisiBarang.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Column 4: Cost */}
                      <td className="px-6 py-4 font-mono">
                        <div className="font-semibold text-slate-700">{formatRupiah(oVal)}</div>
                        {asset.qty > 1 && (
                          <div className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold mt-0.5">
                            Total: {formatRupiah(oVal * asset.qty)}
                          </div>
                        )}
                      </td>

                      {/* Column 5: Depreciation Progression */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden shrink-0">
                            <div 
                              className={`h-full rounded-full ${
                                dPercent > 80 ? 'bg-amber-500' : dPercent > 50 ? 'bg-primary-600' : 'bg-primary-400'
                              }`}
                              style={{ width: `${dPercent}%` }}
                            ></div>
                          </div>
                          <span className="font-mono text-[10px] text-slate-500 font-bold shrink-0">
                            {dPercent.toFixed(0)}%
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-450 mt-1 space-y-0.5">
                          <div>
                            Akm: <span className="font-mono font-bold text-slate-700">{formatRupiah(currentDepreciated)}</span>
                            {asset.qty > 1 && <span className="text-indigo-600 font-bold mt-0.5 block">Total Akm: {formatRupiah(currentDepreciated * asset.qty)}</span>}
                          </div>
                          <div>
                            Depr: {formatRupiah(asset.biayaPenyusutan)}/th
                            {asset.qty > 1 && <span className="text-indigo-600 font-bold mt-0.5 block">Total Depr: {formatRupiah(asset.biayaPenyusutan * asset.qty)}/th</span>}
                          </div>
                        </div>
                      </td>

                      {/* Column 6: Current Book Value */}
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-xs text-primary-700 block">
                          {formatRupiah(bVal)}
                        </span>
                        {asset.qty > 1 && (
                          <span className="font-mono font-bold text-[10px] text-primary-650 block mt-0.5">
                            Total: {formatRupiah(bVal * asset.qty)}
                          </span>
                        )}
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          Residu: {formatRupiah(residu)}
                          {asset.qty > 1 && <span className="block font-bold mt-0.5 text-slate-500">Total Res: {formatRupiah(residu * asset.qty)}</span>}
                          <span className="block text-slate-400 mt-0.5">(Umur {asset.umurManfaat} Th)</span>
                        </div>
                      </td>

                      {/* Column 7: Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => onSelectAsset(asset)}
                            title="Detail / QR"
                            className="p-1 px-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-150 rounded transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {currentUser.role !== 'PETUGAS_VIEWER' && (
                            <>
                              <button 
                                onClick={() => handleOpenEditForm(asset)}
                                title="Ubah data"
                                className="p-1 px-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(asset)}
                                title="Hapus aset"
                                className="p-1 px-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 📋 PAGINATION FOOTER PANEL */}
        {filteredAssets.length > 0 && (
          <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-slate-500 rounded-b-xl">
            {/* Left side: Items per page selector & status summary */}
            <div className="flex flex-wrap items-center gap-2">
              <span>Tampilkan</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>entri dari total <strong className="text-slate-800">{totalItems}</strong> aset</span>
            </div>

            {/* Right side: Modern page-shuffling buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={activePage === 1}
                onClick={() => setCurrentPage(1)}
                className="px-2.5 py-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer font-bold text-[10px]"
                title="Halaman Pertama"
              >
                &laquo; Pertama
              </button>
              
              <button
                type="button"
                disabled={activePage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer font-bold"
              >
                Sebelumnya
              </button>

              <span className="bg-white text-primary-800 border border-slate-200 font-mono px-3 py-1.5 rounded-lg font-bold text-xs">
                {activePage} <span className="text-slate-300 font-sans mx-1">/</span> {totalPages}
              </span>

              <button
                type="button"
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer font-bold"
              >
                Berikutnya
              </button>

              <button
                type="button"
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="px-2.5 py-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer font-bold text-[10px]"
                title="Halaman Terakhir"
              >
                Terakhir &raquo;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Asset Drawer Dialog Overlay */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-in-right">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-primary-600 animate-pulse" />
                  {isEditing ? 'Ubah Informasi Aset Paroki' : 'Daftarkan Inventaris Aset Baru'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Formulasi nomor seri otomatis sesuai standar pelaporan paroki [1, 2].
                </p>
              </div>
              <button 
                onClick={() => setShowForm(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              
              {formErrorMsg && (
                <div className="bg-rose-50 text-rose-800 p-3.5 rounded-lg border border-rose-150 text-xs flex items-center gap-2 animate-fade-in font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-650 shrink-0"></span>
                  {formErrorMsg}
                </div>
              )}
              
              {/* Dynamic RBAC Info Alert */}
              <div className="bg-slate-100 p-3 rounded-lg flex gap-2 border border-slate-200 text-xs text-slate-600">
                <UserCheck className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block text-slate-800">Operator Sesi: {currentUser.name} ({currentUser.role})</span>
                  {currentUser.role === 'KOORDINATOR_TIM' && (
                    <p className="text-[10px] text-amber-700">
                      Izin penguncian kategori aktif untuk: **[{currentUser.kategoriAkses}]**
                    </p>
                  )}
                </div>
              </div>

              {/* Uraian (Main Description) */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-bold block uppercase tracking-wide">Uraian / Deskripsi Aset</label>
                <span className="text-[10px] text-slate-400 block -mt-1">Nama lengkap aset beserta spesifikasi penting (misal: Daikin 2 PK, ASUS ROG G14).</span>
                <input 
                  type="text"
                  required
                  placeholder="Contoh: Genset Honda 5 KVA"
                  value={formData.uraian}
                  onChange={(e) => setFormData({...formData, uraian: e.target.value})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {/* Bidang / Fungsi Terkoordinasi */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-bold block uppercase tracking-wide">Bidang / Fungsi Terkoordinasi</label>
                <span className="text-[10px] text-slate-400 block -mt-1">Bidang yang menaungi aset (Opsional, contoh: Liturgi, Pewartaan).</span>
                <select
                  value={formData.bidang}
                  onChange={(e) => setFormData({...formData, bidang: e.target.value})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                >
                  <option value="">- Tanpa Bidang Khusus -</option>
                  {Object.entries(bMap).map(([code, name]) => (
                    <option key={code} value={code}>[{code}] {name}</option>
                  ))}
                </select>
              </div>

              {/* Level 1 & Level 5: Jenis Aset & Letak Ruang */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold block uppercase tracking-wide">Level 1 - Jenis Aset</label>
                  <select
                    value={formData.jenisAset}
                    disabled={currentUser.role === 'KOORDINATOR_TIM'} // locked to their spec
                    onChange={(e) => setFormData({...formData, jenisAset: e.target.value})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                  >
                    {Object.entries(jMap).map(([code, name]) => (
                      <option key={code} value={code}>[{code}] {name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold block uppercase tracking-wide">Level 5 - Letak Ruang</label>
                  <select
                    value={formData.letakRuang}
                    onChange={(e) => setFormData({...formData, letakRuang: e.target.value})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                  >
                    {Object.entries(lMap).map(([code, name]) => (
                      <option key={code} value={code}>[{code}] {name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Level 3 & Level 4: Teritori & Peruntukan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold block uppercase tracking-wide">Level 3 - Teritori</label>
                  <select
                    value={formData.teritori}
                    onChange={(e) => setFormData({...formData, teritori: e.target.value})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                  >
                    {Object.entries(tMap).map(([code, name]) => (
                      <option key={code} value={code}>[{code}] {name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold block uppercase tracking-wide">Level 4 - Peruntukan</label>
                  <select
                    value={formData.peruntukan}
                    onChange={(e) => setFormData({...formData, peruntukan: e.target.value})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                  >
                    {Object.entries(pMap).map(([code, name]) => (
                      <option key={code} value={code}>[{code}] {name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* No Urut Sejenis & Kode Barang */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs text-slate-500 font-bold block uppercase tracking-wide">Level 7 - Nama Barang (Kode)</label>
                  <select
                    value={formData.kodeNamaBarang}
                    onChange={(e) => setFormData({...formData, kodeNamaBarang: e.target.value})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                  >
                    {Object.entries(kMap).map(([code, name]) => (
                      <option key={code} value={code}>[{code}] {name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold block uppercase tracking-wide">Level 6 - Urut</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 001, 012"
                    value={formData.noUrutSejenis}
                    onChange={(e) => setFormData({...formData, noUrutSejenis: e.target.value.trim()})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none text-center font-mono"
                  />
                </div>
              </div>

              {/* Qty, Satuan, Tahun */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold block uppercase tracking-wide">Qty (Jumlah)</label>
                  <input 
                    type="number"
                    min="1"
                    value={formData.qty}
                    onChange={(e) => setFormData({...formData, qty: Math.max(1, Number(e.target.value))})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold block uppercase tracking-wide">Satuan</label>
                  <input 
                    type="text"
                    value={formData.satuan}
                    onChange={(e) => setFormData({...formData, satuan: e.target.value})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold block uppercase tracking-wide">Tahun Buku</label>
                  <input 
                    type="number"
                    value={formData.tahun}
                    onChange={(e) => setFormData({...formData, tahun: Number(e.target.value)})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none font-mono text-center"
                  />
                </div>
              </div>

              {/* Financial & Purchase Info: Tanggal, Harga Pembelian */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold block uppercase tracking-wide">Tanggal Perolehan</label>
                  <input 
                    type="date"
                    required
                    value={formData.tanggalPerolehan}
                    onChange={(e) => setFormData({...formData, tanggalPerolehan: e.target.value})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold block uppercase tracking-wide">Harga Pembelian Satuan (Rp)</label>
                  <input 
                    type="number"
                    min="0"
                    required
                    value={formData.hargaPembelian}
                    onChange={(e) => setFormData({...formData, hargaPembelian: Number(e.target.value)})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Useful years & salvage values */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold block uppercase tracking-wide">Umur Manfaat (Tahun)</label>
                  <input 
                    type="number"
                    min="1"
                    required
                    value={formData.umurManfaat}
                    onChange={(e) => setFormData({...formData, umurManfaat: Math.max(1, Number(e.target.value))})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold block uppercase tracking-wide">Nilai Residu Satuan (Rp)</label>
                  <input 
                    type="number"
                    min="0"
                    value={formData.nilaiResidu}
                    onChange={(e) => setFormData({...formData, nilaiResidu: Number(e.target.value)})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none font-mono"
                  />
                </div>
              </div>

              {formData.qty > 1 && (
                <div className="bg-primary-50/50 dark:bg-primary-950/20 p-2.5 rounded-lg border border-primary-100/60 text-[11px] text-slate-600 dark:text-slate-300 space-y-1 mt-1">
                  <div className="font-bold text-slate-700 dark:text-slate-200">Kalkulasi Total Aset (Qty x Harga):</div>
                  <div className="flex justify-between">
                    <span>Total Biaya Perolehan:</span> 
                    <span className="font-mono font-bold text-primary-700 dark:text-primary-400">
                      {formData.qty} x {formatRupiah(formData.hargaPembelian)} = {formatRupiah(formData.hargaPembelian * formData.qty)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Nilai Residu:</span> 
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {formData.qty} x {formatRupiah(formData.nilaiResidu)} = {formatRupiah(formData.nilaiResidu * formData.qty)}
                    </span>
                  </div>
                </div>
              )}

              {/* Physical Condition Selector */}
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-bold block uppercase tracking-wide">Kondisi Fisik Saat Pendaftaran</label>
                <div className="grid grid-cols-3 gap-2">
                  {['BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT'].map(cond => {
                    const active = formData.kondisiBarang === cond;
                    const cLabel = cond === 'BAIK' ? 'Baik' : cond === 'RUSAK_RINGAN' ? 'Rusak Ringan' : 'Rusak Berat';
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => setFormData({...formData, kondisiBarang: cond as KondisiBarang})}
                        className={`text-xs font-semibold p-2.5 rounded-lg border text-center transition cursor-pointer ${
                          active 
                            ? 'bg-primary-600 text-white border-primary-600 shadow-sm' 
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200'
                        }`}
                      >
                        {cLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Calculation Preview Banner (Live calculations) */}
              <div className="bg-slate-950 text-slate-100 p-4 rounded-xl border border-slate-800 space-y-1.5 shadow-inner">
                <span className="text-[10px] text-primary-400 font-bold uppercase tracking-wider block">PREVIEW KALKULASI DEPRESIASI & SERIAL</span>
                
                <div className="flex justify-between items-center pt-1 border-t border-slate-900">
                  <span className="text-[10px] text-slate-400 font-medium">Auto No Seri:</span>
                  <span className="font-mono text-xs font-bold text-white bg-slate-900 px-2 py-0.5 rounded tracking-wide border border-slate-800">
                    {livePreview.noSeriFinal}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[11px] pt-1">
                  <span className="text-slate-400">Selisih Umur Berjalan:</span>
                  <span className="font-bold font-mono text-amber-500">{livePreview.umurBerjalanTahun.toFixed(2)} Tahun</span>
                </div>

                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Biaya Depresiasi / Tahun:</span>
                  <span className="font-bold font-mono">{formatRupiah(livePreview.biayaPenyusutan)}</span>
                </div>

                <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-slate-900">
                  <span className="text-white">Estimasi Nilai Buku Saat Ini:</span>
                  <span className="text-primary-400 font-mono font-bold">{formatRupiah(livePreview.nilaiBuku)}</span>
                </div>
              </div>

            </form>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2">
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="flex-1 bg-white hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 font-semibold text-xs py-3 border border-slate-200 rounded-lg transition"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={handleSubmit}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs py-3 rounded-lg transition shadow active:scale-95"
              >
                {isEditing ? 'Simpan Perubahan' : 'Daftarkan Sekarang'}
              </button>
            </div>

          </div>
        </div>
      )}
      
      {/* ⚠️ DIALOG KONFIRMASI PENGHAPUSAN KUSTOM (BEBAS BROWSER MODAL BLOCKING) */}
      {assetToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-6 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-red-650">
              <div className="w-10 h-10 bg-red-150 rounded-full flex items-center justify-center text-red-600">
                <Trash2 className="w-5 h-5 shrink-0" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Konfirmasi Hapus Aset</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus aset berikut ini dari basis data inventaris paroki? Tindakan ini bersifat permanen dan tidak dapat dipulihkan.
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-[11px] font-mono space-y-1.5 text-slate-755 break-all">
              <div><span className="text-slate-400 font-bold block mb-0.5">NAMA/URAIAN BARANG:</span> {assetToDelete.uraian}</div>
              <div><span className="text-slate-400 font-bold block mb-0.5">NO SERI FINAL:</span> <span className="bg-slate-100 px-1 py-0.5 text-slate-900 rounded font-semibold">{assetToDelete.noSeriFinal}</span></div>
              {assetToDelete.tanggalPerolehan && <div><span className="text-slate-400 font-bold block mb-0.5">TANGGAL PEROLEHAN:</span> {assetToDelete.tanggalPerolehan}</div>}
              <div><span className="text-slate-400 font-bold block mb-0.5">HARGA PEROLEHAN:</span> {formatRupiah(assetToDelete.hargaPembelian)}</div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAssetToDelete(null)}
                className="flex-1 bg-white hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 font-semibold text-xs py-2.5 rounded-lg border border-slate-200 transition cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteAsset(assetToDelete.id);
                  setAssetToDelete(null);
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-2.5 rounded-lg shadow-md transition cursor-pointer"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ DIALOG KONFIRMASI HAPUS MASSAL KUSTOM */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-6 space-y-4 animate-fade-in text-left">
            <div className="flex items-center gap-3 text-red-650">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                <Trash2 className="w-5 h-5 shrink-0" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Konfirmasi Hapus Massal</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              Anda akan menghapus secara massal <span className="font-bold text-slate-900">{bulkDeleteGroups.deletable.length}</span> aset yang Anda pilih dan memiliki wewenang untuk menghapusnya. Tindakan ini tidak dapat dibatalkan atau dipulihkan.
            </p>

            {bulkDeleteGroups.locked.length > 0 && (
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-[10px] leading-relaxed text-amber-800 flex items-start gap-2 animate-fade-in">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Pemberitahuan Hak Akses (RBAC):</strong> Sebanyak <span className="underline font-bold">{bulkDeleteGroups.locked.length} unit</span> aset yang Anda pilih tidak akan terhapus karena dilindungi oleh batasan kategori tim Anda. Hanya Super Admin atau koordinator kategori bersangkutan yang dapat menghapusnya.
                </div>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 max-h-40 overflow-y-auto space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Daftar Aset yang akan Dihapus ({bulkDeleteGroups.deletable.length}):</span>
              {bulkDeleteGroups.deletable.map(asset => (
                <div key={asset.id} className="text-[10px] font-mono flex justify-between gap-1.5 py-1 border-b border-slate-100 text-slate-700">
                  <span className="truncate max-w-[200px]">{asset.uraian}</span>
                  <span className="font-semibold text-slate-900 shrink-0">{asset.noSeriFinal}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="flex-1 bg-white hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 font-semibold text-xs py-2.5 rounded-lg border border-slate-200 transition cursor-pointer text-center"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-2.5 rounded-lg shadow-md transition cursor-pointer text-center"
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ DIALOG PERINGATAN IZIN TERKUNCI KUSTOM */}
      {permissionErrorMsg && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-55 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-6 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Akses Modifikasi Ditolak</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              {permissionErrorMsg}
            </p>

            <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100 text-[10px] leading-relaxed text-amber-800">
              Sistem SIMAS menggunakan Otoritas Berbasis Peran (RBAC) yang membedakan hak tulis antara <strong>Super Admin</strong>, <strong>Koordinator Bidang</strong>, dan <strong>Viewer</strong>. Anda dapat menguji perubahan peran ini kapan saja melalui menu <strong>Ganti Operator Sesi</strong> di kiri bawah atau tab <strong>Pengaturan Akun</strong>.
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setPermissionErrorMsg(null)}
                className="w-full bg-white hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 font-semibold text-xs py-2.5 rounded-lg border border-slate-200 text-center transition cursor-pointer"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔮 MULTI-SELECT STRIP AND BULK PRINT OVERLAY MODAL */}
      {showBulkPrintModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-50 rounded-2xl w-full max-w-5xl h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-fade-in border border-slate-200">
            {/* Header of Modal */}
            <div className="bg-white border-b border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
              <div>
                <div className="flex items-center gap-2 text-primary-600">
                  <Printer className="w-5 h-5 shrink-0" />
                  <h3 className="font-bold text-sm uppercase tracking-wide text-slate-800">Preview Cetak Massal Label QR</h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Menyiapkan lembar cetak stiker fisik untuk total <span className="font-bold text-slate-800">{selectedAssets.length} unit</span> aset terkurasi.
                </p>
              </div>

              {/* Configurations Toggles */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-700">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Ukuran Label:</span>
                <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => setLabelSize('standard')}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                      labelSize === 'standard' 
                        ? 'bg-white text-primary-700 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Standar (Besar)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabelSize('compact')}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                      labelSize === 'compact' 
                        ? 'bg-white text-primary-700 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Kompak (Kecil)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow cursor-pointer text-xs"
                >
                  <Printer className="w-4 h-4 shrink-0" />
                  Cetak Sekarang
                </button>

                <button
                  type="button"
                  onClick={() => setShowBulkPrintModal(false)}
                  className="bg-white hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 font-bold px-3 py-2 border border-slate-200 rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Informative Tips Sheet */}
            <div className="bg-primary-50 border-b border-primary-100 px-5 py-2.5 text-[10.5px] leading-normal text-primary-800 flex items-start gap-2 shrink-0">
              <Info className="w-3.5 h-3.5 text-primary-600 shrink-0 mt-0.5" />
              <div>
                <strong>Tips Cetak Stiker:</strong> Klik tombol <strong>"Cetak Sekarang"</strong> di atas. Di menu print browser, pilih opsi margin <strong>"Tidak ada / None"</strong>, centang <strong>"Latar belakang grafis / Background graphics"</strong> agar warna hijau lencana stiker tercetak, dan pasang media kertas label A4 berperekat Anda.
              </div>
            </div>

            {/* Main scrollable body for sheet preview */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 flex justify-center bg-slate-100">
              <div 
                id="bulk-print-area" 
                className={`bg-white shadow-xl rounded-xl border border-slate-200 p-8 w-full max-w-[800px] no-print-border`}
              >
                {/* Print Title Header */}
                <div className="border-b-2 border-dashed border-slate-100 pb-4 mb-6 text-center print:hidden">
                  <h4 className="font-bold text-xs uppercase tracking-wide text-slate-700">Simulasi Lembar Cetak Label Stiker</h4>
                  <div className="text-[10px] text-slate-400 mt-0.5">Paroki Pringwulung - SIMAS (Sistem Informasi Manajemen Aset)</div>
                </div>

                {/* Grid of Stickers */}
                <div className={`grid gap-4 ${
                  labelSize === 'standard' 
                    ? 'grid-cols-1 sm:grid-cols-2' 
                    : 'grid-cols-1 sm:grid-cols-3'
                }`}>
                  {selectedAssets.map(asset => {
                    const lName = lMap[asset.letakRuang] || asset.letakRuang;
                    const jName = jMap[asset.jenisAset] || 'Aset';
                    const tName = tMap[asset.teritori] || asset.teritori;

                    return (
                      <div 
                        key={asset.id} 
                        className={`print-card-break bg-white border-2 border-primary-600 rounded-xl overflow-hidden flex flex-col justify-between text-left h-full shadow-sm hover:shadow transition`}
                        style={{ minHeight: labelSize === 'standard' ? '146px' : '110px' }}
                      >
                        {/* Sticker Top Header Bar */}
                        <div className="bg-primary-700 text-white py-1.5 px-3 flex items-center justify-between font-sans shrink-0 uppercase tracking-widest text-[8px] font-bold">
                          <span>SIMAS Paroki</span>
                          <span>Inventaris</span>
                        </div>

                        {/* Middle Content */}
                        <div className="p-3 flex items-center gap-3 flex-1">
                          {/* Left: Vector QR Code */}
                          <div className="shrink-0 p-1 bg-white border border-slate-200 rounded-lg shadow-inner">
                            <QRCodeCanvas
                              value={generateQrValue(asset)}
                              size={labelSize === 'standard' ? 76 : 56}
                              level="H"
                              includeMargin={false}
                            />
                          </div>

                          {/* Right: Metadata Details */}
                          <div className="flex-1 min-w-0">
                            {/* Title/Uraian */}
                            <h5 className="font-bold text-slate-900 leading-tight text-xs truncate uppercase tracking-tight" title={asset.uraian}>
                              {asset.uraian}
                            </h5>

                            {/* No Seri Mono */}
                            <p className="font-mono text-primary-700 font-bold text-xs mt-0.5 tracking-tight break-all">
                              {asset.noSeriFinal}
                            </p>

                            {/* Extra Attributes */}
                            <div className="text-[9px] text-slate-500 mt-1 space-y-0.5 leading-tight">
                              <div className="truncate font-medium">
                                <span className="font-bold text-slate-450 uppercase text-[7px] tracking-wider mr-1">R:</span>
                                {lName} <span className="text-slate-400">({tName})</span>
                              </div>
                              <div className="truncate">
                                <span className="font-bold text-slate-450 uppercase text-[7px] tracking-wider mr-1">T:</span>
                                {asset.tanggalPerolehan} | {jName}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Minimal card footer for standard */}
                        {labelSize === 'standard' && (
                          <div className="border-t border-slate-100 bg-slate-50 py-1 px-3 text-[8px] text-slate-400 font-bold uppercase tracking-wider font-mono flex justify-between shrink-0">
                            <span>Seksi Rumah Tangga</span>
                            <span>Milik Gereja</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Custom Embedded CSS stylesheet injection strictly for printing override */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                /* Hide all visual elements except '#bulk-print-area' */
                body * {
                  visibility: hidden !important;
                }
                #bulk-print-area, #bulk-print-area * {
                  visibility: visible !important;
                }
                #bulk-print-area {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: 156% !important;
                  margin: 0 !important;
                  padding: 10px !important;
                  box-shadow: none !important;
                  border: none !important;
                  background: white !important;
                }
                
                /* Layout grid config on print sheet (forced multiple columns) */
                #bulk-print-area .grid {
                  display: grid !important;
                  grid-template-columns: ${labelSize === 'standard' ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))'} !important;
                  gap: 12px !important;
                  width: 100% !important;
                }
                
                /* Instruct printing engines to avoid dissecting a card across page sheets */
                .print-card-break {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  border: 2px solid #047857 !important; /* Always green borders on physical sheet */
                  background: #ffffff !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .bg-primary-700 {
                  background-color: #047857 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .text-white {
                  color: #ffffff !important;
                }
                .text-primary-700 {
                  color: #047857 !important;
                }
              }
            ` }} />
          </div>
        </div>
      )}

    </div>
  );
}
