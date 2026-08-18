import { Request, Response } from "express";
import { UMUR_CACHE_LAPORAN } from "../constants/cache.constant";
import { redisClient } from "../utils/redis.helper";
import { GoodReceiptRepository } from "../repositories/good-receipt.repository";
import { StockInRepository } from "../repositories/stock-in.repository";
import { StockOutRepository } from "../repositories/stock-out.repository";
import { ProductRepository } from "../repositories/product.repository";
import { ProductStockRepository } from "../repositories/product-stock.repository";
import { AdjustmentCaseRepository } from "../repositories/adjustment-case.repository";
import { CompanyRepository } from "../repositories/company.repository";
import ErrorList from "../constants/error-list.constant";
import { rentangBulan } from "../utils/date.helper";

/**
 * Laporan persediaan dan keluar-masuk barang.
 *
 * Dipisahkan dari ReportController yang menerima 19 repository di
 * konstruktornya padahal tiap laporan hanya memakai sebagian kecil.
 */
export class StockReportController {
  private stockInRepository: StockInRepository;
  private productRepository: ProductRepository;
  private productStockRepository: ProductStockRepository;
  private stockOutRepository: StockOutRepository;
  private goodReceiptRepository: GoodReceiptRepository;
  private adjustmentCaseRepository: AdjustmentCaseRepository;
  private companyRepository: CompanyRepository;

  constructor(
    stockInRepository: StockInRepository,
    productRepository: ProductRepository,
    productStockRepository: ProductStockRepository,
    stockOutRepository: StockOutRepository,
    goodReceiptRepository: GoodReceiptRepository,
    adjustmentCaseRepository: AdjustmentCaseRepository,
    companyRepository: CompanyRepository
  ) {
    this.stockInRepository = stockInRepository;
    this.productRepository = productRepository;
    this.productStockRepository = productStockRepository;
    this.stockOutRepository = stockOutRepository;
    this.goodReceiptRepository = goodReceiptRepository;
    this.adjustmentCaseRepository = adjustmentCaseRepository;
    this.companyRepository = companyRepository;
  }

  /*
    Kedua endpoint persediaan menyisir seluruh sejarah stock_out (jutaan
    baris) — hasilnya dipegang Redis sebentar supaya klik bolak-balik
    tanggal instan. Redis mati bukan alasan gagal: cache dilewati saja.
  */
  private dariCache = async (kunci: string): Promise<string | null> => {
    try {
      return await redisClient.get(kunci);
    } catch {
      return null;
    }
  };

  private keCache = async (kunci: string, nilai: unknown): Promise<void> => {
    try {
      await redisClient.setEx(kunci, UMUR_CACHE_LAPORAN, JSON.stringify(nilai));
    } catch {
      /* cache gagal ditulis — biarkan; permintaan berikut menghitung ulang */
    }
  };

