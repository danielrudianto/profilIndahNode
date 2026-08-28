import { Request, Response } from "express";
import ErrorList from "../constants/error-list.constant";
import { AuditLogRepository } from "../repositories/audit-log.repository";

/**
 * Jejak aktivitas seluruh sistem.
 *
 * Melengkapi kolom created_by/updated_by yang sudah ada di hampir setiap
 * tabel: kolom itu hanya menyimpan siapa yang TERAKHIR menyentuh sebuah baris,
 * sehingga tidak bisa menjawab "apa saja yang terjadi hari ini" maupun "apa
 * saja yang diubah orang tertentu".
 */
class AuditLogController {
  private auditLogRepository: AuditLogRepository;

  constructor(auditLogRepository: AuditLogRepository) {
    this.auditLogRepository = auditLogRepository;
  }

  fetch = async (req: Request, res: Response) => {
    /*
      Nilai bawaan ditetapkan di sini, bukan di skema. Skema hanya menolak nilai
      yang tidak masuk akal; menaruh bawaannya di sana membuat permintaan tanpa
      penyaring seolah-olah mengirim page=1, padahal ia memang tidak mengirim
      apa-apa.
    */
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.page_size) || 25;
    const entity = (req.query.entity as string) || null;
    const entityID = req.query.entityID ? Number(req.query.entityID) : null;
    const userOnly =
      req.query.userOnly === "true" || req.query.userOnly === "1";

    const dariQuery = req.query.userID;
    const userID =
      dariQuery === undefined
        ? null
        : (Array.isArray(dariQuery) ? dariQuery : [dariQuery]).map((x) =>
            Number(x)
          );

    const dateFrom = req.query.dateFrom
      ? new Date(`${req.query.dateFrom}T00:00:00`)
      : null;
    const dateTo = req.query.dateTo
      ? new Date(`${req.query.dateTo}T00:00:00`)
      : null;

    try {
      const hasil = await this.auditLogRepository.fetch({
        page: page,
        pageSize: pageSize,
        entity: entity,
        entityID: entityID,
        userID: userID,
        dateFrom: dateFrom,
        dateTo: dateTo,
        userOnly: userOnly,
      });

      return res.status(200).send(hasil);
    } catch (error) {
      console.error(`[error]: Error on fetching audit logs ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}

export default AuditLogController;
