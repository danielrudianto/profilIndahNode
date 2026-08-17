import { StockInRepository } from "../repositories/stock-in.repository";
import { StockOutRepository } from "../repositories/stock-out.repository";

export class StockOutService {
  private stockOutRepository: StockOutRepository;
  private stockInRepository: StockInRepository;

  constructor(
    stockOutRepository: StockOutRepository,
    stockInRepository: StockInRepository
  ) {
    this.stockOutRepository = stockOutRepository;
    this.stockInRepository = stockInRepository;
  }

  async delete() {
    await this.stockOutRepository.delete();
  }

  async insertFromDocuments() {
    try {
      await this.stockOutRepository.insertFromSalesInvoices();

      console.info(
        `[info]: Successfully inserted sales invoice to stock out data`
      );
      await this.stockOutRepository.insertFromAdjustmentCases();

      console.info(
        `[info]: Successfully inserted adjustment case to stock out data`
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Menetapkan setiap stock_out tanpa penetapan ke lapisan stok masuk
   * tertua (FIFO) — inilah yang menentukan HPP.
   *
   * Rencana alokasi sebuah stock_out dihitung LEBIH DULU dari daftar lapisan,
   * baru diterapkan sekaligus dalam satu transaksi di repository. Idempoten
   * dan aman dipanggil kapan pun: baris yang sudah tertetap tidak tersentuh,
   * jadi ia dipakai job worker `hpp-assign` setiap ada dokumen stok baru,
   * dan tetap bisa dijalankan manual lewat `npm run start:calculate-hpp`.
   */
  /*
    Kuantitas di basis data Decimal(12,2), tetapi aritmetika di sini float
    JS: 0.3 - 0.1 - 0.1 - 0.1 menyisakan 4e-17, yang lolos pemeriksaan
    `sisa > 0` dan melahirkan baris menunggak berkuantitas 0,00 — abadi,
    karena tiap sapuan berikutnya hanya melewatinya sambil memperingatkan.
    Semua hasil kurang/minimum dibulatkan kembali ke dua desimal.
  */
  private bulatkan(nilai: number): number {
    return Math.round(nilai * 100) / 100;
  }

  /**
   * Jalur BORONGAN penetapan HPP — untuk pembangunan ulang historis.
   *
   * Aturannya persis calculateStockOut: FIFO per produk pada urutan
   * (tanggal, id) yang sama, dengan pembulatan dua desimal yang sama.
   * Bedanya seluruh rencana dihitung di memori lalu ditulis massal —
   * jalur per-baris menetapkan ±40 baris per detik, jadi membangun
   * ulang ±1 juta baris memakan hampir tujuh jam; jalur ini menit.
   */
  async calculateStockOutBulk() {
    const stockOuts = await this.stockOutRepository.fetchUnassigned();
    console.info(
      `[info]: Penetapan HPP borongan — ${stockOuts.length} stock_out menunggu`
    );

    const produkIds = [...new Set(stockOuts.map((x) => x.product_id))];
    const lapisanSemua = await this.stockInRepository.fetchManyUnfilled(
      produkIds
    );

    // Urutan (tanggal, id) dari query dipertahankan per produk.
    const lapisanPerProduk = new Map<
      number,
      { id: number; residue: number }[]
    >();
    for (const lapis of lapisanSemua) {
      if (!lapisanPerProduk.has(lapis.product_id)) {
        lapisanPerProduk.set(lapis.product_id, []);
      }
      lapisanPerProduk.get(lapis.product_id)!.push({
        id: lapis.id,
        residue: lapis.residue,
      });
    }

    const ubah: { id: number; stock_in_id: number; quantity: number }[] = [];
    const tambah: any[] = [];
    const konsumsi = new Map<number, number>();
    let dilewati = 0;
    let tanpaLapisan = 0;
    let kurang = 0;

    for (const stockOut of stockOuts) {
      const kebutuhan = Number(stockOut.quantity);
      if (kebutuhan <= 0) {
        dilewati += 1;
        continue;
      }

      const lapisan = lapisanPerProduk.get(stockOut.product_id) ?? [];
      const plan: { stock_in_id: number; quantity: number }[] = [];
      let sisa = kebutuhan;

      for (const lapis of lapisan) {
        if (sisa <= 0) {
          break;
        }
        if (lapis.residue <= 0) {
          continue;
        }

        const ambil = this.bulatkan(Math.min(lapis.residue, sisa));
        if (ambil <= 0) {
          continue;
        }

        plan.push({ stock_in_id: lapis.id, quantity: ambil });
        lapis.residue = this.bulatkan(lapis.residue - ambil);
        konsumsi.set(
          lapis.id,
          this.bulatkan((konsumsi.get(lapis.id) ?? 0) + ambil)
        );
        sisa = this.bulatkan(sisa - ambil);
      }

      if (plan.length === 0) {
        tanpaLapisan += 1;
        continue;
      }

      const salinan = {
        product_id: stockOut.product_id,
        price: stockOut.price,
        sales_invoice_id: stockOut.sales_invoice_id,
        sales_invoice_code_id: stockOut.sales_invoice_code_id,
        adjustment_case_id: stockOut.adjustment_case_id,
        adjustment_case_code_id: stockOut.adjustment_case_code_id,
        date: stockOut.date,
      };

      ubah.push({
        id: stockOut.id,
        stock_in_id: plan[0].stock_in_id,
        quantity: plan[0].quantity,
      });
      for (const jatah of plan.slice(1)) {
        tambah.push({
          ...salinan,
          quantity: jatah.quantity,
          stock_in_id: jatah.stock_in_id,
        });
      }
      if (sisa > 0) {
        kurang += 1;
        tambah.push({ ...salinan, quantity: sisa, stock_in_id: null });
      }
    }

    console.info(
      `[info]: Rencana borongan — ${ubah.length} ditetapkan, ${tambah.length} baris pecahan/sisa, ` +
        `${tanpaLapisan} tanpa lapisan, ${kurang} kurang stok, ${dilewati} dilewati (kuantitas <= 0)`
    );

    await this.stockOutRepository.applyBulkAssignments({
      ubah: ubah,
      tambah: tambah,
      konsumsi: [...konsumsi.entries()].map(([stock_in_id, quantity]) => ({
        stock_in_id: stock_in_id,
        quantity: quantity,
      })),
    });

    console.info(`[info]: Penetapan borongan selesai ditulis`);
  }

  async calculateStockOut() {
    const stockOuts = await this.stockOutRepository.fetchUnassigned();
    console.info(
      `[info]: Penetapan HPP — ${stockOuts.length} stock_out menunggu`
    );

    for (const stockOut of stockOuts) {
      const kebutuhan = Number(stockOut.quantity);

      /*
        Kuantitas nol atau negatif tidak bisa ditetapkan. Baris seperti ini
        seharusnya tidak ada lagi sejak kasus hilang dimutlakkan; kalau masih
        muncul, itu data lama yang perlu dibangun ulang — bukan untuk
        dilewati diam-diam.
      */
      if (kebutuhan <= 0) {
        console.warn(
          `[warn]: stock_out ${stockOut.id} berkuantitas ${kebutuhan} — dilewati; jalankan pembangunan ulang untuk data lama`
        );
        continue;
      }

      const lapisan = await this.stockInRepository.fetchManyUnfilled([
        stockOut.product_id,
      ]);

      const plan: { stock_in_id: number; quantity: number }[] = [];
      let sisa = kebutuhan;

      for (const lapis of lapisan) {
        if (sisa <= 0) {
          break;
        }

        const ambil = this.bulatkan(Math.min(lapis.residue, sisa));
        if (ambil <= 0) {
          continue;
        }

        plan.push({ stock_in_id: lapis.id, quantity: ambil });
        sisa = this.bulatkan(sisa - ambil);
      }

      if (plan.length === 0) {
        console.warn(
          `[warn]: Produk ${stockOut.product_id} tidak punya lapisan stok tersisa — stock_out ${stockOut.id} (${kebutuhan}) belum bisa dinilai HPP-nya`
        );
        continue;
      }

      if (sisa > 0) {
        console.warn(
          `[warn]: Stok produk ${stockOut.product_id} kurang ${sisa} untuk stock_out ${stockOut.id} — sisanya menunggu stok masuk berikutnya`
        );
      }

      await this.stockOutRepository.assign({
        stockOut: {
          id: stockOut.id,
          product_id: stockOut.product_id,
          sales_invoice_id: stockOut.sales_invoice_id,
          sales_invoice_code_id: stockOut.sales_invoice_code_id,
          adjustment_case_id: stockOut.adjustment_case_id,
          adjustment_case_code_id: stockOut.adjustment_case_code_id,
          price: stockOut.price,
          date: stockOut.date,
        },
        plan: plan,
        sisa: sisa,
      });
    }
  }
}
