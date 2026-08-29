import express from "express";
import { timeline } from "../../src/index";

const app = express();

app.use(timeline());

app.get("/users", async (_req, res) => {
  // Simulate controller async delay
  await new Promise((resolve) => setTimeout(resolve, 35));
  res.json([
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ]);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
