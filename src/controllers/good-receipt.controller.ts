import { Request, Response } from "express";
import ErrorList from "../constants/error-list.constant";
import {
  translateFaktur,
  translateKeyword,
  translatePage,
  translatePageSize,
} from "../utils/escape.helper";
import { alokasiDiskonFaktur } from "../utils/hpp.helper";

import { queue } from "../utils/queue.helper";
import { GoodReceiptRepository } from "../repositories/good-receipt.repository";
import { StockCardRepository } from "../repositories/stock-card.repository";
import { StockInRepository } from "../repositories/stock-in.repository";
import { ProductStockRepository } from "../repositories/product-stock.repository";

class GoodReceiptController {
  private goodReceiptRepository: GoodReceiptRepository;
  private stockInRepository: StockInRepository;
  private productStockRepository: ProductStockRepository;
  private stockCardRepository: StockCardRepository;

  constructor(
    goodReceiptRepository: GoodReceiptRepository,
    stockInRepository: StockInRepository,
    productStockRepository: ProductStockRepository,
    stockCardRepository: StockCardRepository
  ) {
    this.goodReceiptRepository = goodReceiptRepository;
    this.stockInRepository = stockInRepository;
    this.productStockRepository = productStockRepository;
    this.stockCardRepository = stockCardRepository;
  }

