import { Request, Response } from "express";
import SocketHelper from "../helper/socket.helper";
import SupplierModel from "../model/supplier.model";

class SupplierController {
    static create = (req: Request, res: Response) => {
        const name = req.body.name;
        const address = req.body.address;
        const npwp = (req.body.npwp.toString().length == 15) ? req.body.npwp : null;

        const supplier = new SupplierModel(name, address, npwp, null, req.body.userId);
        supplier.create().then(supplier_result => {
            const socket = new SocketHelper("createSupplier", supplier_result);
            socket.create();

            return res.status(201).send(supplier_result)
        }).catch(error => {
            return res.status(500).send(error);
        })
    }

    static update = (req: Request, res: Response) => {
        const name = req.body.name;
        const id = req.body.id;
        const address = req.body.address;
        const npwp = (req.body.npwp.toString().length == 15) ? req.body.npwp : null;

        const supplier = new SupplierModel(name, address, npwp, id);
        supplier.update().then(supplier_result => {
            const socket = new SocketHelper("updateSupplier", supplier_result);
            socket.create();

            return res.status(201).send("Data supplier berhasil dirubah.");
        }).catch(error => {
            return res.status(500).send(error);
        })
    }

    static getItems = (req: Request, res: Response) => {
        const keyword = (!req.query.keyword) ? "" : req.query.keyword.toString();
        const page = (!req.query.page) ? 1 : Math.max(1, parseInt(req.query.page.toString()));
        const limit = parseInt(process.env.LIMIT!);
        const offset = (page - 1) * limit;

        SupplierModel.getItems(keyword, offset, limit).then(result => {
            return res.status(200).send({
                data: result[0],
                count: result[1]
            });
        }).catch(error => {
            return res.status(500).send(error);
        })
    }

    static getAutocomplete = (req: Request, res: Response) => {
        const keyword = (!req.query.keyword) ? "" : req.query.keyword.toString();
        SupplierModel.getAutocomplete(keyword).then(result => {
            return res.status(200).send(result);
        }).catch(error => {
            return res.status(500).send(error);
        })
    }
}

export default SupplierController;