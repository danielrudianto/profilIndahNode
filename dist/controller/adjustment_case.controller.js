"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const log_helper_1 = __importDefault(require("../helper/log.helper"));
const query_transaction_helper_1 = __importDefault(require("../helper/query.transaction.helper"));
const adjustment_case_model_1 = __importDefault(require("../model/adjustment_case.model"));
class AdjustmentCaseController {
}
_a = AdjustmentCaseController;
AdjustmentCaseController.post = (req, res) => {
    const name = _a.generateName(new Date(req.body.date));
    const adjustment_case = new adjustment_case_model_1.default(name, new Date(req.body.date), req.body.userId);
    adjustment_case
        .create()
        .then((result) => {
        adjustment_case_model_1.default.createItems(req.body.adjustment_case.map((x) => {
            return Object.assign(Object.assign({}, x), { quantity: req.body.type == 0 ? x.quantity : -1 * x.quantity, adjustment_case_code_id: result.id });
        }))
            .then(() => {
            return res.status(201).send(result);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        log_helper_1.default.log(new Date(), "error", error, "Adjustment case controller - Create", req.body.userId);
        return res.status(500).send(error);
    });
};
AdjustmentCaseController.generateName = (date) => {
    return `ADJ-${date.getFullYear()}-${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
};
AdjustmentCaseController.fetchArchives = (req, res) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (!req.params.year && !req.params.month) {
        const archive_years = adjustment_case_model_1.default.fetchArchiveYears();
        const count_archive_years = adjustment_case_model_1.default.countArchiveByYear();
        const transaction = new query_transaction_helper_1.default();
        transaction
            .create([archive_years, count_archive_years])
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
        adjustment_case_model_1.default.countArchiveByMonth(year)
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
        const transaction = new query_transaction_helper_1.default();
        transaction
            .create([
            adjustment_case_model_1.default.fetchArchive(year, month, offset, limit),
            adjustment_case_model_1.default.countArchive(year, month),
        ])
            .then((result) => {
            return res.status(200).send({
                data: result[0],
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
AdjustmentCaseController.fetchById = (req, res) => {
    const id = parseInt(req.params.id);
    adjustment_case_model_1.default.fetchById(id)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
AdjustmentCaseController.fetchCodeById = (req, res) => {
    const id = parseInt(req.params.id.toString());
    adjustment_case_model_1.default.fetchCodeById(id).then(result => {
        return res.status(200).send(result === null || result === void 0 ? void 0 : result.adjustment_case_code);
    }).catch(error => {
        log_helper_1.default.log(new Date(), 'error', error, "Adjustment Case Controller - fetchCodeById", req.body.userId);
        return res.status(500).send(error);
    });
};
exports.default = AdjustmentCaseController;
