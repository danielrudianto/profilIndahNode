/**
 * Tes untuk requireRole — lapisan yang menahan pengguna satu divisi membaca
 * laporan divisi lain.
 *
 * Prisma dan jsonwebtoken diganti tiruan supaya tes ini jalan tanpa database
 * dan tanpa Redis. Yang diuji adalah keputusan izin, bukan koneksi.
 */

const mockFindFirst = jest.fn();
const mockVerify = jest.fn();

jest.mock("../../src/utils/database.helper", () => ({
  prisma: { user: { findFirst: (...a: any[]) => mockFindFirst(...a) } },
}));

jest.mock("jsonwebtoken", () => ({
  verify: (...a: any[]) => mockVerify(...a),
}));

import { requireRole } from "../../src/utils/auth.helper";

function buatRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const req = (header?: string): any => ({
  headers: header ? { authorization: header } : {},
  body: {},
});

/** Menunggu rantai promise di dalam callback verify selesai. */
const tunggu = () => new Promise((r) => setImmediate(r));

beforeEach(() => {
  jest.clearAllMocks();
  process.env.TOKEN_KEY = "kunci-uji";
  // Perilaku bawaan: token sah, id pengguna 1.
  mockVerify.mockImplementation((_t: any, _k: any, cb: any) =>
    cb(null, { id: 1 })
  );
});

describe("requireRole — penolakan sebelum menyentuh database", () => {
  it("menolak permintaan tanpa header Authorization", async () => {
    const res = buatRes();
    const next = jest.fn();
    requireRole([5, 7])(req(), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("menolak header yang bukan skema Bearer", async () => {
    const res = buatRes();
    const next = jest.fn();
    requireRole([5, 7])(req("Basic abc123"), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("menolak Bearer tanpa token", async () => {
    const res = buatRes();
    const next = jest.fn();
    requireRole([5, 7])(req("Bearer "), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("menolak token yang tidak sah", async () => {
    mockVerify.mockImplementation((_t: any, _k: any, cb: any) =>
      cb(new Error("invalid signature"), null)
    );
    const res = buatRes();
    const next = jest.fn();
    requireRole([5, 7])(req("Bearer palsu"), res, next);
    await tunggu();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireRole — keputusan izin", () => {
  it("meneruskan pengguna yang rolenya ada di daftar", async () => {
    mockFindFirst.mockResolvedValue({ id: 1, role: 5, is_active: true });
    const res = buatRes();
    const next = jest.fn();
    requireRole([2, 3, 5, 7])(req("Bearer ok"), res, next);
    await tunggu();
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("menolak 403 untuk role di luar daftar", async () => {
    // Purchasing (1) mencoba membuka laporan penjualan.
    mockFindFirst.mockResolvedValue({ id: 1, role: 1, is_active: true });
    const res = buatRes();
    const next = jest.fn();
    requireRole([2, 3, 5, 7])(req("Bearer ok"), res, next);
    await tunggu();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("menolak pengguna yang tidak lagi aktif", async () => {
    // Sengaja memakai objek pengguna yang lengkap dengan is_active: false,
    // bukan null. Kalau memakai null, menghapus pemeriksaan is_active membuat
    // kode melempar galat dan tertangkap .catch() sehingga tetap menjawab 401 —
    // tes lulus karena alasan yang salah, dan cabang is_active tidak teruji.
    mockFindFirst.mockResolvedValue({ id: 1, role: 7, is_active: false });
    const res = buatRes();
    const next = jest.fn();
    requireRole([7])(req("Bearer ok"), res, next);
    await tunggu();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("menolak ketika pengguna tidak ditemukan", async () => {
    mockFindFirst.mockResolvedValue(null);
    const res = buatRes();
    const next = jest.fn();
    requireRole([7])(req("Bearer ok"), res, next);
    await tunggu();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("hanya superadmin yang tembus daftar [7]", async () => {
    for (const role of [1, 2, 3, 4, 5, 6]) {
      jest.clearAllMocks();
      mockVerify.mockImplementation((_t: any, _k: any, cb: any) =>
        cb(null, { id: 1 })
      );
      mockFindFirst.mockResolvedValue({ id: 1, role, is_active: true });
      const res = buatRes();
      const next = jest.fn();
      requireRole([7])(req("Bearer ok"), res, next);
      await tunggu();
      expect(next).not.toHaveBeenCalled();
    }
  });
});

describe("requireRole — role tidak boleh datang dari client", () => {
  it("menimpa role dan userId kiriman client dengan hasil verifikasi token", async () => {
    mockFindFirst.mockResolvedValue({ id: 42, role: 2, is_active: true });
    const res = buatRes();
    const next = jest.fn();

    // Client mengaku superadmin lewat body.
    const permintaan: any = {
      headers: { authorization: "Bearer ok" },
      body: { role: 7, userId: 999 },
    };

    requireRole([2, 3, 5, 7])(permintaan, res, next);
    await tunggu();

    expect(next).toHaveBeenCalled();
    expect(permintaan.body.role).toBe(2);
    expect(permintaan.body.userId).toBe(42);
  });

  it("keputusan izin memakai role dari database, bukan dari body", async () => {
    mockFindFirst.mockResolvedValue({ id: 1, role: 1, is_active: true });
    const res = buatRes();
    const next = jest.fn();

    const permintaan: any = {
      headers: { authorization: "Bearer ok" },
      body: { role: 7 },
    };

    requireRole([7])(permintaan, res, next);
    await tunggu();

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
