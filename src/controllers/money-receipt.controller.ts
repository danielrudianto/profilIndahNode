import { Request, Response } from "express";
import ErrorList from "../constants/error-list.constant";
import { SalesReturnRepository } from "../repositories/sales-return.repository";
import { SalesInvoicePaymentRepository } from "../repositories/sales-invoice-payment.repository";
import { SalesDepositPaymentRepository } from "../repositories/sales-deposit-payment.repository";
import { PaymentMethodRepository } from "../repositories/payment-method.repository";
import { OverpaymentRepository } from "../repositories/overpayment.repository";
import { SalesInvoiceRebateRepository } from "../repositories/sales-invoice-rebate.repository";

/**
 * Rekap penerimaan uang dari berbagai sumber pembayaran.
 *
 * Dipisahkan dari ReportController yang menerima 19 repository di
 * konstruktornya padahal tiap laporan hanya memakai sebagian kecil.
 */
export class MoneyReceiptController {
  private paymentMethodRepository: PaymentMethodRepository;
  private salesInvoicePaymentRepository: SalesInvoicePaymentRepository;
  private salesDepositPaymentRepository: SalesDepositPaymentRepository;
  private salesReturnRepository: SalesReturnRepository;
  private overpaymentRepository: OverpaymentRepository;
  private salesInvoiceRebateRepository: SalesInvoiceRebateRepository;

  constructor(
    paymentMethodRepository: PaymentMethodRepository,
    salesInvoicePaymentRepository: SalesInvoicePaymentRepository,
    salesDepositPaymentRepository: SalesDepositPaymentRepository,
    salesReturnRepository: SalesReturnRepository,
    overpaymentRepository: OverpaymentRepository,
    salesInvoiceRebateRepository: SalesInvoiceRebateRepository
  ) {
    this.paymentMethodRepository = paymentMethodRepository;
    this.salesInvoicePaymentRepository = salesInvoicePaymentRepository;
    this.salesDepositPaymentRepository = salesDepositPaymentRepository;
    this.salesReturnRepository = salesReturnRepository;
    this.overpaymentRepository = overpaymentRepository;
    this.salesInvoiceRebateRepository = salesInvoiceRebateRepository;
  }

