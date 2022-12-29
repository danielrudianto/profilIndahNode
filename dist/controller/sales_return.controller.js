import BillCodeModel from "../model/bill_code.model";
import SalesReturnModel from "../model/sales_return.model";
class SalesReturnController {
}
SalesReturnController.create = (req, res) => {
    const date = new Date(req.body.date);
    const payment_method_id = req.body.payment_method_id == 0 ? null : req.body.payment_method_id;
    const items = req.body.sales_return;
    if (items.length > 0) {
        const name = `RJ-${date.getFullYear()}-${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
        const sales_return_code = new SalesReturnModel(name, date, req.body.userId, payment_method_id, items, null, true);
        sales_return_code
            .create()
            .then((result) => {
            return res.status(200).send(result);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else {
        return res.status(400).send("Data barang tidak dilampirkan.");
    }
};
SalesReturnController.fetchSearch = (req, res) => {
    const date = new Date(req.body.date);
    const items = req.body.item;
    BillCodeModel.fetchSearch(date, items)
        .then((result) => {
        return res.status(200).send(result.map((x) => {
            return {
                id: x.id,
                name: x.name,
                date: x.date,
                customer: {
                    name: x.customer_name,
                },
            };
        }));
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
SalesReturnController.fetchArchive = (req, res) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (!req.params.year && !req.params.month) {
        const archive_years = SalesReturnModel.fetchArchiveYears();
        const count_archive_years = SalesReturnModel.countArchiveByYear();
        Promise.all([archive_years, count_archive_years])
            .then((result) => {
            const response = [];
            result[0].forEach((item) => {
                response.push({
                    year: item.year,
                    count: result[1].filter((x) => x.year == item.year)[0]
                        .count,
                });
            });
            return res.status(200).send(response);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else if (!req.params.month) {
        const count = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        SalesReturnModel.countArchiveByMonth(year)
            .then((counts) => {
            counts.forEach((x) => {
                const month = x.month;
                const num = x.count;
                count[month - 1] = num;
            });
            return res.status(200).send(count);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else if (req.params.year && req.params.month) {
        const page = !req.query.page
            ? 1
            : Math.max(parseInt(req.query.page.toString()), 1);
        const limit = parseInt(process.env.LIMIT.toString());
        const offset = (page - 1) * limit;
        Promise.all([
            SalesReturnModel.fetchArchive(year, month, offset, limit),
            SalesReturnModel.countArchive(year, month),
        ])
            .then((result) => {
            return res.status(200).send({
                data: result[0].map((x) => {
                    return Object.assign(Object.assign({}, x), { customer: x.sales_return.length == 0 ||
                            x.sales_return[0].bill.bill_code.customer == null
                            ? null
                            : {
                                name: x.sales_return[0].bill.bill_code.customer.name,
                            } });
                }),
                count: result[1],
            });
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else {
        return res.status(400).send("Input tidak dikenal.");
    }
};
SalesReturnController.fetchById = (req, res) => {
    const id = parseInt(req.params.id.toString());
    SalesReturnModel.fetchById(id)
        .then((result) => {
        if (result == null || result.sales_return.length == 0) {
            return res.status(404).send("Data tidak ditemukan.");
        }
        else {
            const bill_code_id = result === null || result === void 0 ? void 0 : result.sales_return[0].bill.bill_code_id;
            BillCodeModel.fetchById(bill_code_id).then((bill) => {
                return res.status(200).send(Object.assign(Object.assign({}, result), { bill: bill, customer: (result === null || result === void 0 ? void 0 : result.sales_return.length) == 0 ||
                        (result === null || result === void 0 ? void 0 : result.sales_return[0].bill.bill_code.customer) == null
                        ? null
                        : {
                            name: result.sales_return[0].bill.bill_code.customer.name,
                        } }));
            });
        }
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
SalesReturnController.deleteById = (req, res) => {
    const id = parseInt(req.params.id.toString());
    SalesReturnModel.fetchById(id).then((salesReturn) => {
        if (salesReturn == null || salesReturn.is_delete) {
            return res.status(404).send("Data tidak ditemukan.");
        }
        else {
            SalesReturnModel.deleteById(id, req.body.userId)
                .then((result) => {
                return res.status(200).send(result);
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
        }
    });
};
export default SalesReturnController;
