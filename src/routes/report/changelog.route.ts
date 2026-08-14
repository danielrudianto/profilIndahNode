import { Router } from "express";
import changelog from "../../constants/changelog";

const router = Router();

/*
  Riwayat perubahan dibaca dari src/constants/changelog.ts, bukan lagi dari
  MongoDB. Urutan di berkas itu sudah terbaru-di-atas, sama seperti hasil
  .sort({ date: -1 }) yang dipakai sebelumnya, jadi tidak perlu diurutkan ulang.
*/
router.get("/", (_, res) => {
  return res.status(200).send(changelog);
});

export default router;
