import React, { useState } from "react";
import { CharacterType, GameStats } from "../types";
import { User, Heart, Sparkles, Home, CreditCard, ChevronRight } from "lucide-react";
import { APP_SESSION_NAMES } from "../utils/constants";

interface CharacterSelectionProps {
  onSelected: (
    type: CharacterType,
    name: string,
    avatar: string,
    initialStats: GameStats
  ) => void;
  isLoading?: boolean;
}

export const CharacterSelection: React.FC<CharacterSelectionProps> = ({ onSelected, isLoading }) => {
  const [selectedTab, setSelectedTab] = useState<CharacterType>("pejuang_mahar");

  // Custom Form states
  const [customName, setCustomName] = useState("");
  const [customAvatar, setCustomAvatar] = useState("👨‍💻");
  const [initialSocioTier, setInitialSocioTier] = useState<"miskin_kota" | "menengah_pas" | "mewah_kredit">("menengah_pas");

  const handleSelectPredefined = (type: "pejuang_mahar" | "tulang_punggung") => {
    if (type === "pejuang_mahar") {
      // Inisialisasi Pejuang Mahar
      const stats: GameStats = {
        keuangan: 8000000,
        tabungan: 45000000, // target nikah is 50jt
        asetRumah: false,
        asetMobil: false,
        asetMotor: true,
        hubunganPasangan: 85, // Calon istri Penuh Harapan
        hubunganKeluarga: 90,
        hubunganTeman: 80,
        mentalStatus: 15,
        hutangPinjol: 0,
        hutangTeman: 0,
        refusalCount: 0,
        spinCount: 0,
        initialWinLimit: Math.floor(Math.random() * 4), // 0 to 3 guaranteed initial wins
      };
      onSelected("pejuang_mahar", APP_SESSION_NAMES.pejuangMahar, "🤵", stats);
    } else {
      // Inisialisasi Tulang Punggung
      const stats: GameStats = {
        keuangan: 15000000,
        tabungan: 120000000, // Uang kuliah anak & masa depan
        asetRumah: true, // under mortgage
        asetMobil: true, // under credit
        asetMotor: true,
        hubunganPasangan: 92, // Istri Penyayang
        hubunganKeluarga: 95, // Anak dekat dengan ayah
        hubunganTeman: 75,
        mentalStatus: 20,
        hutangPinjol: 0,
        hutangTeman: 0,
        refusalCount: 0,
        spinCount: 0,
        initialWinLimit: Math.floor(Math.random() * 4), // 0 to 3 guaranteed initial wins
      };
      onSelected("tulang_punggung", APP_SESSION_NAMES.tulangPunggung, "👨‍👩‍👦", stats);
    }
  };

  const handleSelectCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customName.trim() || "Suhu Kustom";

    // Setup stats based on socio tier selected
    let stats: GameStats = {
      keuangan: 10000000,
      tabungan: 20000000,
      asetRumah: false,
      asetMobil: false,
      asetMotor: true,
      hubunganPasangan: 80,
      hubunganKeluarga: 80,
      hubunganTeman: 80,
      mentalStatus: 25,
      hutangPinjol: 0,
      hutangTeman: 0,
      refusalCount: 0,
      spinCount: 0,
      initialWinLimit: Math.floor(Math.random() * 4), // 0 to 3 guaranteed initial wins
    };

    if (initialSocioTier === "miskin_kota") {
      stats.keuangan = 3000000;
      stats.tabungan = 5000000;
      stats.asetMotor = true;
      stats.mentalStatus = 40; // stress awal tinggi
    } else if (initialSocioTier === "mewah_kredit") {
      stats.keuangan = 25000000;
      stats.tabungan = 150000000;
      stats.asetRumah = true;
      stats.asetMobil = true;
      stats.asetMotor = true;
      stats.mentalStatus = 15;
    }

    onSelected("custom", name, customAvatar, stats);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#0a0a0a]/90 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden text-left">
      {/* Decorative pulse border */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-red-600 to-[#14f195]" />

      {/* Header */}
      <div className="text-center mb-6">
        <span className="text-[10px] text-[#14f195] font-mono tracking-widest uppercase block mb-1">
          🎰 SISTEM SIMULASI PERILAKU PEJUANG IMPIAN 🎰
        </span>
        <h2 className="font-sans font-black text-2xl md:text-3xl text-white tracking-tight">
          PILIH GERBANG TAKDIRMU
        </h2>
        <p className="text-white/60 font-sans text-xs md:text-sm mt-1.5 max-w-lg mx-auto leading-relaxed">
          Tentukan identitas sosial dan kondisi keuangan awalmu. Sadarlah bahwa setiap profil membawa harapan batin tersendiri.
        </p>
      </div>

      {/* Selector Tabs */}
      <div className="grid grid-cols-3 gap-2 bg-white/5 p-1.5 rounded-xl mb-6">
        <button
          onClick={() => setSelectedTab("pejuang_mahar")}
          className={`py-2.5 px-1 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer ${
            selectedTab === "pejuang_mahar"
              ? "bg-[#14f195] text-black font-black shadow-md border-transparent"
              : "text-white/60 hover:text-white"
          }`}
        >
          💍 Pejuang Mahar
        </button>
        <button
          onClick={() => setSelectedTab("tulang_punggung")}
          className={`py-2.5 px-1 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer ${
            selectedTab === "tulang_punggung"
              ? "bg-[#14f195] text-black font-black shadow-md border-transparent"
              : "text-white/60 hover:text-white"
          }`}
        >
          🏠 Tulang Punggung
        </button>
        <button
          onClick={() => setSelectedTab("custom")}
          className={`py-2.5 px-1 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer ${
            selectedTab === "custom"
              ? "bg-[#14f195] text-black font-black shadow-md border-transparent"
              : "text-white/60 hover:text-white"
          }`}
        >
          👤 Karakter Kustom
        </button>
      </div>

      {/* Card Content based on Selected Tab */}
      <div className="bg-white/5 p-5 sm:p-6 rounded-2xl border border-white/5 min-h-[300px] flex flex-col justify-between">
        
        {selectedTab === "pejuang_mahar" && (
          <div className="flex flex-col h-full justify-between gap-5">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl p-2 bg-white/5 rounded-xl">🤵</span>
                <div>
                  <h3 className="font-sans font-bold text-lg text-white">
                    {APP_SESSION_NAMES.pejuangMahar} (Anak Muda Pejuang Mahar)
                  </h3>
                  <span className="text-[10px] text-[#14f195] font-mono tracking-wider uppercase">
                    Status: Gaji Pas dapet Jakarta, Target Nikah Dekat
                  </span>
                </div>
              </div>

              <p className="text-xs text-white/70 leading-relaxed font-sans mb-4">
                {APP_SESSION_NAMES.pejuangMahar} berumur 25 tahun, seorang staf operasional biasa di Jakarta. Dia telah berpacaran dengan {APP_SESSION_NAMES.pasanganMahar} selama 5 tahun. Mertuanya menuntut pesta pernikahan sederhana namun layak senilai Rp 50.000.000 dalam waktu 3 bulan lagi. Tabungannya saat ini terkumpul Rp 45.000.000. Hanya tersisa Rp 5.000.000! Sang mertua mendesak, {APP_SESSION_NAMES.pejuangMahar.split(" ")[0]} pusing mencari kekurangan dana...
              </p>

              {/* Initial Stats Display */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-mono text-[10.5px] border-t border-white/10 pt-3">
                <div className="text-white/60">
                  Uang Kas: <span className="text-[#14f195] block font-bold">Rp 8.000.000</span>
                </div>
                <div className="text-white/60">
                  Tabungan Nikah: <span className="text-teal-400 block font-bold">Rp 45.000.000</span>
                </div>
                <div className="text-white/60">
                  Respek Pacar: <span className="text-amber-500 block font-bold">85% (Penuh Asa)</span>
                </div>
                <div className="text-white/60 col-span-2 md:col-span-1">
                  Aset Utama: <span className="text-stone-355 block">Motor Matic (Satu-satunya)</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleSelectPredefined("pejuang_mahar")}
              disabled={isLoading}
              className="mt-4 w-full py-3 bg-[#14f195] hover:bg-[#1ef19c] active:scale-[0.98] text-black font-sans font-black text-xs tracking-widest uppercase rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all shadow-[0_0_15px_rgba(20,241,149,0.25)] disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-pulse"
            >
              {isLoading ? (
                <span>Menyiapkan Takdirmu...</span>
              ) : (
                <>
                  <span>Masuki Kegilaan Sebagai {APP_SESSION_NAMES.pejuangMahar.split(" ")[0]}</span>
                  <ChevronRight className="w-4 h-4 text-black" />
                </>
              )}
            </button>
          </div>
        )}

        {selectedTab === "tulang_punggung" && (
          <div className="flex flex-col h-full justify-between gap-5">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl p-2 bg-white/5 rounded-xl">👨‍👩‍👦</span>
                <div>
                  <h3 className="font-sans font-bold text-lg text-white">
                    {APP_SESSION_NAMES.tulangPunggung} (Tumpuan Keluarga Utama)
                  </h3>
                  <span className="text-[10px] text-amber-500 font-mono tracking-wider uppercase">
                    Status: Cicilan Rumah Aktif, Kuliah Anak Pertama
                  </span>
                </div>
              </div>

              <p className="text-xs text-white/70 leading-relaxed font-sans mb-4">
                {APP_SESSION_NAMES.tulangPunggung} memiliki istri yang setia, {APP_SESSION_NAMES.pasanganKeluarga}, dan seorang putra yang baru lulus SMA dan ingin masuk Universitas Negeri. Di sisi lain, cicilan KPR rumah tersisa 3 tahun lagi dengan denda keterlambatan yang menumpuk. Tabungan masa depannya Rp 120.000.000, tetapi tagihan uang pangkal kuliah dan renovasi atap dapur yang bocor parah melampaui sisa gajinya. Sebagai tulang punggung, pundaknya serasa mau remuk dihantam inflasi keluarga...
              </p>

              {/* Initial Stats Display */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 font-mono text-[10.5px] border-t border-white/10 pt-3">
                <div className="text-white/60">
                  Uang Kas: <span className="text-[#14f195] block font-bold">Rp 15.000.000</span>
                </div>
                <div className="text-white/60">
                  Sisa Tabungan: <span className="text-teal-400 block font-bold">Rp 120.000.000</span>
                </div>
                <div className="text-white/60">
                  Stabilitas Rumah: <span className="text-amber-500 block font-bold">92% (Harmonis)</span>
                </div>
                <div className="text-white/60 col-span-2 md:col-span-1">
                  Aset Utama: <span className="text-stone-355 block">KPR Rumah, Mobil LCGC, Motor</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleSelectPredefined("tulang_punggung")}
              disabled={isLoading}
              className="mt-4 w-full py-3 bg-[#14f195] hover:bg-[#1ef19c] active:scale-[0.98] text-black font-sans font-black text-xs tracking-widest uppercase rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all shadow-[0_0_15px_rgba(20,241,149,0.25)] disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-pulse"
            >
              {isLoading ? (
                <span>Menyiapkan Takdirmu...</span>
              ) : (
                <>
                  <span>Pikul Beban Takdir Sebagai {APP_SESSION_NAMES.tulangPunggung.split(" ")[0]}</span>
                  <ChevronRight className="w-4 h-4 text-black" />
                </>
              )}
            </button>
          </div>
        )}


        {selectedTab === "custom" && (
          <form onSubmit={handleSelectCustom} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              
              {/* Name input */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono tracking-wider text-white/40 block">
                  Nama Lengkap Karakter
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Contoh: Aldi Gacor"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white/90 focus:outline-none focus:border-[#14f195] focus:ring-1 focus:ring-[#14f195]/45 transition-all"
                />
              </div>

              {/* Avatar Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono tracking-wider text-white/40 block">
                  Pilih Avatar / Emoji
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["👨‍💻", "👩‍💼", "🧑‍🎓", "🧑‍🌾"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setCustomAvatar(emoji)}
                      className={`py-1.5 bg-white/5 border rounded-xl text-lg hover:border-[#14f195]/50 hover:bg-[#14f195]/5 transition-all ${
                        customAvatar === emoji
                          ? "border-[#14f195] bg-[#14f195]/10"
                          : "border-white/15"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Socio Economic Tier Selector */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[10px] uppercase font-mono tracking-wider text-white/40 block">
                Kondisi Ekonomi Sosial Awal
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: "miskin_kota",
                    label: "Miskin Kota",
                    desc: "Uang serba Rp 3jt, stress tinggi.",
                  },
                  {
                    id: "menengah_pas",
                    label: "Menengah",
                    desc: "Uang Rp 10jt, tabungan Rp 20jt.",
                  },
                  {
                    id: "mewah_kredit",
                    label: "Kelas Atas Kredit",
                    desc: "Banyak aset atas nama cicilan.",
                  },
                ].map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setInitialSocioTier(tier.id as any)}
                    className={`p-2.5 bg-white/5 border rounded-xl text-left transition-all hover:bg-white/5 ${
                      initialSocioTier === tier.id
                        ? "border-[#14f195] bg-[#14f195]/10 text-white"
                        : "border-white/15 text-white/60"
                    }`}
                  >
                    <span className="block text-xs font-bold leading-none mb-1">{tier.label}</span>
                    <span className="text-[9px] block leading-tight text-white/45">{tier.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 w-full py-3 bg-[#14f195] hover:bg-[#1ef19c] active:scale-[0.98] text-black font-sans font-black text-xs tracking-widest uppercase rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all shadow-[0_0_15px_rgba(20,241,149,0.25)] disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-pulse"
            >
              {isLoading ? (
                <span>Menyiapkan Takdirmu...</span>
              ) : (
                <>
                  <span>Buatkan Karakter & Mulai Kegelapan ini</span>
                  <ChevronRight className="w-4 h-4 text-black" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
