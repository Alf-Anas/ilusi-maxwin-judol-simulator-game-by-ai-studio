import React from "react";
import { ChoiceLog, HistoricalSession } from "../types";
import { ArrowLeft, Clock, TrendingDown, TrendingUp, AlertCircle, RefreshCw, Layers } from "lucide-react";

interface HistoricalLogsProps {
  currentLogs: ChoiceLog[];
  completedList: HistoricalSession[];
  onBack: () => void;
  onClearAll?: () => void;
}

export const HistoricalLogs: React.FC<HistoricalLogsProps> = ({
  currentLogs,
  completedList,
  onBack,
  onClearAll,
}) => {
  return (
    <div className="bg-[#0a0a0a]/90 backdrop-blur-md border border-white/10 rounded-2xl p-6 w-full max-w-3xl mx-auto shadow-2xl relative overflow-hidden">
      {/* Decorative scanline accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-[#14f195] to-red-600 animate-pulse" />

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-white/10">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors bg-white/5 border border-white/15 hover:bg-white/10 rounded-xl px-4 py-2 cursor-pointer max-w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </button>
        <div>
          <h2 className="font-sans font-black text-lg tracking-tight text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#14f195]" />
            <span>AUDIT TRANSGRESS: RIWAYAT KETERPURUKAN</span>
          </h2>
          <p className="text-[10px] text-white/50 uppercase tracking-widest font-mono text-left">
            Timeline pilihan, keuangan, dan degradasi hubungan sosial
          </p>
        </div>
      </div>

      {/* Tabs / Breakdown of Session Logs */}
      <div className="space-y-6">
        {/* Timeline of CURRENT active game */}
        <div>
          <h3 className="text-xs font-mono uppercase tracking-widest text-[#14f195] mb-3 block text-left">
            🕒 Alur Pilihan Sesi Sekarang ({currentLogs.length} Langkah)
          </h3>

          {currentLogs.length === 0 ? (
            <div className="bg-white/5 p-4 text-center rounded-xl border border-white/10 text-white/40 text-xs italic">
              Belum ada pilihan yang diambil pada sesi ini. Mulailah simulasi untuk merekam keputusan.
            </div>
          ) : (
            <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10">
              {currentLogs.map((log, index) => {
                const uanbBefore = log.statsBefore.keuangan;
                const uangAfter = log.statsAfter.keuangan;
                const isLoss = uangAfter < uanbBefore;
                const cashDiff = uangAfter - uanbBefore;

                const hutangBefore = log.statsBefore.hutangPinjol + log.statsBefore.hutangTeman;
                const hutangAfter = log.statsAfter.hutangPinjol + log.statsAfter.hutangTeman;

                return (
                  <div key={log.id} className="relative pl-8">
                    {/* Circle Node indicator */}
                    <span className={`absolute left-2.5 top-1.5 -translate-x-1/2 w-2 h-2 rounded-full border ring-4 ring-[#0a0a0a] ${log.action === "play"
                        ? "bg-red-500 border-red-400 animate-pulse"
                        : log.action === "refuse"
                          ? "bg-[#14f195] border-[#1ef19c]"
                          : "bg-amber-400 border-amber-300"
                      }`} />

                    <div className="bg-white/5 rounded-2xl border border-white/10 p-4 hover:border-white/20 transition-all">
                      {/* Top Header */}
                      <div className="flex justify-between items-start gap-2 mb-2 font-mono text-[10px]">
                        <span className="text-white/40 uppercase flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#14f195]" />
                          <span>Langkah {index + 1}</span>
                        </span>
                        <span className={`px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${log.action === "play"
                            ? "bg-red-950/50 text-red-400 border border-red-900/30"
                            : log.action === "refuse"
                              ? "bg-[#14f195]/10 text-[#14f195] border border-[#14f195]/20"
                              : "bg-amber-950/50 text-amber-400 border border-amber-900/30"
                          }`}>
                          {log.action === "play" ? "Slot Spin" : log.action === "refuse" ? "Tolak Main" : "Ragu-Ragu"}
                        </span>
                      </div>

                      {/* Narasi context snippet */}
                      <p className="text-xs text-stone-300 font-sans italic leading-relaxed mb-3 border-l-2 border-[#14f195]/50 pl-3">
                        "{log.narasi.length > 150 ? log.narasi.slice(0, 150) + "..." : log.narasi}"
                      </p>

                      {/* Choice Taken */}
                      <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 mb-3">
                        <span className="block text-[8px] text-white/40 uppercase tracking-widest font-mono">Pilihan yang Diambil</span>
                        <span className="text-[11px] text-white block mt-0.5 font-medium leading-normal">
                          ➔ {log.pilihanTeks}
                        </span>
                      </div>

                      {/* Stats changes Audit */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] font-mono border-t border-white/10 pt-3 text-white/60">
                        {/* Financial Audit */}
                        <div className="flex flex-col">
                          <span className="text-[8px] text-white/40 uppercase">Cash Dompet</span>
                          <span className="text-white mt-0.5 flex flex-wrap items-center gap-1">
                            Rp {uanbBefore.toLocaleString("id-ID")}
                            <span className="text-white/30">➔</span>
                            <span className={cashDiff === 0 ? "text-white" : isLoss ? "text-red-400 font-bold" : "text-[#14f195] font-bold"}>
                              Rp {uangAfter.toLocaleString("id-ID")}
                            </span>
                          </span>
                          {cashDiff !== 0 && (
                            <span className={`text-[9px] font-bold ${isLoss ? "text-red-400" : "text-[#14f195]"}`}>
                              ({isLoss ? "-" : "+"}Rp {Math.abs(cashDiff).toLocaleString("id-ID")})
                            </span>
                          )}
                        </div>

                        {/* Future savings */}
                        <div className="flex flex-col">
                          <span className="text-[8px] text-white/40 uppercase">Tabungan Cadangan</span>
                          <span className="text-white mt-0.5">
                            Rp {log.statsBefore.tabungan.toLocaleString("id-ID")} ➔
                            <span className={log.statsAfter.tabungan < log.statsBefore.tabungan ? "text-red-400 font-bold" : "text-white/80"}>
                              Rp {log.statsAfter.tabungan.toLocaleString("id-ID")}
                            </span>
                          </span>
                        </div>

                        {/* Debts indicator */}
                        <div className="flex flex-col">
                          <span className="text-[8px] text-white/40 uppercase">Beban Utang</span>
                          <span className="text-white mt-0.5 flex flex-wrap items-center gap-0.5">
                            Rp {hutangBefore.toLocaleString("id-ID")} ➔
                            <span className={hutangAfter > hutangBefore ? "text-red-400 font-bold" : "text-white/80"}>
                              Rp {hutangAfter.toLocaleString("id-ID")}
                            </span>
                          </span>
                        </div>

                        {/* Stress indicator */}
                        <div className="flex flex-col">
                          <span className="text-[8px] text-white/40 uppercase">Tingkat Stres</span>
                          <span className="text-white mt-0.5 flex items-center gap-1">
                            {log.statsBefore.mentalStatus}% ➔
                            <span className={log.statsAfter.mentalStatus > log.statsBefore.mentalStatus ? "text-red-400 font-bold" : "text-[#14f195]"}>
                              {log.statsAfter.mentalStatus}%
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Display Slot Matrix outcome if occurred */}
                      {log.isSlotSpin && log.slotOutcome && (
                        <div className="mt-3 pt-2.5 border-t border-dashed border-white/10 text-[10px] font-mono flex flex-wrap justify-between items-center text-white/40 gap-2">
                          <span className="block uppercase text-amber-500">Hasil Putaran Slot:</span>
                          <span className="text-white/80 flex items-center gap-1">
                            Simbol: [ {log.slotOutcome.symbols.join(" | ")} ]
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="h-px bg-white/10" />

        {/* HISTORICAL COMPLETED RUNS */}
        <div>
          <h3 className="text-xs font-mono uppercase tracking-widest text-red-500 mb-3 block text-left flex items-center gap-1.5">
            💀 Riwayat Kehancuran Sebelumnya / Log Akhir ({completedList.length} Game)
          </h3>

          {completedList.length === 0 ? (
            <div className="bg-white/5 p-6 text-center rounded-xl border border-dashed border-white/10 text-white/40 text-xs italic animate-pulse">
              Belum ada riwayat game berakhir yang tersimpan di memori IndexedDB. Mainkan game hingga konklusi menang/kalah untuk memunculkan log kehancuran.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {completedList.map((hist) => (
                <div key={hist.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between hover:border-red-500/30 transition-all hover:scale-[1.01]">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="text-[10px] text-white/40 font-mono">
                        {new Date(hist.timestamp).toLocaleDateString("id-ID")}
                      </span>
                      <span className={`text-[9px] font-mono uppercase font-black px-1.5 py-0.5 rounded ${hist.status === "won"
                          ? "bg-[#14f195]/10 text-[#14f195] border border-[#14f195]/20"
                          : "bg-red-950/40 text-red-400 border border-red-900/30"
                        }`}>
                        {hist.status === "won" ? "Selamat (Won)" : "Hancur (Lost)"}
                      </span>
                    </div>

                    <h4 className="font-sans font-bold text-sm text-white flex items-center gap-1 my-1">
                      👤 {hist.profileName}
                      <span className="text-xs font-mono text-white/40">
                        ({hist.profileType === "pejuang_mahar" ? "Mahar" : hist.profileType === "tulang_punggung" ? "T. Punggung" : "Kustom"})
                      </span>
                    </h4>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 font-mono text-[10px] text-white/60 grid grid-cols-2 gap-2 bg-white/5 p-2 rounded-xl">
                    <div>
                      Cash Akhir: <span className="text-white/80 block font-bold">Rp {hist.statsSummary.keuanganAkhir.toLocaleString("id-ID")}</span>
                    </div>
                    <div>
                      Tabungan Akhir: <span className="text-white/80 block font-bold">Rp {hist.statsSummary.tabunganAkhir.toLocaleString("id-ID")}</span>
                    </div>
                    <div>
                      Sisa Hutang: <span className="text-red-400 block font-bold">Rp {hist.statsSummary.totalHutang.toLocaleString("id-ID")}</span>
                    </div>
                    <div>
                      Total Spin: <span className="text-amber-500 block font-bold">{hist.statsSummary.totalSpins} kali</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-white/70 italic leading-relaxed mt-2 border-l border-white/15 pl-2">
                      "{hist.narrativeConclusion}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clear memory button */}
        {completedList.length > 0 && onClearAll && (
          <div className="text-center pt-3">
            <button
              onClick={() => {
                if (confirm("Yakin ingin menghapus semua rekam jejak tragedi dari memori IndexedDB? Tindakan ini permanen.")) {
                  onClearAll();
                }
              }}
              className="px-4 py-2 border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-red-500/5 hover:scale-[1.01]"
            >
              Hapus Semua Riwayat Memori 🗑️
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
