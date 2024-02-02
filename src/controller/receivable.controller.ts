import { Request, Response } from "express";
import BillCodeModel from "../model/bill_code.model";
import CustomerModel from "../model/customer.model";
import BillPaymentModel from "../model/bill_payment.model";
import ErrorList from "../assets/error_list";

class ReceivableController {
  static receivable = 0;

  static fetch = (req: Request, res: Response) => {
    BillCodeModel.fetchReceivableIDs().then(async (result) => {
      BillCodeModel.fetchReceivableByIDs(
        result.map((x) => {
          return x.id;
        })
      ).then((receivables) => {
        return res.status(200).send(receivables);
      });
    });
  };

  static fetchByCustomerID = (req: Request, res: Response) => {
    const customerID = req.params.id;
    BillCodeModel.fetchBillIDByCustomerID(Number(customerID))
      .then((result) => {
        BillCodeModel.fetchReceivableDetailByIDs(
          result.map((x) => {
            return x.id;
          })
        ).then(async (receivables) => {
          return res.status(200).send({
            data: receivables,
            customer:
              Number(customerID) == 0
                ? {
                    name: "Retail Customer",
                    address: "Retail Customer",
                    phone: "Retail Customer",
                    email: "Retail Customer",
                  }
                : await CustomerModel.fetchByID(Number(customerID)),
          });
        });
      })
      .catch((error) => {
        console.error(
          `[error]: Error on fetch receivable by customer id ${error}`
        );
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  static fetchPaymentsHistory = (req: Request, res: Response) => {
    const id = req.params.id;
    BillPaymentModel.fetchByBillCodeID(Number(id))
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        console.error(
          `[error]: Error on fetch payments history by bill code id [${id}]`
        );

        return res.status(500).send(error);
      });
  };

  static createPayment = async (req: Request, res: Response) => {
    const payment_method_id = req.body.payment_method_id;
    const full_payment = req.body.full_payment;
    const sales_invoice_id = req.body.sales_invoice_id;
    const date = new Date(req.body.date);

    const salesInvoice = await BillCodeModel.fetchByID(sales_invoice_id);
    if (!salesInvoice) {
      return res.status(404).send({
        message: "Sales invoice not found",
      });
    } else if (salesInvoice.is_delete) {
      return res.status(400).send({
        message: "Sales invoice is already deleted",
      });
    } else if (salesInvoice.is_paid) {
      return res.status(400).send({
        message: "Sales invoice is already paid",
      });
    } else {
      const totalInvoice = salesInvoice.bill.reduce((a, b) => {
        return (a +=
          Number(b.quantity) * (Number(b.price) - Number(b.discount)));
      }, 0);

      const totalInvoiceValue =
        totalInvoice -
        Number(salesInvoice.discount) +
        Number(salesInvoice.delivery) +
        Number(salesInvoice.service);

      const totalPayment = salesInvoice.bill_payment.reduce((a, b) => {
        return (a += Number(b.value));
      }, 0);

      if (full_payment == true) {
        const payment = {
          bill_code_id: sales_invoice_id,
          payment_method_id: payment_method_id,
          value: totalInvoiceValue - totalPayment,
          date: date,
          is_paid: true,
        };

        BillPaymentModel.create(payment)
          .then(([result, _]) => {
            this.receivable -= totalInvoiceValue - totalPayment;
            return res.status(200).send(result);
          })
          .catch((error) => {
            console.error(`[error]: Error on creating payment ${error}`);
            return res.status(500).send(error);
          });
      } else {
        const value = req.body.amount;
        if (value > totalInvoiceValue - totalPayment) {
          return res.status(400).send({
            message:
              "Payment amount is greater than the remaining invoice value",
          });
        } else if (value + totalPayment < totalInvoiceValue) {
          const payment = {
            bill_code_id: sales_invoice_id,
            payment_method_id: payment_method_id,
            value: value,
            date: date,
            is_paid: false,
          };

          BillPaymentModel.create(payment)
            .then(([result, _]) => {
              this.receivable -= value;
              return res.status(200).send(result);
            })
            .catch((error) => {
              console.error(`[error]: Error on creating payment ${error}`);
              return res.status(500).send(error);
            });
        } else if (value + totalPayment == totalInvoiceValue) {
          const payment = {
            bill_code_id: sales_invoice_id,
            payment_method_id: payment_method_id,
            value: value,
            date: date,
            is_paid: true,
          };

          BillPaymentModel.create(payment)
            .then(([result, _]) => {
              this.receivable -= value;
              return res.status(200).send(result);
            })
            .catch((error) => {
              console.error(`[error]: Error on creating payment ${error}`);
              return res.status(500).send(error);
            });
        }
      }
    }
  };

  static deletePayment = (req: Request, res: Response) => {
    const id = req.params.id;
    BillPaymentModel.deleteByID(Number(id))
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on delete payment ${error}`);
        return res.status(500).send(error);
      });
  };

  static checkReceivable = () => {
    BillCodeModel.calculateReceivables()
      .then((result) => {
        this.receivable = result.length == 0 ? 0 : Number(result[0].value);
      })
      .catch((error) => {
        console.error(`[error]: Error on check receivable ${error}`);
      });
  };
}

export default ReceivableController;
