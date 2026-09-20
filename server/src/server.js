import app from "./app.js";

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`CampusFlow server is running on http://localhost:${PORT}`);
});