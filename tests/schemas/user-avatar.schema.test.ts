import express from "express";
import request from "supertest";
import { body } from "express-validator";
import ErrorHelper from "../support/legacy-error.helper";
import ErrorList from "../../src/constants/error-list.constant";
import { validate } from "../../src/utils/validate.helper";
import { updateAvatarSchema } from "../../src/schemas/user-avatar.schema";

/**
 * Perbandingan perilaku: rantai express-validator lama versus skema Zod baru.
 *
 * Seluruh bidang avatar memakai pesan yang sama, ErrorList["Parameter error"],
 * sehingga yang harus dijaga di sini bukan kalimatnya melainkan NILAI MANA yang
 * diterima dan mana yang ditolak. Perbedaan yang disengaja dikumpulkan di
 * bagian bawah dan selalu diuji berpasangan: rantai lama dijalankan juga,
 * supaya yang tercatat adalah "dulu diterima, sekarang ditolak" beserta
 * buktinya.
 */

const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

/** Rantai validator lama, disalin VERBATIM dari user-avatar.route.ts. */
function appLama() {
  const app = express();
  app.use(express.json());

  const validateAvatarFields = [
    body("accessories")
      .isInt({ min: 0 })
      .withMessage(ErrorList["Parameter error"]),
    body("top").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
    body("clothes").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
    body("color").isHexColor().withMessage(ErrorList["Parameter error"]),
    body("eyes").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
    body("eyebrows")
      .isInt({ min: 0 })
      .withMessage(ErrorList["Parameter error"]),
    body("mouth").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
    body("circle").isBoolean().withMessage(ErrorList["Parameter error"]),
  ];

  app.post("/a", [...validateAvatarFields, ErrorHelper.intercept], balas);

  return app;
}

function appBaru() {
  const app = express();
  app.use(express.json());
  app.post("/a", validate(updateAvatarSchema), balas);
  return app;
}

const lama = appLama();
const baru = appBaru();

async function keduanya(badan: any) {
  const [a, b] = await Promise.all([
    request(lama).post("/a").send(badan),
    request(baru).post("/a").send(badan),
  ]);
  return {
    lama: { status: a.status, teks: a.text },
    baru: { status: b.status, teks: b.text },
  };
}

/** Avatar yang sah; tiap kasus hanya menimpa satu bidang saja. */
const lengkap = {
  accessories: 1,
  top: 2,
  clothes: 3,
  color: "#a1b2c3",
  eyes: 4,
  eyebrows: 5,
  mouth: 6,
  circle: true,
};

const bidangAngka = [
  "accessories",
  "top",
  "clothes",
  "eyes",
  "eyebrows",
  "mouth",
] as const;

describe("POST /user-avatar — perilaku harus identik", () => {
  it("avatar lengkap diterima keduanya", async () => {
    const h = await keduanya(lengkap);
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(200);
  });

  it("badan kosong ditolak keduanya", async () => {
    const h = await keduanya({});
    expect(h.baru).toEqual(h.lama);
    expect(h.baru.status).toBe(400);
    expect(h.baru.teks).toBe(ErrorList["Parameter error"]);
  });

  for (const bidang of bidangAngka) {
    it(`${bidang}: nilai nol diterima`, async () => {
      const h = await keduanya({ ...lengkap, [bidang]: 0 });
      expect(h.baru).toEqual(h.lama);
      expect(h.baru.status).toBe(200);
    });

    it(`${bidang}: negatif, pecahan, null, boleh-tidaknya sama`, async () => {
      for (const nilai of [-1, 1.5, null, true, "abc", { a: 1 }]) {
        const h = await keduanya({ ...lengkap, [bidang]: nilai });
        expect(h.baru).toEqual(h.lama);
        expect(h.baru.status).toBe(400);
      }
    });

    it(`${bidang}: tidak dikirim ditolak keduanya`, async () => {
      const badan: any = { ...lengkap };
      delete badan[bidang];
      const h = await keduanya(badan);
      expect(h.baru).toEqual(h.lama);
      expect(h.baru.status).toBe(400);
    });
  }
});

describe("color — bentuk warna yang diterima harus sama", () => {
  /*
    isHexColor() milik validator.js memperlakukan tanda pagar sebagai opsional
    dan menerima panjang 3, 4, 6, dan 8. Kelonggaran itu ditiru apa adanya:
    nilai yang sudah tersimpan di kolom user_avatar.color harus tetap bisa
    dikirim ulang tanpa ditolak.
  */
  const kasus: Array<[string, string]> = [
    ["tiga digit dengan pagar", "#fff"],
    ["tiga digit tanpa pagar", "fff"],
    ["empat digit (alfa)", "#ffff"],
    ["enam digit", "#a1b2c3"],
    ["delapan digit (alfa)", "#a1b2c3d4"],
    ["huruf besar", "#ABCDEF"],
    ["lima digit tidak sah", "#abcde"],
    ["tujuh digit tidak sah", "#abcdef1"],
    ["bukan heksadesimal", "#gggggg"],
    ["kosong", ""],
    ["dua pagar", "##fff"],
  ];

  for (const [nama, warna] of kasus) {
    it(nama, async () => {
      const h = await keduanya({ ...lengkap, color: warna });
      expect(h.baru).toEqual(h.lama);
    });
  }

  it("nilai bukan teks yang bentuk teksnya juga tidak sah ditolak keduanya", async () => {
    // true menjadi "true" dan 12.5 menjadi "12.5"; keduanya bukan bentuk
    // heksadesimal yang sah, jadi rantai lama pun menolaknya. Hanya angka yang
    // KEBETULAN berbentuk sah yang dulu lolos — itu diuji terpisah di bawah.
    for (const nilai of [true, 12.5, null, { a: 1 }]) {
      const h = await keduanya({ ...lengkap, color: nilai });
      expect(h.baru).toEqual(h.lama);
      expect(h.baru.status).toBe(400);
    }
  });
});

