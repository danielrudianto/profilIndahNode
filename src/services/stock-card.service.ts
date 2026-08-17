import { StockCardRepository } from "../repositories/stock-card.repository";

export class StockCardService {
  private stockCardRepository: StockCardRepository;

  constructor(stockCardRepository: StockCardRepository) {
    this.stockCardRepository = stockCardRepository;
  }

  /*
    Kedua jalur di bawah menghitung ulang mulai TEPAT SETELAH baris
    berjangkar terakhir (stock terisi), BUKAN dari baris yang sedang
    disentuh. Bedanya kelihatan saat ada baris ber-stock NULL terselip
    di antaranya — sisa job antrean yang dulu gagal (antreannya tanpa
    retry): dihitung dari baris yang disentuh, baris NULL itu dilompati
    selamanya dan kuantitasnya hilang dari semua saldo sesudahnya;
    dihitung dari setelah jangkar, ia ikut tersembuhkan.
  */
  async update(id: number) {
    const stockCard = await this.stockCardRepository.fetchByID(id);
    if (!stockCard) {
      throw new Error("Stock card not found");
    }

    const previous = await this.stockCardRepository.fetchPrevious({
      product_id: stockCard.product_id,
      date: new Date(stockCard.date),
      id: id,
    });

    if (previous == null) {
      /* Tidak ada jangkar: hitung ulang seluruh riwayat produk ini. */
      await this.stockCardRepository.reorderSince({
        product_id: stockCard.product_id,
        id: 0,
        initial_stock: 0,
        date: new Date(0),
      });
    } else {
      await this.stockCardRepository.reorderSince({
        product_id: stockCard.product_id,
        id: previous.id! + 1,
        initial_stock: previous.stock!,
        date: new Date(previous.date),
      });
    }
  }

  async delete(data: {
    sales_invoice_id: number | null;
    sales_invoice_code_id: number | null;
    good_receipt_id: number | null;
    good_receipt_code_id: number | null;
    adjustment_case_id: number | null;
    adjustment_case_code_id: number | null;
    sales_return_id: number | null;
    sales_return_code_id: number | null;
  }) {
    const stockCard = await this.stockCardRepository.fetch(data);
    if (!stockCard) {
      throw new Error("Stock card not found");
    }

    const id = stockCard.id;

    const previous = await this.stockCardRepository.fetchPrevious({
      product_id: stockCard.product_id,
      date: new Date(stockCard.date),
      id: id!,
    });

    await this.stockCardRepository.delete(id!);

    if (previous == null) {
      await this.stockCardRepository.reorderSince({
        product_id: stockCard.product_id,
        id: 0,
        initial_stock: 0,
        date: new Date(0),
      });
    } else {
      await this.stockCardRepository.reorderSince({
        product_id: stockCard.product_id,
        id: previous.id! + 1,
        initial_stock: previous.stock!,
        date: new Date(previous.date),
      });
    }
  }

  async startup() {
    console.info(`[info]: Starting inserting stock card`);

    await this.stockCardRepository.startup();

    console.info(`[info]: Inserting stock card completed`);
    console.info(`[info]: Starting reordering stock card`);

    await this.stockCardRepository.reorder();
    console.info(`[info]: Reordering stock card completed`);
  }

  async reorder() {
    console.info(`[info]: Starting reordering stock card`);

    await this.stockCardRepository.reorder();
    console.info(`[info]: Reordering stock card completed`);
  }
}
