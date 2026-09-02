import { Request, Response } from "express";
import ErrorList from "../constants/error-list.constant";
import { SalesReturnRepository } from "../repositories/sales-return.repository";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { translateKeyword, translatePage } from "../utils/escape.helper";
import { StockOutRepository } from "../repositories/stock-out.repository";
import { StockCardRepository } from "../repositories/stock-card.repository";
import { queue } from "../utils/queue.helper";
import { ProductStockRepository } from "../repositories/product-stock.repository";
import { ReceivableRepository } from "../repositories/receivable.repository";
import { OverpaymentRepository } from "../repositories/overpayment.repository";

class SalesReturnController {
  salesReturnRepository: SalesReturnRepository;
  salesInvoiceRepository: SalesInvoiceRepository;
  productStockRepository: ProductStockRepository;
  stockOutRepository: StockOutRepository;
  stockCardRepository: StockCardRepository;
  receivableRepository: ReceivableRepository;
  overpaymentRepository: OverpaymentRepository;

  constructor(
    salesReturnRepository: SalesReturnRepository,
    salesInvoiceRepository: SalesInvoiceRepository,
    productStockRepository: ProductStockRepository,
    stockOutRepository: StockOutRepository,
    stockCardRepository: StockCardRepository,
    receivableRepository: ReceivableRepository,
    overpaymentRepository: OverpaymentRepository
  ) {
    this.salesReturnRepository = salesReturnRepository;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.productStockRepository = productStockRepository;
    this.stockOutRepository = stockOutRepository;
    this.stockCardRepository = stockCardRepository;
    this.receivableRepository = receivableRepository;
    this.overpaymentRepository = overpaymentRepository;
  }

