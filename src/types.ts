/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type KondisiBarang = 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT';
export type Role = 'SUPER_ADMIN' | 'KOORDINATOR_TIM' | 'PETUGAS_VIEWER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  username?: string;
  password?: string;
  kategoriAkses?: string; // e.g. "403" for Peralatan Listrik, "408" for Alat Komsos
}

export interface MaintenanceLog {
  id: string;
  assetId: string;
  tanggalServis: string;
  deskripsi: string;
  biaya: number;
  vendor: string;
  tanggalServisNext?: string;
  createdAt?: string;
}

export interface AssetMutation {
  id: string;
  assetId: string;
  ruangAsal: string;
  ruangTujuan: string;
  tanggalMutasi: string;
  keterangan?: string;
  picName: string;
}

export interface AssetDocument {
  id: string;
  assetId: string;
  namaDokumen: string;
  fileUrl: string;
  createdAt: string;
}

export interface AssetHistoryLog {
  id: string;
  assetId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'MUTASI' | 'MAINTENANCE';
  userId: string;
  userName: string;
  timestamp: string;
  details: string;
}

export interface Asset {
  id: string;
  uraian: string;
  qty: number;
  satuan: string;
  tanggalPerolehan: string;
  hargaPembelian: number;
  jenisAset: string;        // Level 1 code (e.g. "100" - Tanah, "401" - Bangunan, "403" - Peralatan, "408" - Komsos)
  tahun: number;
  teritori: string;         // Level 3 code (e.g. "01" - Paroki, "02" - Stasi)
  peruntukan: string;       // Level 4 code (e.g. "01" - Gereja Paroki)
  letakRuang: string;       // Level 5 code (e.g. "02" - Panti Imam, "08" - R. Komsos, "09" - Sekretariat)
  noUrutSejenis: string;    // Level 6 code (e.g. "001", "002")
  kodeNamaBarang: string;    // Level 7 code (e.g. "1" - CPU, "101" - Tensimeter)
  noSeriFinal: string;      // Formatted automatic unique serial: jenisAset.teritori.peruntukan.letakRuang.kodeNamaBarang.noUrutSejenis
  umurManfaat: number;      // elements in years
  nilaiResidu: number;
  nilaiBuku: number;
  biayaPenyusutan: number;
  kondisiBarang: KondisiBarang;
  bidang?: string;
  createdAt: string;
  updatedAt: string;

  // Related lists for simulation
  maintenanceLogs?: MaintenanceLog[];
  mutations?: AssetMutation[];
  documents?: AssetDocument[];
  historyLogs?: AssetHistoryLog[];
}

export interface DashboardStats {
  totalOriginalValue: number;
  totalBookValue: number;
  totalDepreciationYear: number;
  totalUnits: number;
  categoryDistribution: { category: string; count: number; originalValue: number; bookValue: number }[];
  conditionDistribution: { condition: string; count: number }[];
  bidangDistribution: { bidang: string; count: number }[];
  expiringAssets: Asset[];
}

// Map Indonesian descriptive labels to codes
export const BIDANG_MAP: Record<string, string> = {
  "BDG-01": "Bidang Liturgi",
  "BDG-02": "Bidang Pewartaan",
  "BDG-03": "Bidang Paguyuban",
  "BDG-04": "Bidang Kemasyarakatan",
  "BDG-05": "Tim Aset & Pemeliharaan",
  "BDG-06": "Sekretariat Paroki",
  "BDG-07": "Komsos (Komunikasi Sosial)",
  "BDG-08": "Tim P3K / Kesehatan"
};

export const JENIS_ASET_MAP: Record<string, string> = {
  "100": "Tanah & Bangunan Utama",
  "401": "Bangunan Gereja & Kapel",
  "403": "Peralatan Elektronik & Sound System",
  "405": "Paramenta & Perlengkapan Liturgi",
  "408": "Alat Komunikasi Sosial (KOMSOS)",
  "410": "Mebel & Inventaris Kantor",
  "412": "Kendaraan Operasional Paroki"
};

export const TERITORI_MAP: Record<string, string> = {
  "01": "Paroki Pringwulung",
  "02": "Stasi Wedomartani",
  "03": "Stasi Maguwoharjo"
};

export const PERUNTUKAN_MAP: Record<string, string> = {
  "01": "Gereja Utama Paroki",
  "02": "Pastorat (Gedung Domus)",
  "03": "Gedung Pertemuan (GGP)",
  "04": "Sekolah / Aula Luar"
};

export const LETAK_RUANG_MAP: Record<string, string> = {
  "01": "Panti Imam (Altar)",
  "02": "Panti Umat / Nave",
  "03": "Ruang Sakristi",
  "04": "Sekretariat Paroki",
  "05": "Ruang Konsultasi Pastor",
  "06": "Kamar Kostor / Penjaga",
  "07": "Ruang Rapat Utama",
  "08": "Gudang Peralatan Liturgi (Paramenta)",
  "09": "Ruang KOMSOS (Multimedia)"
};

