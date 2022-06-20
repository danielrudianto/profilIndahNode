import { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import BrandController from '../controller/brand.controller';
import { io } from '../helper/socket.connection.helper';

const prisma = new PrismaClient();
const router = Router();

router.get("/autocomplete", BrandController.getAutocomplete)
router.get("/:id", BrandController.fetchById)
router.get("/", BrandController.get)
router.put("/", BrandController.update)
router.post("/", BrandController.create)

router.delete("/:id", async(req, res, next) => {
    const id = parseInt(req.params.id);

    prisma.$transaction([
        prisma.item.count({
            where:{
                item_brand_id: id,
                is_delete: false
            }
        }),
        prisma.item_brand.findUnique({
            where:{
                id: id
            }
        })
    ]).then(result => {
        if(result[0] > 0){
            return res.status(500).send("Masih terdapat barang yang menggunakan merek ini. Tidak dapat menghapus merek.")
        }

        if(result[1]?.is_delete){
            return res.status(404).send("Merek tidak ditemukan.");
        }

        prisma.item_brand.update({
            where:{
                id: id
            },
            data: {
                is_delete: true,
                deleted_by: req.body.userId
            },
            select: {
                id: true,
                name: true
            }
        }).then(async(result) => {
            const count = await prisma.item_brand.count({
                where:{
                    is_delete: false
                }
            });
            io.emit("deleteBrand", {
                id: result.id,
                count: count
            });
            return res.status(201).send(result);
        }).catch(error => {
            return res.status(500).send(error);
        })
    }).catch(error => {
        return res.status(500).send(error);
    });    
})

export default router;