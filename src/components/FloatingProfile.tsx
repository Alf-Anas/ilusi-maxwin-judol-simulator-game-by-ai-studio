import React, { useState } from "react";
import { GameStats, CharacterProfile } from "../types";
import { 
  User, 
  X, 
  Wallet, 
  Heart, 
  AlertOctagon, 
  ShieldAlert, 
  Maximize2, 
  Car, 
  Home, 
  Bike,
  Activity
} from "lucide-react";

interface FloatingProfileProps {
  profile: CharacterProfile;
  stats: GameStats;
  isOpen: boolean;
  onClose: () => void;
}

export const FloatingProfile: React.FC<FloatingProfileProps> = ({ profile, stats, isOpen, onClose }) => {
  // Total debt calculation
  const totalDebt = stats.hutangPinjol + stats.hutangTeman;

  // Stress Level Color mapper
  const getStressColor = (level: number) => {
    if (level < 30) return "bg-[#14f195]";
    if (level < 60) return "bg-amber-500";
    return "bg-red-500 animate-pulse";
  };

  const getRelationColor = (level: number) => {
    if (level > 70) return "bg-[#14f195]";
    if (level > 40) return "bg-amber-500";
    return "bg-red-500 animate-pulse";
  };

  return (
    <>
      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-lg rounded-2xl p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            {/* Close Button */}
            <button
               onClick={onClose}
               className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title / Header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
              <span className="text-3xl p-1 bg-white/5 rounded-lg">{profile.avatar}</span>
              <div>
                <h3 className="font-sans font-black text-xl text-white tracking-tight">
                  KONDISI HIDUP: {profile.name.toUpperCase()}
                </h3>
                <p className="text-xs text-[#14f195] font-medium uppercase tracking-wider font-mono">
                  {profile.type === "pejuang_mahar" 
                    ? "💍 PEJUANG RUPIAH DEMI MAHAR" 
                    : profile.type === "tulang_punggung" 
                      ? "🏠 TULANG PUNGGUNG KELUARGA" 
                      : "👤 PEJUANG BEBAS"
                  }
                </p>
              </div>
            </div>

            {/* Profile Status Message */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-6 text-xs text-white/75 italic text-center leading-relaxed">
              &ldquo;{profile.statusMessage}&rdquo;
            </div>

            {/* Main Stats Grid */}
            <div className="space-y-6">
              {/* Part 1: Financial Details */}
              <div>
                <h4 className="text-[10px] text-white/40 font-mono uppercase tracking-widest flex items-center gap-1.5 mb-3">
                  <Wallet className="w-3.5 h-3.5 text-[#14f195]" />
                  KEUANGAN DAN NILAI ASET
                </h4>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {/* Keuangan Utama */}
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10 text-center">
                    <span className="block text-[9px] text-white/40 uppercase font-mono">Uang di Dompet (Cash)</span>
                    <span className="text-base font-bold text-[#14f195] mt-1 block font-mono">
                      Rp {stats.keuangan.toLocaleString("id-ID")}
                    </span>
                  </div>

                  {/* Tabungan */}
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10 text-center">
                    <span className="block text-[9px] text-white/40 uppercase font-mono">
                      {profile.type === "pejuang_mahar" ? "Tabungan Nikah" : "Tabungan Masa Depan"}
                    </span>
                    <span className="text-base font-bold text-teal-400 mt-1 block font-mono">
                      Rp {stats.tabungan.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                {/* Pinjol and Borrowings */}
                {totalDebt > 0 ? (
                  <div className="bg-red-950/20 border border-red-900/60 p-3 rounded-xl mb-4">
                    <div className="flex items-center gap-1.5 text-red-400 text-xs font-bold mb-2">
                      <AlertOctagon className="w-4 h-4 fill-red-500/10 text-red-400" />
                      <span>BEBAN UTANG AKTIF: Rp {totalDebt.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
                      <div className="bg-white/5 p-2 rounded text-stone-300">
                        Tagihan Pinjol: <span className="text-red-400 font-bold">Rp {stats.hutangPinjol.toLocaleString("id-ID")}</span>
                      </div>
                      <div className="bg-white/5 p-2 rounded text-stone-300">
                        Hutang Teman: <span className="text-red-400 font-bold">Rp {stats.hutangTeman.toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/5 border border-white/10 p-2.5 rounded-lg text-stone-300 text-center text-xs">
                    ✅ Bebas hutang pinjol dan kerabat saat ini.
                  </div>
                )}

                {/* Assets Checklist */}
                <div className="mt-3">
                  <span className="block text-[10px] text-white/40 uppercase font-mono tracking-wider mb-2">Aset Fisik Tersisa</span>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Rumah */}
                    <div className={`p-2 rounded-lg border text-center flex flex-col items-center justify-center ${
                      stats.asetRumah 
                        ? "bg-white/5 border-white/15 text-white/90" 
                        : "bg-red-950/15 border-red-900/20 text-red-500 line-through"
                    }`}>
                      <Home className="w-4 h-4 mb-1" />
                      <span className="text-[10px] font-mono uppercase font-bold">Rumah</span>
                    </div>

                    {/* Mobil */}
                    <div className={`p-2 rounded-lg border text-center flex flex-col items-center justify-center ${
                      stats.asetMobil 
                        ? "bg-white/5 border-white/15 text-white/90"
                        : "bg-red-950/15 border-red-900/20 text-red-500 line-through"
                    }`}>
                      <Car className="w-4 h-4 mb-1" />
                      <span className="text-[10px] font-mono uppercase font-bold">Mobil</span>
                    </div>

                    {/* Motor */}
                    <div className={`p-2 rounded-lg border text-center flex flex-col items-center justify-center ${
                      stats.asetMotor 
                        ? "bg-white/5 border-white/15 text-white/90"
                        : "bg-red-950/15 border-red-900/20 text-red-500 line-through"
                    }`}>
                      <Bike className="w-4 h-4 mb-1" />
                      <span className="text-[10px] font-mono uppercase font-bold">Motor</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Part 2: Social relationship & Stress level */}
              <div>
                <h4 className="text-[10px] text-white/40 font-mono uppercase tracking-widest flex items-center gap-1.5 mb-3">
                  <Activity className="w-3.5 h-3.5 text-red-500" />
                  KONDISI PSIKOLOGIS & EMOSIONAL
                </h4>

                <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/10">
                  {/* Stress Meter */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-stone-300">Tingkat Stres / Depresi</span>
                      <span className={stats.mentalStatus > 60 ? "text-red-500 font-black animate-pulse" : "text-stone-400"}>
                        {stats.mentalStatus}%
                      </span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${getStressColor(stats.mentalStatus)}`}
                        style={{ width: `${stats.mentalStatus}%` }}
                      />
                    </div>
                  </div>

                  {/* Hubungan Pasangan */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-stone-300"> Hubungan dengan Calon / Pasangan</span>
                      <span className={stats.hubunganPasangan < 40 ? "text-red-500 font-black" : "text-stone-400"}>
                        {stats.hubunganPasangan}/100
                      </span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${getRelationColor(stats.hubunganPasangan)}`}
                        style={{ width: `${stats.hubunganPasangan}%` }}
                      />
                    </div>
                  </div>

                  {/* Hubungan Keluarga */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-stone-300">👨‍👩‍👧 Hubungan Keluarga</span>
                      <span className={stats.hubunganKeluarga < 40 ? "text-red-500 font-black" : "text-stone-400"}>
                        {stats.hubunganKeluarga}/100
                      </span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${getRelationColor(stats.hubunganKeluarga)}`}
                        style={{ width: `${stats.hubunganKeluarga}%` }}
                      />
                    </div>
                  </div>

                  {/* Hubungan Teman */}
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-stone-300">👥 Respek Lingkungan Tongkrongan</span>
                      <span className={stats.hubunganTeman < 40 ? "text-red-500 font-black" : "text-stone-400"}>
                        {stats.hubunganTeman}/100
                      </span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${getRelationColor(stats.hubunganTeman)}`}
                        style={{ width: `${stats.hubunganTeman}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Warnings Footer Indicator */}
            {stats.mentalStatus > 60 && (
              <div className="mt-5 bg-red-950/20 border border-red-900/60 text-red-400 rounded-xl p-3 flex gap-2">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>DARURAT PSIKOLOGIS:</strong> Stress level yang tinggi membuat batinmu rentan. Setiap SMS godaan bandar akan berbunyi layaknya jalan keluar satu-satunya. Pasanganmu mulai merasa ketidakjujuranmu.
                </p>
              </div>
            )}

            <button
              onClick={onClose}
              className="mt-6 w-full py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Kembali ke Layar Simulasi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