export const KODE_NAMA_BARANG_MAP: Record<string, string> = {
  "4": "Air Conditioner (AC)",
  "12": "Laptop / Komputer Portabel",
  "15": "Kursi Lipat",
  "17": "Televisi & Perlengkapan Multimedia",
  "21": "Mixer Konsol Audio",
  "44": "Kamera Mirrorless / DSLR",
  "99": "Mobil Operasional",
  "119": "Gong & Alat Musik Tradisional"
};

// Formatting utilities
export function formatRupiah(val: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(val);
}

// Realstraight-line depreciation calculation model (matches app/Services/DepreciationService.php)
export function calculateStraightLineDepreciation(
  hargaPembelian: number,
  nilaiResidu: number,
  umurManfaat: number,
  tanggalPerolehan: string,
  asOfDate: string = new Date().toISOString()
) {
  const tglPerolehan = new Date(tanggalPerolehan);
  const tglSekarang = new Date(asOfDate);

  // Annual depreciation cost
  const biayaPenyusutanTahunan = umurManfaat > 0 
    ? (hargaPembelian - nilaiResidu) / umurManfaat 
    : 0;

  // Time elapsed in years (with decimal precision)
  const diffMs = tglSekarang.getTime() - tglPerolehan.getTime();
  let selisihTahun = diffMs / (1000 * 60 * 60 * 24 * 365.25);

  if (selisihTahun < 0) {
    selisihTahun = 0;
  }

  const maksPenyusutan = hargaPembelian - nilaiResidu;
  const akumulasiPenyusutan = Math.min(biayaPenyusutanTahunan * selisihTahun, maksPenyusutan);

  let nilaiBukuSaatIni = Math.max(hargaPembelian - akumulasiPenyusutan, nilaiResidu);
  let biayaPenyusutanBerjalan = biayaPenyusutanTahunan;

  // Jika masa manfaat terlampaui, nilai buku otomatis dipaksa menjadi 0 rupiah demi asas akuntansi gereja paroki
  if (umurManfaat > 0 && selisihTahun >= umurManfaat) {
    nilaiBukuSaatIni = 0;
    biayaPenyusutanBerjalan = 0; // Masa manfaat sudah terlampaui, sehingga beban penyusutan tahun berjalan adalah 0
  }

  return {
    biayaPenyusutan: Math.round(biayaPenyusutanBerjalan * 100) / 100,
    nilaiBuku: Math.round(nilaiBukuSaatIni * 100) / 100,
    umurBerjalanTahun: Math.round(selisihTahun * 100) / 100
  };
}

// Automatically generate Serial Code: [JENIS_ASET]-[TAHUN]-[TERITORI]-[LETAK_RUANG]-[PERUNTUKAN]-[KODE_NAMA_BARANG]
export function generateNoSeriFinal(asset: Partial<Asset>): string {
  const jenis = asset.jenisAset || "403";
  const tahun = asset.tahun || 2024;
  const teri = asset.teritori || "01";
  const ruang = asset.letakRuang || "02";
  const peruntukan = asset.peruntukan || "01";
  const kodeBarang = asset.kodeNamaBarang || "1";
  
  // Clean values by removing leading zeros for numeric segment representations to match the custom standard (e.g. "01" -> "1", "08" -> "8")
  const cleanTeri = /^\d+$/.test(teri) ? String(parseInt(teri, 10)) : teri;
  const cleanRuang = /^\d+$/.test(ruang) ? String(parseInt(ruang, 10)) : ruang;
  const cleanPeruntukan = /^\d+$/.test(peruntukan) ? String(parseInt(peruntukan, 10)) : peruntukan;
  const cleanKodeBarang = /^\d+$/.test(kodeBarang) ? String(parseInt(kodeBarang, 10)) : kodeBarang;

  return `${jenis}-${tahun}-${cleanTeri}-${cleanRuang}-${cleanPeruntukan}-${cleanKodeBarang}`;
}

// Generate human-readable string for QR Code scanner payload
export function generateQrValue(asset: Asset): string {
  const bidangName = BIDANG_MAP[asset.bidang] || asset.bidang;
  const letakName = LETAK_RUANG_MAP[asset.letakRuang] || asset.letakRuang;
  return `No Seri: ${asset.noSeriFinal}
Nama Barang: ${asset.uraian}
Tahun: ${asset.tahun}
Bidang: ${bidangName}
Letak Ruang: ${letakName}
Kondisi: ${asset.kondisiBarang}`;
}

import initialUsers from "./initial_users.json";
import initialAssets from "./initial_assets.json";

// Master preloaded mock data representing high-quality initial list for Pringwulung Parish
export const INITIAL_USERS: User[] = initialUsers as User[];
export const INITIAL_ASSETS: Asset[] = initialAssets as Asset[];
