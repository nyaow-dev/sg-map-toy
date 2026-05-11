import "dotenv/config";
import express from "express";
import cors from "cors";
import { router as poisRouter } from "./routes/pois.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: function (origin, callback) {
      const allowed = ["http://localhost:3000", "http://localhost:1841"];

      // Allow any vercel.app subdomain for this project
      const vercelPreview = /^https:\/\/sg-map[a-z0-9-]*\.vercel\.app$/;

      if (!origin || allowed.includes(origin) || vercelPreview.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS blocked: " + origin));
      }
    },
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/pois", poisRouter);

app.listen(PORT, () => {
  console.log(`SG Map API running on http://localhost:${PORT}`);
});
