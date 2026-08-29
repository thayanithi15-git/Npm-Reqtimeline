import express from "express";
import { timeline } from "../../src/index";

const app = express();

app.use(timeline());

// Standalone step checkpoints
app.use(timeline.mark("auth"), (_req, _res, next) => {
  setTimeout(next, 5);
});

app.use(timeline.mark("validation"), (_req, _res, next) => {
  setTimeout(next, 2);
});

// Wrapped middleware step
const databaseQuery = async (
  _req: express.Request,
  _res: express.Response,
  next: express.NextFunction
) => {
  // Simulate slow database query (> 50ms threshold)
  await new Promise((resolve) => setTimeout(resolve, 60));
  next();
};

app.use(timeline.mark("database", databaseQuery));

app.get("/api/products", (_req, res) => {
  res.json({ products: ["Laptop", "Phone"] });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
