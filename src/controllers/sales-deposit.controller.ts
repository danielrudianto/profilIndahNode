import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import ErrorList from "../constants/error-list.constant";
import {
  translateDate,
  translateKeyword,
  translatePage,
  translateSalesName,
} from "../utils/escape.helper";
import { queue } from "../utils/queue.helper";
import { SalesDepositPaymentModel } from "../models/sales-deposit-payment.model";
import { OverpaymentRepository } from "../repositories/overpayment.repository";
import { ReceivableRepository } from "../repositories/receivable.repository";
import { SalesDepositRepository } from "../repositories/sales-deposit.repository";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { StockCardRepository } from "../repositories/stock-card.repository";
import { StockOutRepository } from "../repositories/stock-out.repository";
import { ProductStockRepository } from "../repositories/product-stock.repository";

export class SalesDepositController {
  salesDepositRepository: SalesDepositRepository;
  salesInvoiceRepository: SalesInvoiceRepository;
  stockCardRepository: StockCardRepository;
  productStockRepository: ProductStockRepository;
  stockOutRepository: StockOutRepository;
  receivableRepository: ReceivableRepository;
  overpaymentRepository: OverpaymentRepository;
  prisma: PrismaClient;

  constructor(
    salesDepositRepository: SalesDepositRepository,
    salesInvoiceRepository: SalesInvoiceRepository,
    stockCardRepository: StockCardRepository,
    productStockRepository: ProductStockRepository,
    stockOutRepository: StockOutRepository,
    receivableRepository: ReceivableRepository,
    overpaymentRepository: OverpaymentRepository,
    prisma: PrismaClient
  ) {
    this.salesDepositRepository = salesDepositRepository;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.stockCardRepository = stockCardRepository;
    this.productStockRepository = productStockRepository;
    this.stockOutRepository = stockOutRepository;
    this.receivableRepository = receivableRepository;
    this.overpaymentRepository = overpaymentRepository;
    this.prisma = prisma;
  }