  /**
   * Tren 30 hari untuk grafik laporan uang masuk, berakhir di tanggal
   * diminta. Per hari: masuk (pembayaran faktur + deposit + kelebihan
   * bayar diterima) dan keluar (retur + pengembalian diskon + kelebihan
   * bayar dikembalikan). Hari tanpa pergerakan diisi nol di sini supaya
   * frontend selalu menerima 30 baris berurutan.
   *
   * Ikut dikirim: akumulasi DOR bulan berjalan sampai tanggal diminta —
   * sistem ini bukan sistem gaji, jadi yang dilaporkan hanya "sudah
   * terkumpul berapa", bukan status potongannya.
   */
  fetchMoneyReceiptTrend = async (req: Request, res: Response) => {
    const akhir = req.query.date
      ? new Date(String(req.query.date))
      : new Date();

    try {
      const sebelum = new Date(
        akhir.getFullYear(),
        akhir.getMonth(),
        akhir.getDate() + 1
      );
      const mulai = new Date(
        akhir.getFullYear(),
        akhir.getMonth(),
        akhir.getDate() - 29
      );
      const awalBulan = new Date(akhir.getFullYear(), akhir.getMonth(), 1);

      const [
        faktur,
        deposit,
        retur,
        lebihMasuk,
        lebihKeluar,
        rebate,
        dorFaktur,
        dorDeposit,
      ] = await Promise.all([
        this.salesInvoicePaymentRepository.sumHarian(mulai, sebelum),
        this.salesDepositPaymentRepository.sumHarian(mulai, sebelum),
        this.salesReturnRepository.sumHarian(mulai, sebelum),
        this.overpaymentRepository.sumHarianMasuk(mulai, sebelum),
        this.overpaymentRepository.sumHarianKeluar(mulai, sebelum),
        this.salesInvoiceRebateRepository.sumHarian(mulai, sebelum),
        this.salesInvoicePaymentRepository.fetchDORPaymentsByDateRange(
          awalBulan,
          akhir
        ),
        this.salesDepositPaymentRepository.fetchDORPaymentsByDateRange(
          awalBulan,
          akhir
        ),
      ]);

      const dorBulanIni =
        dorFaktur.reduce((a, x) => a + Number(x.value), 0) +
        dorDeposit.reduce((a, x) => a + Number(x.value), 0);

      const kunci = (tanggal: Date) => tanggal.toISOString().slice(0, 10);
      const masuk = new Map<string, number>();
      const keluar = new Map<string, number>();
      const tambah = (
        peta: Map<string, number>,
        baris: { date: Date; value: number }[]
      ) => {
        for (const x of baris) {
          const k = kunci(new Date(x.date));
          peta.set(k, (peta.get(k) ?? 0) + x.value);
        }
      };
      tambah(masuk, faktur);
      tambah(masuk, deposit);
      tambah(masuk, lebihMasuk);
      tambah(keluar, retur);
      tambah(keluar, lebihKeluar);
      tambah(keluar, rebate);

      const data = [];
      for (let mundur = 29; mundur >= 0; mundur--) {
        const d = new Date(
          akhir.getFullYear(),
          akhir.getMonth(),
          akhir.getDate() - mundur
        );
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        data.push({
          date: k,
          masuk: masuk.get(k) ?? 0,
          keluar: keluar.get(k) ?? 0,
        });
      }

      return res.status(200).send({ data: data, dorBulanIni: dorBulanIni });
    } catch (error) {
      console.error(`[error]: Error on fetching money receipt trend ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchMoneyReceipt = async (req: Request, res: Response) => {
    try {
      const date = new Date(req.body.date);

      /*
        Sembilan sumber yang saling bebas — dulu ditunggu berurutan,
        sehingga lama halamannya adalah JUMLAH seluruh query, bukan yang
        terlama. Catatan rebate: pengembalian diskon faktur adalah uang
        KELUAR lewat metode pilihannya — bayar tunai 5.000 dengan diskon
        1.000 yang dikembalikan via transfer berarti +5.000 di kas dan
        -1.000 di transfer.
      */
      const [
        paymentMethods,
        salesInvoicePayments,
        salesInvoiceDORPayments,
        salesDepositPayments,
        salesDepositDORPayments,
        salesReturnPayments,
        overpayment,
        overpaymentReturn,
        rebates,
      ] = await Promise.all([
        this.paymentMethodRepository.fetchAll(),
        this.salesInvoicePaymentRepository.fetchPaymentsByDate(date),
        this.salesInvoicePaymentRepository.fetchDORPaymentsByDate(date),
        this.salesDepositPaymentRepository.fetchPaymentsByDate(date),
        this.salesDepositPaymentRepository.fetchDORPaymentsByDate(date),
        this.salesReturnRepository.fetchPaymentsByDate(date),
        this.overpaymentRepository.fetchReportByReceiveDate(date),
        this.overpaymentRepository.fetchReportByReturnDate(date),
        this.salesInvoiceRebateRepository.sumByDate(date),
      ]);

      const salesInvoicePaymentIndex = salesInvoicePayments.findIndex(
        (x) => x.payment_method_id == null
      );
      const salesDepositPaymentIndex = salesDepositPayments.findIndex(
        (x) => x.payment_method_id == null
      );
      const salesReturnPaymentIndex = salesReturnPayments.findIndex(
        (x) => x.payment_method_id == null
      );

      const overpaymentIndex = overpayment.findIndex(
        (x) => x.payment_method_id == null
      );

      const overpaymentReturnIndex = overpaymentReturn.findIndex(
        (x) => x.payment_method_id == null
      );

      const dorData: {
        sales: string | null;
        salesInvoice: number;
        salesDeposit: number;
      }[] = [];

      for (let i = 0; i < salesDepositDORPayments.length; i++) {
        const check = checkExistingSales(salesDepositDORPayments[i].sales);
        if (check == -1) {
          dorData.push({
            sales: salesDepositDORPayments[i].sales,
            salesInvoice: 0,
            salesDeposit: salesDepositDORPayments[i].value,
          });
        } else {
          dorData[check].salesDeposit += salesDepositDORPayments[i].value;
        }
      }

      for (let i = 0; i < salesInvoiceDORPayments.length; i++) {
        const check = checkExistingSales(salesInvoiceDORPayments[i].sales);
        if (check == -1) {
          dorData.push({
            sales: salesInvoiceDORPayments[i].sales,
            salesInvoice: salesInvoiceDORPayments[i].value,
            salesDeposit: 0,
          });
        } else {
          dorData[check].salesInvoice += salesInvoiceDORPayments[i].value;
        }
      }

      function checkExistingSales(sales: string | null): number {
        const index = dorData.findIndex((x) => x.sales == sales);
        return index;
      }

      return res.status(200).send([
        {
          id: null,
          name: "Cash",
          salesInvoice:
            salesInvoicePaymentIndex == -1
              ? 0
              : salesInvoicePayments[salesInvoicePaymentIndex].value,
          salesDeposit:
            salesDepositPaymentIndex == -1
              ? 0
              : salesDepositPayments[salesDepositPaymentIndex].value,
          salesReturn:
            salesReturnPaymentIndex == -1
              ? 0
              : salesReturnPayments[salesReturnPaymentIndex].value,
          overpayment:
            (overpaymentIndex == -1 ? 0 : overpayment[overpaymentIndex].value) -
            (overpaymentReturnIndex == -1
              ? 0
              : overpaymentReturn[overpaymentReturnIndex].value),
          rebate: rebates.find((y) => y.payment_method_id == null)?.value ?? 0,
        },
        {
          id: 0,
          name: "DOR",
          data: dorData,
        },
        ...paymentMethods.map((x) => {
          const salesInvoiceIndex = salesInvoicePayments.findIndex(
            (y) => y.payment_method_id == x.id
          );
          const salesDepositIndex = salesDepositPayments.findIndex(
            (y) => y.payment_method_id == x.id
          );
          const salesReturnIndex = salesReturnPayments.findIndex(
            (y) => y.payment_method_id == x.id
          );

          const overpaymentIndex = overpayment.findIndex(
            (y) => y.payment_method_id == x.id
          );

          const overpaymentReturnIndex = overpaymentReturn.findIndex(
            (y) => y.payment_method_id == x.id
          );

          return {
            id: x.id,
            name: x.name,
            salesInvoice:
              salesInvoiceIndex == -1
                ? 0
                : salesInvoicePayments[salesInvoiceIndex].value,
            salesDeposit:
              salesDepositIndex == -1
                ? 0
                : salesDepositPayments[salesDepositIndex].value,
            salesReturn:
              salesReturnIndex == -1
                ? 0
                : salesReturnPayments[salesReturnIndex].value,
            overpayment:
              (overpaymentIndex == -1
                ? 0
                : overpayment[overpaymentIndex].value) -
              (overpaymentReturnIndex == -1
                ? 0
                : overpaymentReturn[overpaymentReturnIndex].value),
            rebate:
              rebates.find((y) => y.payment_method_id == x.id)?.value ?? 0,
          };
        }),
      ]);
    } catch (error) {
      console.error(`[error]: Error on fetching money receipt ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  downloadMoneyReceipt = async (req: Request, res: Response) => {
    try {
      const date = new Date(req.body.date);
      const payments =
        await this.salesInvoicePaymentRepository.downloadReport(date);
      return res.status(200).send({
        data: payments,
      });
    } catch (error) {
      console.error(
        `[error]: Error on downloading money receipt data ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchDorMoneyReceipt = async (req: Request, res: Response) => {
    const startDate = new Date(req.body.startDate);
    const endDate = new Date(req.body.endDate);

    const salesInvoiceDORPayments =
      await this.salesInvoicePaymentRepository.fetchDORPaymentsByDateRange(
        startDate,
        endDate
      );

    const salesDepositDORPayments =
      await this.salesDepositPaymentRepository.fetchDORPaymentsByDateRange(
        startDate,
        endDate
      );

    const dorData: {
      sales: string | null;
      salesInvoice: number;
      salesDeposit: number;
    }[] = [];

    for (let i = 0; i < salesDepositDORPayments.length; i++) {
      const check = checkExistingSales(salesDepositDORPayments[i].sales);
      if (check == -1) {
        dorData.push({
          sales: salesDepositDORPayments[i].sales,
          salesInvoice: 0,
          salesDeposit: salesDepositDORPayments[i].value,
        });
      } else {
        dorData[check].salesDeposit += salesDepositDORPayments[i].value;
      }
    }

    for (let i = 0; i < salesInvoiceDORPayments.length; i++) {
      const check = checkExistingSales(salesInvoiceDORPayments[i].sales);
      if (check == -1) {
        dorData.push({
          sales: salesInvoiceDORPayments[i].sales,
          salesInvoice: salesInvoiceDORPayments[i].value,
          salesDeposit: 0,
        });
      } else {
        dorData[check].salesInvoice += salesInvoiceDORPayments[i].value;
      }
    }

    function checkExistingSales(sales: string | null): number {
      const index = dorData.findIndex((x) => x.sales == sales);
      return index;
    }

    return res.status(200).send({
      id: 0,
      name: "DOR",
      data: dorData,
    });
  };
}

export default MoneyReceiptController;
