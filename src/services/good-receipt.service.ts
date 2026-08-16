import { GoodReceiptRepository } from "../repositories/good-receipt.repository";
import { StockInRepository } from "../repositories/stock-in.repository";

export class GoodReceiptService {
  private goodReceiptRepository: GoodReceiptRepository;
  private stockInRepository: StockInRepository;
  constructor(
    goodReceiptRepository: GoodReceiptRepository,
    stockInRepository: StockInRepository
  ) {
    this.goodReceiptRepository = goodReceiptRepository;
    this.stockInRepository = stockInRepository;
  }

  async create(id: number) {
    try {
      const goodReceipt = await this.goodReceiptRepository.fetchByID(id);
      if (!goodReceipt) {
        throw new Error("Good receipt not found");
      }

      /*
        SATUAN DASAR, bukan satuan dokumen. Seluruh mesin HPP — stock_out
        faktur penjualan, penimpaan harga saat faktur pembelian dikonfirmasi,
        dan pembangunan ulang lewat CLI — bekerja dalam satuan dasar dengan
        harga netto diskon per satuan dasar. Jalur ini pernah menulis mentah
        dari dokumennya: terima 3 box (= 300 pcs) tercatat residue 3 dengan
        harga per box tanpa diskon, sehingga FIFO kehabisan lapisan seratus
        kali lebih cepat dan HPP baris yang terisi meledak ratusan kali lipat.
      */
      const result = await this.stockInRepository.createMany(
        goodReceipt.good_receipt!.map((item) => {
          const konversi =
            item.product_unit == null ? 1 : item.product_unit.conversion;

          return {
            date: goodReceipt.date,
            company_id: goodReceipt.company_id,
            supplier_id: goodReceipt.supplier_id,
            product_id: item.product_id,
            quantity: item.quantity * konversi,
            price: (item.price - item.discount) / konversi,
            created_at: new Date(),
            created_by: goodReceipt.created_by,
            good_receipt_id: item.id!,
            good_receipt_code_id: goodReceipt.id!,
            adjustment_case_code_id: null,
            adjustment_case_id: null,
          };
        })
      );
      return result;
    } catch (error) {
      console.error("Error creating good receipt:", error);
      throw new Error("Failed to create good receipt");
    }
  }

  async deleteByID(id: number) {
    try {
      await this.goodReceiptRepository.deleteGoodReceiptByID(id);
    } catch (error) {
      console.error(`[error]: Error on deleting good receipt data ${error}`);
      throw new Error("Failed to delete good receipt");
    }
  }
}
