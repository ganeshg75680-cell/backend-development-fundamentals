const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// GET / — welcome message
app.get("/", (req, res) => {
  res.status(200).send("Welcome to the Node.js and Express Server!");
});

// GET /about — name and section as JSON
app.get("/about", (req, res) => {
  res.status(200).json({
    name: "Ganesh",
    section: "CSE-GenAI"
  });
});

// GET /time — current date and time as JSON
app.get("/time", (req, res) => {
  res.status(200).json({
    currentDateTime: new Date()
  });
});

// Any unmatched route returns 404
app.use((req, res) => {
  res.status(404).send("404 - Route Not Found");
});

app.listen(PORT, () => {
  console.log(`Express server running at http://localhost:${PORT}`);
});
