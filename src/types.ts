export interface GameStats {
  keuangan: number; // Current liquid wallet
  tabungan: number; // Marriage / future savings
  asetRumah: boolean;
  asetMobil: boolean;
  asetMotor: boolean;
  hubunganPasangan: number; // 0-100 (relational friction)
  hubunganKeluarga: number; // 0-100
  hubunganTeman: number; // 0-100
  mentalStatus: number; // 0-100 (stress/depression index)
  hutangPinjol: number; // pinjol balance
  hutangTeman: number; // friends borrowing
  refusalCount: number; // Consecutive refusals
  spinCount: number; // Slot plays counter
  initialWinLimit?: number; // Store randomized initial win count limit (0-3)
  lastPullLoss?: number; // Real-time tracker of the previous slot pull loss for Gacor Boost
}

export type CharacterType = "pejuang_mahar" | "tulang_punggung" | "custom";

export interface CharacterProfile {
  name: string;
  type: CharacterType;
  avatar: string; // Emoji representing avatar
  statusMessage: string; // Dynamic mood text based on choices
}

export interface ChoiceLog {
  id: string;
  timestamp: string;
  narasi: string;
  pilihanTeks: string;
  action: "play" | "refuse" | "hesitate";
  statsBefore: GameStats;
  statsAfter: GameStats;
  isSlotSpin: boolean;
  slotOutcome?: {
    multiplier: number;
    amountChanged: number;
    symbols: string[];
    won: boolean;
  };
}

export interface GameSession {
  id: string; // typically "current" for ongoing, or unique timestamp
  timestamp: string;
  profile: CharacterProfile;
  stats: GameStats;
  status: "playing" | "won" | "lost";
  history: ChoiceLog[];
  finalSummary?: string;
  turnCount: number;
  initialStats?: GameStats;
}

export interface HistoricalSession {
  id: string;
  timestamp: string;
  profileName: string;
  profileType: CharacterType;
  status: "won" | "lost";
  statsSummary: {
    keuanganAkhir: number;
    tabunganAkhir: number;
    totalHutang: number;
    totalSpins: number;
  };
  narrativeConclusion: string;
  netFinancialLoss?: number;
}
