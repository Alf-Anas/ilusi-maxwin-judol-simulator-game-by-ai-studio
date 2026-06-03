import React, { useState, useEffect, useRef } from "react";
import { GameStats } from "../types";
import { audioManager } from "../utils/audio";
import { Coins, AlertTriangle, Play, Sparkles, RefreshCcw } from "lucide-react";

interface SlotMachineProps {
  currentStats: GameStats;
  galaSpinThreshold: number; // Left for compatibility, but we follow organic limits
  lossBoost: number; // Loss boost percent (0 to 45)
  onSpinComplete: (
    won: boolean,
    amountChanged: number,
    balanceAfter: number,
    resultingSymbols: string[],
    isGalaSemua: boolean,
    multiSpinStats?: Partial<GameStats> & { systemActions?: string[]; actionSequence?: string[] }
  ) => void;
  onClose: () => void;
}

const SLOT_SYMBOLS = ["🎰", "🍒", "💎", "💰", "❌"];

const formatBetButtonLabel = (bet: number): string => {
  if (bet >= 1000000) {
    const million = bet / 1000000;
    return `${million.toString().replace(".", ",")}jt`;
  }
  return `${bet / 1000}rb`;
};

// Get win rate based on bet sizes relative to current wallet
const getWinRate = (bet: number, maxWallet: number, lossBoostPercent: number): number => {
  const boostFraction = lossBoostPercent / 100;
  let baseRate = 0.03;
  // If player did an explicit all-in with high stake, make it highly addictive but lower odds
  if (bet === maxWallet && maxWallet > 500000) baseRate = 0.03; // All-In: 3%
  else if (bet <= 50000) baseRate = 0.20;       // 50k: 20%
  else if (bet <= 200000) baseRate = 0.15;      // 100k/200k: 15%
  else if (bet <= 500000) baseRate = 0.10;      // 500k: 10%
  else if (bet <= 1000500) baseRate = 0.07;     // 1000k: 7%
  else if (bet <= 2500500) baseRate = 0.05;     // 2500k: 5%
  else baseRate = 0.03;

  return Math.min(0.95, baseRate + boostFraction);
};

