import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Lazy initialization pattern for Gemini client to prevent crash on startup if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined. Please add it to your secrets or .env file.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Helper to perform content generation using 'gemini-3.1-flash-lite' first,
// and if it returns a 429 rate limit error, fallback to 'gemma-4-26b'.
async function generateWithFallback(
  client: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
  }
) {
  try {
    console.log("Attempting generation with core model: gemini-3.1-flash-lite");
    const response = await client.models.generateContent({
      ...params,
      model: "gemini-3.1-flash-lite",
    });
    return response;
  } catch (error: any) {
    // Check if error represents a 429 rate-limiting status
    const is429 =
      error.status === 429 ||
      error.statusCode === 429 ||
      (error.message &&
        (error.message.includes("429") ||
          error.message.toLowerCase().includes("resource_exhausted") ||
          error.message.toLowerCase().includes("quota")));

    if (is429) {
      console.warn("Got 429 error on gemini-3.1-flash-lite. Retrying with fallback model: gemma-4-26b");
      const response = await client.models.generateContent({
        ...params,
        model: "gemma-4-26b",
      });
      return response;
    }

    // Rethrow any other error so the route handlers can catch it or use static fallbacks
    throw error;
  }
}

const app = express();
const PORT = 3000;

app.use(express.json());

// API: Health probe
app.get("/api/health", (req, res) => {
  res.json({ status: "green", timestamp: new Date().toISOString() });
});

