/**
 * Matriks peran untuk penjagaan rute laporan.
 *
 * Diturunkan dari app-routing.module.ts pada frontend:
 *   Purchasing [1,3,5,7]  Sales [2,3,5,7]  General [3,5,7]  Administrator [5,7]
 *
 * Peran 6 (Gudang) sengaja tidak disertakan: ia tidak muncul pada guard laporan
 * mana pun di frontend dan hanya memakai rute /warehouse.
 *
 * Sebelumnya berada di routes/report/report.route.ts. Dipindah mengikuti
 * kesepakatan bahwa konstanta punya berkasnya sendiri di constants/.
 */
export const PERAN_PENJUALAN = [2, 3, 5, 7];
export const PERAN_PEMBELIAN = [1, 3, 5, 7];
export const PERAN_UMUM = [3, 5, 7];
export const PERAN_SUPERADMIN = [7];
