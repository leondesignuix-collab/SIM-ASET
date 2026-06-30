/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import {
  Asset,
  DashboardStats,
  formatRupiah,
  JENIS_ASET_MAP,
  BIDANG_MAP
} from '../types';
import { ShieldAlert, TrendingDown, ClipboardList, Wallet, Sparkles, TrendingUp } from 'lucide-react';

const COLORS = {
  BAIK: '#10b981',        // Emerald 500
  RUSAK_RINGAN: '#f59e0b', // Amber 500
  RUSAK_BERAT: '#ef4444'   // Red 500
};

interface DashboardTabProps {
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
  jenisAsetMap?: Record<string, string>;
}

export default function DashboardTab({ assets, onSelectAsset, jenisAsetMap }: DashboardTabProps) {
  const activeJenisAsetMap = jenisAsetMap || JENIS_ASET_MAP;
  
  // Compute trend data over the last 12 months for book values
  const bookValueTrend = useMemo(() => {
    const trendData = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthLabel = d.toLocaleDateString('id-ID', { month: 'short' });
      const yearLabel = d.getFullYear();
      
      trendData.push({
        label: `${monthLabel} ${yearLabel}`,
        year: d.getFullYear(),
        month: d.getMonth(),
        count: 0,
        value: 0,
        bookValue: 0
      });
    }

    assets.forEach(asset => {
      if (!asset.tanggalPerolehan) return;
      const pDate = new Date(asset.tanggalPerolehan);
      const pYear = pDate.getFullYear();
      const pMonth = pDate.getMonth();

      const match = trendData.find(item => item.year === pYear && item.month === pMonth);
      if (match) {
        const qty = Number(asset.qty) || 1;
        match.count += qty;
        match.value += (Number(asset.hargaPembelian) || 0) * qty;
        match.bookValue += (Number(asset.nilaiBuku) || 0) * qty;
      }
    });

    return trendData;
  }, [assets]);

  // Compute real statistics in real-time
  const stats = useMemo<DashboardStats>(() => {
    let totalOriginalValue = 0;
    let totalBookValue = 0;
    let totalDepreciationYear = 0;
    let totalUnits = 0;

    const catMap: Record<string, { original: number; book: number; count: number }> = {};
    const bidangMap: Record<string, { count: number }> = {};
    const condMap = {
      BAIK: 0,
      RUSAK_RINGAN: 0,
      RUSAK_BERAT: 0
    };

    // Initialize categories
    Object.keys(activeJenisAsetMap).forEach(k => {
      catMap[k] = { original: 0, book: 0, count: 0 };
    });

    Object.keys(BIDANG_MAP).forEach(k => {
      bidangMap[k] = { count: 0 };
    });

    const expiringAssetsList: Asset[] = [];

    assets.forEach(asset => {
      // Aggregate general counters
      const qty = Number(asset.qty) || 1;
      totalOriginalValue += (Number(asset.hargaPembelian) || 0) * qty;
      totalBookValue += (Number(asset.nilaiBuku) || 0) * qty;
      totalDepreciationYear += (Number(asset.biayaPenyusutan) || 0) * qty;
      totalUnits += qty;

      // Group by category code
      const catCode = asset.jenisAset;
      if (!catMap[catCode]) {
        catMap[catCode] = { original: 0, book: 0, count: 0 };
      }
      catMap[catCode].original += (Number(asset.hargaPembelian) || 0) * qty;
      catMap[catCode].book += (Number(asset.nilaiBuku) || 0) * qty;
      catMap[catCode].count += qty;

      // Group by bidang
      const bidangCode = asset.bidang;
      if (bidangCode) {
        if (!bidangMap[bidangCode]) {
          bidangMap[bidangCode] = { count: 0 };
        }
        bidangMap[bidangCode].count += qty;
      }

      // Group by conditions
      const cond = asset.kondisiBarang || 'BAIK';
      if (cond === 'BAIK') condMap.BAIK += qty;
      else if (cond === 'RUSAK_RINGAN') condMap.RUSAK_RINGAN += qty;
      else if (cond === 'RUSAK_BERAT') condMap.RUSAK_BERAT += qty;

      // Expiring assets selection: useful life remaining < 1 year
      const price = Number(asset.hargaPembelian) || 0;
      const salvage = Number(asset.nilaiResidu) || 0;
      const usefulYears = Number(asset.umurManfaat) || 1;
      
      const purchaseDate = new Date(asset.tanggalPerolehan);
      const today = new Date();
      const elapsedYears = (today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      
      const sisaUmur = Math.max(usefulYears - elapsedYears, 0);

      if (sisaUmur < 1.0) {
        expiringAssetsList.push(asset);
      }
    });

    const categoryDistribution = Object.entries(catMap).map(([code, data]) => ({
      category: activeJenisAsetMap[code] || `Kategori ${code}`,
      originalValue: data.original,
      bookValue: data.book,
      count: data.count
    }));

    const conditionDistribution = [
      { condition: 'BAIK', count: condMap.BAIK },
      { condition: 'RUSAK_RINGAN', count: condMap.RUSAK_RINGAN },
      { condition: 'RUSAK_BERAT', count: condMap.RUSAK_BERAT }
    ];

    const bidangDistribution = Object.entries(bidangMap).map(([code, data]) => ({
      bidang: BIDANG_MAP[code] || `Bidang ${code}`,
      count: data.count
    }));

    // Sort expiring assets by book value descending
    expiringAssetsList.sort((a, b) => b.nilaiBuku - a.nilaiBuku);

    return {
      totalOriginalValue,
      totalBookValue,
      totalDepreciationYear,
      totalUnits,
      categoryDistribution,
      conditionDistribution,
      bidangDistribution,
      expiringAssets: expiringAssetsList.slice(0, 5) // top 5
    };
  }, [assets, activeJenisAsetMap]);

  return (
    <div id="dashboard-container" className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Units */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5 flex items-center justify-between">
            <span>Total Kuantitas</span>
            <span className="text-primary-500 text-[10px] font-bold bg-primary-50 px-1.5 py-0.5 rounded">Aktif</span>
          </p>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold font-mono text-slate-900">{stats.totalUnits.toLocaleString('id-ID')}</span>
            <span className="text-[10px] text-slate-400 font-medium">Unit Terdata</span>
          </div>
        </div>

        {/* Card 2: Original Cost */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5">Nilai Perolehan</p>
          <div className="flex items-end justify-between">
            <span className="text-xl font-bold font-mono text-slate-900">{formatRupiah(stats.totalOriginalValue)}</span>
            <span className="text-[10px] text-slate-400 font-semibold">Harga Awal</span>
          </div>
        </div>

        {/* Card 3: Book Value */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5 flex items-center justify-between">
            <span>Nilai Buku Saat Ini</span>
            <span className="text-primary-500 text-[9px] font-bold bg-primary-50 px-1 py-0.2 rounded">Depresiasi</span>
          </p>
          <div className="flex items-end justify-between">
            <span className="text-xl font-bold font-mono text-primary-600">{formatRupiah(stats.totalBookValue)}</span>
            <span className="text-[10px] text-slate-400 font-medium">Aktual</span>
          </div>
        </div>

        {/* Card 4: Depreciation per year */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5">Penyusutan / Tahun</p>
          <div className="flex items-end justify-between">
            <span className="text-xl font-bold font-mono text-amber-600">{formatRupiah(stats.totalDepreciationYear)}</span>
            <span className="text-[9px] text-slate-400 uppercase font-mono">Garis Lurus</span>
          </div>
        </div>
      </div>

      {/* Recharts Visualizations */}
      <div className="space-y-6">
        
        {/* Full-width Row: Bar Chart per Kategori */}
        <div className="w-full bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Representasi Nilai Buku per Kategori</h3>
              <p className="text-xs text-slate-400">Membandingkan nilai awal vs nilai buku berjalan (Depresiasi)</p>
            </div>
          </div>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.categoryDistribution} margin={{ top: 15, right: 15, left: 75, bottom: 85 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="category" 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: '500' }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  width={80}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `Rp ${val / 1e6}jt`}
                />
                <Tooltip 
                  formatter={(value: any, name: any) => [
                    formatRupiah(value),
                    name === 'bookValue' ? 'Nilai Buku Aktual' : 'Nilai Pembelian Awal'
                  ]}
                  contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar name="originalValue" dataKey="originalValue" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={25} />
                <Bar name="bookValue" dataKey="bookValue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Full-width Row: Bar Chart per Bidang */}
        <div className="w-full bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Jumlah Aset per Bidang</h3>
              <p className="text-xs text-slate-400">Komparasi kuantitas aset yang dikelola oleh setiap bidang (Komsos, P3K, dll)</p>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.bidangDistribution} margin={{ top: 15, right: 15, left: 20, bottom: 65 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="bidang" 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: '500' }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  width={40}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  formatter={(value: any) => [`${value} unit`, 'Jumlah Aset']}
                  contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Bar name="Jumlah Aset" dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={35}>
                  {stats.bidangDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#ec4899', '#f97316'][index % 8]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3-Column Grid: Kondisi Fisik Barang, Nilai Aset per Kategori & Tren Registrasi Aset Baru */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1: Pie Chart Kondisi Fisik */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Kondisi Fisik Barang</h3>
              <p className="text-xs text-slate-400 mb-4">Proporsi kelayakan guna inventaris saat ini</p>
            </div>
            <div className="h-44 flex items-center justify-center relative my-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.conditionDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={6}
                    dataKey="count"
                  >
                    {stats.conditionDistribution.map((entry) => (
                      <Cell 
                        key={entry.condition} 
                        fill={COLORS[entry.condition as keyof typeof COLORS] || '#94a3b8'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${value} unit`, 'Jumlah Aset']}
                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center flex flex-col items-center">
                <span className="text-2xl font-bold font-mono text-slate-700">{stats.totalUnits}</span>
                <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Unit Total</span>
              </div>
            </div>
            <div className="space-y-2 mt-2 pt-2 border-t border-slate-100">
              {stats.conditionDistribution.map((item) => {
                const percentage = stats.totalUnits > 0 ? ((item.count / stats.totalUnits) * 100).toFixed(1) : '0';
                const label = item.condition === 'BAIK' ? 'Baik (Siap Pakai)' : item.condition === 'RUSAK_RINGAN' ? 'Rusak Ringan (Butuh Servis)' : 'Rusak Berat (Afkir/Ganti)';
                const colorHex = COLORS[item.condition as keyof typeof COLORS];
                return (
                  <div key={item.condition} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorHex }}></span>
                      <span className="text-slate-600 font-medium">{label}</span>
                    </div>
                    <span className="font-semibold text-slate-800 font-mono">{item.count} unit ({percentage}%)</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Pie Chart Komposisi Nilai Aset per Kategori */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Komposisi Nilai Aset</h3>
              <p className="text-xs text-slate-400 mb-4">Proporsi total nilai buku berdasarkan kategori</p>
            </div>
            <div className="h-44 flex items-center justify-center relative my-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.categoryDistribution.filter(c => c.bookValue > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="bookValue"
                    nameKey="category"
                    stroke="none"
                    cornerRadius={4}
                  >
                    {stats.categoryDistribution.filter(c => c.bookValue > 0).map((entry, index) => (
                      <Cell 
                        key={entry.category} 
                        fill={['#0031f6', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#8b5cf6', '#a855f7', '#f43f5e', '#f59e0b'][index % 10]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [formatRupiah(value), 'Nilai Buku']}
                    contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2 pt-2 border-t border-slate-100 max-h-32 overflow-y-auto">
              {stats.categoryDistribution.filter(c => c.bookValue > 0).sort((a,b) => b.bookValue - a.bookValue).slice(0, 4).map((item, index) => {
                const percentage = stats.totalBookValue > 0 ? ((item.bookValue / stats.totalBookValue) * 100).toFixed(1) : '0';
                return (
                  <div key={item.category} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 max-w-[70%]">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ['#0031f6', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#8b5cf6', '#a855f7', '#f43f5e', '#f59e0b'][index % 10] }}></span>
                      <span className="text-slate-600 font-medium truncate" title={item.category}>{item.category}</span>
                    </div>
                    <span className="font-semibold text-slate-800 font-mono">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 3: 📈 Tren Nilai Buku Aset 12 Bulan Terakhir */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
                    <TrendingUp className="w-5 h-5 shrink-0" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide text-left">Tren Nilai Buku Aset</h3>
                    <p className="text-xs text-slate-400 text-left">Perkembangan total nilai buku berjalan berdasarkan bulan perolehan</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 shrink-0">
                  <div className="flex items-center gap-1.5 font-sans font-bold text-[9px] tracking-wide text-primary-600 bg-primary-50 px-2 py-0.5 rounded uppercase">
                    Nilai Buku
                  </div>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bookValueTrend} margin={{ top: 15, right: 20, left: 60, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      width={60}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => {
                        if (val >= 1e6) {
                          return `Rp ${(val / 1e6).toFixed(0)}jt`;
                        }
                        if (val > 0) {
                          return `Rp ${(val / 1e3).toFixed(0)}rb`;
                        }
                        return 'Rp 0';
                      }}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-950 text-white p-3 rounded-lg border border-slate-800 shadow-xl text-xs space-y-1 text-left">
                              <p className="font-bold text-slate-400 border-b border-slate-800 pb-1 mb-1 font-mono">{data.label}</p>
                              <div className="flex items-center gap-2 justify-between">
                                <span className="text-slate-300">Aset Terdaftar:</span>
                                <span className="font-bold text-slate-300 text-right font-mono">{data.count} Unit</span>
                              </div>
                              <div className="flex items-center gap-2 justify-between">
                                <span className="text-slate-300">Nilai Perolehan:</span>
                                <span className="font-bold text-slate-400 text-right font-mono">{formatRupiah(data.value)}</span>
                              </div>
                              <div className="flex items-center gap-2 justify-between border-t border-slate-850 pt-1 mt-1">
                                <span className="text-primary-400 font-semibold">Total Nilai Buku:</span>
                                <span className="font-bold text-primary-400 text-right font-mono">{formatRupiah(data.bookValue)}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bookValue" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      activeDot={{ r: 6 }} 
                      dot={{ r: 4, strokeWidth: 1 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Row 3: Useful life alerts */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-indigo-50 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500 animate-pulse shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Aset yang Mendekati Akhir Umur Manfaat</h3>
              <p className="text-xs text-slate-400">Aset dengan sisa umur ekonomis kurang dari 1 tahun. Rekomendasi audit / maintenance [2, 10]</p>
            </div>
          </div>
          <span className="bg-amber-50 text-amber-800 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
            {stats.expiringAssets.length} Aset Terdegradasi
          </span>
        </div>

        {stats.expiringAssets.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Tidak ada aset yang mendekati akhir umur manfaat saat ini. Semua dalam periode sisa umur normal.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">No. Seri Final</th>
                  <th className="px-6 py-3">Uraian / Deskripsi</th>
                  <th className="px-6 py-3">Tanggal Perolehan</th>
                  <th className="px-6 py-3 font-mono">Umur Manfaat</th>
                  <th className="px-6 py-3">Nilai Buku Sisa</th>
                  <th className="px-6 py-3 text-right">Status Kondisi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {stats.expiringAssets.map((asset) => {
                  const purchase = new Date(asset.tanggalPerolehan);
                  const today = new Date();
                  const elapsed = (today.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
                  const sisa = Math.max(Number(asset.umurManfaat) - elapsed, 0);

                  return (
                    <tr 
                      key={asset.id} 
                      onClick={() => onSelectAsset(asset)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 cursor-pointer transition"
                    >
                      <td className="px-6 py-3 font-mono text-xs text-indigo-600 font-semibold decoration-dashed hover:underline">
                        {asset.noSeriFinal}
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-800">
                        {asset.uraian}
                      </td>
                      <td className="px-6 py-3">
                        {new Date(asset.tanggalPerolehan).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-3 font-mono font-medium">
                        {asset.umurManfaat} Thn <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">Sisa {sisa.toFixed(1)} Thn</span>
                      </td>
                      <td className="px-6 py-3 font-semibold text-slate-900 font-mono">
                        {formatRupiah(asset.nilaiBuku)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          asset.kondisiBarang === 'BAIK' ? 'bg-primary-50 text-primary-700' :
                          asset.kondisiBarang === 'RUSAK_RINGAN' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {asset.kondisiBarang.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