// API: Narrative Engine using Server-Side Gemini API
app.post("/api/gemini/generate", async (req, res) => {
  try {
    const {
      characterType,
      characterName,
      spouseName,
      currentStats,
      lastAction,
      slotResult,
      refusalCount,
      turnCount = 1,
    } = req.body;

    const client = getGeminiClient();

    // Map character type in Indonesian for Gemini insight
    let characterDesc = "";
    if (characterType === "pejuang_mahar") {
      characterDesc = `Anak Muda Pejuang Mahar (sedang menabung nikah bersama pasangan/kekasihnya bernama '${spouseName || "Nisa"}', hubungannya dengan kekasih & calon mertua sangat rawan, gampang goyah karena iming-iming modal nikah instan dalam semalam, butuh duit cepat biar gak dianggap miskin).`;
    } else if (characterType === "tulang_punggung") {
      characterDesc = `Kepala Keluarga Tulang Punggung (punya cicilan rumah/kontrakan, biaya sekolah anak, tabungan masa depan keluarga, istri penyabar bernama '${spouseName || "Siti"}' dan anak yang butuh makan, gampang tergoda melunasi cicilan dan utang bulanan secara instan dalam semalam).`;
    } else {
      characterDesc = `Karakter Kustom bernama '${characterName}' yang berpasangan dengan '${spouseName || "Pasangan"}', dengan status keuangan awal: ${JSON.stringify(currentStats)}.`;
    }

    // Detail current variables for context and simulation tracking
    const statsContext = `
STATUS SAAT INI (PENTING):
- Nama Karakter: ${characterName}
- Nama Pasangan (Tunangan/Istri): ${spouseName || "Pasangan"} (PENTING: Gunakan nama ini ketika bercerita tentang pasangannya, chat batin, tuntutan pernikahan, chat WA darurat, dsb!)
- Tipe Karakter: ${characterDesc}
- Uang Sekarang: Rp ${currentStats.keuangan.toLocaleString("id-ID")}
- Tabungan Masa Depan/Mahar: Rp ${currentStats.tabungan.toLocaleString("id-ID")}
- Utang Pinjol: Rp ${currentStats.hutangPinjol.toLocaleString("id-ID")}
- Utang Teman: Rp ${currentStats.hutangTeman.toLocaleString("id-ID")}
- Kesehatan Mental / Stress Level: ${currentStats.mentalStatus}/100
- Hubungan Sosial: Pasangan (${currentStats.hubunganPasangan}/100), Keluarga (${currentStats.hubunganKeluarga}/100), Teman (${currentStats.hubunganTeman}/100)
- Aset: Rumah (${currentStats.asetRumah ? "Ada/Milik Sendiri" : "TIDAK ADA"}), Mobil (${currentStats.asetMobil ? "Ada/Milik Sendiri" : "TIDAK ADA"}), Motor (${currentStats.asetMotor ? "Ada/Milik Sendiri" : "TIDAK ADA"})
- Refusal count berturut-turut: ${refusalCount}/7
- Jumlah Giliran: ${turnCount}
`;

    // Inform Gemini about last action to steer narrative
    let contextActionPrompt = "";
    if (lastAction === "start") {
      contextActionPrompt = `Karakter baru saja memulai gamenya. Berikan pengenalan dramatis pertama. Tampilkan notifikasi chat WhatsApp dari seorang teman dekat yang bangga memamerkan hasil menang judolnya, atau DM Instagram dari influencer yang pura-pura berbagi tips menang slot instan. Sesuaikan godaan tersebut dengan tipe karakter (jika Pejuang Mahar, goda dengan modal nikah gratis instan dalam semalam agar bisa nikah mewah; jika Tulang Punggung, goda dengan pelunasan cicilan, sewa rumah, atau biaya sekolah anak gratis dalam semalam).`;
    } else if (lastAction === "play") {
      const slotInfo = slotResult
        ? `Dia memilih MAIN SLOT GACOR. Hasil putaran slot: ${slotResult.won ? "MENANG (ILUSI/DOPAMIN PALSU)" : "KALAH (RUNGKAD)"}. Saldo berkurang/bertambah: Rp ${slotResult.amountChanged.toLocaleString("id-ID")}. Saldo slot sekarang: Rp ${slotResult.balanceAfter.toLocaleString("id-ID")}`
        : "Dia memilih MAIN SLOT GACOR.";
      contextActionPrompt = `${slotInfo}. Berikan respons manipulatif bandar atau kepalsuan kemenangan / kekesalan rungkad. Jika dia menang, bandar memberikan ilusi dopamin luar biasa agar dia mau depo lebih gede. Jika dia rungkad, bandar memanasi otaknya agar 'bales dendam'. Tampilkan juga sisipan notifikasi chat panik, DM medsos, atau bisikan batin.`;
    } else if (lastAction === "refuse") {
      contextActionPrompt = `Dia memilih MENOLAK main judol (Refusal berturut-turut: ${refusalCount}/7). Berikan godaan yang lebih gila: misal obrolan grup WhatsApp teman tongkrongan yang flexing habis WD 20 juta malam ini, DM Instagram influencer pamer kunci mobil baru hasil slot, atau video random Facebook berkedok 'Amal Sedekah Admin Gacor' yang mendesak dia bermain sekarang juga. Hubungkan godaan ini dengan kondisi pribadinya (Nikahan atau cicilan keluarga)!`;
    } else if (lastAction === "hesitate") {
      contextActionPrompt = `Dia RAGU-RAGU / bimbang. Berikan rayuan licik dari chat temannya ('Coba depo goceng doang bro, masa takut sih cowok lembek'), bisikan setan batin sendiri, atau notifikasi deposit khusus 'JP PAUS DEPO 10K BONUS 30K LANGSUNG GAIRAH MELEDAK'.`;
    }

    const systemInstruction = `
Kamu adalah Sistem Game AI Manipulatif sekaligus Psikolog Perilaku yang dingin, realistis, dan Narrative Designer dari game "Ilusi Maxwin: Judol Simulator Game".
Tugasmu adalah merekayasa emosi, godaan, dan konsekuensi tragis dari kecanduan judi online demi memberikan kesadaran psikologis penuh kepada pemain.

Karakteristik Narasi:
1. Sangat realistis, emosional, mendalam, dan menggunakan slang bahasa tongkrongan Jakarta / Jaksel ("gacor", "depo", "wd", "rungkad", "maxwin", "JP paus", "pejuang rupiah", "pasti balik modal", "sensor zues", "admin slot", "scatter", "putaran", "petir").
2. Gunakan format visualisasi teks bercerita dalam MARKDOWN yang kaya. Gunakan:
   - Blockquotes (\`>\`) untuk salinan tiruan chat WhatsApp darurat, desakan batin, dan surat penting.
   - Bold (\`**\`) untuk kata kunci dramatis, denda denda pinjol, atau notifikasi hp.
   - Bullet points (\`-\`) atau Headers kecil untuk melabeli perubahan suasana agar UI tampak dinamis dan sangat imersif.
3. Selalu buat godaan ("Narasi Godaan") berupa chat WhatsApp dari teman, DM Instagram dari influencer, atau deskripsi video random Facebook yang membujuk user dengan sangat licik dan merayu.
4. Sesuaikan godaan tersebut dengan tipe karakter:
   - Jika karakter sedang menabung nikah (Pejuang Mahar), godaannya adalah "bisa dapet modal nikah instan dalam semalam", "tunangan kita layak dapet resepsi mewah di ballroom, bukan di gang becek!", atau mengolok status keuangannya di depan mertua.
   - Jika karakter adalah Kepala Keluarga (Tulang Punggung), godaannya adalah melunasi seluruh cicilan rumah, menebus motor yang digadaikan, atau bayaran sekolah anak gratis secara instan tanpa perlu banting tulang bulanan.
5. Alur cerita harus DESTRUKTIF secara perlahan tapi pasti jika mereka terus bermain slot.
6. JIKA KEUANGAN Rp 0 DAN TABUNGAN Rp 0 (PEMAIN JATUH MISKIN / BANKRUPT):
   Game diletakkan pada status GAME OVER (kekalahan mutlak). Berikan narasi yang luar biasa tragis, dingin, dan menyayat hati yang memberikan terapi syok nyata tentang bahaya judi online. Gambarkan salah satu skenario berikut dengan sangat mengerikan dan menguras emosi batin:
   - **Skenario Pasangan bunuh diri dan meninggalkan surat wasiat**: Pasanganmu tidak sanggup lagi hidup dalam kebohonganmu, dikejar denda pinjol yang kamu ambil atas namanya, atau kecewa berat karena celengan pernikahan/kuliah anak dicuri. Dia mengakhiri hidupnya secara ekstrem dan meninggalkan surat wasiat penuh air mata di atas meja rias, menyalahkan kegilaan judolmu.
   - **Skenario Keluarga dipukuli debt collector**: Rumahmu digerebek di malam hari oleh segerombolan debt collector beringas dari pinjol ilegal. Pintu didobrak, barang disita paksa, dan pasangan/ibumu dipukuli/disiksa secara brutal di depan matamu sendiri karena kamu tidak bisa membayar cicilan bunga yang menggunung.
   - **Skenario Penjara / Gelandangan**: Kamu diseret paksa polisi karena penipuan/menggelapkan dana kantor, atau dibuang di jalanan menjadi gelandangan gila dengan bayang-bayang depresi slot zeus yang tiada henti mendengung di kepalamu.
7. Tombol pilihan (pilihan) HARUS berupa frasa naratif dinamis yang mewakili gumaman batin karakter (misal: "Aduh, gila ini mah, coba depo gocap lagi kali ya siapa tau hoki" atau "Engga, mending gw matiin hp, gw mau denger ceramah biar tobat"). Jika pemain sudah ludes bangkrut (Uang Rp 0), pilihan batinnya harus memancarkan penyesalan kelam tanpa menyediakan aksi 'play' yang aktif.
8. PENTING - SEBUTKAN NAMA PASANGAN: Jika bercerita tentang pasangan, tunangan, atau istri karakter, selalu panggil dengan nama aslinya yaitu '${spouseName || "pasangan"}'. Masukkan dia ke dalam obrolan chat Whatsapp atau dialog narasi agar terasa sangat personal dan emosional bagi pemain.

Kembalikan respon SELALU dalam bentuk JSON murni dengan format schema berikut:
{
  "status": "berisi status singkat narasi saat ini (misal: menang tipis, rungkad parah, godaan wa, tobat bertahap, dll) - JANGAN gabungkan status ini ke dalam string narasi",
  "narasi": "Teks cerita, chat WhatsApp, atau akibat tragis yang ditulis dalam format Markdown (gunakan blockquotes untuk chat, bold untuk alarm, bullet-points)...",
  "pilihan": [
    { "teks": "Frasa batin pengakuan penyesalan atau tindakan 1...", "action": "play" },
    { "teks": "Frasa batin pengakuan penyesalan atau tindakan 2...", "action": "refuse" },
    { "teks": "Frasa batin pengakuan penyesalan atau tindakan 3...", "action": "hesitate" }
  ]
}
Sediakan tepat 3 pilihan di setiap respon (terdiri dari aksi play, refuse, dan hesitate).
Jangan sertakan markdown \`\`\`json atau teks lain di luar JSON murni itu.
`;

    const response = await generateWithFallback(client, {
      contents: `
Konteks Game saat ini:
${statsContext}

Kejadian Terakhir:
${contextActionPrompt}

Buatkan narasi kelanjutan cerita yang imersif dan 3 pilihan batin dinamis sesuai schema JSON tersebut. Jika Refusal berturut-turut bernilai 7, berikan narasi kemenangan/keselamatan dari lingkaran setan ini. 
Jika stat keuangan habis dan stress level tinggi, buat surat atau percakapan emosional yang menyayat batin.
`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: {
              type: Type.STRING,
              description: "Status singkat narasi saat ini, misal: 'menang tipis', 'gacor parah', 'rungkad', 'godaan wa teman', 'bimbang', dsb.",
            },
            narasi: {
              type: Type.STRING,
              description: "Narasi cerita, SMS godaan, notifikasi, chat whatsapp, atau tangisan pasangan.",
            },
            pilihan: {
              type: Type.ARRAY,
              description: "Daftar 3 tombol pilihan tindakan batiniah.",
              items: {
                type: Type.OBJECT,
                properties: {
                  teks: {
                    type: Type.STRING,
                    description: "Frasa naratif batin yang diucapkan karakter.",
                  },
                  action: {
                    type: Type.STRING,
                    description: "Wajib salah satu dari: 'play', 'refuse', 'hesitate'.",
                  },
                },
                required: ["teks", "action"],
              },
            },
          },
          required: ["status", "narasi", "pilihan"],
        },
      },
    });

    const outputText = response.text || "";
    const parsedData = JSON.parse(outputText.trim());
    return res.json(parsedData);
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    // Fallback response if Gemini fails or is unconfigured to keep app playable
    const fallbackText = req.body.lastAction === "start"
      ? "Sore itu, layar handphone-mu menyala. Sebuah notifikasi WhatsApp dari nomor tak dikenal masuk: 'BRO! Zeus lagi bagi-bagi sensor nih, gila lu wajib coba, modal gocap bisa jp paus malem ini. Akun lu udah gw setting gacor abis!' Tanggapanmu mending ditengok dulu?"
      : `Suasana semakin berat. Kepalamu pusing memikirkan beban keuangan saat ini. Setiap desisan angin rasanya menyuarakan nominal taruhan berikutnya... (Gagal memanggil Gemini AI: ${err.message || err})`;
    
    return res.json({
      status: "fallback",
      narasi: fallbackText,
      pilihan: [
        { teks: "Ah beneran nih gacor? Boleh deh depo gocap dulu, modal iseng doang...", action: "play" },
        { teks: "Halah penipuan bandar ini mah. Cari aman, mending gw abaikan aja seleranya.", action: "refuse" },
        { teks: "Duh, jadi bimbang gw... Coba baca testimoni dulu kali ya di grup fb.", action: "hesitate" }
      ],
      isFallback: true
    });
  }
});

