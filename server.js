import express from 'express'
const app = express();
import dotenv from "dotenv"
dotenv.config();
import cookieparser from 'cookie-parser';
import userRoutes from './routes/UserRoutes.js'
import cors from "cors"
import { connectDB } from './utils/db.js';


//middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieparser())


app.use(cors({
   origin: [
      "http://localhost:4028",
      process.env.FRONTEND_URL
    ],
    credentials: true,               // allow cookies/credentials
}))



//api
app.use('/user', userRoutes);
app.get("/", (req, res) => {
  res.send("Hello from backend!");
});


const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    connectDB()
    console.log(`Server running on PORT ${PORT}`);
})
