import { Request, Response } from "express";
import BillCodeModel from "../model/bill_code.model";
import CustomerModel from "../model/customer.model";
import { BillPaymentModel } from "../model/bill_payment.model";
import ErrorList from "../assets/error_list";

class ReceivableController {
  static receivable = 0;

  /**
   * Fetch all receivable
   * @param req
   * @param res
   */
  static fetch = (req: Request, res: Response) => {
    BillCodeModel.fetchReceivableIDs().then(async (result) => {
      BillCodeModel.fetchReceivableByIDs(
        result.map((x) => {
          return x.id;
        })
      )
        .then((receivables) => {
          return res.status(200).send(receivables);
        })
        .catch((error) => {
          console.error(`[error]: Error on fetching receivable ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
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

  static fetchByCustomerIDV2 = (req: Request, res: Response) => {
    const customerID = Number(req.params.id);
    const page =
      req.query.page == null || req.query.page == undefined
        ? 1
        : Number(req.query.page);

    BillCodeModel.fetchBillIDByCustomerIDV2(customerID, page)
      .then(([result, count]) => {
        BillCodeModel.fetchReceivableDetailByIDs(
          result.map((x) => {
            return x.id;
          })
        ).then(async (receivables) => {
          return res.status(200).send({
            data: receivables,
            count: count,
          });
        });
      })
      .catch((error) => {
        console.error(
          `[error]: Error on fetching receivable by customer ID ${error}`
        );
        return res.status(500).send(error);
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
    // Helper function to validate sales invoice
    const validateSalesInvoice = (
      salesInvoice: any,
      res: Response
    ): boolean => {
      if (!salesInvoice) {
        res.status(404).send({ message: "Sales invoice not found" });
        return false;
      }
      if (salesInvoice.is_delete) {
        res.status(400).send({ message: "Sales invoice is already deleted" });
        return false;
      }
      if (salesInvoice.is_paid) {
        res.status(400).send({ message: "Sales invoice is already paid" });
        return false;
      }
      return true;
    };

    // Helper function to calculate invoice values
    const calculateInvoiceValues = (salesInvoice: any) => {
      const totalInvoice = salesInvoice.bill.reduce((a: any, b: any) => {
        return (a +=
          Number(b.quantity) * (Number(b.price) - Number(b.discount)));
      }, 0);

      const totalInvoiceValue =
        totalInvoice -
        Number(salesInvoice.discount) +
        Number(salesInvoice.delivery) +
        Number(salesInvoice.service);

      const totalPayment = salesInvoice.bill_payment.reduce(
        (a: any, b: any) => {
          return (a += Number(b.value));
        },
        0
      );

      return { totalInvoiceValue, totalPayment };
    };

    // Helper function to create payment
    const createPaymentRecord = async (
      sales_invoice_id: number,
      payment_method_id: number | null,
      value: number,
      date: Date,
      is_paid: boolean,
      res: Response
    ) => {
      try {
        const result = await new BillPaymentModel({
          bill_code_id: sales_invoice_id,
          payment_method_id: payment_method_id,
          value: value,
          date: date,
          is_paid: is_paid,
        }).create();

        return res.status(200).send(result);
      } catch (error) {
        console.error(`[error]: Error on creating payment ${error}`);
        return res
          .status(500)
          .send({ message: "Error creating payment", error });
      }
    };

    const { payment_method_id, full_payment, sales_invoice_id, date, amount } =
      req.body;

    const salesInvoice = await BillCodeModel.fetchByID(sales_invoice_id);

    // Validate sales invoice
    if (!validateSalesInvoice(salesInvoice, res)) return;

    // Calculate invoice values
    const { totalInvoiceValue, totalPayment } =
      calculateInvoiceValues(salesInvoice);

    const remainingValue = totalInvoiceValue - totalPayment;

    // Handle full payment
    if (full_payment) {
      return createPaymentRecord(
        sales_invoice_id,
        payment_method_id == 0 ? null : payment_method_id,
        remainingValue,
        new Date(date),
        true,
        res
      );
    }

    // Handle partial payment
    if (amount > remainingValue) {
      return res.status(400).send({
        message: "Payment amount is greater than the remaining invoice value",
      });
    }

    const isPaid = amount + totalPayment === totalInvoiceValue;

    return createPaymentRecord(
      sales_invoice_id,
      payment_method_id == 0 ? null : payment_method_id,
      amount,
      new Date(date),
      isPaid,
      res
    );
  };

  static deletePayment = async (req: Request, res: Response) => {
    const id = req.params.id;
    if (!id || isNaN(Number(id))) {
      return res.status(400).send({ message: "Invalid payment ID" });
    }
    try {
      const billPayment = await BillPaymentModel.fetchByID(Number(id));
      if (!billPayment) {
        return res.status(404).send({ message: "Payment not found" });
      }

      const deleteResult = await billPayment.delete();
      return res.status(200).send(deleteResult);
    } catch (error) {
      console.error(`[error]: Error fetching payment by ID ${id}: ${error}`);
      return res.status(500).send({ message: "Internal server error" });
    }
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
