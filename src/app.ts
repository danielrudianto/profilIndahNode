import express from 'express';
import cors from 'cors';

import { authMiddleware } from './helper/auth.helper';

import authRoutes from './routes/auth.route';
import itemRoutes from './routes/item.route';
import itemPriceRoutes from './routes/item_price.route';
import itemPurchaseRoutes from './routes/item_purchase_price.route';
import brandRoutes from './routes/brand.route';
import supplierRoutes from './routes/supplier.route';
import companyRoutes from './routes/company.route';
import goodReceiptRoutes from './routes/good_receipt.route';
import purchaseDocumentRoutes from './routes/purchase_document.route';
import userRoutes from './routes/user.route';

import { server } from './helper/socket.connection.helper';


const allowedOrigins = ['http://localhost:4200', 'https://app.profilindah.id'];
const options: cors.CorsOptions = {
  origin: allowedOrigins
};

const app = express();
app.use(cors(options));
app.use(express.urlencoded({extended: true})); 
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/item", authMiddleware, itemRoutes);
app.use("/brand", authMiddleware, brandRoutes);

app.use("/itemPrice", authMiddleware, itemPriceRoutes);
app.use("/itemPurchasePrice", authMiddleware, itemPurchaseRoutes);

app.use("/supplier", authMiddleware, supplierRoutes);
app.use("/company", authMiddleware, companyRoutes);

app.use("/good_receipt", authMiddleware, goodReceiptRoutes);
app.use("/purchaseDocument", authMiddleware, purchaseDocumentRoutes);

app.use("/user", authMiddleware, userRoutes);

app.listen(5000, () => {
    console.log("Application running on port 5000");
});

server.listen(5274, () => {});

export default app;