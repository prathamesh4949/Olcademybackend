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

// Simple CORS configuration that works with Vercel
app.use(cors({
  origin: [
    "http://localhost:4028",
    "https://olcademyfrontend.vercel.app",
    process.env.FRONTEND_URL
  ],
  credentials: true
}))

// Manual CORS headers for better compatibility
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://olcademyfrontend.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

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
