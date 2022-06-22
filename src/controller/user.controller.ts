import { hash } from "bcryptjs";
import { Request, Response } from "express";
import QueryTransactionHelper from "../helper/query.transaction.helper";
import SocketHelper from "../helper/socket.helper";
import UserModel from "../model/user.model";
import UserRoleModel from "../model/user_role.model";

class UserController {
    static create = (req: Request, res: Response) => {
        const roleId = parseInt(req.body.role);
        const role = UserModel.roles.filter(x => x.id == roleId && x.available);
        const username = req.body.username;
        const nik = req.body.nik;
        const name = req.body.name;

        if(role.length == 0 || role == null){
            return res.status(500).send("Peran tidak ditemukan.");
        }

        UserModel.countDuplicate(username, nik).then(count => {
            if(count > 0){
                return res.status(500).send("Mohon masukan username / NIK unik.");
            }

            let password = "";
            const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            for(var i = 0; i < 8; i++){
                password += characters[Math.floor(Math.random() * (characters.length - 1))];
            }

            hash(password, 12).then(hashedPassword => {
                const user = new UserModel(name, nik, username, hashedPassword, req.body.userId);
                user.create().then(user_create => {
                    const user_role = new UserRoleModel(user_create.id, roleId);
                    user_role.create().then(user_role_create => {
                        const user_object = {
                            id: user_create.id,
                            name: user_create.name,
                            nik: user_create.nik,
                            username: user_create.username,
                            password: password,
                            role: UserModel.roles.filter(x => x.id == user_role_create.role)[0]
                        };

                        const socket = new SocketHelper("createUser", {
                            data: user_object
                        });
                        socket.create();

                        return res.status(201).send({
                            name: user_create.name,
                            nik: user_create.nik,
                            username: user_create.username,
                            password: password,
                            role: UserModel.roles.filter(x => x.id == user_role_create.role)[0]
                        });
                    }).catch(error => {
                        return res.status(500).send(error);
                    })
                }).catch(error => {
                    return res.status(500).send(error);
                })
            }).catch(error => {
                return res.status(500).send(error);
            })
        })
    }

    static fetchById = (req: Request, res: Response) => {
        const id = parseInt(req.params.id);
        UserModel.fetchById(id).then(user => {
            if(user == null){
                return res.status(404).send("Pengguna tidak ditemukan.");
            }

            const response = {
                ...user,
                role: UserModel.roles.filter(y => y.id == user.user_department?.role)[0].name
            }

            return res.status(200).send(response);
        }).catch(error => {
            return res.status(500).send(error);
        })
    };

    static fetch = (req: Request, res: Response) => {
        const page = (!req.query.page) ? 1 : Math.max(1, parseInt(req.query.page?.toString()));
        const keyword = (!req.query.keyword) ? "" : req.query.keyword?.toString();
        const limit = parseInt(process.env.LIMIT!.toString());
        const offset = (page - 1) * limit;

        UserModel.fetch(keyword, offset, limit).then(result => {
            const response: any[] = [];
            result[0].forEach(x => {
                response.push({
                    id: x.id,
                    nik: x.nik,
                    name: x.name,
                    username: x.username,
                    user_department: x.user_department,
                    role: UserModel.roles.filter(y => y.id == x.user_department?.role)[0].name
                })
            })
            return res.status(200).send({
                data: response,
                count: result[1]
            })
        }).catch(error => {
            return res.status(500).send(error);
        })
    }

    static update = (req: Request, res: Response) => {
        const password = req.body.password;
        const name = req.body.name;
        const id = req.body.id;

        const roleId = parseInt(req.body.role);
        const role = UserModel.roles.filter(x => x.id == roleId && x.available);

        if(role == null || role.length == 0){
            return res.status(500).send("Peran tidak ditemukan.");
        }

        UserModel.fetchById(id).then(user => {
            hash(password, 12).then(hashedPassword => {
                const userRoleModel = new UserRoleModel(id, role[0].id);
                new QueryTransactionHelper().create([
                    UserModel.update(id, name, hashedPassword),
                    userRoleModel.update()
                ]).then(result => {
                    const user_object = {
                        id: result[0].id,
                        name: result[0].name,
                        nik: result[0].nik,
                        username: result[0].username,
                        password: null,
                        role: UserModel.roles.filter(x => x.id == result[2].role)[0]
                    };

                    const socket = new SocketHelper("updateUser", {
                        data: user_object
                    });
                    socket.create();

                    return res.status(201).send("User berhasil dirubah.");
                }).catch(error => {
                    return res.status(500).send(error);
                })
            }).catch(error => {
                return res.status(500).send(error);
            })
        })
    }

    static toggleActive = (req: Request, res: Response) => {
        const id = parseInt(req.params.id);
        UserModel.fetchById(id).then(user => {
            if(user == null){
                return res.status(404).send("Pengguna tidak ditemukan.");
            }

            UserModel.toggleActive(user.id, !user.is_active).then(() => {
                // If user was active and no longer active
                // Log him / her out from our system immidiately
                if(user.is_active){
                    const socket = new SocketHelper("userInactive", {
                        username: user.username
                    });
                    socket.create();
                }
                
                return res.status(201).send("Status berhasil dirubah.");
            }).catch(error => {
                return res.status(500).send(error);
            })
        }).catch(error => {
            return res.status(500).send(error);
        })
    }
}

export default UserController;