  create = async (req: Request, res: Response) => {
    try {
      const date = new Date(req.body.date);
      const payment_method_id =
        req.body.payment_method_id == 0 ? null : req.body.payment_method_id;
      const items = req.body.sales_return as any[];
      const userID = req.body.userId;
      const sales_return = req.body.sales_return;
      const name = this.generateName(date);
      const sales_invoice_code_id = req.body.sales_invoice_code_id;
      /*
        Perlakuan yang DIMINTA petugas. Pembagian sebenarnya tetap dihitung
        server dari sisa tagihan, bukan diterima apa adanya: angka yang
        menentukan berapa utang seseorang berkurang tidak boleh datang dari
        peramban.
      */
      const perlakuan =
        req.body.treatment === "RECEIVABLE" ? "RECEIVABLE" : "OVERPAYMENT";
      const jadwal = {
        return_payment_date: req.body.return_payment_date,
        return_payment_method: req.body.return_payment_method,
        return_payment_name: req.body.return_payment_name,
        return_payment_bank: req.body.return_payment_bank ?? null,
        return_payment_number: req.body.return_payment_number ?? null,
      };

      // first need to check if the quantity satisfies
      const validation =
        await this.salesInvoiceRepository.validateSalesReturn(sales_return);

      if (!validation) {
        return res.status(400).send(ErrorList["Sales return insufficient"]);
      }

      /*
        Pembagian nilai retur dihitung SEBELUM returnya lahir.

        Alasannya bukan kerapian: kalau jatuhnya menjadi kelebihan bayar,
        jadwal pengembalian wajib ada — dan menolaknya setelah dokumen
        tersimpan meninggalkan retur yang stoknya sudah kembali tetapi uangnya
        tidak pernah dicatat ke mana pun.

        Sisa tagihan dibaca dari server, tidak dari peramban. Angka yang
        menentukan berapa utang seseorang berkurang tidak boleh datang dari
        sisi yang bisa dikarang.
      */
      const faktur = await this.salesInvoiceRepository.fetchByID(
        sales_invoice_code_id
      );
      if (!faktur) {
        return res.status(404).send(ErrorList["Sales invoice not found"]);
      }

      const hargaBaris = new Map<number, number>(
        (faktur.sales_invoice ?? []).map((x: any) => [
          x.id,
          Number(x.price) - Number(x.discount),
        ])
      );
      const nilaiRetur = items.reduce(
        (a, x) =>
          a + Number(x.quantity) * (hargaBaris.get(x.sales_invoice_id) ?? 0),
        0
      );

      const tagihan = await this.receivableRepository.fetchInvoiceOutstanding(
        sales_invoice_code_id
      );

      /*
        Memotong tagihan hanya sebesar tagihan yang MASIH ada; sisanya jatuh ke
        kelebihan bayar dengan sendirinya. Retur yang melebihi utang memang
        menghasilkan uang yang harus dikembalikan, dan memaksanya tetap
        memotong membuat piutangnya minus — dan piutang minus adalah kelebihan
        bayar yang menyamar.
      */
      const potongTagihan =
        perlakuan === "RECEIVABLE"
          ? Math.min(nilaiRetur, tagihan.outstanding)
          : 0;
      const jadiKelebihan = nilaiRetur - potongTagihan;

      if (
        jadiKelebihan > 0 &&
        (!jadwal.return_payment_date ||
          !jadwal.return_payment_method ||
          !jadwal.return_payment_name)
      ) {
        return res
          .status(400)
          .send(ErrorList["Return payment method is required"]);
      }

      const result = await this.salesReturnRepository.create({
        date: date,
        payment_method_id: payment_method_id,
        name: name,
        created_by: userID,
        created_at: new Date(),
        confirmed_by: userID,
        confirmed_at: new Date(),
        is_confirm: true,
        is_delete: false,
        sales_return: items.map((x) => {
          return {
            sales_invoice_id: x.sales_invoice_id,
            quantity: x.quantity,
            sales_return_code_id: 0,
          };
        }),
        sales_invoice_code_id: sales_invoice_code_id,
      });

      if (!result) {
        return res.status(400).send(ErrorList["Sales return creation failed"]);
      }

      await this.salesReturnRepository.simpanPembagian(
        result.id!,
        potongTagihan,
        jadiKelebihan
      );

      if (jadiKelebihan > 0) {
        await this.overpaymentRepository.create({
          customer_id: result.sales_invoice_code!.customerID!,
          date: date,
          sales_deposit_code_id: null,
          sales_return_code_id: result.id!,
          payment_method_id: payment_method_id,
          return_payment_method: jadwal.return_payment_method,
          return_payment_number: jadwal.return_payment_number,
          return_payment_date: new Date(jadwal.return_payment_date),
          return_payment_bank: jadwal.return_payment_bank,
          return_payment_name: jadwal.return_payment_name,
          created_by: userID,
          created_at: new Date(),
          value: jadiKelebihan,
        });
      }

      await this.productStockRepository.updateMany(
        result.sales_return!.map((x) => {
          return {
            quantity:
              x.quantity *
              (x.sales_invoice?.product_unit == null
                ? 1
                : x.sales_invoice.product_unit.conversion),
            productID: x.sales_invoice!.product_id!,
          };
        })
      );

      const stockCardResult = await this.stockCardRepository.createMany(
        result.sales_return!.map((x) => {
          return {
            date: result.date,
            quantity:
              x.quantity *
              (x.sales_invoice?.product_unit == null
                ? 1
                : x.sales_invoice.product_unit.conversion),
            display_quantity: x.quantity,
            product_id: x.sales_invoice!.product_id,
            product_unit_id: x.sales_invoice!.product_unit_id,
            supplier_id: null,
            customer_id: result.sales_invoice_code!.customerID,
            stock: null,
            document_name: result.name,
            adjustment_case_code_id: null,
            adjustment_case_id: null,
            sales_return_id: x.id!,
            sales_return_code_id: result.id!,
            good_receipt_code_id: null,
            good_receipt_id: null,
            sales_invoice_id: x.sales_invoice_id,
            sales_invoice_code_id: result.sales_invoice_code_id,
            created_at: new Date(),
          };
        })
      );

      await this.stockOutRepository.decreaseMany(
        result.sales_return!.map((x) => {
          return {
            sales_invoice_id: x.sales_invoice_id,
            quantity:
              x.quantity *
              (x.sales_invoice?.product_unit == null
                ? 1
                : x.sales_invoice.product_unit.conversion),
          };
        })
      );

      stockCardResult.forEach(async (x) => {
        await queue.add("stock-card-inserted", {
          id: x.id,
        });
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on creating sales return: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  private generateName(date: Date): string {
    const name = `RJ-${date.getFullYear()}-${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}`;

    return name;
  }

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      const result = await this.salesReturnRepository.fetchByID(id);
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error during fetching sales invoice ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchAnnualArchives = async (req: Request, res: Response) => {
    try {
      const result = await this.salesReturnRepository.fetchAnnualArchives();
      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetching annual good receipt archives ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchArchives = async (req: Request, res: Response) => {
    const year = Number(req.body.year);
    const month = Number(req.body.month);
    const page = translatePage(req.body.page);
    const pageSize = Number(process.env.LIMIT);
    const keyword = translateKeyword(req.body.keyword);
    const isDelete = req.body.isDelete;
    const isActive = req.body.isActive;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;

    try {
      const result = await this.salesReturnRepository.fetchArchives({
        month: month,
        year: year,
        page: page,
        pageSize: pageSize,
        keyword: keyword,
        isDelete: isDelete,
        isActive: isActive,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetching good receipt archives ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  deleteByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userID = req.body.userId;

    try {
      const salesReturn = await this.salesReturnRepository.fetchByID(id);

      if (!salesReturn) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (salesReturn.is_delete) {
        return res.status(400).send(ErrorList["Sales return already deleted"]);
      }

      /*
        Kelebihan bayar yang lahir dari retur ini ikut dibereskan.

        Laporan uang membaca overpayment TANPA menyaring keadaan returnya:
        sisi retur menyaring is_delete, sisi kelebihan bayar tidak. Baris yang
        ditinggalkan membuat uang dari dokumen yang sudah dibatalkan mengambang
        di laporan selamanya — dan karena sisi "dikembalikan" hanya cocok pada
        tanggal rencananya, selisihnya menetap sebagai uang masuk yang tidak
        pernah ada.

        Yang uangnya SUDAH keluar menolak penghapusan, bukan ikut terbuang.
        Membuang catatan uang yang terlanjur ditransfer membuat buku kas
        berhenti cocok dengan rekening, dan itu kesalahan yang jauh lebih mahal
        daripada dokumen yang tidak jadi dihapus.
      */
      const kelebihan =
        await this.overpaymentRepository.fetchBySalesReturnCodeID(id);

      if (kelebihan && kelebihan.is_resolved) {
        return res
          .status(400)
          .send(ErrorList["Sales return overpayment resolved"]);
      }

      const result = await this.salesReturnRepository.delete(id, userID);

      if (kelebihan) {
        await this.overpaymentRepository.deleteBySalesReturnCodeID(id);
      }

      salesReturn.sales_return?.forEach(async (x) => {
        await queue.add("stock-card-deleted", {
          sales_invoice_code_id: salesReturn.sales_invoice_code_id,
          sales_invoice_id: x.sales_invoice_id,
          sales_return_code_id: salesReturn.id!,
          sales_return_id: x.id!,
          adjustment_case_code_id: null,
          adjustment_case_id: null,
          good_receipt_code_id: null,
          good_receipt_id: null,
        });
      });

      await this.productStockRepository.updateMany(
        salesReturn.sales_return!.map((x) => {
          return {
            quantity:
              -1 *
              x.quantity *
              (x.sales_invoice?.product_unit == null
                ? 1
                : x.sales_invoice.product_unit.conversion),
            productID: x.sales_invoice!.product_id!,
          };
        })
      );

      await this.stockOutRepository.create(
        salesReturn.sales_return!.map((x) => {
          return {
            sales_invoice_code_id: salesReturn.sales_invoice_code_id,
            sales_invoice_id: x.sales_invoice_id,
            date: salesReturn.sales_invoice_code!.date,
            product_id: x.sales_invoice!.product_id,
            quantity:
              x.quantity *
              (x.sales_invoice!.product_unit == null
                ? 1
                : x.sales_invoice!.product_unit.conversion),
            price:
              (x.sales_invoice!.price - x.sales_invoice!.discount) /
              (x.sales_invoice?.product_unit == null
                ? 1
                : x.sales_invoice.product_unit.conversion),
            stock_in_id: null,
            adjustment_case_code_id: null,
            adjustment_case_id: null,
          };
        })
      );

      /*
        Baris stock_out yang baru dibuat ulang di atas belum menunjuk lapisan
        stock_in mana pun. Tanpa sapuan ini ia menggantung tak-teralokasi
        sampai kebetulan ada dokumen lain yang memicu penetapan.
      */
      await queue.add("hpp-assign", {});

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on deleting sales return ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}

export default SalesReturnController;
