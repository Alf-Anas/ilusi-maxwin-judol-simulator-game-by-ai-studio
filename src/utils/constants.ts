// Constants for random Indonesian names (30 Male, 30 Female)

export const PEJUANG_NAMES = [
  "Aji Saputra",
  "Bambang Wijaya",
  "Aldi Pratama",
  "Rian Hidayat",
  "Budi Santoso",
  "Denny Setiawan",
  "Fahri Ramadhan",
  "Guntur Wibowo",
  "Hendra Kusuma",
  "Indra Lesmana",
  "Joko Susilo",
  "Kevin Sanjaya",
  "Lukman Hakim",
  "Mifta Farid",
  "Nugroho Adhi",
  "Oki Nugraha",
  "Putu Gede",
  "Rizky Ramadhan",
  "Surya Kencana",
  "Taufik Hidayat",
  "Vicky Prasetyo",
  "Wahyu Hidayat",
  "Yuda Pratama",
  "Zaki Mubarak",
  "Bobby Nasution",
  "Dedi Sugandi",
  "Eko Prasetyo",
  "Farhan Halim",
  "Gilang Dirga",
  "Roni Gunawan"
];

export const PASANGAN_NAMES = [
  "Nisa Rahmawati",
  "Siti Aminah",
  "Amalia Putri",
  "Bella Cantika",
  "Citra Kirana",
  "Dian Sastrowardoyo",
  "Elsa Mayori",
  "Fitri Handayani",
  "Gita Gutawa",
  "Hesti Purwadinata",
  "Indah Permatasari",
  "Julia Perez",
  "Kartika Putri",
  "Lesti Kejora",
  "Mega Utami",
  "Nabila Syakieb",
  "Olivia Zalianty",
  "Prilly Latuconsina",
  "Queen Alexandra",
  "Rini Wulandari",
  "Siska Kohl",
  "Tari Nastiti",
  "Ussy Sulistiawaty",
  "Vanesha Prescilla",
  "Winda Citra",
  "Yuni Shara",
  "Zaskia Mecca",
  "Ayu Tingting",
  "Dewi Perssik",
  "Lulu Tobing"
];

// Helper to choose unique pairs of character name and spouse name
// By exporting this stable evaluation, each page load will have its own unique set of names.
export function getRandomNames() {
  const maleShuffled = [...PEJUANG_NAMES].sort(() => Math.random() - 0.5);
  const femaleShuffled = [...PASANGAN_NAMES].sort(() => Math.random() - 0.5);

  return {
    pejuangMahar: maleShuffled[0],
    pasanganMahar: femaleShuffled[0],
    tulangPunggung: maleShuffled[1] || maleShuffled[0], // fallback if arrays are small
    pasanganKeluarga: femaleShuffled[1] || femaleShuffled[0],
  };
}

// Generate the names dynamically on load for this app instance
export const APP_SESSION_NAMES = getRandomNames();
