import React, { useState, useEffect } from "react";
import { GameStats } from "../types";
import { Coins, AlertTriangle, Play, Sparkles, RefreshCcw } from "lucide-react";

interface SlotMachineProps {
  currentStats: GameStats;
  galaSpinThreshold: number; // The randomized threshold (e.g. 4, 5, or 6)
  onSpinComplete: (
    won: boolean,
    amountChanged: number,
    balanceAfter: number,
    resultingSymbols: string[],
    isGalaSemua: boolean
  ) => void;
  onClose: () => void;
}

const SLOT_SYMBOLS = ["🎰", "🍒", "💎", "💰", "❌"];

export const SlotMachine: React.FC<SlotMachineProps> = ({
  currentStats,
  galaSpinThreshold,
  onSpinComplete,
  onClose,
}) => {
  const currentSpinIndex = currentStats.spinCount + 1;
  const maxAffordableBet = currentStats.keuangan;

  // Available bets in IDR
  const standardBets = [50000, 200000, 500000, 1000000, 2500000].filter(
    (b) => b <= Math.max(maxAffordableBet, 50000)
  );

  const [selectedBet, setSelectedBet] = useState<number>(() => {
    if (standardBets.length > 0) return standardBets[0];
    return maxAffordableBet > 0 ? maxAffordableBet : 10000;
  });

  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [pendingResult, setPendingResult] = useState<{
    won: boolean;
    amountChanged: number;
    balanceAfter: number;
    symbols: string[];
    isGalaSemua: boolean;
  } | null>(null);
  const [reels, setReels] = useState(["🎰", "💰", "💎"]);
  const [slotMessage, setSlotMessage] = useState<string>("Suhu Bandar siap memanjakanmu. Pasang depo lu!");
  const [soundEffect, setSoundEffect] = useState<string>("");
  const [justResult, setJustResult] = useState<{
    won: boolean;
    gain: number;
    text: string;
  } | null>(null);

  // Auto-update bet if current money becomes less than selected bet
  useEffect(() => {
    if (maxAffordableBet > 0 && selectedBet > maxAffordableBet) {
      setSelectedBet(maxAffordableBet);
    }
  }, [maxAffordableBet, selectedBet]);

  const handleSpin = () => {
    if (isSpinning) return;
    if (currentStats.keuangan <= 0 && currentStats.tabungan <= 0) {
      setSlotMessage("DANA LU ABIS (RUNGKAD)! Hubungi pinjol secepatnya untuk lanjut depo.");
      return;
    }

    setIsSpinning(true);
    setHasSpun(false);
    setPendingResult(null);
    setJustResult(null);
    setSlotMessage("SISTEM GACOR SEDANG MEMUTAR ALGORITMA...");

    let reelsInterval: NodeJS.Timeout;
    let duration = 0;

    // Simulate clicking sound
    setSoundEffect("Tick...");

    reelsInterval = setInterval(() => {
      setReels([
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
      ]);
      duration += 100;
    }, 100);

    setTimeout(() => {
      clearInterval(reelsInterval);
      setIsSpinning(false);
      setHasSpun(true);

      let finalWon = false;
      let finalGain = 0;
      let finalSymbols = ["❌", "❌", "❌"];
      let isGalaSemua = false;

      // CORE MANIPULASI BANDAR LOGIC
      if (currentSpinIndex <= 2) {
        // SPIN 1 & 2 (ILUSI KEMENANGAN): Guaranteed small win, about 20% to 50% profit over the current bet.
        finalWon = true;
        const profitPercentage = 0.2 + Math.random() * 0.3; // 20% - 50%
        finalGain = Math.round(selectedBet * profitPercentage);
        
        // Winning symbols (Matching symbols but maybe mixed to look convincing)
        const luckySymbol = ["🎰", "💎", "💰"][Math.floor(Math.random() * 3)];
        finalSymbols = [luckySymbol, luckySymbol, luckySymbol];
        
        setJustResult({
          won: true,
          gain: finalGain,
          text: `SENSATIONAL WIN! Jackpot Zeus turun. Dapat untung Rp ${finalGain.toLocaleString("id-ID")}`
        });
        setSlotMessage("Pecah petir gila! Bandar baik kan? Sekali lagi pasti Maxwin nih!");
      } else if (currentSpinIndex >= galaSpinThreshold || currentStats.keuangan <= selectedBet) {
        // GALA SEMUA (SUDDEN DEATH / bankrupcy triggered at randomized threshold or when remaining liquid cash is low)
        isGalaSemua = true;
        finalWon = false;
        
        // Deduct ALL cash and wedding savings! High drama!
        finalGain = -(currentStats.keuangan + currentStats.tabungan);
        finalSymbols = ["❌", "❌", "❌"];
        
        setJustResult({
          won: false,
          gain: finalGain,
          text: `RUNGKAD TOTAL (GALA SEMUA)! Saldo lu disapu bersih oleh Bandar!`
        });
        setSlotMessage("AKUN DIKUNCI! ZEUS MENYAPU BERSIH SELURUH TABUNGAN DAN DANA NIKAH LU!");
      } else {
        // SPIN 3 OR NORMAL MID-GAME SPIN (Forced to Lose / Pasti Kalah)
        finalWon = false;
        finalGain = -selectedBet;
        
        // Convincingly close but losing
        const symbolA = SLOT_SYMBOLS[Math.floor(Math.random() * 2)];
        const symbolB = SLOT_SYMBOLS[Math.floor(Math.random() * 2)];
        finalSymbols = [symbolA, symbolA, "❌"];
        
        setJustResult({
          won: false,
          gain: finalGain,
          text: `Rungkad! Taruhan Rp ${selectedBet.toLocaleString("id-ID")} ludes.`
        });
        setSlotMessage("Aduh sedikit lagi dapet scatter petir merah! Ayo double depo biar modal balik!");
      }

      setReels(finalSymbols);

      // Report spin stats completion up
      // balanceAfter is computed inside App.tsx state, but we send information
      const balanceAfter = Math.max(0, currentStats.keuangan + finalGain);
      setPendingResult({
        won: finalWon,
        amountChanged: finalGain,
        balanceAfter,
        symbols: finalSymbols,
        isGalaSemua,
      });

    }, 2000);
  };

  const isGalaWarning = currentSpinIndex >= galaSpinThreshold - 1;

  return (
    <div className="bg-[#0a0a0a]/90 backdrop-blur-md border border-white/10 rounded-2xl p-6 w-full max-w-md mx-auto relative overflow-hidden shadow-2xl">
      {/* Decorative Matrix Scanline Header */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-[#14f195] to-red-600 animate-pulse" />

      {/* Header Stat & Title */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-1.5 text-stone-200">
          <Sparkles className="w-4 h-4 text-[#14f195]" />
          <span className="font-sans font-bold text-sm tracking-wider uppercase text-white/85">PETIR_ZEUS_SIMULATOR</span>
        </div>
        <div className="text-white/45 font-mono text-xs">
          DEPO KE-{currentSpinIndex}
        </div>
      </div>

      {/* Dynamic Casino Banner */}
      <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center mb-5">
        <p className="text-[#14f195] font-sans font-bold text-xs tracking-widest uppercase animate-pulse">
          ⚡ {isGalaWarning ? "PERINGATAN PINJOL: MARGIN DEPO MAKSIMAL" : "SERVER JP SENSASIONAL GACOR"} ⚡
        </p>
        <p className="text-stone-300 font-sans text-xs mt-1.5 italic">
          "{slotMessage}"
        </p>
      </div>

      {/* Slot Machine Display Frame */}
      <div className="bg-[#050505] border border-white/10 rounded-2xl p-6 mb-5 relative">
        {/* Lights indicators */}
        <div className="absolute top-3 inset-x-3 flex justify-between">
          <span className={`w-1.5 h-1.5 rounded-full ${isSpinning ? "bg-red-500 animate-ping" : "bg-red-700"}`} />
          <span className={`w-1.5 h-1.5 rounded-full ${isSpinning ? "bg-amber-400 animate-ping" : "bg-amber-600"}`} />
          <span className={`w-1.5 h-1.5 rounded-full ${isSpinning ? "bg-[#14f195] animate-ping" : "bg-emerald-700"}`} />
        </div>

        {/* The Reels */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 justify-items-center py-4 bg-white/5 rounded-xl border border-white/5 my-2">
          {reels.map((symbol, idx) => (
            <div
              key={idx}
              className={`w-full max-w-[70px] aspect-[4/5] bg-gradient-to-b from-[#050505] to-neutral-900 border border-white/10 rounded-xl flex items-center justify-center text-4xl shadow-md transition-all duration-100 ${
                isSpinning ? "animate-bounce scale-95" : ""
              }`}
            >
              <span className="drop-shadow-lg">{symbol}</span>
            </div>
          ))}
        </div>

        {/* Glow accent */}
        <div className="absolute inset-x-0 bottom-1 h-1 bg-[#14f195]/10 blur-[2px]" />
      </div>

      {/* Spin Result Area */}
      {justResult && (
        <div
          className={`p-3 rounded-xl border mb-5 text-center transition-all animate-bounce ${
            justResult.won
              ? "bg-[#14f195]/10 border-[#14f195]/30 text-[#14f195]"
              : "bg-red-950/30 border-red-500/30 text-red-400"
          }`}
        >
          <div className="flex justify-center items-center gap-1.5 font-bold text-sm">
            {justResult.won ? "🎉 JP PAUS BERUNTUN ARIS!" : "❌ RUNGKAD TOTAL!"}
          </div>
          <p className="text-xs font-sans font-medium mt-1 uppercase tracking-tight">
            {justResult.text}
          </p>
        </div>
      )}

      {/* Stats Counter & Bet Selectors */}
      <div className="space-y-4">
        {/* Money Stat display */}
        <div className="flex justify-between items-center text-xs font-mono bg-white/5 p-3 rounded-xl border border-white/10">
          <span className="text-white/50">SALDO DOMPET:</span>
          <span className="text-[#14f195] font-black">
            Rp {maxAffordableBet.toLocaleString("id-ID")}
          </span>
        </div>

        {/* Bet Selection buttons */}
        {!isSpinning && maxAffordableBet > 0 && (
          <div>
            <label className="text-white/40 font-mono text-[10px] uppercase tracking-wider block mb-2 text-center">
              Pilih Nominal Taruhan (Bet Size)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {standardBets.map((bet) => (
                <button
                  key={bet}
                  onClick={() => setSelectedBet(bet)}
                  disabled={isSpinning}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold font-mono transition-all border ${
                    selectedBet === bet
                      ? "bg-[#14f195] text-black border-[#14f195] scale-102 font-extrabold shadow-lg shadow-[#14f195]/20"
                      : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {(bet / 1000).toFixed(0)}k
                </button>
              ))}
              {/* All In Trigger */}
              <button
                onClick={() => setSelectedBet(maxAffordableBet)}
                disabled={isSpinning}
                className={`py-2 px-1 col-span-3 rounded-xl text-[11px] font-bold font-mono transition-all border ${
                  selectedBet === maxAffordableBet
                    ? "bg-red-500 text-white border-red-500 scale-102"
                    : "bg-red-500/10 text-red-400 border-red-500/35 hover:bg-red-500/20"
                }`}
              >
                🔴 SEMUA PERSEN (ALL-IN: Rp {maxAffordableBet.toLocaleString("id-ID")})
              </button>
            </div>
          </div>
        )}

        {/* Spin action buttons */}
        <div className="flex gap-2 pt-1">
          {hasSpun && pendingResult ? (
            <button
              onClick={() => {
                onSpinComplete(
                  pendingResult.won,
                  pendingResult.amountChanged,
                  pendingResult.balanceAfter,
                  pendingResult.symbols,
                  pendingResult.isGalaSemua
                );
              }}
              className="flex-1 py-3 px-4 bg-[#14f195] hover:bg-[#1ef19c] active:scale-[0.98] text-black font-sans font-black text-xs tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(20,241,149,0.35)] hover:shadow-[0_0_25px_rgba(20,241,149,0.5)] animate-pulse"
            >
              AMBIL HASIL & LIHAT TAKDIR ➔
            </button>
          ) : (
            <button
              onClick={handleSpin}
              disabled={isSpinning || (maxAffordableBet <= 0 && currentStats.tabungan <= 0)}
              className="flex-1 py-3 px-4 bg-[#14f195] hover:bg-[#1ef19c] active:scale-[0.98] text-black font-sans font-black text-xs tracking-widest uppercase rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(20,241,149,0.3)] hover:shadow-[0_0_25px_rgba(20,241,149,0.5)] disabled:bg-white/5 disabled:text-white/20 disabled:border-white/5 disabled:shadow-none"
            >
              {isSpinning ? (
                <>
                  <RefreshCcw className="w-4 h-4 animate-spin text-black" />
                  MEMUTAR...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-black text-black" />
                  TARIK TUAS SLOT!
                </>
              )}
            </button>
          )}

          {!isSpinning && !hasSpun && (
            <button
              onClick={onClose}
              className="py-3 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-sans font-bold text-xs rounded-xl transition-colors"
            >
              Kembali
            </button>
          )}
        </div>
      </div>

      {isGalaWarning && !isSpinning && (
        <div className="mt-4 bg-red-950/20 border border-red-800/40 rounded p-2.5 flex items-start gap-2 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-red-400 leading-normal">
            <strong>PERINGATAN BAHAYA:</strong> Anda terjerat hutang tersembunyi. Putaran berikutnya berpotensi memicu skenario bangkrut total (gala semua) jika algoritma bandar memutuskan mengunci modal.
          </p>
        </div>
      )}
    </div>
  );
};
