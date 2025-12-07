// server.js
import express from "express";
import cors from "cors";
import multer from "multer";
import axios from "axios";
import PinataSDK from "@pinata/sdk";
import dotenv from "dotenv";
import { Readable } from "stream";
import crypto from "crypto"; // NEW: for SHA-256 AI hash

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Multer: store files in memory
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Pinata SDK
const pinata = new PinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_SECRET_KEY
);

// ===================== /analyze ROUTE (UPDATED) =====================
app.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded"
      });
    }

    const fileBuffer = req.file.buffer;

    // Convert buffer → stream for Pinata
    const fileStream = Readable.from(fileBuffer);

    // 1️⃣ Upload image to IPFS
    const ipfsResult = await pinata.pinFileToIPFS(fileStream, {
      pinataOptions: { cidVersion: 1 },
      pinataMetadata: { name: req.file.originalname }
    });

    const imageHash = ipfsResult.IpfsHash; // CID

    // 2️⃣ Analyze image via Gemini Vision model
    const aiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: "Identify the issue in this image. Only respond with exactly one word: pothole, garbage, broken_light, water_leak, other."
              },
              {
                inline_data: {
                  data: fileBuffer.toString("base64"),
                  mime_type: req.file.mimetype
                }
              }
            ]
          }
        ]
      }
    );

    const issueType =
      aiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "unknown";

    // 3️⃣ AI-based severity logic
    const severity =
      issueType === "pothole" ? 7 :
      issueType === "garbage" ? 5 :
      issueType === "broken_light" ? 3 :
      issueType === "water_leak" ? 6 :
      1;

    // 4️⃣ Generate AI verification hash (for FDC)
    const dataToHash = `${issueType}-${severity}-${imageHash}`;
    const aiHash = crypto
      .createHash("sha256")
      .update(dataToHash)
      .digest("hex");

    // 5️⃣ Return data to frontend
    res.json({
      success: true,
      issueType,
      severity,
      imageHash,
      aiHash // <-- IMPORTANT: For FDC integration
    });

  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ===================== START SERVER =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Backend running on port ${PORT}`)
);
