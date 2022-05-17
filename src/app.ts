import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth_route';
import itemRoutes from './routes/item_route';

const allowedOrigins = ['http://localhost:4200', 'https://app.profilindah.id'];
const options: cors.CorsOptions = {
  origin: allowedOrigins
};

const app = express();
app.use(cors(options));
app.use(express.urlencoded({extended: true})); 
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/item", itemRoutes);

app.listen(5000, () => {
    console.log("Application running on port 5000");
});