  create = async (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt as any[];

    const invoice_name = req.body.invoice_name;
    const faktur = req.body.faktur;
    const discount = req.body.discount;

    const userID = req.body.userId;
    const uuid = req.body.uuid;

    const is_confirm =
      req.body.is_confirm == undefined ? false : req.body.is_confirm;

    try {
      /*
        Diskon faktur harus tertampung baris — kalau melebihi total nilai
        baris, harga pokoknya jadi negatif dan itu bukan dokumen yang sah.
      */
      const totalBaris = good_receipt_items.reduce(
        (a, x) =>
          a + (Number(x.price) - Number(x.discount)) * Number(x.quantity),
        0
      );
      /*
        Diskon NOL tidak bisa melebihi apa pun, jadi tidak diperiksa.

        Tanpa penjaga ini, penerimaan yang tidak memungut diskon sama sekali
        ikut ditolak ketika total barisnya negatif — dan itu terjadi tanpa
        seorang pun mengetik harga. Layar penerimaan tidak menampilkan harga
        (banner-nya sendiri menyebut harga diinput lewat faktur pembelian),
        tetapi barisnya disemai purchase_price dan purchase_discount dari
        master barang. Barang yang di master punya diskon beli sementara harga
        belinya masih nol menghasilkan (0 − diskon) × jumlah — negatif — dan
        0 > negatif bernilai benar.

        Petugas lalu melihat "Diskon faktur tidak boleh melebihi total nilai
        barang" pada layar yang tidak punya satu pun kolom harga.
      */
      const diskonDokumen = Number(discount ?? 0);
      if (
        diskonDokumen > 0 &&
        Number.isFinite(totalBaris) &&
        diskonDokumen > totalBaris
      ) {
        return res.status(400).send(ErrorList["Discount > total"]);
      }

      const result = await this.goodReceiptRepository.create({
        uuid: uuid,
        name: name,
        invoice_name: invoice_name,
        faktur: faktur,
        date: date,
        company_id: company_id,
        supplier_id: supplier_id,
        created_at: new Date(),
        created_by: userID,
        good_receipt: good_receipt_items.map((x, index) => {
          return {
            product_id: x.product_id,
            product_unit_id: x.product_unit_id,
            quantity: x.quantity,
            price: x.price,
            discount: x.discount,
          };
        }),
        discount: discount,
        confirmed_at: is_confirm ? new Date() : null,
        confirmed_by: is_confirm ? userID : null,
        is_confirm: is_confirm,
        is_delete: false,
      });

      /*
        HPP #4: diskon faktur dialokasikan pro-rata ke baris, jadi harga
        pokok lapisan = nilai bersih baris setelah bagiannya, per satuan
        dasar. Dokumen tanpa diskon menghasilkan alokasi nol — rumusnya
        jatuh kembali ke (harga - diskon barang) / konversi yang lama.
      */
      const alokasi = alokasiDiskonFaktur(
        result.good_receipt!.map((x) => (x.price - x.discount) * x.quantity),
        Number(discount ?? 0)
      );

      await this.stockInRepository.createMany(
        result.good_receipt!.map((x, i) => {
          const konversi =
            x.product_unit == null ? 1 : x.product_unit.conversion;
          return {
            good_receipt_code_id: result.id!,
            good_receipt_id: x.id!,
            adjustment_case_code_id: null,
            adjustment_case_id: null,
            price:
              ((x.price - x.discount) * x.quantity - alokasi[i]) /
              (x.quantity * konversi),
            product_id: x.product_id,
            quantity: x.quantity * konversi,
            company_id: result.company_id,
            date: result.date,
          };
        })
      );

      await this.productStockRepository.updateMany(
        result.good_receipt!.map((x) => {
          return {
            productID: x.product_id,
            quantity:
              x.quantity *
              (x.product_unit_id == null ? 1 : x.product_unit!.conversion),
          };
        })
      );

      const stockCardResult = await this.stockCardRepository.createMany(
        result.good_receipt!.map((x) => {
          return {
            document_name: result.name,
            customer_id: null,
            supplier_id: result.supplier_id,
            date: result.date,
            good_receipt_id: x.id!,
            good_receipt_code_id: result.id!,
            adjustment_case_code_id: null,
            adjustment_case_id: null,
            sales_invoice_code_id: null,
            sales_invoice_id: null,
            sales_return_code_id: null,
            sales_return_id: null,
            quantity:
              x.quantity *
              (x.product_unit_id == null ? 1 : x.product_unit!.conversion),
            display_quantity: x.quantity,
            stock: null,
            product_id: x.product_id,
            product_unit_id: x.product_unit_id,
            created_at: new Date(),
          };
        })
      );

      stockCardResult.forEach(async (x) => {
        await queue.add("stock-card-inserted", {
          id: x.id,
        });
      });

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on creating good receipt ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  update = async (req: Request, res: Response) => {
    const id = req.body.id;
    const date = new Date(req.body.date);
    const name = req.body.name;
    const invoice_name = req.body.invoice_name;
    const faktur = translateFaktur(req.body.faktur);
    const discount = req.body.discount;
    const good_receipt = req.body.good_receipt;
    const userID = req.body.userId;
    const supplierID = req.body.supplier_id;
    const companyID = req.body.company_id;

    try {
      const data = await this.goodReceiptRepository.fetchByID(id);
      if (!data) {
        return res.status(404).send(ErrorList["Good receipt not found"]);
      }

      if (data.is_delete) {
        return res.status(400).send(ErrorList["Good receipt already deleted"]);
      }

      if (!data.is_confirm) {
        return res.status(400).send(ErrorList["Good receipt not confirmed"]);
      }

      /* Diskon faktur wajib tertampung total nilai baris — cermin create. */
      const totalBaris = (good_receipt as any[]).reduce(
        (a, x) =>
          a + (Number(x.price) - Number(x.discount)) * Number(x.quantity),
        0
      );
      const diskonDokumen = Number(discount ?? 0);
      if (
        diskonDokumen > 0 &&
        Number.isFinite(totalBaris) &&
        diskonDokumen > totalBaris
      ) {
        return res.status(400).send(ErrorList["Discount > total"]);
      }

      const result = await this.goodReceiptRepository.update({
        uuid: data.uuid,
        id: id,
        name: name,
        invoice_name: invoice_name,
        supplier_id: supplierID,
        company_id: companyID,
        date: date,
        faktur: faktur,
        discount: discount,
        is_confirm: true,
        is_delete: false,
        confirmed_at: new Date(),
        confirmed_by: userID,
        good_receipt: good_receipt.map((x: any) => {
          return {
            quantity: x.quantity,
            product_id: x.product_id,
            product_unit_id: x.product_unit_id,
            price: x.price,
            discount: x.discount,
            id: x.id,
          };
        }),
      });

      if (result) {
        await this.stockInRepository.deleteMany(
          data.good_receipt!.map((x) => {
            return {
              good_receipt_code_id: id,
              good_receipt_id: x.id!,
              adjustment_case_code_id: null,
              adjustment_case_id: null,
              price: 0,
            };
          })
        );

        await this.productStockRepository.updateMany(
          data.good_receipt!.map((x) => {
            return {
              productID: x.product_id,
              quantity:
                -1 *
                x.quantity *
                (x.product_unit == null ? 1 : x.product_unit.conversion),
            };
          })
        );

        for (let i = 0; i < data.good_receipt!.length; i++) {
          await queue.add("stock-card-deleted", {
            sales_invoice_code_id: null,
            sales_invoice_id: null,
            adjustment_case_code_id: null,
            adjustment_case_id: null,
            sales_return_code_id: null,
            sales_return_id: null,
            good_receipt_code_id: id,
            good_receipt_id: data.good_receipt![i].id,
          });

          await queue.add("good-receipt-deleted", data.good_receipt![i].id);
        }

        /* HPP #4: bagian diskon faktur tiap baris, pro-rata nilai bersih. */
        const alokasi = alokasiDiskonFaktur(
          result.good_receipt!.map((x) => (x.price - x.discount) * x.quantity),
          Number(discount ?? 0)
        );

        await this.stockInRepository.createMany(
          result.good_receipt!.map((x, i) => {
            const konversi =
              x.product_unit == null ? 1 : x.product_unit.conversion;

            return {
              good_receipt_code_id: result.id!,
              good_receipt_id: x.id!,
              adjustment_case_code_id: null,
              adjustment_case_id: null,
              /*
                Nilai bersih baris (dikurangi bagian diskon faktur) dibagi
                kuantitas satuan dasar. Dibagi konversi karena kuantitasnya
                satuan dasar — jalur ini sempat menulis harga netto per
                satuan DOKUMEN pada kuantitas satuan dasar: 3 box @1,5jt
                menjadi 300 pcs @1,47jt per pcs, HPP meledak seratus kali.
              */
              price:
                ((x.price - x.discount) * x.quantity - alokasi[i]) /
                (x.quantity * konversi),
              product_id: x.product_id,
              quantity: x.quantity * konversi,
              company_id: result.company_id,
              date: result.date,
            };
          })
        );

        await this.productStockRepository.updateMany(
          result.good_receipt!.map((x) => {
            return {
              productID: x.product_id,
              quantity:
                x.quantity *
                (x.product_unit_id == null ? 1 : x.product_unit!.conversion),
            };
          })
        );

        await this.stockCardRepository.createMany(
          result.good_receipt!.map((x) => {
            return {
              document_name: result.name,
              customer_id: null,
              supplier_id: result.supplier_id,
              date: result.date,
              good_receipt_id: x.id!,
              good_receipt_code_id: id!,
              adjustment_case_code_id: null,
              adjustment_case_id: null,
              sales_invoice_code_id: null,
              sales_invoice_id: null,
              sales_return_code_id: null,
              sales_return_id: null,
              quantity:
                x.quantity *
                (x.product_unit_id == null ? 1 : x.product_unit!.conversion),
              display_quantity: x.quantity,
              stock: null,
              product_id: x.product_id,
              product_unit_id: x.product_unit_id,
              created_at: new Date(),
            };
          })
        );

        /*
          Stock_out yang tadinya menempel pada lapisan lama sudah dilepas oleh
          deleteMany di atas — sapu sekali supaya mereka menempel ke lapisan
          baru, bukan menunggu dokumen berikutnya.
        */
        await queue.add("hpp-assign", {});

        return res.status(201).send(result);
      }
    } catch (error) {
      console.error(`[error]: Error on updating good receipt ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  delete = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userID = req.body.userId;
    try {
      const goodReceipt = await this.goodReceiptRepository.fetchByID(id);
      if (!goodReceipt) {
        return res.status(404).send(ErrorList["Good receipt not found"]);
      }

      if (!goodReceipt.is_confirm) {
        return res.status(400).send(ErrorList["Good receipt not confirmed"]);
      }

      if (goodReceipt.is_delete) {
        return res.status(400).send(ErrorList["Good receipt already deleted"]);
      }

      console.info(`[info]: Preparing deletation for good receipt ${id}`);

      const result = await this.goodReceiptRepository.delete(id, userID);

      console.info(
        `[info]: Commencing deletation for stock card for good receipt ID ${id}`
      );

      goodReceipt.good_receipt?.forEach(async (x) => {
        await queue.add("stock-card-deleted", {
          sales_invoice_code_id: null,
          sales_invoice_id: null,
          sales_return_code_id: null,
          sales_return_id: null,
          adjustment_case_code_id: null,
          adjustment_case_id: null,
          good_receipt_code_id: id,
          good_receipt_id: x.id!,
        });
      });

      console.info(
        `[info]: Completed deletation for stock card for good receipt ID ${id}`
      );

      console.info(
        `[info]: Commencing deletation for stock in for good receipt ID ${id}`
      );

      await this.stockInRepository.deleteMany(
        goodReceipt.good_receipt!.map((x) => {
          return {
            good_receipt_code_id: id,
            good_receipt_id: x.id!,
            adjustment_case_code_id: null,
            adjustment_case_id: null,
            price: 0,
          };
        })
      );

      await this.productStockRepository.updateMany(
        goodReceipt.good_receipt!.map((x) => {
          return {
            productID: x.product_id,
            quantity:
              x.quantity *
              -1 *
              (x.product_unit == null ? 1 : x.product_unit.conversion),
          };
        })
      );

      console.info(
        `[info]: Completed deletation for stock in for good receipt ID ${id}`
      );

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on deleting good receipt ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  check = async (req: Request, res: Response) => {
    const name = req.body.name;
    try {
      const result = await this.goodReceiptRepository.fetchByName(name);
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on checking good receipt ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      const result = await this.goodReceiptRepository.fetchByID(id);
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching good receipt ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchUnconfirmed = async (req: Request, res: Response) => {
    const page = translatePage(req.query.page);
    /*
      Kata kunci dan ukuran halaman dibaca dari permintaan, bukan dikunci.

      Sebelumnya keduanya dipaku — keyword selalu kosong dan pageSize selalu
      dari env — sehingga halaman "menunggu faktur" tidak bisa dicari maupun
      diatur jumlah barisnya, padahal repository-nya sudah menerima keduanya.
    */
    const keyword = translateKeyword(req.query.keyword);
    const pageSize = translatePageSize(req.query.pageSize);

    try {
      const result = await this.goodReceiptRepository.fetchUnconfirmed({
        keyword: keyword,
        page: page,
        pageSize: pageSize,
      });
      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetching unconfirmed good receipts ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchAnnualArchives = async (req: Request, res: Response) => {
    try {
      const result = await this.goodReceiptRepository.fetchAnnualArchives();
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
    const endDate = new Date(req.body.endDate);
    const startDate = new Date(req.body.startDate);
    const sortBy = req.body.sortBy;
    const sortDirection = req.body.sortDirection;
    const isActive = req.body.isActive;
    const isDelete = req.body.isDelete;
    const isPending = req.body.isPending;

    try {
      const result = await this.goodReceiptRepository.fetchArchives({
        month: month,
        year: year,
        page: page,
        pageSize: pageSize,
        keyword: keyword,
        endDate: endDate,
        startDate: startDate,
        sortBy: sortBy,
        sortDirection: sortDirection,
        isActive: isActive,
        isDelete: isDelete,
        isPending: isPending,
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetching good receipt archives ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  confirm = async (req: Request, res: Response) => {
    const id = req.body.id;
    const date = new Date(req.body.date);
    const name = req.body.name;
    const invoice_name = req.body.invoice_name;
    const faktur = translateFaktur(req.body.faktur);
    const discount = req.body.discount;
    const good_receipt = req.body.good_receipt;
    const userID = req.body.userId;

    try {
      const data = await this.goodReceiptRepository.fetchByID(id);

      if (!data) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (data.is_confirm) {
        return res
          .status(400)
          .send(ErrorList["Good receipt already confirmed"]);
      }

      if (data.is_delete) {
        return res.status(400).send(ErrorList["Good receipt already deleted"]);
      }

      /*
        Harga/diskon baru datang dari body, kuantitas dan konversi dari
        dokumen yang sudah ada — digabung per id. Lapisan stok dihitung
        dari gabungan ini, BUKAN dari include hasil confirm: include pada
        update kode dibaca sebelum update baris dalam transaksi yang sama,
        jadi isinya masih harga lama.
      */
      const barisDb = new Map(data.good_receipt!.map((x) => [x.id, x]));
      const barisBaru = (good_receipt as any[])
        .filter((x) => barisDb.has(x.id))
        .map((x) => {
          const db = barisDb.get(x.id)!;
          return {
            id: Number(x.id),
            price: Number(x.price),
            discount: Number(x.discount),
            quantity: Number(db.quantity),
            konversi:
              db.product_unit == null ? 1 : Number(db.product_unit.conversion),
          };
        });

      /* Diskon faktur wajib tertampung total nilai baris — cermin create. */
      const totalBaris = barisBaru.reduce(
        (a, x) => a + (x.price - x.discount) * x.quantity,
        0
      );
      const diskonDokumen = Number(discount ?? 0);
      if (
        diskonDokumen > 0 &&
        Number.isFinite(totalBaris) &&
        diskonDokumen > totalBaris
      ) {
        return res.status(400).send(ErrorList["Discount > total"]);
      }

      const goodReceipt = await this.goodReceiptRepository.confirm({
        uuid: data.uuid,
        id: id,
        name: name,
        invoice_name: invoice_name,
        date: date,
        faktur: faktur,
        discount: discount,
        is_confirm: true,
        is_delete: false,
        confirmed_at: new Date(),
        confirmed_by: userID,
        good_receipt: good_receipt.map((x: any) => {
          return {
            price: x.price,
            discount: x.discount,
            id: x.id,
          };
        }),
        company_id: data.company_id,
        supplier_id: data.supplier_id,
      });

      /* HPP #4: bagian diskon faktur tiap baris, pro-rata nilai bersih. */
      const alokasi = alokasiDiskonFaktur(
        barisBaru.map((x) => (x.price - x.discount) * x.quantity),
        Number(discount ?? 0)
      );

      await this.stockInRepository.updateMany(
        barisBaru.map((x, i) => {
          return {
            good_receipt_id: x.id,
            good_receipt_code_id: id,
            adjustment_case_id: null,
            adjustment_case_code_id: null,
            price:
              ((x.price - x.discount) * x.quantity - alokasi[i]) /
              (x.quantity * x.konversi),
          };
        })
      );

      return res.status(200).send(goodReceipt);
    } catch (error) {
      console.error(`[error]: Error on confirming purchase invoice ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  reject = async (req: Request, res: Response) => {
    const id = req.body.id;
    const userID = req.body.userId;

    try {
      const data = await this.goodReceiptRepository.fetchByID(id);

      if (!data) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (data.is_confirm) {
        return res
          .status(400)
          .send(ErrorList["Good receipt already confirmed"]);
      }

      if (data.is_delete) {
        return res.status(400).send(ErrorList["Good receipt already deleted"]);
      }

      const result = await this.goodReceiptRepository.reject({
        uuid: data.uuid,
        id: id,
        name: data.name,
        invoice_name: data.invoice_name,
        date: data.date,
        faktur: data.faktur,
        discount: data.discount,
        is_confirm: false,
        is_delete: true,
        confirmed_at: new Date(),
        confirmed_by: userID,
        company_id: data.company_id,
        supplier_id: data.supplier_id,
      });

      if (!result) {
        return res.status(400).send(ErrorList["Good receipt creation failed"]);
      }

      await this.stockInRepository.deleteMany(
        data.good_receipt!.map((x: any) => {
          return {
            good_receipt_id: x.id,
            good_receipt_code_id: id,
            adjustment_case_id: null,
            adjustment_case_code_id: null,
            price: 0,
          };
        })
      );

      await this.productStockRepository.updateMany(
        data.good_receipt!.map((x) => {
          return {
            productID: x.product_id,
            quantity:
              -1 *
              x.quantity *
              (x.product_unit == null ? 1 : x.product_unit.conversion),
          };
        })
      );

      for (let i = 0; i < data.good_receipt!.length; i++) {
        await queue.add("stock-card-deleted", {
          sales_invoice_code_id: null,
          sales_invoice_id: null,
          adjustment_case_code_id: null,
          adjustment_case_id: null,
          sales_return_code_id: null,
          sales_return_id: null,
          good_receipt_code_id: id,
          good_receipt_id: data.good_receipt![i].id,
        });
      }

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on confirming purchase invoice ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}

export default GoodReceiptController;
