import express from "express";
import {
  createPaste,
  getPastes,
  getPasteById,
  getPasteHTML
} from "../controllers/pasteController.js";


const router = express.Router();

router.post("/", createPaste);
router.get("/", getPastes);
router.get("/:id", getPasteById);
router.get("/html/:id", getPasteHTML);


export default router;




