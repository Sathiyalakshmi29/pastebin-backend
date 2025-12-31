import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import pasteRoutes from "./routes/pasteRoutes.js";
import { getPasteHTML } from "./controllers/pasteController.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.get("/p/:id", getPasteHTML);
// ✅ API routes only
app.use("/api/pastes", pasteRoutes);


// Health check
app.get("/api/healthz", async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(console.error);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));



