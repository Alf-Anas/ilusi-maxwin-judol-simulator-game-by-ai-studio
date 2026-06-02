import { useState, useEffect } from "react";
import { 
  GameSession, 
  GameStats, 
  CharacterProfile, 
  HistoricalSession, 
  ChoiceLog, 
  CharacterType 
} from "./types";
import { 
  saveSession, 
  getSession, 
  deleteSession, 
  saveHistoricalSession, 
  getHistoricalSessions, 
  clearAllDB 
} from "./utils/db";
import { Typewriter } from "./components/Typewriter";
import { SlotMachine } from "./components/SlotMachine";
import { FloatingProfile } from "./components/FloatingProfile";
import { HistoricalLogs } from "./components/HistoricalLogs";
import { CharacterSelection } from "./components/CharacterSelection";
import { 
  TrendingDown, 
  Skull, 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Sparkles, 
  Info, 
  AlertTriangle,
  History,
  PartyPopper,
  RefreshCw,
  X,
  Wallet,
  Heart,
  Activity
} from "lucide-react";

const FALLBACK_NARRATIVE = {
  narasi: "Sore itu, hp lu berdenting gila. Chat dari nomor misterius masuk di WhatsApp: 'BRO! Zeus lagi bagi-bagi bonus petir merah nih, akun lu udah gw setting gacor parah, depo 20rb jamin maxwin sore ini! Jangan loyo lah pejuang rupiah.' Tanggapan lu gimana?",
  pilihan: [
    { teks: "Boleh deh coba gocok dulu gocap gampang dapet scatter Zeus...", action: "play" },
    { teks: "Ah bualan marketing bandar doang ini mah. Mending tabung buat masa depan.", action: "refuse" },
    { teks: "Duh tergoda sih sebenernya, tanya info di grup FB dulu kali ya...", action: "hesitate" }
  ]
};

