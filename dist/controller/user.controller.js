import { hash } from "bcryptjs";
import LogHelper from "../helper/log.helper";
import SocketHelper from "../helper/socket.helper";
import UserModel from "../model/user.model";
import UserRoleModel from "../model/user_role.model";
class UserController {
}
UserController.create = (req, res) => {
    const roleId = parseInt(req.body.role);
    const role = UserModel.roles.filter((x) => x.id == roleId && x.available);
    const username = req.body.username;
    const nik = req.body.nik;
    const name = req.body.name;
    if (role.length == 0 || role == null) {
        return res.status(500).send("Peran tidak ditemukan.");
    }
    UserModel.countDuplicate(username, nik).then((count) => {
        if (count > 0) {
            return res.status(500).send("Mohon masukan username / NIK unik.");
        }
        let password = "";
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (var i = 0; i < 8; i++) {
            password +=
                characters[Math.floor(Math.random() * (characters.length - 1))];
        }
        hash(password, 12)
            .then((hashedPassword) => {
            const user = new UserModel(name, nik, username, hashedPassword, req.body.userId);
            user
                .create()
                .then((user_create) => {
                const user_role = new UserRoleModel(user_create.id, roleId);
                user_role
                    .create()
                    .then((user_role_create) => {
                    var _a;
                    const user_object = {
                        id: user_create.id,
                        name: user_create.name,
                        nik: user_create.nik,
                        username: user_create.username,
                        password: password,
                        role: UserModel.roles.filter((x) => x.id == user_role_create.role)[0].name,
                        user: user_create.user,
                    };
                    const socket = new SocketHelper("createUser", user_object);
                    socket.create();
                    LogHelper.log(new Date(), "info", `${(_a = user_create.user) === null || _a === void 0 ? void 0 : _a.name} created user with username ${user_create.username} (ID: ${user_create.id})`, "User - Create", req.body.userId);
                    return res.status(201).send({
                        name: user_create.name,
                        nik: user_create.nik,
                        username: user_create.username,
                        password: password,
                        role: UserModel.roles.filter((x) => x.id == user_role_create.role)[0],
                    });
                })
                    .catch((error) => {
                    LogHelper.log(new Date(), "error", error, "User - Create", req.body.userId);
                    return res.status(500).send(error);
                });
            })
                .catch((error) => {
                LogHelper.log(new Date(), "error", error, "User - Create", req.body.userId);
                return res.status(500).send(error);
            });
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    });
};
UserController.fetchById = (req, res) => {
    const id = parseInt(req.params.id);
    UserModel.fetchById(id)
        .then((user) => {
        if (user == null) {
            return res.status(404).send("Pengguna tidak ditemukan.");
        }
        const response = Object.assign(Object.assign({}, user), { role: UserModel.roles.filter((y) => { var _a; return y.id == ((_a = user.user_department) === null || _a === void 0 ? void 0 : _a.role); })[0].name });
        return res.status(200).send(response);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
UserController.fetch = (req, res) => {
    var _a, _b;
    const page = !req.query.page
        ? 1
        : Math.max(1, parseInt((_a = req.query.page) === null || _a === void 0 ? void 0 : _a.toString()));
    const keyword = !req.query.keyword ? "" : (_b = req.query.keyword) === null || _b === void 0 ? void 0 : _b.toString();
    const limit = parseInt(process.env.LIMIT.toString());
    const offset = (page - 1) * limit;
    UserModel.fetch(keyword, offset, limit)
        .then((result) => {
        const response = [];
        result[0].forEach((x) => {
            response.push({
                id: x.id,
                nik: x.nik,
                name: x.name,
                username: x.username,
                user_department: x.user_department,
                role: x.user_department == null
                    ? null
                    : UserModel.roles.filter((y) => { var _a; return y.id == ((_a = x.user_department) === null || _a === void 0 ? void 0 : _a.role); })[0].name,
            });
        });
        return res.status(200).send({
            data: response,
            count: result[1],
        });
    })
        .catch((error) => {
        LogHelper.log(new Date(), "error", error, "User - Update", req.body.userId);
        return res.status(500).send(error);
    });
};
UserController.update = (req, res) => {
    const name = req.body.name;
    const id = req.body.id;
    const roleId = parseInt(req.body.role);
    const role = UserModel.roles.filter((x) => x.id == roleId && x.available);
    if (role == null || role.length == 0) {
        return res.status(500).send("Peran tidak ditemukan.");
    }
    else {
        UserModel.fetchById(id).then((user) => {
            const userRoleModel = new UserRoleModel(id, role[0].id);
            Promise.all([
                UserModel.update(id, name, null, req.body.userId),
                userRoleModel.update(),
            ])
                .then((result) => {
                const user_object = {
                    id: result[0].id,
                    name: result[0].name,
                    nik: result[0].nik,
                    username: result[0].username,
                    password: null,
                    role: UserModel.roles.filter((x) => x.id == result[1].role)[0],
                };
                const socket = new SocketHelper("updateUser", {
                    data: user_object,
                });
                socket.create();
                return res.status(201).send(user_object);
            })
                .catch((error) => {
                return res.status(500).send(error);
            });
        });
    }
};
UserController.toggleActive = (req, res) => {
    const id = parseInt(req.params.id);
    UserModel.fetchById(id)
        .then((user) => {
        if (user == null) {
            return res.status(404).send("Pengguna tidak ditemukan.");
        }
        UserModel.delete(user.id, !user.is_active, req.body.userId)
            .then((user_delete) => {
            var _a;
            // If user was active and no longer active
            // Log him / her out from our system immidiately
            if (user.is_active) {
                LogHelper.log(new Date(), "info", `${(_a = user_delete.user_userTouser_deleted_by) === null || _a === void 0 ? void 0 : _a.name} deleted user with username ${user_delete.username} (ID: ${user_delete.id})`, "User - Delete", req.body.userId);
                const socket = new SocketHelper("deleteUser", user_delete);
                socket.create();
            }
            return res.status(201).send(user_delete);
        })
            .catch((error) => {
            LogHelper.log(new Date(), "error", error, "User - Delete", req.body.userId);
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        LogHelper.log(new Date(), "error", error, "User - Delete", req.body.userId);
        return res.status(500).send(error);
    });
};
UserController.changePassword = (req, res) => {
    const password = req.body.password;
    hash(password, 12).then((hashed_password) => {
        UserModel.updatePassword(hashed_password, req.body.userId)
            .then((result) => {
            return res.status(200).send(result);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    });
};
export default UserController;