// API: Life Evaluation / Status Analysis using Server-Side Gemini API
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { characterType, characterName, spouseName, currentStats } = req.body;
    const client = getGeminiClient();

    let characterDesc = "";
    if (characterType === "pejuang_mahar") {
      characterDesc = `Anak Muda Pejuang Mahar (punya target tabungan nikah, relasi tunangan yang sensitif bersama pacar bernama '${spouseName || "Nisa"}', calon mertua cerewet)`;
    } else if (characterType === "tulang_punggung") {
      characterDesc = `Kepala Keluarga Tulang Punggung (punya cicilan rumah, tagihan sekolah anak, nafkah bulanan istri bernama '${spouseName || "Siti"}')`;
    } else {
      characterDesc = `Pemain Kustom bernama '${characterName}' dengan pasangan bernama '${spouseName || "Pasangan"}'`;
    }

    const systemInstruction = `
Kamu adalah Psikolog Perilaku Klinis sekaligus Konselor Keuangan yang kritis, dingin, sangat realistis, dan hantam keras dalam game "Ilusi Maxwin".
Tugasmu adalah menganalisis statistik batin dan finansial karakter korban judi online saat ini dan memberikan evaluasi kehidupan secara jujur, blak-blakan, tanpa ramah tamah palsu.
Panggil pasangannya/istrinya dengan nama aslinya (yaitu '${spouseName || "pasangan"}') jika membahas hubungan sosial atau dampak kebohongan judol pada kehidupan pribadinya demi memberikan shock therapy asmara yang maksimal.
Gunkaan bahasa Indonesia yang tajam, agak menyindir, namun mendidik dan memberikan kesadaran penuh.
Sesuaikan kritik batinmu dengan statistik batin mereka (misal jika tabungan/keuangan menipis, sebutkan tentang kehancuran masa depan atau kejatuhan harga diri; jika hubungan dengan pasangan anjlok, sebutkan kehancuran asmara atau ancaman cerai/batal nikah).

Kembalikan respon SELALU dalam bentuk JSON murni dengan format schema berikut:
{
  "ringkasan": "Analisis tajam 2-3 kalimat yang menampar batin pemain tentang status keseluruhannya saat ini.",
  "finansialStatus": "Uraian kondisi keuangan, tabungan, dan utang pinjolnya saat ini secara blak-blakan.",
  "sosialStatus": "Uraian relasi dia dengan tunangan/istri (gunakan nama aslinya), keluarga, dan teman yang terdampak judi.",
  "mentalStatus": "Uraian batin, kesehatan mental, serta tingkat kestabilan batinnya saat ini."
}
`;

    const response = await generateWithFallback(client, {
      contents: `
Evaluasilah batin dan status kehidupan karakter korban judi ini secara blak-blakan sesuai schema JSON:
- Nama Karakter: ${characterName}
- Nama Pasangan (Tunangan / Istri): ${spouseName || "pasangan"}
- Tipe Karakter: ${characterDesc}
- Uang Pegangan: Rp ${currentStats.keuangan.toLocaleString("id-ID")}
- Tabungan Masa Depan: Rp ${currentStats.tabungan.toLocaleString("id-ID")}
- Utang Pinjol: Rp ${currentStats.hutangPinjol.toLocaleString("id-ID")}
- Utang Teman: Rp ${currentStats.hutangTeman.toLocaleString("id-ID")}
- Tingkat Stres Mental: ${currentStats.mentalStatus}/100
- Keharmonisan Pasangan: ${currentStats.hubunganPasangan}/100
- Keharmonisan Keluarga: ${currentStats.hubunganKeluarga}/100
- Hubungan Teman: ${currentStats.hubunganTeman}/100
`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ringkasan: { type: Type.STRING },
            finansialStatus: { type: Type.STRING },
            sosialStatus: { type: Type.STRING },
            mentalStatus: { type: Type.STRING },
          },
          required: ["ringkasan", "finansialStatus", "sosialStatus", "mentalStatus"],
        },
      },
    });

    const outputText = response.text || "";
    const parsedData = JSON.parse(outputText.trim());
    return res.json(parsedData);
  } catch (err: any) {
    console.error("Gemini Analysis Error:", err);
    return res.json({
      ringkasan: "Kondisi batin Anda terlalu kacau untuk diproses oleh sistem pintar kami (Koneksi terputus). Cobalah merenung sejenak secara mandiri.",
      finansialStatus: "Kritis, awan kelam menyelimuti dompet Anda.",
      sosialStatus: "Renggang, kebohongan Anda lambat laun akan terbongkar.",
      mentalStatus: "Penuh kecemasan tinggi dan dihantui bayang-bayang petir merah."
    });
  }
});

// Serve application
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development server with Vite middleware integration
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production build delivery
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Judol Simulator] Server robustly launched at http://localhost:${PORT}`);
  });
}

startServer();
