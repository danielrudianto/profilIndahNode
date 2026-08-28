-- Membetulkan tipe deposit pada riwayat.
--
-- Frontend mengirim 'INTERNAL' pada KEDUA pilihan — deposit biasa maupun
-- deposit internal — sehingga setiap baris yang pernah tersimpan bertipe
-- internal, termasuk yang menerima pembayaran. Kolomnya tidak pernah dibaca
-- perilaku apa pun di server, jadi kesalahannya tidak pernah bergejala sampai
-- tipenya mulai ditampilkan di layar.
--
-- Pembedanya ada tidaknya pembayaran, dan itu memang DEFINISI-nya menurut
-- pemilik: internal berarti belum ada transaksi, cuma janji barang. Deposit
-- yang pernah menerima uang karena itu bukan internal, apa pun yang tertulis
-- di kolomnya.
--
-- Yang tidak bisa dipulihkan: deposit eksternal yang dibuat tetapi belum
-- dibayar sepeser pun tetap terbaca internal. Tidak ada jejak yang
-- membedakannya — dan menurut definisi di atas, ia memang belum jadi
-- transaksi.
UPDATE `sales_deposit_code`
SET `type` = 'EXTERNAL'
WHERE `type` = 'INTERNAL'
  AND EXISTS (
    SELECT 1 FROM `sales_deposit_payment`
    WHERE `sales_deposit_payment`.`sales_deposit_code_id` = `sales_deposit_code`.`id`
  );
