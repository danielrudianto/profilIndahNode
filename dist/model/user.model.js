"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserViewModel = exports.UserModel = void 0;
const user_avatar_model_1 = __importDefault(require("./user-avatar.model"));
class UserModel {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.username = data.username;
        this.nik = data.nik;
        this.created_by = data.created_by;
        this.role = data.role;
        this.roleText = data.roleText;
        this.password = data.password;
        this.user_avatar = data.user_avatar;
        this.user_sales = data.user_sales;
        this.is_active = data.is_active;
        this.created_at = data.created_at;
    }
    static fromMap(data) {
        // if user_avatar is not null, convert it to IUserAvatar
        if (data.user_avatar) {
            data.user_avatar = user_avatar_model_1.default.fromMap(data.user_avatar);
        }
        return new UserModel({
            id: data.id,
            name: data.name,
            username: data.username,
            nik: data.nik,
            created_by: data.created_by,
            role: data.role,
            roleText: data.roleText,
            password: data.password,
            is_active: data.is_active,
            created_at: data.created_at,
            user_avatar: data.user_avatar == undefined
                ? undefined
                : user_avatar_model_1.default.fromMap(data.user_avatar),
            user_sales: data.user_sales,
        });
    }
}
exports.UserModel = UserModel;
class UserViewModel {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.username = data.username;
        this.role = data.role;
        this.user_avatar = data.user_avatar || null;
    }
    static fromMap(data) {
        // if user_avatar is not null, convert it to IUserAvatar
        if (data.user_avatar) {
            data.user_avatar = user_avatar_model_1.default.fromMap(data.user_avatar);
        }
        return new UserViewModel({
            id: data.id,
            name: data.name,
            username: data.username,
            role: data.role,
            user_avatar: data.user_avatar || null,
        });
    }
}
exports.UserViewModel = UserViewModel;
//# sourceMappingURL=user.model.js.map