  fetchInventoryReport = async (req: Request, res: Response) => {
    // Tanpa tanggal berarti hari ini — bentuk lama laporan ini memang
    // hanya bisa menjawab "sekarang".
    const tanggal = req.query.date
      ? new Date(String(req.query.date))
      : new Date();
    const kunci = `laporan-persediaan:${tanggal.toISOString().slice(0, 10)}`;

    try {
      const simpanan = await this.dariCache(kunci);
      if (simpanan) {
        return res.status(200).send(JSON.parse(simpanan));
      }

      const result = await this.stockInRepository.calculateAsOf(tanggal);
      await this.keCache(kunci, result);
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching inventory report ${error}`);
      return res.status(500).send(error);
    }
  };

  /**
   * Laporan per perusahaan, bulanan — "toko X jual (dan terima) apa
   * saja bulan ini". Keluar diatribusikan lewat PEMILIK lapisan stok
   * (stock_in.company_id): faktur penjualan tidak membawa company, dan
   * memang begitulah konsepnya — toko lain menjual dari kartu stok yang
   * sama, barangnya diambil dari lapisan pemiliknya.
   */
  fetchCompanyReport = async (req: Request, res: Response) => {
    const companyID = Number(req.query.company_id);
    const month = Number(req.query.month);
    const year = Number(req.query.year);

    try {
      const company = await this.companyRepository.fetchByID(companyID);
      if (!company) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      const periode = rentangBulan(year, month);
      const [keluar, masukGr, masukAdj] = await Promise.all([
        this.stockOutRepository.fetchCompanyOutputSummary({
          companyID: companyID,
          mulai: periode.mulai,
          sebelum: periode.sebelum,
        }),
        this.goodReceiptRepository.fetchCompanySummary({
          companyID: companyID,
          mulai: periode.mulai,
          sebelum: periode.sebelum,
        }),
        this.adjustmentCaseRepository.fetchCompanySummary({
          companyID: companyID,
          mulai: periode.mulai,
          sebelum: periode.sebelum,
        }),
      ]);

      /* Masuk = penerimaan + penyesuaian temuan, dilebur per produk. */
      const masukPerProduk = new Map<string, (typeof masukGr)[number]>();
      for (const baris of [...masukGr, ...masukAdj]) {
        const ada = masukPerProduk.get(baris.reference);
        if (ada) {
          ada.quantity += baris.quantity;
          ada.documents += baris.documents;
        } else {
          masukPerProduk.set(baris.reference, { ...baris });
        }
      }
      const masuk = [...masukPerProduk.values()].sort(
        (a, b) => b.quantity - a.quantity
      );

      return res.status(200).send({
        company: { id: company.id, name: company.name },
        output: keluar,
        input: masuk,
        summary: {
          outputQuantity: keluar.reduce((a, b) => a + b.quantity, 0),
          outputDocuments: keluar.reduce((a, b) => a + b.documents, 0),
          inputQuantity: masuk.reduce((a, b) => a + b.quantity, 0),
          inputDocuments: masuk.reduce((a, b) => a + b.documents, 0),
        },
      });
    } catch (error) {
      console.error(`[error]: Error on fetching company report ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  /** Baris rinci untuk unduhan Excel — dua arah sekaligus. */
  downloadCompanyReport = async (req: Request, res: Response) => {
    const companyID = Number(req.query.company_id);
    const month = Number(req.query.month);
    const year = Number(req.query.year);

    try {
      const periode = rentangBulan(year, month);
      const [output, masukGr, masukAdj] = await Promise.all([
        this.stockOutRepository.fetchCompanyOutputDetail({
          companyID: companyID,
          mulai: periode.mulai,
          sebelum: periode.sebelum,
        }),
        this.goodReceiptRepository.fetchCompanyDetail({
          companyID: companyID,
          mulai: periode.mulai,
          sebelum: periode.sebelum,
        }),
        this.adjustmentCaseRepository.fetchCompanyDetail({
          companyID: companyID,
          mulai: periode.mulai,
          sebelum: periode.sebelum,
        }),
      ]);

      const input = [...masukGr, ...masukAdj].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      return res.status(200).send({ output: output, input: input });
    } catch (error) {
      console.error(`[error]: Error on downloading company report ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  /**
   * Bahan grafik dan sorotan laporan persediaan: tren nilai gudang 12
   * bulan (berakhir di tanggal diminta) plus nilai per merek pada
   * tanggal itu. Dikunci super administrator seperti /inventory.
   */
  fetchInventoryTrend = async (req: Request, res: Response) => {
    const tanggal = req.query.date
      ? new Date(String(req.query.date))
      : new Date();
    const kunci = `laporan-persediaan-tren:${tanggal.toISOString().slice(0, 10)}`;

    try {
      const simpanan = await this.dariCache(kunci);
      if (simpanan) {
        return res.status(200).send(JSON.parse(simpanan));
      }

      const [trend, brands] = await Promise.all([
        this.stockInRepository.trendAsOf(tanggal),
        this.stockInRepository.nilaiPerMerekAsOf(tanggal),
      ]);
      const result = { trend: trend, brands: brands };
      await this.keCache(kunci, result);
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching inventory trend ${error}`);
      return res.status(500).send(error);
    }
  };

  fetchOutputReport = async (req: Request, res: Response) => {
    const brand = req.body.brand as number[];
    const type = req.body.type as number[];
    const month = req.body.month;
    const year = req.body.year;
    const group = req.body.group;

    try {
      const result = await this.productRepository.fetchOutputReport({
        month: month,
        year: year,
        brand: brand,
        type: type,
        group: group,
      });

      const stock = await this.productStockRepository.fetchOutputReport({
        product_id: result.data.map((x) => {
          return x.id;
        }),
        month: month,
        year: year,
      });

      return res.status(200).send({
        brands: result.brands,
        types: result.types,
        data: result.data.map((x) => {
          const stockIndex = stock.findIndex((y) => y.product_id == x.id);
          return {
            ...x,
            stock: stockIndex == -1 ? 0 : stock[stockIndex].stock,
          };
        }),
      });
    } catch (error) {
      console.error(`[error]: Error on fetching output report ${error}`);
      return res.status(500).send(error);
    }
  };
}

export default StockReportController;