describe("circle — nilai boolean asli harus sama", () => {
  for (const nilai of [true, false]) {
    it(`circle: ${nilai} diterima keduanya`, async () => {
      const h = await keduanya({ ...lengkap, circle: nilai });
      expect(h.baru).toEqual(h.lama);
      expect(h.baru.status).toBe(200);
    });
  }

  it("circle berupa teks yang bukan boolean ditolak keduanya", async () => {
    for (const nilai of ["yes", "ya", "", 2, null]) {
      const h = await keduanya({ ...lengkap, circle: nilai });
      expect(h.baru).toEqual(h.lama);
      expect(h.baru.status).toBe(400);
    }
  });
});

/**
 * PERBEDAAN YANG DISENGAJA — kebijakan ketat req.body.
 *
 * Alasan lengkapnya ada di src/schemas/common.schema.ts: express-validator
 * mengubah setiap nilai menjadi teks SEBELUM memeriksanya, sehingga tipe yang
 * salah lolos selama bentuk teksnya kebetulan sah. Nilai itu tidak berhenti di
 * lapisan validasi — ia diteruskan apa adanya ke user-avatar.repository.
 */
describe("Perbedaan disengaja: angka berupa teks ditolak", () => {
  for (const bidang of bidangAngka) {
    it(`${bidang} berupa teks: dulu diterima, sekarang ditolak`, async () => {
      const h = await keduanya({ ...lengkap, [bidang]: "7" });

      expect(h.lama.status).toBe(200);
      expect(h.baru.status).toBe(400);
      expect(h.baru.teks).toBe(ErrorList["Parameter error"]);
    });
  }

  it("angka berupa teks dengan nol di depan juga ditolak", async () => {
    const h = await keduanya({ ...lengkap, top: "007" });

    expect(h.lama.status).toBe(200);
    expect(h.baru.status).toBe(400);
  });
});

describe("Perbedaan disengaja: color bukan teks ditolak", () => {
  /*
    Ini kasus paling merugikan di berkas ini. Angka 123 diubah menjadi "123",
    yang memang tiga digit heksadesimal yang sah, sehingga isHexColor()
    meloloskannya dan angka tersebut tersimpan sebagai warna avatar tanpa ada
    yang mengeluh. Nilai bertipe salah yang KEBETULAN berbentuk sah justru
    yang paling sulit ditemukan, karena tidak meninggalkan galat apa pun.
  */
  const kasus: Array<[string, unknown]> = [
    ["angka tiga digit", 123],
    ["angka empat digit", 1234],
    ["angka enam digit", 111222],
    ["angka delapan digit", 11223344],
  ];

  for (const [nama, nilai] of kasus) {
    it(`color berupa ${nama}: dulu diterima, sekarang ditolak`, async () => {
      const h = await keduanya({ ...lengkap, color: nilai });

      expect(h.lama.status).toBe(200);
      expect(h.baru.status).toBe(400);
      expect(h.baru.teks).toBe(ErrorList["Parameter error"]);
    });
  }
});

describe("Perbedaan disengaja: circle bukan boolean ditolak", () => {
  /*
    isBoolean() memeriksa bentuk TEKS-nya: "true", "false", "1", dan "0" semua
    lolos. Angka 1 dan 0 karenanya ikut diterima, dan yang tersimpan bukan
    boolean melainkan apa pun yang dikirim klien.
  */
  const kasus: Array<[string, unknown]> = [
    ["angka 1", 1],
    ["angka 0", 0],
    ['teks "true"', "true"],
    ['teks "false"', "false"],
    ['teks "1"', "1"],
    ['teks "0"', "0"],
  ];

  for (const [nama, nilai] of kasus) {
    it(`circle berupa ${nama}: dulu diterima, sekarang ditolak`, async () => {
      const h = await keduanya({ ...lengkap, circle: nilai });

      expect(h.lama.status).toBe(200);
      expect(h.baru.status).toBe(400);
      expect(h.baru.teks).toBe(ErrorList["Parameter error"]);
    });
  }
});

describe("Urutan bidang disalin dari rantai lama", () => {
  /*
    Pesan seluruh bidang sama, jadi urutan tidak terlihat dari balasan. Yang
    diuji di sini adalah bahwa urutan kunci skema memang accessories, top,
    clothes, color, eyes, eyebrows, mouth, circle — supaya perbandingan dengan
    rantai lama tetap lurus bila kelak salah satu pesannya dibedakan.
  */
  it("urutan kunci skema sama dengan urutan rantai lama", () => {
    expect(Object.keys(updateAvatarSchema.shape)).toEqual([
      "accessories",
      "top",
      "clothes",
      "color",
      "eyes",
      "eyebrows",
      "mouth",
      "circle",
    ]);
  });
});
