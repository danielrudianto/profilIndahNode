"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
class ReceivableController {
    constructor(receivableRepository, salesInvoiceRepository) {
        this.fetch = async (req, res) => {
            try {
                console.log("start fetching");
                const result = await this.receivableRepository.fetch();
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching receivable ${error}`);
                return res.status(500).send(error);
            }
        };
        this.fetchByCustomerID = async (req, res) => {
            const customerID = Number(req.params.id);
            const page = (0, escape_helper_1.translatePage)(req.query.page);
            const pageSize = (0, escape_helper_1.translatePageSize)(req.query.pageSize);
            try {
                const result = await this.receivableRepository.fetchByCustomerID({
                    customerID: customerID == 0 ? null : customerID,
                    page: page,
                    pageSize: pageSize,
                });
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching receivable by customerID ${error}`);
                return res.status(500).send(error);
            }
        };
        this.createPayment = async (req, res) => {
            try {
                const { date, amount, payment_method_id, full_payment, sales_invoice_id, } = req.body;
                const salesInvoice = await this.salesInvoiceRepository.fetchByID(sales_invoice_id);
                if (!salesInvoice || salesInvoice.isDelete) {
                    return res.status(404).send(error_list_1.default["Sales invoice not found"]);
                }
                // Calculate the total value of the sales invoice
                const totalValue = salesInvoice.sales_invoice.reduce((sum, item) => sum + item.quantity * (item.price - item.discount), 0) +
                    salesInvoice.delivery +
                    salesInvoice.service -
                    salesInvoice.discount;
                // Calculate the total previous payments
                const previousPayment = salesInvoice.sales_invoice_payment.reduce((sum, payment) => sum + payment.value, 0);
                const maximumPaymentValue = totalValue - previousPayment;
                // Handle full payment
                if (full_payment) {
                    const result = await this.receivableRepository.create({
                        date: new Date(date),
                        payment_method_id,
                        sales_invoice_code_id: sales_invoice_id,
                        amount: maximumPaymentValue,
                        is_paid: true,
                    });
                    return res.status(201).send(result);
                }
                // Handle partial payment
                if (amount > maximumPaymentValue) {
                    return res
                        .status(400)
                        .send(error_list_1.default["Receivable exceed sales invoice"]);
                }
                const result = await this.receivableRepository.create({
                    date: new Date(date),
                    payment_method_id,
                    sales_invoice_code_id: sales_invoice_id,
                    amount,
                    is_paid: amount === maximumPaymentValue,
                });
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on creating sales invoice payment ${error}`);
                return res.status(500).send(error);
            }
        };
        this.receivableRepository = receivableRepository;
        this.salesInvoiceRepository = salesInvoiceRepository;
    }
}
_a = ReceivableController;
/**
 * Fetch all receivable
 * @param req
 * @param res
 */
ReceivableController.fetch = (req, res) => {
    // BillCodeModel.fetchReceivableIDs().then(async (result) => {
    //   BillCodeModel.fetchReceivableByIDs(
    //     result.map((x) => {
    //       return x.id;
    //     })
    //   )
    //     .then((receivables) => {
    //       return res.status(200).send(receivables);
    //     })
    //     .catch((error) => {
    //       console.error(`[error]: Error on fetching receivable ${error}`);
    //       return res.status(500).send(ErrorList["Internal server error"]);
    //     });
    // });
};
ReceivableController.fetchByCustomerID = (req, res) => {
    // const customerID = req.params.id;
    // BillCodeModel.fetchBillIDByCustomerID(Number(customerID))
    //   .then((result) => {
    //     BillCodeModel.fetchReceivableDetailByIDs(
    //       result.map((x) => {
    //         return x.id;
    //       })
    //     ).then(async (receivables) => {
    //       return res.status(200).send({
    //         data: receivables,
    //       });
    //     });
    //   })
    //   .catch((error) => {
    //     console.error(
    //       `[error]: Error on fetch receivable by customer id ${error}`
    //     );
    //     return res.status(500).send(ErrorList["Internal server error"]);
    //   });
};
ReceivableController.fetchByCustomerIDV2 = (req, res) => {
    // const customerID = Number(req.params.id);
    // const page =
    //   req.query.page == null || req.query.page == undefined
    //     ? 1
    //     : Number(req.query.page);
    // BillCodeModel.fetchBillIDByCustomerIDV2(customerID, page)
    //   .then(([result, count]) => {
    //     BillCodeModel.fetchReceivableDetailByIDs(
    //       result.map((x) => {
    //         return x.id;
    //       })
    //     ).then(async (receivables) => {
    //       return res.status(200).send({
    //         data: receivables,
    //         count: count,
    //       });
    //     });
    //   })
    //   .catch((error) => {
    //     console.error(
    //       `[error]: Error on fetching receivable by customer ID ${error}`
    //     );
    //     return res.status(500).send(error);
    //   });
};
ReceivableController.fetchPaymentsHistory = (req, res) => {
    // const id = req.params.id;
    // BillPaymentModel.fetchByBillCodeID(Number(id))
    //   .then((result) => {
    //     return res.status(200).send(result);
    //   })
    //   .catch((error) => {
    //     console.error(
    //       `[error]: Error on fetch payments history by bill code id [${id}]`
    //     );
    //     return res.status(500).send(error);
    //   });
};
ReceivableController.createPayment = async (req, res) => {
    // Helper function to calculate invoice values
    const calculateInvoiceValues = (salesInvoice) => {
        const totalInvoice = salesInvoice.bill.reduce((a, b) => {
            return (a +=
                Number(b.quantity) * (Number(b.price) - Number(b.discount)));
        }, 0);
        const totalInvoiceValue = totalInvoice -
            Number(salesInvoice.discount) +
            Number(salesInvoice.delivery) +
            Number(salesInvoice.service);
        const totalPayment = salesInvoice.bill_payment.reduce((a, b) => {
            return (a += Number(b.value));
        }, 0);
        return { totalInvoiceValue, totalPayment };
    };
    // Helper function to create payment
    const createPaymentRecord = async (sales_invoice_id, payment_method_id, value, date, is_paid, res) => {
        try {
            // const result = await new BillPaymentModel({
            //   bill_code_id: sales_invoice_id,
            //   payment_method_id: payment_method_id,
            //   value: value,
            //   date: date,
            //   is_paid: is_paid,
            // }).create();
            // return res.status(200).send(result);
        }
        catch (error) {
            console.error(`[error]: Error on creating payment ${error}`);
            return res
                .status(500)
                .send({ message: "Error creating payment", error });
        }
    };
    const { payment_method_id, full_payment, sales_invoice_id, date, amount } = req.body;
    // const salesInvoice = await BillCodeModel.fetchByID(sales_invoice_id);
    // // Validate sales invoice
    // if (!validateSalesInvoice(salesInvoice, res)) return;
    // // Calculate invoice values
    // const { totalInvoiceValue, totalPayment } =
    //   calculateInvoiceValues(salesInvoice);
    // const remainingValue = totalInvoiceValue - totalPayment;
    // // Handle full payment
    // if (full_payment) {
    //   return createPaymentRecord(
    //     sales_invoice_id,
    //     payment_method_id == 0 ? null : payment_method_id,
    //     remainingValue,
    //     new Date(date),
    //     true,
    //     res
    //   );
    // }
    // // Handle partial payment
    // if (amount > remainingValue) {
    //   return res.status(400).send({
    //     message: "Payment amount is greater than the remaining invoice value",
    //   });
    // }
    // const isPaid = amount + totalPayment === totalInvoiceValue;
    // return createPaymentRecord(
    //   sales_invoice_id,
    //   payment_method_id == 0 ? null : payment_method_id,
    //   amount,
    //   new Date(date),
    //   isPaid,
    //   res
    // );
};
ReceivableController.deletePayment = async (req, res) => {
    const id = req.params.id;
    if (!id || isNaN(Number(id))) {
        return res.status(400).send({ message: "Invalid payment ID" });
    }
    try {
        // const billPayment = await salesInvoice.fetchByID(Number(id));
        // if (!billPayment) {
        //   return res.status(404).send({ message: "Payment not found" });
        // }
        // const deleteResult = await billPayment.delete();
        // return res.status(200).send(deleteResult);
    }
    catch (error) {
        console.error(`[error]: Error fetching payment by ID ${id}: ${error}`);
        return res.status(500).send({ message: "Internal server error" });
    }
};
ReceivableController.checkReceivable = () => {
    // BillCodeModel.calculateReceivables()
    //   .then((result) => {
    //     this.receivable = result.length == 0 ? 0 : Number(result[0].value);
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error on check receivable ${error}`);
    //   });
};
exports.default = ReceivableController;
//# sourceMappingURL=receivable.controller.js.map