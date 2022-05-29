import express from 'express';
import cors from 'cors';

import { authMiddleware } from './middleware/auth_helper';

import authRoutes from './routes/auth_route';
import itemRoutes from './routes/item_route';
import itemPriceRoutes from './routes/item_price_route';
import brandRoutes from './routes/brand_route';
import supplierRoutes from './routes/supplier_route';
import companyRoutes from './routes/company_route';
import goodReceiptRoutes from './routes/good_receipt_route';


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
app.use("/itemPrice", authMiddleware, itemPriceRoutes);
app.use("/brand", authMiddleware, brandRoutes);
app.use("/supplier", authMiddleware, supplierRoutes);
app.use("/company", authMiddleware, companyRoutes);
app.use("/good_receipt", authMiddleware, goodReceiptRoutes);

app.listen(5000, () => {
    console.log("Application running on port 5000");
});