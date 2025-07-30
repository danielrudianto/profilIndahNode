"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSalesModel = void 0;
const product_type_model_1 = require("./product-type.model");
class UserSalesModel {
    constructor(data) {
        this.id = data.id;
        this.product_type_id = data.product_type_id;
        this.product_type = data.product_type;
    }
    static fromMap(data) {
        return new UserSalesModel({
            id: data.id,
            product_type_id: data.product_type_id,
            product_type: product_type_model_1.ProductTypeModel.fromMap(data.product_type),
        });
    }
}
exports.UserSalesModel = UserSalesModel;
//# sourceMappingURL=user-sales.model.js.map