export default function App() {
  // Navigation Screens
  const [screen, setScreen] = useState<"menu" | "init_char" | "sim" | "logs">("menu");
  
  // Game session states
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);
  const [completedRuns, setCompletedRuns] = useState<HistoricalSession[]>([]);
  
  // Checking if there is a restorable session
  const [restorableSession, setRestorableSession] = useState<GameSession | null>(null);

  // Gameplay specific interactive states
  const [currentNarasi, setCurrentNarasi] = useState<string>("");
  const [pilihanOptions, setPilihanOptions] = useState<Array<{ teks: string; action: "play" | "refuse" | "hesitate" }>>([]);
  const [choicesVisible, setChoicesVisible] = useState(false);
  const [galaSpinThreshold, setGalaSpinThreshold] = useState<number>(5);
  
  // Loading indicators for Gemini calls
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Slot machine interface toggle
  const [showSlotOverlay, setShowSlotOverlay] = useState(false);
  const [lastSelectedChoiceTeks, setLastSelectedChoiceTeks] = useState<string>("");

  // Sound/Mute Toggle (Just for immersive visual feeling)
  const [isAtmosphereMuted, setIsAtmosphereMuted] = useState(false);

  // Life evaluation analysis popup states
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    ringkasan: string;
    finansialStatus: string;
    sosialStatus: string;
    mentalStatus: string;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Method to query the Server-Side analyze API
  const handleFetchLifeAnalysis = async () => {
    if (!activeSession) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterType: activeSession.profile.type,
          characterName: activeSession.profile.name,
          currentStats: activeSession.stats
        })
      });
      if (!response.ok) {
        throw new Error("Gagal terhubung ke pusat analisis batin");
      }
      const data = await response.json();
      setAnalysisResult(data);
    } catch (err: any) {
      console.error("Analysis fetch error:", err);
      setAnalysisError(err.message || "Gagal memproses batin");
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Monitor analysis modal opening to auto-trigger analysis query
  useEffect(() => {
    if (isAnalysisOpen && activeSession) {
      handleFetchLifeAnalysis();
    }
  }, [isAnalysisOpen]);

  // Load initial IndexedDB data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const active = await getSession("active");
        if (active) {
          setRestorableSession(active);
        }
        const historicalList = await getHistoricalSessions();
        setCompletedRuns(historicalList);
      } catch (err) {
        console.error("IndexedDB load error:", err);
      }
    }
    loadData();
  }, [screen]);

  // Handle continuing restorable session
  const handleResumeSession = async () => {
    if (restorableSession) {
      setActiveSession(restorableSession);
      
      // Determine what to display based on their narrative trail
      if (restorableSession.history.length > 0) {
        const lastLog = restorableSession.history[restorableSession.history.length - 1];
        setCurrentNarasi(lastLog.narasi);
        // Wait, to continue, we can just trigger next turn or fetch based on their current stats
        // To be safe, trigger a fetch to synchronize or restore previous choices
        await handleTriggerNextNarration(restorableSession, "hesitate", "Melanjutkan takdir yang tertunda...");
      } else {
        // Just started previous session
        await handleTriggerNextNarration(restorableSession, "start", "Membuka lembaran takdir...");
      }
      setScreen("sim");
      setRestorableSession(null);
    }
  };

  // Triggering new Gemini narrative fetch
  const handleTriggerNextNarration = async (
    session: GameSession, 
    lastAction: "play" | "refuse" | "hesitate" | "start",
    choiceTeks: string,
    slotDetails?: any
  ) => {
    setIsLoadingApi(true);
    setApiError(null);
    setChoicesVisible(false);
    setCurrentNarasi(""); // Reset narration first to force typewriter remount

    // Double-check bankruptcy before making backend API call
    if (session.stats.keuangan <= 0 && session.stats.tabungan <= 0 && lastAction !== "start") {
      setIsLoadingApi(false);
      handleTriggerGameDefeat();
      return;
    }

    try {
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterType: session.profile.type,
          characterName: session.profile.name,
          currentStats: session.stats,
          lastAction,
          slotResult: slotDetails,
          refusalCount: session.stats.refusalCount,
          turnCount: session.turnCount,
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal mengambil respon dari Server Gemini");
      }

      const data = await response.json();
      setCurrentNarasi(data.narasi);
      setPilihanOptions(data.pilihan || FALLBACK_NARRATIVE.pilihan);

      // Save log step in session history if not starting
      if (lastAction !== "start") {
        const logItem: ChoiceLog = {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: new Date().toISOString(),
          narasi: data.narasi || "Mulai babak",
          pilihanTeks: choiceTeks,
          action: lastAction,
          statsBefore: { ...session.history[session.history.length - 1]?.statsAfter || session.stats }, // prior state representation
          statsAfter: { ...session.stats },
          isSlotSpin: lastAction === "play",
          slotOutcome: slotDetails ? {
            multiplier: slotDetails.won ? 1.5 : 0,
            amountChanged: slotDetails.amountChanged,
            symbols: slotDetails.symbols || ["🎰", "🎰", "🎰"],
            won: slotDetails.won
          } : undefined
        };
        session.history.push(logItem);
      }

      // Increment turns
      session.turnCount += 1;

      // Update session state and indexedDB
      setActiveSession({ ...session });
      await saveSession(session);

    } catch (err: any) {
      console.error("Gemini sync error:", err);
      setApiError(err.message || "Ulang koneksi");
      
      // Fallback
      setCurrentNarasi(FALLBACK_NARRATIVE.narasi);
      setPilihanOptions(FALLBACK_NARRATIVE.pilihan as any);
    } finally {
      setIsLoadingApi(false);
    }
  };

  // Launch fresh game
  const handleStartNewGame = () => {
    setRestorableSession(null);
    setScreen("init_char");
  };

  const handleCharacterSelected = async (
    type: CharacterType,
    name: string,
    avatar: string,
    initialStats: GameStats
  ) => {
    // Randomize catastrophe slot spin (4 to 6 spins before total doom)
    const randomizedThreshold = Math.floor(Math.random() * 3) + 4; // 4, 5, or 6
    setGalaSpinThreshold(randomizedThreshold);

    const initialSession: GameSession = {
      id: "active",
      timestamp: new Date().toISOString(),
      profile: {
        name,
        type,
        avatar,
        statusMessage: "Penuh asa untuk masa depan gemilang tanpa noda."
      },
      stats: initialStats,
      status: "playing",
      history: [],
      turnCount: 1,
    };

    setActiveSession(initialSession);
    await saveSession(initialSession);
    
    // Trigger initial narrative
    await handleTriggerNextNarration(initialSession, "start", "Karakter Diinisialisasi");
    setScreen("sim");
  };

  // Core choice handler
  const handleChoiceSelected = async (option: { teks: string; action: "play" | "refuse" | "hesitate" }) => {
    if (!activeSession) return;

    setLastSelectedChoiceTeks(option.teks);

    if (option.action === "play") {
      // Trigger slot machine overlay instead of immediate text resolution
      setShowSlotOverlay(true);
    } else {
      // Execute relational/stress state calculus
      const nextStats = { ...activeSession.stats };

      if (option.action === "refuse") {
        nextStats.refusalCount += 1;
        // Stress starts climbing slightly due to frustration/pressure, but drops as they maintain focus
        if (nextStats.refusalCount < 4) {
          nextStats.mentalStatus = Math.min(100, nextStats.mentalStatus + 5);
        } else {
          nextStats.mentalStatus = Math.max(0, nextStats.mentalStatus - 8);
        }
        // Family metrics grow
        nextStats.hubunganPasangan = Math.min(100, nextStats.hubunganPasangan + 5);
        nextStats.hubunganKeluarga = Math.min(100, nextStats.hubunganKeluarga + 4);
      } else if (option.action === "hesitate") {
        // Reset refusal streak
        nextStats.refusalCount = 0;
        nextStats.mentalStatus = Math.min(100, nextStats.mentalStatus + 10); // higher indecision stress
        nextStats.hubunganPasangan = Math.max(0, nextStats.hubunganPasangan - 3);
      }

      activeSession.stats = nextStats;

      // Check DEFEAT condition (Total liquid cash and wedding savings are 0)
      if (nextStats.keuangan <= 0 && nextStats.tabungan <= 0) {
        handleTriggerGameDefeat();
        return;
      }

      // Check WIN condition (Conquer RefusalCount = 7)
      if (nextStats.refusalCount >= 7) {
        handleTriggerGameVictory();
        return;
      }

      await handleTriggerNextNarration(activeSession, option.action, option.teks);
    }
  };

  // Handle slot completion
  const handleSlotSpinCompleted = async (
    won: boolean,
    amountChanged: number,
    balanceAfter: number,
    symbols: string[],
    isGalaSemua: boolean
  ) => {
    if (!activeSession) return;

    setShowSlotOverlay(false);
    const nextStats = { ...activeSession.stats };

    nextStats.spinCount += 1;
    nextStats.refusalCount = 0; // reset resistance on slot pull
    nextStats.keuangan = balanceAfter;

    if (isGalaSemua) {
      // TOTAL DISASTER WIDGETS COLLAPSE
      nextStats.keuangan = 0;
      nextStats.tabungan = 0;
      nextStats.asetRumah = false;
      nextStats.asetMobil = false;
      nextStats.asetMotor = false;
      nextStats.hubunganPasangan = 0;
      nextStats.hubunganKeluarga = 5;
      nextStats.hubunganTeman = 5;
      nextStats.mentalStatus = 100;
      nextStats.hutangPinjol += 35000000; // forced catastrophic pinjol automatically drawn
      nextStats.hutangTeman += 8000000;
      
      activeSession.stats = nextStats;
      handleTriggerGameDefeat();
      return;
    }

    // Normal Spin updates
    if (won) {
      // temporary mental stress reduction
      nextStats.mentalStatus = Math.max(5, nextStats.mentalStatus - 10);
      nextStats.hubunganPasangan = Math.max(0, nextStats.hubunganPasangan - 4); // family senses bad addiction
      activeSession.profile.statusMessage = "Eforia JP Paus! Rasa-rasanya ada petunjuk tersembunyi kelancaran finansial.";
    } else {
      nextStats.mentalStatus = Math.min(100, nextStats.mentalStatus + 15);
      nextStats.hubunganPasangan = Math.max(0, nextStats.hubunganPasangan - 10);
      nextStats.hubunganKeluarga = Math.max(0, nextStats.hubunganKeluarga - 8);
      activeSession.profile.statusMessage = "Kepala cenat-cenut mikirin dana habis. Butuh deposit recovery secepatnya.";

      // Pinjol automatic debt limits & emergency savings breakout if out of cash
      if (nextStats.keuangan <= 100000) {
        if (nextStats.hutangPinjol < 25000000) {
          const pinjolAmount = 5000000;
          nextStats.hutangPinjol += pinjolAmount;
          nextStats.keuangan += pinjolAmount;
          activeSession.profile.statusMessage = "SALDO TIPIS! Pinjol otomatis ditarik Rp 5.000.000 demi bertahan hidup.";
        } else if (nextStats.tabungan > 0) {
          // Forcefully break wedding/family savings
          const stealAmount = Math.min(nextStats.tabungan, 10000000);
          nextStats.tabungan -= stealAmount;
          nextStats.keuangan += stealAmount;
          nextStats.hubunganPasangan = Math.max(0, nextStats.hubunganPasangan - 35);
          nextStats.hubunganKeluarga = Math.max(0, nextStats.hubunganKeluarga - 25);
          nextStats.mentalStatus = Math.min(100, nextStats.mentalStatus + 30);
          activeSession.profile.statusMessage = `DI-BLACKLIST PINJOL! Terpaksa diam-diam mencairkan Rp ${stealAmount.toLocaleString("id-ID")} dari tabungan keluarga. Hubungan kalian hancur...`;
        } else {
          // Officially bankrupt
          nextStats.keuangan = 0;
          activeSession.stats = nextStats;
          handleTriggerGameDefeat();
          return;
        }
      }
    }

    activeSession.stats = nextStats;

    // Check DEFEAT condition (Total liquid cash is 0, wedding savings is 0, stress high)
    if (nextStats.keuangan <= 0 && nextStats.tabungan <= 0) {
      handleTriggerGameDefeat();
      return;
    }

    // Call Gemini with slot results context
    await handleTriggerNextNarration(activeSession, "play", lastSelectedChoiceTeks, {
      won,
      amountChanged,
      balanceAfter,
      symbols
    });
  };

  // Skenario Akhir: Victory (Selamat dari judi)
  const handleTriggerGameVictory = async () => {
    if (!activeSession) return;
    setIsLoadingApi(true);
    setCurrentNarasi(""); // Reset first to force typewriter remount
    setScreen("sim");

    try {
      // Clear current logged in DB and save as Historical
      const textSummary = `Selamat! ${activeSession.profile.name} berhasil membebaskan batin dari jeratan iblis digital judol. Berhasil menolak 7 tawaran berturut-turut!`;
      
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterType: activeSession.profile.type,
          characterName: activeSession.profile.name,
          currentStats: activeSession.stats,
          lastAction: "refuse",
          refusalCount: 7,
          turnCount: activeSession.turnCount
        })
      });
      const data = await response.json();

      const finalNarrative = data.narasi || textSummary;
      setCurrentNarasi(finalNarrative);
      setPilihanOptions([]);

      activeSession.status = "won";
      activeSession.finalSummary = finalNarrative;
      setActiveSession({ ...activeSession });

      // Save to completed logs database
      const archive: HistoricalSession = {
        id: `won-${Date.now()}`,
        timestamp: new Date().toISOString(),
        profileName: activeSession.profile.name,
        profileType: activeSession.profile.type,
        status: "won",
        statsSummary: {
          keuanganAkhir: activeSession.stats.keuangan,
          tabunganAkhir: activeSession.stats.tabungan,
          totalHutang: activeSession.stats.hutangPinjol + activeSession.stats.hutangTeman,
          totalSpins: activeSession.stats.spinCount
        },
        narrativeConclusion: finalNarrative.slice(0, 150) + "..."
      };

      await saveHistoricalSession(archive);
      await deleteSession("active");

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingApi(false);
    }
  };

  // Skenario Akhir: Kekalahan Hancur (Ludes)
  const handleTriggerGameDefeat = async () => {
    if (!activeSession) return;
    setIsLoadingApi(true);
    setCurrentNarasi(""); // Reset first to force typewriter remount
    setScreen("sim");

    try {
      // Complete devastation sequence
      const textSummary = `Tragis. ${activeSession.profile.name} terperosok ke lubang hitam judi online. Keuangan ludes total, tabungan habis, aset disita, pasangan angkat kaki karena kegilaaanmu.`;
      
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterType: activeSession.profile.type,
          characterName: activeSession.profile.name,
          currentStats: activeSession.stats,
          lastAction: "play",
          slotResult: { won: false, amountChanged: -99999999, balanceAfter: 0 },
          turnCount: activeSession.turnCount
        })
      });
      const data = await response.json();

      const finalNarrative = data.narasi || textSummary;
      setCurrentNarasi(finalNarrative);
      setPilihanOptions([]);

      activeSession.status = "lost";
      activeSession.finalSummary = finalNarrative;
      setActiveSession({ ...activeSession });

      // Save to completed logs database
      const archive: HistoricalSession = {
        id: `lost-${Date.now()}`,
        timestamp: new Date().toISOString(),
        profileName: activeSession.profile.name,
        profileType: activeSession.profile.type,
        status: "lost",
        statsSummary: {
          keuanganAkhir: activeSession.stats.keuangan,
          tabunganAkhir: activeSession.stats.tabungan,
          totalHutang: activeSession.stats.hutangPinjol + activeSession.stats.hutangTeman,
          totalSpins: activeSession.stats.spinCount
        },
        narrativeConclusion: finalNarrative.slice(0, 150) + "..."
      };

      await saveHistoricalSession(archive);
      await deleteSession("active");

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingApi(false);
    }
  };

  // Exit back to Main Menu
  const handleExitToMenu = () => {
    setActiveSession(null);
    setScreen("menu");
  };

  // Clearing DB history
  const handleClearAllHistory = async () => {
    await clearAllDB();
    setCompletedRuns([]);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] flex flex-col justify-between selection:bg-[#14f195]/30 font-sans">
      
      {/* Immersive Dark Atmosphere Header */}
      <header className="border-b border-white/5 bg-[#0a0a0a]/85 backdrop-blur pb-4 pt-4 px-4 sm:px-6 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Skull className="w-5 h-5 text-red-500 animate-pulse" />
            <h1 className="font-sans font-black tracking-wider text-sm sm:text-base text-white/90">
              ILUSI MAXWIN <span className="text-[#14f195] text-xs font-mono">SIMULATOR</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio atmospheric controller */}
            <button
              onClick={() => setIsAtmosphereMuted(!isAtmosphereMuted)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white cursor-pointer transition-all"
              title={isAtmosphereMuted ? "Unmute Ambiance" : "Mute Ambiance"}
            >
              {isAtmosphereMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-[#14f195]" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        
        {/* SCREEN 1: MAIN MENU */}
        {screen === "menu" && (
          <div className="space-y-6 text-center py-6 sm:py-10 max-w-xl mx-auto">
            {/* Logo area */}
            <div className="relative inline-block pb-3">
              <div className="text-4xl sm:text-5xl lg:text-6xl font-sans font-black tracking-tight text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                ILUSI MAXWIN
              </div>
              <div className="text-[10px] sm:text-xs font-mono tracking-[0.25em] text-[#ef4444] uppercase font-black mt-2">
                🎰 JALUR REALISTIS KEHANCURAN JUDOL 🎰
              </div>
            </div>

            {/* Resume Option Card if exists */}
            {restorableSession && (
              <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-2xl text-left space-y-3 shadow-lg max-w-md mx-auto">
                <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                  <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                  <span>SISTEM MENDETEKSI TRAGEDI SEBELUMNYA</span>
                </div>
                <p className="text-[11.5px] text-white/80 leading-normal font-sans">
                  Identitas: <strong>{restorableSession.profile.name} ({restorableSession.profile.type === "pejuang_mahar" ? "Pejuang Mahar" : "Tulang Punggung"})</strong>.<br/>
                  Langkah yang tersimpan di memori terdeteksi. Ingin merenungkan kembali jalurnya?
                </p>
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    onClick={handleResumeSession}
                    className="py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white font-sans font-black uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    Lanjutkan Sesi
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Mulai lembaran baru akan membuang progres aktifmu. Yakin?")) {
                        handleStartNewGame();
                      }
                    }}
                    className="py-2.5 px-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white font-sans font-black uppercase text-[10px] tracking-wider rounded-xl cursor-pointer transition-colors"
                  >
                    Buang Sesi
                  </button>
                </div>
              </div>
            )}

            {/* Menu options buttons */}
            <div className="flex flex-col gap-3 max-w-sm mx-auto pt-4">
              <button
                onClick={handleStartNewGame}
                className="w-full py-4 bg-[#14f195] hover:bg-[#1ef19c] active:scale-[0.98] text-black font-sans font-black text-xs tracking-widest uppercase rounded-xl transition-all hover:shadow-[0_0_20px_rgba(20,241,149,0.35)] flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <Skull className="w-4 h-4 text-black" />
                Mulai Lembaran Baru
              </button>

              <button
                onClick={() => setScreen("logs")}
                className="w-full py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#14f195]/20 text-white font-sans font-bold text-xs tracking-widest uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <History className="w-4 h-4 text-[#14f195]" />
                Riwayat Kehancuran Sebelumnya
              </button>
            </div>

            {/* Educational Intro */}
            <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-left font-sans text-xs max-w-md mx-auto space-y-3 leading-normal">
              <div className="flex items-center gap-2 text-white/90 font-bold">
                <Info className="w-4 h-4 text-[#14f195]" />
                <span>Kenapa simulator ini dibuat?</span>
              </div>
              <p className="text-white/70">
                Aplikasi ini dirancang sebagai <strong>media edukasi psikologis</strong>. Online slot didesain secara matematis dengan skema manipulatif (memberikan ilusi kemenangan di awal, lalu mengunci akun ke fase kalah mutlak/rungkad) untuk menyandera dopamin otak manusia. 
              </p>
              <p className="text-white/40 font-mono text-[10px]">
                *Tidak mengandung transaksi riil. Menampilkan realitas tragis utang pinjol dan kehancuran batin untuk memberikan sadar penuh.
              </p>
            </div>
          </div>
        )}

        {/* SCREEN 2: INITIALIZE CHARACTER */}
        {screen === "init_char" && (
          <div className="space-y-6">
            <CharacterSelection onSelected={handleCharacterSelected} />
            <div className="text-center">
              <button
                onClick={() => setScreen("menu")}
                className="text-stone-500 hover:text-stone-300 transition-colors text-xs font-semibold cursor-pointer underline"
              >
                Kembali ke Menu Utama
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 3: ACTIVE SIMULATION BOARD */}
        {screen === "sim" && activeSession && (
          <div className="space-y-6 max-w-xl mx-auto w-full">
            
            {/* Top Status Header */}
            <div className="bg-stone-900/90 border border-stone-850 rounded-2xl p-3.5 flex justify-between items-center gap-4">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl p-1 bg-stone-950 rounded-lg">{activeSession.profile.avatar}</span>
                <div className="text-left">
                  <h4 className="font-display font-bold text-xs text-stone-200">
                    {activeSession.profile.name}
                  </h4>
                  <span className="text-[9px] text-amber-500 uppercase tracking-wider font-mono">
                    GILIRAN KE-{activeSession.turnCount} • SPIN: {activeSession.stats.spinCount} MALK
                  </span>
                </div>
              </div>

              {/* Liquid asset Quick tracker */}
              <div className="text-right">
                <span className="block text-[8px] text-stone-500 font-mono uppercase">Saldo Kas</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  Rp {activeSession.stats.keuangan.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* AI Life Diagnosis Trigger Button */}
            <button
              onClick={() => setIsAnalysisOpen(true)}
              className="w-full py-2.5 px-4 bg-[#0a0a0d] hover:bg-stone-900/40 border border-amber-500/10 hover:border-amber-500/40 text-amber-500/90 hover:text-amber-400 font-mono font-bold text-[10px] tracking-wider uppercase rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.02)] animate-pulse"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Diagnosis Nasib &amp; Evaluasi Tobat (AI)</span>
            </button>

            {/* THE CORE GAME BOARD */}
            <div className="bg-zinc-950 border border-stone-900/60 rounded-3xl p-5 md:p-6 shadow-2xl relative min-h-[380px] flex flex-col justify-between">
              
              {/* Overlay Slot block if spinning */}
              {showSlotOverlay ? (
                <div className="py-4">
                  <SlotMachine
                    currentStats={activeSession.stats}
                    galaSpinThreshold={galaSpinThreshold}
                    onSpinComplete={handleSlotSpinCompleted}
                    onClose={() => setShowSlotOverlay(false)}
                  />
                </div>
              ) : (
                <>
                  {/* Narasi Area */}
                  <div className="space-y-4">
                    {/* Status Alert Banner depending on Victory/Defeat */}
                    {activeSession.status === "won" && (
                      <div className="bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl text-center font-display font-black text-sm flex flex-col items-center gap-2 animate-bounce">
                        <PartyPopper className="w-8 h-8 text-emerald-400" />
                        <div>SELAMAT! ANDA MENANG (BERHASIL TOBAT!)</div>
                        <p className="text-xs text-stone-300 font-normal mt-1 leading-relaxed">
                          Anda berhasil menolak lingkaran setan judol sebanyak 7 kali berturut-turut. Batinmu terbebas, hubungan keluargamu terselamatkan!
                        </p>
                      </div>
                    )}

                    {activeSession.status === "lost" && (
                      <div className="bg-red-950/30 border border-red-500/30 text-red-500 p-4 rounded-xl text-center font-display font-black text-sm flex flex-col items-center gap-2 animate-pulse">
                        <Skull className="w-8 h-8 text-red-500" />
                        <div>ANDA TEWAS FINANSIAL (HANCUR TOTAL!)</div>
                        <p className="text-xs text-stone-300 font-normal mt-1 leading-relaxed">
                          Keuangan hancur, barang tergadai, masa depan lenyap berselimut denda pinjol. 
                        </p>
                      </div>
                    )}

                    {/* Chat Bubble Simulation UI Decorator if active */}
                    {activeSession.status === "playing" && (
                      <div className="flex gap-1.5 items-center font-mono text-[9px] text-stone-500 uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        <span>MASUKAN NARASI TAKDIR...</span>
                      </div>
                    )}

                    {/* Actual Typewriter active narrative */}
                    {!isLoadingApi && currentNarasi && (
                      <Typewriter 
                        text={currentNarasi} 
                        onComplete={() => setChoicesVisible(true)}
                      />
                    )}

                    {/* Loading/API Indicator */}
                    {isLoadingApi && (
                      <div className="flex flex-col items-center justify-center py-8 gap-3">
                        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
                        <span className="text-[10px] text-stone-500 font-mono uppercase tracking-widest animate-pulse">
                          MENYUSUN SKENARIO DERITA... (GEMINI API)
                        </span>
                      </div>
                    )}

                    {apiError && (
                      <div className="bg-red-950/30 border border-red-900/60 rounded-xl p-3 text-center text-xs text-red-400">
                        ⚡ Koneksi terhambat: {apiError}. Memakai skenario cadangan.
                      </div>
                    )}
                  </div>

                  {/* Contextual Action Buttons */}
                  <div className="pt-6 border-t border-stone-900 mt-6 md:min-h-[140px] flex flex-col justify-end">
                    
                    {activeSession.status === "playing" ? (
                      choicesVisible && !isLoadingApi && (
                        <div className="space-y-2.5">
                          <span className="block text-[9px] text-stone-500 font-mono uppercase tracking-wider text-left mb-1">
                            Pikirkan Baik-Baik Langkah Batinmu:
                          </span>
                          {pilihanOptions.map((opt, i) => (
                            <button
                              key={i}
                              onClick={() => handleChoiceSelected(opt)}
                              data-action={opt.action}
                              className={`w-full py-3 px-4 rounded-xl text-left text-xs font-sans font-medium hover:scale-[1.01] transition-all border leading-normal flex justify-between items-center group cursor-pointer ${
                                opt.action === "play"
                                  ? "bg-red-950/20 text-red-100 hover:text-white border-red-900/40 hover:bg-red-900/30 hover:border-red-600/70"
                                  : opt.action === "refuse"
                                    ? "bg-emerald-950/20 text-emerald-100 hover:text-white border-emerald-900/30 hover:bg-emerald-900/30 hover:border-emerald-600/70"
                                    : "bg-amber-950/20 text-amber-100 hover:text-white border-amber-900/30 hover:bg-amber-900/30 hover:border-amber-600/70"
                              }`}
                            >
                              <span>{opt.teks}</span>
                              <span className={`text-[9px] font-mono uppercase py-0.5 px-1.5 rounded transition-all group-hover:scale-105 ${
                                opt.action === "play"
                                  ? "bg-red-950 border border-red-900 text-red-400"
                                  : opt.action === "refuse"
                                    ? "bg-emerald-950 border border-emerald-900 text-emerald-400 font-bold"
                                    : "bg-amber-950 border border-amber-900 text-amber-400"
                              }`}>
                                {opt.action === "play" ? "Play Slot" : opt.action === "refuse" ? "Tolak" : "Ragu"}
                              </span>
                            </button>
                          ))}
                        </div>
                      )
                    ) : (
                      // GameOver/Victory buttons
                      <div className="space-y-3">
                        <div className="bg-stone-900 p-3 rounded-xl border border-stone-850 text-stone-400 text-center text-xs">
                          Alur pencapaian batinmu telah diarsip ke dalam IndexedDB. Klik tombol di bawah untuk bercermin di menu utama.
                        </div>
                        <button
                          onClick={handleExitToMenu}
                          className="w-full py-3 bg-stone-900 border border-stone-800 hover:bg-stone-850 text-stone-200 font-display font-medium text-xs tracking-wider uppercase rounded-xl transition-all cursor-pointer"
                        >
                          Tutup Game & Kembali Ke Menu Utama
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Hidden Floating Profile Dashboard */}
            <FloatingProfile 
              profile={activeSession.profile} 
              stats={activeSession.stats} 
            />
          </div>
        )}

        {/* SCREEN 4: HISTORICAL AUDITS / LOGS VIEW */}
        {screen === "logs" && (
          <div className="space-y-4">
            <HistoricalLogs
              currentLogs={activeSession ? activeSession.history : []}
              completedList={completedRuns}
              onBack={handleExitToMenu}
              onClearAll={handleClearAllHistory}
            />
          </div>
        )}

      </main>

      {/* Decorative Atmosphere Music Mock controller (just visually plays if toggled) */}
      {!isAtmosphereMuted && screen === "sim" && (
        <div className="fixed bottom-2 left-2 z-50 bg-stone-900/50 backdrop-blur rounded p-1.5 text-[8px] font-mono text-stone-500 animate-pulse hidden sm:block">
          🎶 AMBIENCE: DARK_PSYCHE_SEDUCED_REEL.wavisPlaying_active...
        </div>
      )}

      {/* LIFE ANALYSIS POPUP MODAL */}
      {isAnalysisOpen && activeSession && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#09090b] border border-amber-500/30 w-full max-w-lg rounded-2xl p-6 md:p-8 shadow-[0_0_50px_rgba(245,158,11,0.15)] relative max-h-[90vh] overflow-y-auto">
            
            {/* Close Button */}
            <button
               onClick={() => setIsAnalysisOpen(false)}
               className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title / Header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-900">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
              </div>
              <div>
                <h3 className="font-sans font-black text-lg text-white tracking-tight uppercase">
                  DIAGNOSIS TAKDIR &amp; EVALUASI HIDUP
                </h3>
                <p className="text-[10px] text-amber-500 font-mono tracking-wider">
                  STATISTIK ANALISIS OLEH PSYCHOLOGY API SYSTEM
                </p>
              </div>
            </div>

            {/* Loading State */}
            {analysisLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-4">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
                <p className="text-xs text-stone-400 font-mono text-center uppercase tracking-wider animate-pulse">
                  MENGHUBUNGKAN SALURAN BATIN &amp; STRUKTUR UTANG PINJOL...
                </p>
              </div>
            ) : analysisError ? (
              <div className="py-6 text-center space-y-4">
                <p className="text-xs text-red-500">{analysisError}</p>
                <button
                  onClick={handleFetchLifeAnalysis}
                  className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-stone-200 hover:text-white rounded-xl text-xs font-mono"
                >
                  ULANGI ANALISIS
                </button>
              </div>
            ) : analysisResult ? (
              <div className="space-y-6">
                
                {/* 1. Psychological Tamparan/Summary */}
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl leading-relaxed">
                  <div className="text-[9px] text-amber-500 font-mono uppercase tracking-widest mb-1 font-bold">
                    KESIMPULAN NASIB SAAT INI:
                  </div>
                  <p className="text-xs text-amber-100 font-sans font-medium italic">
                    &ldquo;{analysisResult.ringkasan}&rdquo;
                  </p>
                </div>

                {/* 2. Structured Metrics Evaluations */}
                <div className="space-y-4">
                  {/* Keuangan */}
                  <div className="p-3.5 bg-stone-950/85 border border-stone-900 rounded-xl">
                    <span className="text-[9px] text-[#14f195] font-mono uppercase tracking-wider font-bold mb-1.5 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 hover:scale-105 transition-all" /> Evaluasi Finansial
                    </span>
                    <p className="text-xs text-stone-300 leading-normal">
                      {analysisResult.finansialStatus}
                    </p>
                  </div>

                  {/* Sosial */}
                  <div className="p-3.5 bg-stone-950/85 border border-stone-900 rounded-xl">
                    <span className="text-[9px] text-pink-400 font-mono uppercase tracking-wider font-bold mb-1.5 flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 hover:scale-105 transition-all" /> Hubungan &amp; Kehidupan Sosial
                    </span>
                    <p className="text-xs text-stone-300 leading-normal font-sans">
                      {analysisResult.sosialStatus}
                    </p>
                  </div>

                  {/* Mental */}
                  <div className="p-3.5 bg-stone-950/85 border border-stone-900 rounded-xl">
                    <span className="text-[9px] text-red-400 font-mono uppercase tracking-wider font-bold mb-1.5 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 hover:scale-105 transition-all" /> Kondisi Batin &amp; Stres
                    </span>
                    <p className="text-xs text-stone-300 leading-normal">
                      {analysisResult.mentalStatus}
                    </p>
                  </div>
                </div>

                {/* Footer advice */}
                <div className="pt-4 border-t border-stone-900 flex justify-between gap-3">
                  <button
                    onClick={handleFetchLifeAnalysis}
                    className="flex-1 py-3 bg-stone-900 hover:bg-stone-850 border border-stone-800 text-stone-300 font-mono text-[10px] uppercase rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Rekalkulasi AI
                  </button>
                  <button
                    onClick={() => setIsAnalysisOpen(false)}
                    className="flex-1 py-3 bg-[#14f195] hover:bg-[#1ef19c] text-black font-sans font-black text-[10px] tracking-wider uppercase rounded-xl transition-all shadow-[0_0_15px_rgba(20,241,149,0.2)] cursor-pointer"
                  >
                    Kembali Bermain
                  </button>
                </div>

              </div>
            ) : null}

          </div>
        </div>
      )}

      {/* Real-time warning alert floating footer */}
      <footer className="py-4 border-t border-stone-900 text-center text-stone-600 text-[10px] sm:text-xs">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© 2026 Ilusi Maxwin: Judol Simulator Game. Dibuat dengan cinta untuk kesadaran sosial.</p>
          <div className="flex gap-3 text-stone-500">
            <span className="hover:text-red-400">#JanganDepo</span>
            <span className="hover:text-red-400">#RungkadNoMore</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
