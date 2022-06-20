import { Request, Response } from "express";
import QueryTransactionHelper from "../helper/query.transaction.helper";
import SocketHelper from "../helper/socket.helper";
import { BrandModel } from "../model/brand.model";
import { ItemModel } from "../model/item.model";

class BrandController {
    static getAutocomplete = (req: Request, res: Response) => {
        const keyword = (!req.query.keyword) ? "" : req.query.keyword.toString();
        BrandModel.getAutocomplete(keyword).then(result => {
            return res.status(200).send(result);
        }).catch(error => {
            return res.status(500).send(error);
        })
    }

    static fetchById = (req: Request, res: Response) => {
        const id = parseInt(req.params.id);

        const transaction = new QueryTransactionHelper();
        transaction.create([
            BrandModel.fetchById(id),
            ItemModel.countByBrandId(id)
        ]).then(result => {
            return res.status(200).send({
                ...result[0],
                can_delete: (result[1] == 0) ? true : false
            });
        }).catch(error => {
            return res.status(500).send(error);
        })
    }

    static get = (req: Request, res: Response) => {
        const page = (!req.query.page) ? 1 : Math.max(1, parseInt(req.query.page.toString()));
        const keyword = (!req.query.keyword) ? "" : req.query.keyword.toString();
        const limit = parseInt(process.env.LIMIT?.toString()!);
        const offset = (page - 1) * limit;

        BrandModel.get(keyword, offset, limit).then(result => {
            return res.status(200).send({
                data: result[0],
                count: result[1]
            })
        }).catch(error => {
            return res.status(500).send(error);
        })
    };

    static create = (req: Request, res: Response) => {
        const name = req.body.name;
        BrandModel.getByName(name).then(brand => {
            if(brand != null){
                return res.status(500).send("Mohon masukkan nama merek unik.");
            }
        })

        const brand_object = new BrandModel(name, req.body.userId);
        brand_object.create().then(brand_result => {
            const socket = new SocketHelper("createBrand", brand_result);
            socket.create();

            return res.status(201).send(brand_result);
        }).catch(error => {
            return res.status(500).send(error);
        })
    }

    static update = (req: Request, res: Response) => {
        const id = req.body.id;
        const name = req.body.name;

        BrandModel.fetchById(id).then(brand => {
            if(brand == null || brand.is_delete){
                return res.status(404).send("Data tidak ditemukan.");
            }

            const update_brand = new BrandModel(name, brand.created_by, id);
            update_brand.update().then(result => {
                const socket = new SocketHelper("updateBrand", result);
                socket.create();

                return res.status(201).send(result);
            }).catch(error => {
                console.log(error);
                return res.status(500).send(error);
            })
        }).catch(error => {
            return res.status(500).send(error);
        })
    }

    static delete = (req: Request, res: Response) => {
        const id = parseInt(req.params.id);
        const validation = BrandModel.checkDeleteById(id);
        if(!validation){
            return res.status(500).send("Merek tidak dapat dihapus.");
        } else {
            
        }
    }
}

export default BrandController;