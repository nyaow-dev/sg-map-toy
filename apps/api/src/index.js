import "dotenv/config";
import express from "express";
import cors from "cors";
import { router as poisRouter } from "./routes/pois.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:1841",
      "https://sg-map-toy.vercel.app",
    ],
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/pois", poisRouter);

app.listen(PORT, () => {
  console.log(`SG Map API running on http://localhost:${PORT}`);
});
