import { Queue } from "bullmq";

const redisConfiguration = {
  connection: {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
  },
};

/*
  Job di antrean ini menulis data turunan (kartu stok, HPP, indeks
  pencarian). Tanpa percobaan ulang, satu kegagalan sesaat — Redis
  kedip, deadlock MySQL — meninggalkan turunannya bolong tanpa gejala,
  dan bolongnya baru ketahuan berbulan-bulan kemudian di angka laporan.

  - attempts + backoff eksponensial: 3 dtk, 6, 12, 24, 48 — kegagalan
    sesaat sembuh sendiri, kegagalan menetap berhenti setelah lima kali.
  - removeOnComplete dibatasi supaya Redis tidak menimbun jutaan job
    sukses; yang GAGAL disimpan lebih banyak justru karena dialah jejak
    yang perlu diperiksa.
*/
export const queue = new Queue("queue", {
  ...redisConfiguration,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});
