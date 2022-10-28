import { Request, Response } from "express";
import BillCodeModel from "../model/bill_code.model";
import SalesReturnModel from "../model/sales_return.model";

class SalesReturnController {
  static create = (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const payment_method_id = req.body.payment_method_id;

    const items = req.body.sales_return as any[];
    if(items.length > 0){
      const name = `RJ-${date.getFullYear()}-${Math.floor(
        Math.random() * 10
      )}${Math.floor(Math.random() * 10)}${Math.floor(
        Math.random() * 10
      )}${Math.floor(Math.random() * 10)}${Math.floor(
        Math.random() * 10
      )}${Math.floor(Math.random() * 10)}${Math.floor(
        Math.random() * 10
      )}${Math.floor(Math.random() * 10)}`;
  
      const sales_return_code = new SalesReturnModel(
        name,
        date,
        req.body.userId,
        payment_method_id,
        items,
        null,
        true,
      );
  
      sales_return_code
        .create()
        .then((result) => {
          return res.status(200).send(result);
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else {
      return res.status(400).send("Data barang tidak dilampirkan.")
    }
    
  };

  static fetchSearch = (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const items = req.body.item as any[];

    BillCodeModel.fetchSearch(date, items)
      .then((result) => {
        return res.status(200).send(
          (result as any[]).map((x) => {
            return {
              id: x.id,
              name: x.name,
              date: x.date,
              customer: {
                name: x.customer_name,
              },
            };
          })
        );
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchArchive = (req: Request, res: Response) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    if (!req.params.year && !req.params.month) {
      const archive_years = SalesReturnModel.fetchArchiveYears();
      const count_archive_years = SalesReturnModel.countArchiveByYear();

      Promise.all([archive_years, count_archive_years])
        .then((result) => {
          const response: any[] = [];
          (result[0] as any[]).forEach((item) => {
            response.push({
              year: item.year,
              count: (result[1] as any[]).filter((x) => x.year == item.year)[0]
                .count,
            });
          });

          return res.status(200).send(response);
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else if (!req.params.month) {
      const count = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      SalesReturnModel.countArchiveByMonth(year)
        .then((counts) => {
          (counts as any[]).forEach((x) => {
            const month = x.month;
            const num = x.count;

            count[month - 1] = num;
          });

          return res.status(200).send(count);
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else if (req.params.year && req.params.month) {
      const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
      const limit = parseInt(process.env.LIMIT!.toString());
      const offset = (page - 1) * limit;

      Promise.all([
        SalesReturnModel.fetchArchive(year, month, offset, limit),
        SalesReturnModel.countArchive(year, month),
      ])
        .then((result) => {
          return res.status(200).send({
            data: result[0].map(x => {
              return {
                ...x,
                customer: (x.sales_return.length == 0 || x.sales_return[0].bill.bill_code.customer == null) ? null : {
                  name: x.sales_return[0].bill.bill_code.customer.name,
                }
              }
            }),
            count: result[1],
          });
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else {
      return res.status(400).send("Input tidak dikenal.");
    }
  };

  static fetchById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    SalesReturnModel.fetchById(id).then(result => {
      return res.status(200).send({
        ...result,
        customer: (result?.sales_return.length == 0 || result?.sales_return[0].bill.bill_code.customer == null) ? null : {
          name: result.sales_return[0].bill.bill_code.customer.name,
        }
      });
    }).catch(error => {
      return res.status(500).send(error);
    })
  }

  static deleteById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    SalesReturnModel.fetchById(id).then(salesReturn => {
      if(salesReturn == null || salesReturn.is_delete){
        return res.status(404).send("Data tidak ditemukan.");
      } else {
        SalesReturnModel.deleteById(id, req.body.userId).then(result => {

        })
      }
    })
  }
}

export default SalesReturnController;
