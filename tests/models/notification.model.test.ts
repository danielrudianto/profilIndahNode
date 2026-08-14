import { NotificationModel } from "../../src/models/notification.model";
import { UserViewModel } from "../../src/models/user.model";

/**
 * Perilaku NotificationModel.
 *
 * Model paling kecil di bagian ini: enam bidang, tanpa larik bersarang, tanpa
 * kolom boolean, tanpa kolom angka desimal. Seluruh bidang konstruktornya
 * diteruskan fromMap, jadi tidak ada bidang yang diam-diam hilang.
 *
 * Satu-satunya keputusan yang diambil fromMap adalah menerjemahkan relasi
 * `user`, dan justru di situlah letak cacatnya: relasi itu diterjemahkan TANPA
 * penjagaan apa pun, padahal bidangnya sendiri ditandai boleh kosong (`user?`).
 *
 * Catatan: modul notifikasi belum tersambung ke mana pun di aplikasi (lihat
 * keterangan pada interfaces/notification.interface.ts), jadi cacat ini belum
 * berdampak pada pengguna hari ini — tetapi akan langsung berdampak begitu
 * modulnya dipakai.
 */

const barisPrisma = {
  id: 5,
  title: "Stok menipis",
  message: "Besi Hollow tersisa 3 batang",
  created_at: new Date("2026-06-01T07:00:00.000Z"),
  created_by: 2,
  user: { id: 2, name: "Andi", username: "andi", role: 1 },
};

describe("fromMap menyalin bidang dari baris basis data", () => {
  it("menyalin seluruh bidang isi notifikasi", () => {
    const m = NotificationModel.fromMap(barisPrisma);

    expect(m.id).toBe(5);
    expect(m.title).toBe("Stok menipis");
    expect(m.message).toBe("Besi Hollow tersisa 3 batang");
    expect(m.created_by).toBe(2);
  });

  it("menyalin created_at apa adanya tanpa membungkusnya ulang", () => {
    const m = NotificationModel.fromMap(barisPrisma);

    expect(m.created_at).toBeInstanceOf(Date);
    expect(m.created_at?.toISOString()).toBe("2026-06-01T07:00:00.000Z");
  });

  it("created_at yang hilang tetap undefined, tidak dipalsukan maupun Invalid Date", () => {
    const { created_at, ...tanpa } = barisPrisma;
    const m = NotificationModel.fromMap(tanpa);

    // Berbeda dari ExpenseModel yang memalsukannya dengan waktu sekarang,
    // dan berbeda dari CustomerModel yang menghasilkan Invalid Date.
    expect(m.created_at).toBeUndefined();
  });

  it("menghasilkan instance NotificationModel, bukan objek biasa", () => {
    expect(NotificationModel.fromMap(barisPrisma)).toBeInstanceOf(
      NotificationModel
    );
  });
});

describe("Relasi pengguna", () => {
  it("pengguna yang dikirim menjadi UserViewModel", () => {
    const m = NotificationModel.fromMap(barisPrisma);

    expect(m.user).toBeInstanceOf(UserViewModel);
    expect(m.user!.name).toBe("Andi");
    expect(m.user!.username).toBe("andi");
    expect(m.user!.role).toBe(1);
  });

  it("user_avatar diberi nilai cadangan null oleh UserViewModel", () => {
    expect(NotificationModel.fromMap(barisPrisma).user!.user_avatar).toBeNull();
  });

  /**
   * CACAT: notifikasi tanpa relasi pengguna membuat fromMap MELEMPAR galat.
   *
   * fromMap memanggil `UserViewModel.fromMap(data.user)` tanpa syarat. Seluruh
   * model lain di repo ini menjaganya lebih dulu — `data.x == undefined ?
   * undefined : UserViewModel.fromMap(data.x)` — model ini tidak.
   *
   * Di dalam UserViewModel.fromMap, baris pertamanya membaca
   * `data.user_avatar`. Bila data-nya undefined, pembacaan itu melempar
   * TypeError.
   *
   * Akibatnya bagi pemakai: setiap kueri notifikasi yang lupa menyertakan
   * `include: { user: true }` akan menggagalkan SELURUH permintaan HTTP dengan
   * galat 500, bukan sekadar kehilangan satu kolom. Karena bidangnya ditandai
   * boleh kosong (`user?`), pemanggil justru berhak menyangka relasi itu
   * memang tidak wajib. Kueri daftar notifikasi yang ringan — tanpa relasi
   * pengguna — mustahil dibuat.
   */
  it("CACAT: pengguna yang tidak dikirim melempar TypeError", () => {
    const { user, ...tanpa } = barisPrisma;

    expect(() => NotificationModel.fromMap(tanpa)).toThrow(TypeError);
    expect(() => NotificationModel.fromMap(tanpa)).toThrow(
      /Cannot read properties of undefined/
    );
  });

  /**
   * CACAT: relasi pengguna bernilai null juga melempar galat.
   *
   * Keadaan ini muncul secara wajar pada notifikasi yang dibangkitkan sistem —
   * tidak ada pengguna yang membuatnya, jadi created_by dan relasinya null di
   * basis data. Notifikasi semacam itu tidak akan pernah bisa dibaca lewat
   * model ini.
   */
  it("CACAT: pengguna bernilai null juga melempar TypeError", () => {
    expect(() =>
      NotificationModel.fromMap({ ...barisPrisma, user: null })
    ).toThrow(/Cannot read properties of null/);
  });

  it("konstruktornya sendiri baik-baik saja tanpa pengguna — cacatnya di fromMap", () => {
    const m = new NotificationModel({
      id: 5,
      title: "Stok menipis",
      message: "pesan",
    });

    expect(m.user).toBeUndefined();
    expect(m.title).toBe("Stok menipis");
  });
});
