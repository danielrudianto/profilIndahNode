import { validationResult } from "express-validator";
import LogHelper from "../helper/log.helper";
import QueryTransactionHelper from "../helper/query.transaction.helper";
import SocketHelper from "../helper/socket.helper";
import BillCodeModel from "../model/bill_code.model";
import BillModel from "../model/bill_code.model";
import CustomerModel from "../model/customer.model";
class CustomerController {
}
CustomerController.create = (req, res) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
        return res.status(400).send(validation_result.array()[0].msg);
    }
    const name = req.body.name;
    const address = req.body.address;
    const pic = req.body.pic;
    const phone_number = req.body.phone_number;
    const npwp = req.body.npwp.toString().length == 15 ? req.body.npwp : null;
    const customer = new CustomerModel(name, address, npwp, pic, phone_number, req.body.userId);
    customer
        .create()
        .then((result) => {
        LogHelper.log(result.created_at, "info", `${result.user.name} created customer with the name ${result.name} (ID: ${result.id})`, "Customer - Create", req.body.userId);
        const socket = new SocketHelper("createCustomer", Object.assign(Object.assign({}, result), { can_delete: true }));
        socket.create();
        return res.status(201).send(result);
    })
        .catch((error) => {
        LogHelper.log(new Date(), "error", error, "Customer - Create", req.body.userId);
        return res.status(500).send(error);
    });
};
CustomerController.update = (req, res) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
        return res.status(400).send(validation_result.array()[0].msg);
    }
    const id = req.body.id;
    const name = req.body.name;
    const address = req.body.address;
    const npwp = req.body.npwp;
    const pic = req.body.pic;
    const phone_number = req.body.phone_number;
    const customer = new CustomerModel(name, address, npwp, pic, phone_number, req.body.userId, id);
    customer
        .update()
        .then((result) => {
        var _a;
        LogHelper.log(new Date(), "info", `${(_a = result.user_customer_updated_byTouser) === null || _a === void 0 ? void 0 : _a.name} updated customer with the name ${result.name} (ID: ${result.id})`, "Customer - Update", req.body.userId);
        const socket = new SocketHelper("updateCustomer", result);
        socket.create();
        return res.status(201).send(result);
    })
        .catch((error) => {
        LogHelper.log(new Date(), "error", error, "Customer - Update", req.body.userId);
        return res.status(500).send(error);
    });
};
CustomerController.delete = (req, res) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
        return res.status(400).send(validation_result.array()[0].msg);
    }
    const id = parseInt(req.params.id.toString());
    BillModel.countByCustomerId(id).then((count) => {
        if (count == 0) {
            CustomerModel.delete(id, req.body.userId)
                .then((customer) => {
                var _a;
                LogHelper.log(customer.deleted_at, "info", `${(_a = customer.user_customer_deleted_byTouser) === null || _a === void 0 ? void 0 : _a.name} deleted customer with the name ${customer.name} (ID: ${customer.id})`, "Customer - Delete", req.body.userId);
                const socket = new SocketHelper("deleteCustomer", customer);
                socket.create();
                return res.status(201).send(customer);
            })
                .catch((error) => {
                LogHelper.log(new Date(), "error", error, "Customer - Delete", req.body.userId);
                return res.status(500).send(error);
            });
        }
        else {
            return res
                .status(400)
                .send("Konsumen tidak dapat dihapus karena terdapat bon dengan konsumen tersebut.");
        }
    });
};
CustomerController.fetchAutocomplete = (req, res) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
        return res.status(400).send(validation_result.array()[0].msg);
    }
    const keyword = req.query.keyword.toString();
    CustomerModel.fetchAutocomplete(keyword)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        LogHelper.log(new Date(), "error", error, "Customer - Fetch autocomplete", req.body.userId);
        return res.status(500).send(error);
    });
};
CustomerController.fetch = (req, res) => {
    var _a;
    const page = !req.query.page
        ? 1
        : Math.max(parseInt(req.query.page.toString()), 1);
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    const keyword = !req.query.keyword ? "" : (_a = req.query.keyword) === null || _a === void 0 ? void 0 : _a.toString();
    CustomerModel.fetch(keyword, offset, limit)
        .then((result) => {
        BillModel.countByCustomerIds(result[0].map((x) => {
            return x.id;
        }))
            .then((count) => {
            return res.status(201).send({
                data: result[0].map((item) => {
                    return Object.assign(Object.assign({}, item), { can_delete: count.filter((x) => x.customer_id == item.id).length == 0
                            ? true
                            : count.filter((x) => x.customer_id == item.id)[0]
                                ._count == 0 });
                }),
                count: result[1],
            });
        })
            .catch((error) => {
            LogHelper.log(new Date(), "error", error, "Customer - Fetch", req.body.userId);
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        LogHelper.log(new Date(), "error", error, "Customer - Fetch", req.body.userId);
        return res.status(500).send(error);
    })
        .catch((error) => {
        LogHelper.log(new Date(), "error", error, "Customer - Fetch", req.body.userId);
        return res.status(500).send(error);
    });
};
CustomerController.fetchById = (req, res) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
        return res.status(400).send(validation_result.array()[0].msg);
    }
    const id = parseInt(req.params.id);
    const transaction = new QueryTransactionHelper();
    transaction
        .create([CustomerModel.fetchById(id), BillModel.countByCustomerId(id)])
        .then((result) => {
        return res.status(200).send(Object.assign(Object.assign({}, result[0]), { can_delete: result[1] == 0 ? true : false }));
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
CustomerController.fetchDetailById = (req, res) => {
    const id = parseInt(req.params.id);
    Promise.all([
        CustomerModel.fetchById(id),
        BillCodeModel.fetchByCustomerId(id),
    ])
        .then(result => {
        return res.status(200).send({
            customer: result[0],
            value: result[1][0].value,
            count: result[1][0].count,
        });
    }).catch(error => {
        return res.status(500).send(error);
    });
};
export default CustomerController;
