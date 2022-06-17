import { Request, Response } from "express";

class PurchaseDocumentController {
    static getById = (req: Request, res: Response) => {
        const id = parseInt(req.params.id);
        
    }
}

export default PurchaseDocumentController;