  create = async (req: Request, res: Response) => {
    const userID = req.body.userId;
    const customerID = req.body.customer_id;
    const discount = Number(req.body.discount);
    const delivery = Number(req.body.delivery);
    const service = Number(req.body.service);
    /*
      `?? 0` bukan kelonggaran: skema menolak permintaan yang tidak menyebut
      biaya admin, jadi di jalur HTTP ia selalu ada. Yang dijaga di sini adalah
      pemanggil yang melewati skema — nilai yang hilang menjadi NaN, dan NaN
      dalam hitungan piutang merusak diam-diam sampai jauh di kemudian hari,
      sementara nol adalah arti sebenarnya dari "tidak ada biaya admin".
    */
    const adminFee = Number(req.body.admin_fee ?? 0);
    const serviceType = req.body.service_type ?? null;
    const sales_invoice = req.body.sales_invoice as any[];
    const sales_invoice_payment = req.body.sales_invoice_payment as any[];
    const payment_term = req.body.payment_term;
    const date = translateDate(req.body.date);
    const isPaid = req.body.is_paid;
    const sales = translateSalesName(req.body.sales);
    const uuid = req.body.uuid;
    const type = req.body.type;

    try {
      const billResult = await this.salesDepositRepository.create({
        name: await this.salesDepositRepository.generateAvailableName(date),
        uuid: uuid,
        customerID: customerID,
        discount: discount,
        delivery: delivery,
        service: service,
        adminFee: adminFee,
        serviceType: serviceType,
        sales: sales,
        isPaid: isPaid,
        date: date,
        createdBy: userID,
        createdAt: new Date(),
        isConfirm: true,
        confirmedBy: userID,
        confirmedAt: new Date(),
        sales_deposit: sales_invoice,
        sales_deposit_payment: sales_invoice_payment.map((x) => {
          return new SalesDepositPaymentModel({
            date: translateDate(x.date),
            payment_method_id: x.payment_method_id,
            value: Number(x.value),
            sales_deposit_code_id: 0,
          });
        }),
        isDelete: false,
        type: type,
      });

      if (!billResult) {
        return res.status(500).send(ErrorList["Sales deposit creation failed"]);
      }

      return res.status(201).send(billResult);
    } catch (error) {
      console.error(`[error]: Error on creating bill ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetch = async (req: Request, res: Response) => {
    const page = translatePage(req.query.page);
    const keyword = translateKeyword(req.query.keyword);
    const pageSize = Number(req.query.pageSize);

    try {
      const result = await this.salesDepositRepository.fetch({
        page: page,
        pageSize: pageSize,
        keyword: keyword,
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching sales deposit ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  /* Rincian pemegang deposit terbuka satu produk — dipakai kartu stok. */
  fetchOutstandingByProduct = async (req: Request, res: Response) => {
    try {
      const productID = Number(req.params.id);
      const result =
        await this.salesDepositRepository.fetchOutstandingByProduct(productID);
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching outstanding deposits ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchByID = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const result = await this.salesDepositRepository.fetchByID(id);
      if (!result) {
        return res.status(404).send(ErrorList["Sales deposit not found"]);
      }

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching sales deposit ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchAnnualArchives = async (req: Request, res: Response) => {
    try {
      const result = await this.salesDepositRepository.fetchAnnualArchives();
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching annual archive ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchArchives = async (req: Request, res: Response) => {
    const year = req.body.year;
    const month = req.body.month;
    /*
      Dari BADAN permintaan, bukan query string. Rutenya POST dan skemanya
      mewajibkan keduanya di badan; membaca req.query membuat arsip selalu
      menampilkan halaman pertama dan pencariannya mati sama sekali.
    */
    const keyword = translateKeyword(req.body.keyword);
    const page = translatePage(req.body.page);
    const offset = Number(process.env.LIMIT!);
    const isPending = req.body.isPending as boolean;
    const isDelete = req.body.isDelete as boolean;
    const startDate = new Date(`${req.body.startDate}T00:00:00+08:00`);
    const endDate = new Date(`${req.body.endDate}T23:59:59+08:00`);

    const sortBy = req.body.sortBy;
    const sortDirection = req.body.sortDirection;

    try {
      const result = await this.salesDepositRepository.fetchArchives({
        month: month,
        year: year,
        keyword: keyword,
        limit: offset,
        offset: (page - 1) * offset,
        isPending: isPending,
        isDelete: isDelete,
        sortBy: sortBy,
        sortDirection: sortDirection,
        startDate: startDate,
        endDate: endDate,
      });
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching archive ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  confirm = async (req: Request, res: Response) => {
    const id = Number(req.body.id);
    const date = new Date(req.body.date);
    const userID = req.body.userId;
    const sales_invoice_payment = req.body.sales_invoice_payment as any[];

    try {
      const deposit = await this.salesDepositRepository.fetchByID(id);
      if (!deposit) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (deposit.isDelete || deposit.isConfirm) {
        return res.status(400).send(ErrorList["Deposit already confirmed"]);
      }

      const value =
        (deposit.sales_deposit?.reduce((a, b) => {
          return a + b.quantity * (b.price - b.discount);
        }, 0) ?? 0) +
        deposit.delivery +
        deposit.service +
        Number(deposit.adminFee ?? 0) -
        deposit.discount;

      const payment = sales_invoice_payment.reduce((a: any, b: any) => {
        return a + b.value;
      }, 0);

      if (payment > value) {
        return res
          .status(400)
          .send(ErrorList["Sales deposit payment is greater than value"]);
      }
      const customerID = deposit.customerID;

      /*
        SATU TRANSAKSI untuk seluruh tulisan basis data di bawah.

        Sebelumnya keenam langkah berjalan sendiri-sendiri, sehingga kegagalan
        di tengah meninggalkan keadaan separuh jadi: fakturnya sudah terbit,
        tetapi setoran belum tertandai, stok belum berkurang, dan kartu stoknya
        belum ada. Keadaan itu tidak bisa dibereskan lewat aplikasi — percobaan
        ulang selalu berhenti di pembuatan faktur karena uuid setoran sudah
        terpakai, dan uuid itu unik pada sales_invoice_code.

        Kini tidak ada yang tersimpan kecuali semuanya berhasil, sehingga
        percobaan ulang selalu bertemu keadaan awal yang bersih.

        Batas waktunya dinaikkan dari 5 detik bawaan: faktur dengan banyak baris
        barang menulis satu baris stok keluar dan satu kartu stok untuk tiap
        barang, dan kehabisan waktu di tengah justru menciptakan kegagalan baru
        pada dokumen yang paling besar.
      */
      /* Nomor diundi dan dicek DI LUAR transaksi — tabrakan tidak perlu
         membatalkan seluruh pekerjaan besar di dalamnya. */
      const namaFaktur =
        await this.salesInvoiceRepository.generateAvailableName(date);

      const result = await this.prisma.$transaction(
        async (tx) => {
          const faktur = await this.salesInvoiceRepository.create(
            {
              /*
          Penomoran memakai generateName milik repository FAKTUR, bukan milik
          setoran. Sebelumnya yang dipakai adalah milik setoran, sehingga faktur
          hasil konfirmasi beredar dengan nomor berawalan DPS-: penomoran faktur
          jadi tidak berurutan, dan nomor itu bisa bertabrakan dengan nomor
          dokumen setoran aslinya.

          Asal-usulnya tetap terlacak — tapi lewat kolom sales_invoice_code_id
          pada sales_deposit_code yang ditulis di bawah, bukan lewat awalan nomor.
        */
              name: namaFaktur,
              date: new Date(date),
              customerID: customerID,
              sales: deposit.sales,
              createdAt: new Date(),
              createdBy: userID,
              discount: deposit.discount,
              delivery: deposit.delivery,
              service: deposit.service,
              adminFee: deposit.adminFee,
              /* Jenisnya ikut dari setoran; faktur ini bukan tempat memilih ulang. */
              serviceType: deposit.serviceType ?? null,
              uuid: deposit.uuid,
              sales_invoice: deposit.sales_deposit!.map((x) => {
                return {
                  product_id: x.product_id,
                  product_unit_id: x.product_unit_id,
                  quantity: x.quantity,
                  price: x.price,
                  discount: x.discount,
                };
              }),
              sales_invoice_payment: sales_invoice_payment!.map((x: any) => {
                return {
                  payment_method_id: x.payment_method_id,
                  value: x.value,
                  date: new Date(x.date),
                  sales_invoice_code_id: 0,
                };
              }),
              isPaid: deposit.isPaid,
              isConfirm: true,
              isDelete: false,
              confirmedAt: new Date(),
              confirmedBy: userID,
            },
            tx
          );

          await this.salesDepositRepository.confirmByID(
            id,
            userID,
            faktur.id!,
            tx
          );

          await this.stockOutRepository.create(
            faktur.sales_invoice!.map((x) => {
              const conversion =
                x.product_unit == null ? 1 : x.product_unit.conversion;
              return {
                stock_in_id: null,
                product_id: x.product_id,
                adjustment_case_code_id: null,
                adjustment_case_id: null,
                date: date,
                quantity: Number(x.quantity * conversion),
                /* Netto diskon baris — sejalan dengan faktur penjualan dan CLI. */
                price: Number((x.price - x.discount) / conversion),
                sales_invoice_id: x.id!,
                sales_invoice_code_id: faktur.id!,
              };
            }),
            tx
          );

          await this.productStockRepository.updateMany(
            faktur.sales_invoice!.map((x) => {
              const conversion =
                x.product_unit == null ? 1 : x.product_unit.conversion;

              return {
                productID: x.product_id,
                quantity: -1 * x.quantity * conversion,
              };
            }),
            tx
          );

          const kartuStok = await this.stockCardRepository.createMany(
            faktur.sales_invoice!.map((x) => {
              const conversion =
                x.product_unit == null ? 1 : x.product_unit.conversion;

              return {
                product_id: x.product_id,
                product_unit_id: x.product_unit_id,
                quantity: -1 * x.quantity * conversion,
                display_quantity: -1 * x.quantity,
                date: faktur.date,
                document_name: faktur.name,
                sales_invoice_id: x.id!,
                sales_invoice_code_id: faktur.id!,
                adjustment_case_code_id: null,
                adjustment_case_id: null,
                good_receipt_code_id: null,
                good_receipt_id: null,
                sales_return_id: null,
                sales_return_code_id: null,
                stock: null,
                customer_id: faktur.customerID,
                supplier_id: null,
                created_at: new Date(),
              };
            }),
            tx
          );

          return { faktur, kartuStok };
        },
        { timeout: 30000 }
      );

      /*
        Yang di bawah ini SENGAJA di luar transaksi, dan urutannya penting.

        addReceivableValue menaikkan penghitung di Redis, bukan di basis data.
        Redis tidak ikut dibatalkan ketika transaksi gagal, sehingga menaikkannya
        di dalam transaksi akan membuat total piutang membesar untuk konfirmasi
        yang sebenarnya tidak jadi.

        queue.add juga menulis ke Redis. Pekerjaan yang terlanjur mengantre untuk
        kartu stok yang batal tersimpan akan mencari baris yang tidak pernah ada.

        Keduanya baru dijalankan setelah transaksi benar-benar commit.
      */
      if (!deposit.isPaid) {
        await this.receivableRepository.addReceivableValue(value - payment);
      }

      for (const kartu of result.kartuStok) {
        await queue.add("stock-card-inserted", { id: kartu.id });
      }

      /* Penetapan HPP menyusul di worker — lihat case hpp-assign. */
      await queue.add("hpp-assign", {});

      return res.status(201).send(result.faktur);
    } catch (error) {
      /*
        Blok ini sebelumnya hanya mencatat ke log dan tidak pernah menyentuh
        `res`, sehingga permintaannya menggantung sampai klien timeout. Kasir
        yang tidak menerima balasan apa pun wajar mengira konfirmasinya belum
        masuk, lalu menekan tombolnya lagi — dan justru percobaan ulang itulah
        yang berbahaya.

        Rangkaian di atas TIDAK dibungkus transaksi: fakturnya dibuat lebih
        dulu, penandaan depositnya lewat confirmByID() menyusul setelahnya.
        Bila kegagalan jatuh di antara keduanya, deposit belum tertandai
        sehingga penjaga `isDelete || isConfirm` di awal belum menutup pintu,
        dan percobaan ulang menerbitkan faktur KEDUA untuk deposit yang sama.

        Membalas 500 tidak menutup celah transaksinya — itu perlu $transaction
        yang mencakup faktur sampai kartu stok — tetapi menghentikan percobaan
        ulang yang tidak disengaja, dan memunculkan kegagalannya alih-alih
        membiarkan operasi selesai separuh jalan tanpa ada yang tahu.
      */
      console.error(`[error]: Error on confirming sales deposit ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  reject = async (req: Request, res: Response) => {
    const id = Number(req.body.id);
    const userID = req.body.userId;
    const method = req.body.method;

    try {
      const salesDeposit = await this.salesDepositRepository.fetchByID(id);
      if (!salesDeposit) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (salesDeposit.isConfirm || salesDeposit.isDelete) {
        return res.status(400).send(ErrorList["Deposit already confirmed"]);
      }

      const result = await this.salesDepositRepository.delete(id, userID);

      if (method == "create") {
        const return_payment_date = translateDate(req.body.return_payment_date);
        const return_payment_method = req.body.return_payment_method;
        const return_payment_number = req.body.return_payment_number;
        const return_payment_bank = req.body.return_payment_bank;
        const return_payment_name = req.body.return_payment_name;

        const deposit_payment = await this.overpaymentRepository.createMany(
          salesDeposit.sales_deposit_payment!.map((x) => {
            return {
              date: x.date,
              sales_deposit_code_id: id,
              customer_id: salesDeposit.customerID!,
              payment_method_id: x.payment_method_id,
              return_payment_date: return_payment_date,
              return_payment_bank: return_payment_bank,
              return_payment_name: return_payment_name,
              return_payment_method: return_payment_method ?? null,
              return_payment_number: return_payment_number ?? null,
              created_by: userID,
              created_at: new Date(),
              value: Number(x.value),
            };
          })
        );
      }

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on deleting sales deposit ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}
