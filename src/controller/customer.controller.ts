import { Request, Response } from "express";
import SocketHelper from "../helper/socket.helper";
import CustomerModel from "../model/customer.model";

class CustomerController {
    static create = (req: Request, res: Response) => {
        const name = req.body.name;
        const address = req.body.address;
        const pic = req.body.pic;
        const phone_number = req.body.phone_number;
        const npwp = (req.body.npwp.toString().length == 15) ? req.body.npwp : null;

        const customer = new CustomerModel(name, address, npwp, pic, phone_number, req.body.userId);
        customer.create().then(result => {
            const socket = new SocketHelper("createCustomer", result);
            socket.create();
            return res.status(201).send(result);
        }).catch(error => {
            return res.status(500).send(error);
        })
    }
}

export default CustomerController;