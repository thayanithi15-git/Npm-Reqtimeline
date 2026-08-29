import express from "express";
import { timeline } from "../../src/index";

const app = express();

app.use(
  timeline({
    enabled: process.env.NODE_ENV !== "production",
    slowThreshold: 20,
    output: "json", // Output structured JSON instead of terminal boxes
  })
);

app.get("/items", async (req, res) => {
  const items = await req.timeline?.time("fetch-items", async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
    return ["item1", "item2"];
  });

  res.json({ items });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