export const SlotMachine: React.FC<SlotMachineProps> = ({
  currentStats,
  galaSpinThreshold,
  lossBoost,
  onSpinComplete,
  onClose,
}) => {
  // Local trackers for reactive real-time wallet/stats updates
  const [walletTracker, setWalletTracker] = useState(currentStats.keuangan);
  const [tabunganTracker, setTabunganTracker] = useState(currentStats.tabungan);
  const [pinjolTracker, setPinjolTracker] = useState(currentStats.hutangPinjol);
  const [spinCountTracker, setSpinCountTracker] = useState(currentStats.spinCount);

  // Extra local trackers to preserve fully randomized emergency states:
  const [hutangTemanTracker, setHutangTemanTracker] = useState(currentStats.hutangTeman);
  const [asetMotorTracker, setAsetMotorTracker] = useState(currentStats.asetMotor);
  const [asetMobilTracker, setAsetMobilTracker] = useState(currentStats.asetMobil);
  const [asetRumahTracker, setAsetRumahTracker] = useState(currentStats.asetRumah);
  const [hubunganTemanTracker, setHubunganTemanTracker] = useState(currentStats.hubunganTeman);
  const [hubunganPasanganTracker, setHubunganPasanganTracker] = useState(currentStats.hubunganPasangan);
  const [hubunganKeluargaTracker, setHubunganKeluargaTracker] = useState(currentStats.hubunganKeluarga);
  const [mentalStatusTracker, setMentalStatusTracker] = useState(currentStats.mentalStatus);
  const [lastPullLossTracker, setLastPullLossTracker] = useState(currentStats.lastPullLoss || 0);

  // Tracking desperate actions taken (pinjol, selling assets, etc.)
  const systemActionsRef = useRef<string[]>([]);
  const actionSequenceRef = useRef<string[]>([]);

  const [spinCountChoice, setSpinCountChoice] = useState<1 | 5 | 10 | 20>(1);
  const [consecutiveLogs, setConsecutiveLogs] = useState<string[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [reels, setReels] = useState(["🎰", "💰", "💎"]);
  const [slotMessage, setSlotMessage] = useState<string>("Suhu Bandar siap memanjakanmu. Pasang depo lu!");
  const [justResult, setJustResult] = useState<{
    won: boolean;
    gain: number;
    text: string;
  } | null>(null);

  const [pendingResult, setPendingResult] = useState<{
    won: boolean;
    amountChanged: number;
    balanceAfter: number;
    symbols: string[];
    isGalaSemua: boolean;
  } | null>(null);

  // Synchronize stats if mutated externally
  useEffect(() => {
    setWalletTracker(currentStats.keuangan);
    setTabunganTracker(currentStats.tabungan);
    setPinjolTracker(currentStats.hutangPinjol);
    setSpinCountTracker(currentStats.spinCount);
    
    setHutangTemanTracker(currentStats.hutangTeman);
    setAsetMotorTracker(currentStats.asetMotor);
    setAsetMobilTracker(currentStats.asetMobil);
    setAsetRumahTracker(currentStats.asetRumah);
    setHubunganTemanTracker(currentStats.hubunganTeman);
    setHubunganPasanganTracker(currentStats.hubunganPasangan);
    setHubunganKeluargaTracker(currentStats.hubunganKeluarga);
    setMentalStatusTracker(currentStats.mentalStatus);
    setLastPullLossTracker(currentStats.lastPullLoss || 0);
  }, [currentStats]);

  const maxAffordableBet = walletTracker;

  // Available bets based on local wallet size
  const standardBets = [50000, 200000, 500000, 1000000, 2500000].filter(
    (b) => b <= Math.max(maxAffordableBet, 50000)
  );

  const [selectedBet, setSelectedBet] = useState<number>(() => {
    if (standardBets.length > 0) return standardBets[0];
    return maxAffordableBet > 0 ? maxAffordableBet : 10000;
  });

  // Automatically adjust selected bet if wallet shrinks
  useEffect(() => {
    if (maxAffordableBet > 0 && selectedBet > maxAffordableBet) {
      setSelectedBet(maxAffordableBet);
    }
  }, [maxAffordableBet, selectedBet]);

  const handleSpin = () => {
    if (isSpinning) return;
    if (walletTracker <= 0 && tabunganTracker <= 0 && !asetMotorTracker && !asetMobilTracker && !asetRumahTracker && (hutangTemanTracker >= 15000000 || hubunganTemanTracker <= 20)) {
      setSlotMessage("DANA LU ABIS (RUNGKAD)! Hubungi pinjol secepatnya untuk lanjut depo.");
      return;
    }

    setIsSpinning(true);
    setHasSpun(false);
    systemActionsRef.current = [];
    actionSequenceRef.current = [];
    setPendingResult(null);
    setJustResult(null);
    setConsecutiveLogs([]);
    setSlotMessage("SISTEM GACOR SEDANG MEMUTAR ALGORITMA...");

    // Sound cue
    audioManager.playSpin();

    // Check if it is the absolute introductory play (retention hook)
    const isInitialHook = spinCountTracker === 0 && selectedBet <= 200000;

    if (spinCountChoice === 1) {
      // 1. LEGACY SINGLE PLAY: Maintain high individual slot tension
      let reelsInterval: NodeJS.Timeout;
      let duration = 0;

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

        const winRate = getWinRate(selectedBet, walletTracker, lossBoost);
        const isNormalWin = !isInitialHook && Math.random() < winRate;
        const finalWon = isInitialHook || isNormalWin;

        let finalGain = 0;
        let finalSymbols = ["❌", "❌", "❌"];

        if (finalWon) {
          // Winner!
          const profitPercentage = isInitialHook
            ? (0.2 + Math.random() * 0.3) // 20% - 50% initial win hook
            : (0.5 + Math.random() * 1.0); // 50% - 150% standard subsequent jackpot
          
          finalGain = Math.round(selectedBet * profitPercentage);
          const luckySymbol = ["🎰", "💎", "💰"][Math.floor(Math.random() * 3)];
          finalSymbols = [luckySymbol, luckySymbol, luckySymbol];

          actionSequenceRef.current.push(
            `Spin ke-${spinCountTracker + 1}: Taruhan Rp ${selectedBet.toLocaleString("id-ID")} ➔ MENANG +Rp ${finalGain.toLocaleString("id-ID")} (Ilusi JP)`
          );

          setJustResult({
            won: true,
            gain: finalGain,
            text: `SENSATIONAL WIN! Jackpot Zeus turun. Dapat untung Rp ${finalGain.toLocaleString("id-ID")}`
          });
          setSlotMessage("Pecah petir gila! Bandar baik kan? Sekali lagi pasti Maxwin nih!");
          audioManager.playWin();
        } else {
          // Loss
          finalGain = -selectedBet;

          const symbolA = SLOT_SYMBOLS[Math.floor(Math.random() * 3)];
          const symbolB = SLOT_SYMBOLS[Math.floor(Math.random() * 3)];
          finalSymbols = [symbolA, symbolA, "❌"];

          actionSequenceRef.current.push(
            `Spin ke-${spinCountTracker + 1}: Taruhan Rp ${selectedBet.toLocaleString("id-ID")} ➔ RUNGKAD -Rp ${selectedBet.toLocaleString("id-ID")}`
          );

          setJustResult({
            won: false,
            gain: finalGain,
            text: `Rungkad! Taruhan Rp ${selectedBet.toLocaleString("id-ID")} ludes.`
          });
          setSlotMessage("Aduh sedikit lagi dapet scatter petir merah! Ayo double depo biar modal balik!");
          audioManager.playLose();
        }

        setReels(finalSymbols);

        const newWallet = Math.max(0, walletTracker + finalGain);
        const nextSpinCount = spinCountTracker + 1;

        setWalletTracker(newWallet);
        setSpinCountTracker(nextSpinCount);
        setLastPullLossTracker(finalWon ? 0 : selectedBet);

        setPendingResult({
          won: finalWon,
          amountChanged: finalGain,
          balanceAfter: newWallet,
          symbols: finalSymbols,
          isGalaSemua: false,
        });

      }, 1500);

    } else {
      // 2. CONSECUTIVE MULTI-SPINS FLOW: Quick step loops for dynamical organic money depletion
      let currentStep = 0;
      let localWallet = walletTracker;
      let localTabungan = tabunganTracker;
      let localPinjol = pinjolTracker;
      let localHutangTeman = hutangTemanTracker;
      let localAsetMotor = asetMotorTracker;
      let localAsetMobil = asetMobilTracker;
      let localAsetRumah = asetRumahTracker;
      let localHubunganTeman = hubunganTemanTracker;
      let localHubunganPasangan = hubunganPasanganTracker;
      let localHubunganKeluarga = hubunganKeluargaTracker;
      let localMentalStatus = mentalStatusTracker;

      let localSpinCount = spinCountTracker;
      let accumulatedNetChange = 0;
      let totalWins = 0;
      let logs: string[] = [];

      const intervalId = setInterval(() => {
        if (currentStep >= spinCountChoice) {
          clearInterval(intervalId);
          setIsSpinning(false);
          setHasSpun(true);

          // Correct win/lose based on total financial results!
          const finalWon = accumulatedNetChange > 0;
          setLastPullLossTracker(accumulatedNetChange < 0 ? Math.abs(accumulatedNetChange) : 0);

          setPendingResult({
            won: finalWon,
            amountChanged: accumulatedNetChange,
            balanceAfter: localWallet,
            symbols: ["🎰", finalWon ? "💰" : "❌", finalWon ? "💎" : "❌"],
            isGalaSemua: false,
          });

          setJustResult({
            won: finalWon,
            gain: accumulatedNetChange,
            text: finalWon
              ? `Multi-Spin Selesai: Untung! Selisih: ${accumulatedNetChange >= 0 ? "+" : ""}Rp ${accumulatedNetChange.toLocaleString("id-ID")}`
              : `Total Rungkad: Sesi selesai dengan kerugian -Rp ${Math.abs(accumulatedNetChange).toLocaleString("id-ID")}`
          });

          if (finalWon) {
            audioManager.playWin();
            setSlotMessage(`Putaran selesai! Berhasil menang sebanyak ${totalWins}x dan dapet untung. Buruan lanjut depo biar JP Maxwin!`);
          } else {
            audioManager.playLose();
            setSlotMessage("Dewa Zeus tertawa puas. Seluruh modalmu ludes tersedot gasingan maut.");
          }
          return;
        }

        // Fund verification & dynamic resource injection simulator
        if (localWallet < selectedBet) {
          // Follow strict psychological descent priority:
          // Uang Pegangan (none) -> Tabungan -> Pinjam Teman -> Pinjol -> Motor -> Mobil -> Rumah
          let chosenOption: string | null = null;

          if (localTabungan > 0) {
            chosenOption = "tabungan";
          } else if (localHutangTeman < 15000000 && localHubunganTeman > 20) {
            chosenOption = "teman";
          } else if (localPinjol < 35000000) {
            chosenOption = "pinjol";
          } else if (localAsetMotor) {
            chosenOption = "motor";
          } else if (localAsetMobil) {
            chosenOption = "mobil";
          } else if (localAsetRumah) {
            chosenOption = "rumah";
          }

          if (chosenOption !== null) {
            let drawAmount = 0;
            let logMsg = "";

            if (!systemActionsRef.current.includes(chosenOption)) {
              systemActionsRef.current.push(chosenOption);
            }

            if (chosenOption === "pinjol") {
              drawAmount = 5000000;
              localPinjol += drawAmount;
              localWallet += drawAmount;
              localMentalStatus = Math.min(100, localMentalStatus + 10);
              logMsg = `⚠️ [PINJOL OTOMATIS] Saldo tipis! Ajukan pinjol Rp ${drawAmount.toLocaleString("id-ID")}.`;
              actionSequenceRef.current.push(`Menarik Pinjol Ilegal sebesar Rp ${drawAmount.toLocaleString("id-ID")} demi lanjut deposit`);
              
              setPinjolTracker(localPinjol);
              setMentalStatusTracker(localMentalStatus);
            } else if (chosenOption === "tabungan") {
              drawAmount = Math.min(localTabungan, 10000000);
              localTabungan -= drawAmount;
              localWallet += drawAmount;
              localHubunganPasangan = Math.max(0, localHubunganPasangan - 25);
              localHubunganKeluarga = Math.max(0, localHubunganKeluarga - 20);
              localMentalStatus = Math.min(100, localMentalStatus + 15);
              logMsg = `🚨 [BOBOT TABUNGAN] Terpaksa membobol tabungan keluarga Rp ${drawAmount.toLocaleString("id-ID")}!`;
              actionSequenceRef.current.push(`Membobol celengan tabungan pernikahan/keluarga sebesar Rp ${drawAmount.toLocaleString("id-ID")} demi lanjut deposit`);

              setTabunganTracker(localTabungan);
              setHubunganPasanganTracker(localHubunganPasangan);
              setHubunganKeluargaTracker(localHubunganKeluarga);
              setMentalStatusTracker(localMentalStatus);
            } else if (chosenOption === "teman") {
              drawAmount = 3000000;
              localHutangTeman += drawAmount;
              localWallet += drawAmount;
              localHubunganTeman = Math.max(0, localHubunganTeman - 20);
              logMsg = `🤝 [PINJAM TEMAN] Pinjam Rp ${drawAmount.toLocaleString("id-ID")} kepada teman lama dengan alasan darurat.`;
              actionSequenceRef.current.push(`Membohongi dan memanipulasi teman terdekat demi sabetan utang Rp ${drawAmount.toLocaleString("id-ID")} demi deposit`);

              setHutangTemanTracker(localHutangTeman);
              setHubunganTemanTracker(localHubunganTeman);
            } else if (chosenOption === "motor") {
              drawAmount = 8000000;
              localAsetMotor = false;
              localWallet += drawAmount;
              localHubunganPasangan = Math.max(0, localHubunganPasangan - 15);
              localMentalStatus = Math.min(100, localMentalStatus + 20);
              logMsg = `🏍️ [GADAI SEPAHAM] Melepas motor kesayangan ke gadai ilegal seharga Rp ${drawAmount.toLocaleString("id-ID")}!`;
              actionSequenceRef.current.push(`Menggadaikan motor satu-satunya seharga Rp ${drawAmount.toLocaleString("id-ID")} demi terus deposit`);

              setAsetMotorTracker(false);
              setHubunganPasanganTracker(localHubunganPasangan);
              setMentalStatusTracker(localMentalStatus);
            } else if (chosenOption === "mobil") {
              drawAmount = 25000000;
              localAsetMobil = false;
              localWallet += drawAmount;
              localHubunganPasangan = Math.max(0, localHubunganPasangan - 35);
              localHubunganKeluarga = Math.max(0, localHubunganKeluarga - 15);
              localMentalStatus = Math.min(100, localMentalStatus + 25);
              logMsg = `🚗 [LEPAS MOBIL] Terpaksa melego mobil keluarga dengan harga miring Rp ${drawAmount.toLocaleString("id-ID")}!`;
              actionSequenceRef.current.push(`Secara desperat menjual miring mobil keluarga kesayangan seharga Rp ${drawAmount.toLocaleString("id-ID")} demi terus deposit`);

              setAsetMobilTracker(false);
              setHubunganPasanganTracker(localHubunganPasangan);
              setHubunganKeluargaTracker(localHubunganKeluarga);
              setMentalStatusTracker(localMentalStatus);
            } else if (chosenOption === "rumah") {
              drawAmount = 80000000;
              localAsetRumah = false;
              localWallet += drawAmount;
              localHubunganPasangan = Math.max(0, localHubunganPasangan - 50);
              localHubunganKeluarga = Math.max(0, localHubunganKeluarga - 40);
              localMentalStatus = Math.min(100, localMentalStatus + 35);
              logMsg = `🏠 [SERTIFIKAT RUMAH] Menjual hak milik sertifikat rumah warisan seharga Rp ${drawAmount.toLocaleString("id-ID")}!`;
              actionSequenceRef.current.push(`Menggadaikan atau melepas sertifikat rumah warisan tempat bernaung keluarga seharga Rp ${drawAmount.toLocaleString("id-ID")} demi terus deposit`);

              setAsetRumahTracker(false);
              setHubunganPasanganTracker(localHubunganPasangan);
              setHubunganKeluargaTracker(localHubunganKeluarga);
              setMentalStatusTracker(localMentalStatus);
            }

            logs.unshift(logMsg);
            setWalletTracker(localWallet);
            audioManager.playWin();
          } else {
            // Absolute bankruptcy early in multi-run
            logs.unshift(`❌ [RUNGKAD MUTLAK] Saldo wallet, tabungan, teman & aset habis terjual! Slot terkunci.`);
            setConsecutiveLogs([...logs]);
            setWalletTracker(0);

            clearInterval(intervalId);
            setIsSpinning(false);
            setHasSpun(true);

            // Correct win/lose based on final financial changes
            const finalWon = accumulatedNetChange > 0;
            setLastPullLossTracker(accumulatedNetChange < 0 ? Math.abs(accumulatedNetChange) : 0);

            setPendingResult({
              won: finalWon,
              amountChanged: accumulatedNetChange,
              balanceAfter: 0,
              symbols: ["❌", "❌", "❌"],
              isGalaSemua: false,
            });

            actionSequenceRef.current.push(`Rungkad Mutlak! Gasingan terhenti di putaran ke-${currentStep + 1} karena seluruh modal dan aset habis.`);

            setJustResult({
              won: finalWon,
              gain: accumulatedNetChange,
              text: `Kehabisan modal di tengah jalan pada gasingan ke-${currentStep + 1}.`
            });
            audioManager.playLose();
            return;
          }
        }

        // Deduct Bet
        localWallet -= selectedBet;
        localSpinCount += 1;
        accumulatedNetChange -= selectedBet;

        const winRate = getWinRate(selectedBet, walletTracker, lossBoost);
        let stepWon = false;

        if (isInitialHook && spinCountChoice === 5) {
          // Absolute win for 5x spins at the start: Win on spin 1, 3, and 5
          if (currentStep === 0 || currentStep === 2 || currentStep === 4) {
            stepWon = true;
          }
        } else {
          stepWon = Math.random() < winRate;
        }

        let stepGain = 0;

        if (stepWon) {
          totalWins += 1;
          const profitPercentage = isInitialHook 
            ? (0.7 + Math.random() * 0.3) // Higher, generous returns for initial welcome play to hook player (70% - 100%)
            : (0.5 + Math.random() * 1.0); // 50% - 150% standard subsequent jackpot
          
          stepGain = Math.round(selectedBet * (1 + profitPercentage));
          localWallet += stepGain;
          accumulatedNetChange += stepGain;

          logs.unshift(`🎉 [WIN] Spin #${currentStep + 1}: PETIR PECAH! +Rp ${stepGain.toLocaleString("id-ID")}`);
          actionSequenceRef.current.push(`Spin ke-${localSpinCount}: Taruhan Rp ${selectedBet.toLocaleString("id-ID")} ➔ MENANG +Rp ${stepGain.toLocaleString("id-ID")} (Ilusi JP)`);
          audioManager.playWin();
        } else {
          logs.unshift(`💸 [LOSE] Spin #${currentStep + 1}: Rungkad. -Rp ${selectedBet.toLocaleString("id-ID")}`);
          actionSequenceRef.current.push(`Spin ke-${localSpinCount}: Taruhan Rp ${selectedBet.toLocaleString("id-ID")} ➔ RUNGKAD -Rp ${selectedBet.toLocaleString("id-ID")}`);
          audioManager.playLose();
        }

        // Sync local trackers
        setWalletTracker(localWallet);
        setSpinCountTracker(localSpinCount);
        setConsecutiveLogs([...logs]);

        // Shift reels visually
        setReels([
          SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
          SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
          SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        ]);

        currentStep++;
      }, 180);
    }
  };

  // Check if warning warning sounds/decorations should highlight
  const isGalaWarning = walletTracker <= 100000 && tabunganTracker <= 0;

  return (
    <div className="bg-[#0a0a0a]/90 backdrop-blur-md border border-white/10 rounded-2xl p-6 w-full max-w-md mx-auto relative overflow-hidden shadow-2xl">
      {/* Decorative Scanline Header */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-[#14f195] to-red-600 animate-pulse" />

      {/* Header Stat & Title */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-1.5 text-stone-200">
          <Sparkles className="w-4 h-4 text-[#14f195]" />
          <span className="font-sans font-bold text-sm tracking-wider uppercase text-white/85">PETIR_ZEUS_SIMULATOR</span>
        </div>
        <div className="text-white/45 font-mono text-xs">
          DEPO KE-{spinCountTracker + 1}
        </div>
      </div>

      {/* Dynamic Casino Banner */}
      <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center mb-5">
        <p className="text-[#14f195] font-sans font-bold text-xs tracking-widest uppercase animate-pulse">
          ⚡ {isGalaWarning ? "PERINGATAN PINJOL: MARGIN KRITIS!" : "SERVER JP SENSASIONAL GACOR"} ⚡
        </p>
        {lossBoost > 0 && (
          <div className="mt-1.5 inline-flex items-center gap-1 bg-emerald-900/40 border border-emerald-500/30 text-[#14f195] px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono animate-pulse">
            💥 GACOR BOOST: +{lossBoost}%
          </div>
        )}
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

      {/* Consecutive logs ticker console */}
      {consecutiveLogs.length > 0 && (
        <div className="bg-[#050505] border border-white/5 rounded-xl p-3 mb-5 font-mono text-[10px] text-stone-350">
          <div className="flex justify-between items-center text-white/40 uppercase mb-2 border-b border-white/5 pb-1 tracking-wider text-[8px]">
            <span>📋 LIVE GASINGAN BERUNTUN LOGS</span>
            <span className="text-[#14f195] animate-pulse">● PLAYING</span>
          </div>
          <div className="max-h-[110px] overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-white/10 pr-1 select-none text-left">
            {consecutiveLogs.map((log, idx) => (
              <div key={idx} className="leading-tight border-l border-white/15 pl-1.5 animate-fadeIn">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

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
            {justResult.won ? "🎉 JP ZEUS PECAH!" : "❌ RUNGKAD!"}
          </div>
          <p className="text-xs font-sans font-medium mt-1 uppercase tracking-tight">
            {justResult.text}
          </p>
        </div>
      )}

      {/* Stats Counter & Bet Selectors */}
      <div className="space-y-4">
        {/* Dynamic Money & Assets Quick Status */}
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-white/5 p-3 rounded-xl border border-white/10 text-left">
          <div className="flex flex-col gap-0.5">
            <span className="text-white/40 uppercase">ASET KAS:</span>
            <span className="text-[#14f195] font-bold text-xs">
              Rp {walletTracker.toLocaleString("id-ID")}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-white/40 uppercase">TABUNGAN:</span>
            <span className="text-teal-400 font-bold text-xs">
              Rp {tabunganTracker.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {/* Bet Selection buttons */}
        {!isSpinning && !hasSpun && maxAffordableBet > 0 && (
          <div className="space-y-4">
            {/* Bet sizes selector */}
            <div>
              <label className="text-white/40 font-mono text-[9px] uppercase tracking-wider block mb-1.5 text-center">
                Pilih Nominal Taruhan (Bet Size)
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {standardBets.map((bet) => (
                  <button
                    key={bet}
                    onClick={() => {
                      audioManager.playClick();
                      setSelectedBet(bet);
                    }}
                    disabled={isSpinning}
                    className={`py-2 px-0.5 rounded-xl text-[10px] font-bold font-mono transition-all border ${
                      selectedBet === bet
                        ? "bg-[#14f195] text-black border-[#14f195] font-extrabold shadow-lg shadow-[#14f195]/20 animate-pulse"
                        : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {formatBetButtonLabel(bet)}
                  </button>
                ))}
              </div>

              {/* All In Trigger */}
              <button
                onClick={() => {
                  audioManager.playClick();
                  setSelectedBet(maxAffordableBet);
                }}
                disabled={isSpinning}
                className={`py-2 px-1 w-full mt-2 rounded-xl text-[10px] font-bold font-mono transition-all border ${
                  selectedBet === maxAffordableBet
                    ? "bg-red-500 text-white border-red-500 font-extrabold shadow-lg"
                    : "bg-red-500/10 text-red-400 border-red-500/25 hover:bg-red-500/20"
                }`}
              >
                🔴 ALL-IN (Rp {maxAffordableBet.toLocaleString("id-ID")})
              </button>
            </div>

            {/* Spin Count Choices */}
            <div>
              <label className="text-white/40 font-mono text-[9px] uppercase tracking-wider block mb-1.5 text-center">
                Jumlah Gasingan Beruntun (Combo Spin)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {([1, 5, 10, 20] as const).map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      audioManager.playClick();
                      setSpinCountChoice(count);
                    }}
                    className={`py-2 px-1 rounded-xl text-[10px] font-bold font-mono transition-all border ${
                      spinCountChoice === count
                        ? "bg-[#14f195] text-black border-[#14f195] font-extrabold shadow-md shadow-[#14f195]/15"
                        : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {count}x Spin
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Spin action buttons */}
        <div className="flex gap-2 pt-1">
          {hasSpun && pendingResult ? (
            <button
              onClick={() => {
                audioManager.playClick();
                onSpinComplete(
                  pendingResult.won,
                  pendingResult.amountChanged,
                  pendingResult.balanceAfter,
                  pendingResult.symbols,
                  pendingResult.isGalaSemua,
                  {
                    keuangan: walletTracker,
                    tabungan: tabunganTracker,
                    hutangPinjol: pinjolTracker,
                    spinCount: spinCountTracker,
                    hutangTeman: hutangTemanTracker,
                    asetMotor: asetMotorTracker,
                    asetMobil: asetMobilTracker,
                    asetRumah: asetRumahTracker,
                    hubunganTeman: hubunganTemanTracker,
                    hubunganPasangan: hubunganPasanganTracker,
                    hubunganKeluarga: hubunganKeluargaTracker,
                    mentalStatus: mentalStatusTracker,
                    lastPullLoss: lastPullLossTracker,
                    systemActions: systemActionsRef.current,
                    actionSequence: actionSequenceRef.current,
                  }
                );
              }}
              className="flex-1 py-3 px-4 bg-[#14f195] hover:bg-[#1ef19c] active:scale-[0.98] text-black font-sans font-black text-xs tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(20,241,149,0.35)] hover:shadow-[0_0_25px_rgba(20,241,149,0.5)] animate-pulse"
            >
              Lanjutkan ➔
            </button>
          ) : (
            <button
              onClick={handleSpin}
              disabled={isSpinning || (walletTracker <= 0 && tabunganTracker <= 0)}
              className="flex-1 py-3 px-4 bg-[#14f195] hover:bg-[#1ef19c] active:scale-[0.98] text-black font-sans font-black text-xs tracking-widest uppercase rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(20,241,149,0.3)] hover:shadow-[0_0_25px_rgba(20,241,149,0.5)] disabled:bg-white/5 disabled:text-white/20 disabled:border-white/5 disabled:shadow-none"
            >
              {isSpinning ? (
                <>
                  <RefreshCcw className="w-4 h-4 animate-spin text-black" />
                  MEMUTAR {spinCountChoice > 1 && `${spinCountChoice} SPIN...`}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-black text-black" />
                  {spinCountChoice === 1 ? "TARIK TUAS SLOT!" : `PUTAR COMBO ${spinCountChoice}X!`}
                </>
              )}
            </button>
          )}

          {!isSpinning && !hasSpun && (
            <button
              onClick={() => {
                audioManager.playClick();
                onClose();
              }}
              className="py-3 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-sans font-bold text-xs rounded-xl transition-colors"
            >
              Kembali
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
