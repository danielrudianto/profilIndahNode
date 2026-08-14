import { Prisma } from "@prisma/client";
import { pasangPencatatAudit } from "../../src/utils/audit.helper";
import {
  jalankanDenganKonteks,
  tetapkanPengguna,
} from "../../src/utils/request-context.helper";

/**
 * Pencatat jejak audit.
 *
 * Bekerja sebagai middleware Prisma, jadi yang diuji di sini adalah fungsi
 * yang didaftarkan lewat $use: ia dipanggil dengan params buatan, dan yang
 * diperiksa adalah baris apa yang akhirnya ditulis ke audit_log.
 *
 * Pemilihan lapisan ini disengaja. Mencatat lewat controller berarti setiap
 * jalur tulis harus ingat memanggil pencatatnya, dan jalur yang lupa tidak
 * pernah menimbulkan galat — ia hanya diam-diam tidak tercatat.
 */

type Middleware = (
  params: Prisma.MiddlewareParams,
  next: (p: Prisma.MiddlewareParams) => Promise<unknown>
) => Promise<unknown>;

function klienTiruan() {
  const tercatat: any[] = [];
  let middleware: Middleware | null = null;

  const klien = {
    $use: (fn: Middleware) => {
      middleware = fn;
    },
    audit_log: {
      create: jest.fn(async ({ data }: any) => {
        tercatat.push(data);
        return data;
      }),
    },
  };

  pasangPencatatAudit(klien as never);
  return {
    klien,
    tercatat,
    jalankan: (p: any, hasil: unknown = {}) =>
      middleware!(p, async () => hasil),
  };
}

function params(ubah: Partial<Prisma.MiddlewareParams> = {}): any {
  return {
    model: "customer",
    action: "create",
    args: { data: { name: "PT A" } },
    dataPath: [],
    runInTransaction: false,
    ...ubah,
  };
}

describe("Model yang dicatat", () => {
  it("mencatat model yang terdaftar", async () => {
    const { tercatat, jalankan } = klienTiruan();
    await jalankan(params(), { id: 7 });

    expect(tercatat).toHaveLength(1);
    expect(tercatat[0].entity).toBe("customer");
    expect(tercatat[0].action).toBe("create");
    expect(tercatat[0].entity_id).toBe(7);
  });

  it("TIDAK mencatat model di luar daftar", async () => {
    const { tercatat, jalankan } = klienTiruan();
    // stock_card lahir puluhan sekaligus dari satu faktur; mencatatnya akan
    // menenggelamkan halaman aktivitas.
    await jalankan(params({ model: "stock_card" as never }), { id: 1 });

    expect(tercatat).toHaveLength(0);
  });

  it("TIDAK mencatat operasi baca", async () => {
    const { tercatat, jalankan } = klienTiruan();
    for (const action of ["findMany", "findUnique", "count", "aggregate"]) {
      await jalankan(params({ action: action as never }), []);
    }

    expect(tercatat).toHaveLength(0);
  });

  it("mencatat audit_log itu sendiri? tidak — jika tidak, pencatatnya akan memanggil dirinya tanpa henti", async () => {
    const { tercatat, jalankan } = klienTiruan();
    await jalankan(params({ model: "audit_log" as never }), { id: 1 });

    expect(tercatat).toHaveLength(0);
  });
});

describe("Isi yang disimpan", () => {
  it("membuang password", async () => {
    const { tercatat, jalankan } = klienTiruan();
    await jalankan(
      params({
        model: "user" as never,
        args: { data: { username: "budi", password: "rahasia-sekali" } },
      }),
      { id: 3 }
    );

    expect(JSON.stringify(tercatat)).not.toContain("rahasia-sekali");
    expect(tercatat[0].changes).toEqual({ username: { to: "budi" } });
  });

  it("membuang kolom jejak yang hanya mengulang isi baris audit-nya sendiri", async () => {
    const { tercatat, jalankan } = klienTiruan();
    await jalankan(
      params({
        args: {
          data: {
            name: "PT A",
            created_by: 9,
            created_at: new Date(),
            updated_by: 9,
          },
        },
      }),
      { id: 1 }
    );

    expect(Object.keys(tercatat[0].changes)).toEqual(["name"]);
  });

  it("melewati nilai bersarang", async () => {
    const { tercatat, jalankan } = klienTiruan();
    // Pembuatan faktur membawa seluruh baris barangnya; menyalinnya utuh
    // membuat satu baris jejak berisi ribuan karakter.
    await jalankan(
      params({
        model: "sales_invoice_code" as never,
        args: {
          data: {
            name: "INV-1",
            sales_invoice: { createMany: { data: [{ product_id: 1 }] } },
          },
        },
      }),
      { id: 1 }
    );

    expect(tercatat[0].changes).toEqual({ name: { to: "INV-1" } });
  });

  it("changes bernilai undefined bila tidak ada yang layak dicatat", async () => {
    const { tercatat, jalankan } = klienTiruan();
    await jalankan(params({ args: { data: { created_by: 9 } } }), { id: 1 });

    expect(tercatat[0].changes).toBeUndefined();
  });
});

describe("Identitas pemanggil", () => {
  it("mengambil pengguna dari konteks permintaan", async () => {
    const { tercatat, jalankan } = klienTiruan();

    await jalankanDenganKonteks({ userId: null }, async () => {
      tetapkanPengguna(42);
      await jalankan(params(), { id: 1 });
    });

    expect(tercatat[0].user_id).toBe(42);
  });

  it("user_id null di luar permintaan HTTP", async () => {
    const { tercatat, jalankan } = klienTiruan();
    // Perintah CLI dan pekerjaan worker menulis tanpa permintaan; jejaknya
    // tetap layak dicatat, hanya tanpa pemilik.
    await jalankan(params(), { id: 1 });

    expect(tercatat[0].user_id).toBeNull();
  });
});

describe("Ketahanan", () => {
  it("kegagalan mencatat TIDAK menggagalkan operasi aslinya", async () => {
    const { klien, jalankan } = klienTiruan();
    klien.audit_log.create.mockRejectedValueOnce(new Error("tabel penuh"));

    // Jejak audit adalah catatan pendamping. Kehilangan satu barisnya jauh
    // lebih ringan daripada membatalkan penyimpanan faktur yang sudah benar.
    const hasil = await jalankan(params(), { id: 5 });

    expect(hasil).toEqual({ id: 5 });
  });

  it("id diambil dari where bila hasilnya tidak menyebutkannya", async () => {
    const { tercatat, jalankan } = klienTiruan();
    await jalankan(
      params({
        action: "update" as never,
        args: { where: { id: 12 }, data: { name: "B" } },
      }),
      { count: 1 }
    );

    expect(tercatat[0].entity_id).toBe(12);
  });

  it("entity_id null pada operasi massal yang tidak menyebut id", async () => {
    const { tercatat, jalankan } = klienTiruan();
    await jalankan(
      params({
        action: "createMany" as never,
        args: { data: [{ name: "A" }] },
      }),
      { count: 3 }
    );

    expect(tercatat[0].entity_id).toBeNull();
  });

  it("baris dari dalam transaksi diberi catatan", async () => {
    const { tercatat, jalankan } = klienTiruan();
    // Tulisan jejak memakai klien dasar, sehingga tidak ikut dibatalkan bila
    // transaksinya gagal. Catatan ini yang memberi tahu pembacanya.
    await jalankan(params({ runInTransaction: true }), { id: 1 });

    expect(tercatat[0].note).toBe("dicatat dari dalam transaksi");
  });
});
