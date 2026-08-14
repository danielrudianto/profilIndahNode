import express from "express";
import request from "supertest";

/**
 * Perkakas bersama untuk uji banding skema.
 *
 * Setiap berkas tes skema membangun dua aplikasi Express: satu memakai rantai
 * express-validator lama, satu memakai skema Zod baru. Keduanya diberi badan
 * permintaan yang sama, lalu status dan teks balasannya dibandingkan. Yang
 * dikunci bukan kalimat tertentu, melainkan bahwa kedua sisi menjawab sama —
 * sehingga perbedaan sekecil apa pun langsung terlihat.
 *
 * Berkas ini hanya memuat bagian yang benar-benar sama di semua domain.
 * Susunan route-nya sengaja tetap tinggal di masing-masing berkas tes, karena
 * di situlah letak perbedaan yang sedang diuji.
 */

/** Handler akhir kedua aplikasi: menandakan permintaan lolos validasi. */
export const balas = (_req: express.Request, res: express.Response) =>
  res.status(200).send("OK");

export type MetodeHttp = "post" | "put" | "get" | "delete";

export interface HasilBanding {
  lama: { status: number; teks: string };
  baru: { status: number; teks: string };
}

/**
 * Membuat fungsi pembanding untuk sepasang aplikasi.
 *
 * Keduanya dipanggil bersamaan lewat Promise.all: keduanya berdiri sendiri dan
 * tidak berbagi keadaan, jadi tidak ada urutan yang perlu dijaga.
 */
export function buatBanding(lama: express.Express, baru: express.Express) {
  return async function banding(
    metode: MetodeHttp,
    jalur: string,
    badan?: unknown
  ): Promise<HasilBanding> {
    const kirim = (app: express.Express) => {
      const r = (request(app) as any)[metode](jalur);
      return badan === undefined ? r : r.send(badan);
    };
    const [a, b] = await Promise.all([kirim(lama), kirim(baru)]);
    return {
      lama: { status: a.status, teks: a.text },
      baru: { status: b.status, teks: b.text },
    };
  };
}
