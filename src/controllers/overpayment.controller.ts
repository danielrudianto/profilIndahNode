import { Request, Response } from "express";
import ErrorList from "../constants/error-list.constant";
import { translatePage, translatePageSize } from "../utils/escape.helper";
import { OverpaymentRepository } from "../repositories/overpayment.repository";

export class OverpaymentController {
  private overpaymentRepository: OverpaymentRepository;

  constructor(overpaymentRepository: OverpaymentRepository) {
    this.overpaymentRepository = overpaymentRepository;
  }

  create = async (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const customer_id = req.body.customer_id;
    const sales_deposit_code_id = req.body.sales_deposit_code_id;
    const userID = req.body.userId;
    const return_payment_date = new Date(req.body.return_payment_date);
    const return_payment_method = req.body.return_payment_method;
    const return_payment_number = req.body.return_payment_number;
    const return_payment_name = req.body.return_payment_name;
    const return_payment_bank = req.body.return_payment_bank;
    const value = req.body.value;
    const payment_method_id = req.body.payment_method_id;

    try {
      const result = await this.overpaymentRepository.create({
        date: date,
        customer_id: customer_id,
        sales_deposit_code_id: sales_deposit_code_id,
        payment_method_id: payment_method_id,
        return_payment_date: return_payment_date,
        return_payment_method: return_payment_method,
        return_payment_name: return_payment_name,
        return_payment_bank: return_payment_bank,
        return_payment_number: return_payment_number,
        created_at: new Date(),
        created_by: userID,
        value: value,
      });

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on creating overpayment ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  /**
   * PUT /overpayment/:id — layar 16c, menu "Update".
   *
   * Hanya catatan yang belum dikembalikan yang boleh diubah; 409 untuk
   * yang sudah, mengikuti pembedaan 404/409 milik resolve().
   */
  update = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    try {
      const hasil = await this.overpaymentRepository.update(id, {
        date: new Date(req.body.date),
        customer_id: req.body.customer_id,
        payment_method_id: req.body.payment_method_id,
        value: req.body.value,
        return_payment_date: new Date(req.body.return_payment_date),
        return_payment_method: req.body.return_payment_method,
        return_payment_name: req.body.return_payment_name,
        return_payment_bank: req.body.return_payment_bank,
        return_payment_number: req.body.return_payment_number,
      });

      if (hasil === "tidak-ada") {
        return res.status(404).send(ErrorList["Not found"]);
      }
      if (hasil === "sudah-dikembalikan") {
        return res.status(409).send(ErrorList["No changes"]);
      }

      return res.status(200).send({ id: id });
    } catch (error) {
      console.error(`[error]: Error on updating overpayment ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetch = async (req: Request, res: Response) => {
    const page = translatePage(req.query.page);
    const pageSize = translatePageSize(req.query.pageSize);
    const sortBy = req.query.sortBy as string;
    const sortDirection = req.query.sortDirection as string;

    try {
      const result = await this.overpaymentRepository.fetch({
        page: page,
        pageSize: pageSize,
        sortBy: sortBy,
        sortDirection: sortDirection,
        status: req.query.status as string | undefined,
        keyword: req.query.keyword as string | undefined,
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching overpayment data ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  /**
   * Menandai sebuah kelebihan bayar sudah dikembalikan.
   *
   * Menjawab 409, bukan 404, ketika catatannya ada tetapi sudah ditandai:
   * permintaannya sah, keadaannya saja yang sudah bukan itu lagi. Membedakan
   * keduanya penting karena yang satu berarti salah alamat dan yang lain
   * berarti sudah beres — dan keduanya sama-sama mungkin ketika dua orang
   * menekan tombol yang sama hampir bersamaan.
   */
  resolve = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    try {
      const catatan = await this.overpaymentRepository.fetchByID(id);
      if (catatan == null) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      const berubah = await this.overpaymentRepository.resolve(id);
      if (!berubah) {
        return res.status(409).send(ErrorList["No changes"]);
      }

      return res.status(200).send({ id: id, is_resolved: true });
    } catch (error) {
      console.error(`[error]: Error on resolving overpayment ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      const result = await this.overpaymentRepository.fetchByID(id);
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching overpayment data ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchReport = async (req: Request, res: Response) => {
    const date = new Date(req.body.date);

    try {
      const result = await this.overpaymentRepository.fetchReportByDate(date);
      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetching overpayment return data ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}
