-- Rekomendasi stok minimum hasil hitungan (reorder point). Terpisah dari
-- minimum_stock manual supaya angka yang pernah diset orang tidak tertimpa;
-- NULL berarti belum dihitung atau datanya terlalu tipis untuk dihitung.
ALTER TABLE `product` ADD COLUMN `minimum_stock_recommendation` DECIMAL(50, 4) NULL;
