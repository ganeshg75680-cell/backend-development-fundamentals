const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "books.db");
const PORT = process.env.PORT || 3000;
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    await db.exec(`CREATE TABLE IF NOT EXISTS book (
      id INTEGER PRIMARY KEY,
      title TEXT,
      author TEXT,
      price INTEGER,
      pages INTEGER
    )`);
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const isValidBook = ({ title, author, price, pages }) =>
  typeof title === "string" && title.trim() !== "" &&
  typeof author === "string" && author.trim() !== "" &&
  Number.isInteger(price) && price >= 0 &&
  Number.isInteger(pages) && pages > 0;

const isValidId = (id) => /^\d+$/.test(id);

// 1. Get all books
app.get("/books/", async (request, response) => {
  try {
    const books = await db.all("SELECT * FROM book ORDER BY id;");
    response.send(books);
  } catch (error) {
    response.status(500).send({ error: "Internal server error" });
  }
});

// 2. Get one book
app.get("/books/:bookId/", async (request, response) => {
  const { bookId } = request.params;
  if (!isValidId(bookId)) return response.status(400).send({ error: "Invalid book id" });
  try {
    const book = await db.get("SELECT * FROM book WHERE id = ?;", [bookId]);
    if (!book) return response.status(404).send({ error: "Book not found" });
    response.send(book);
  } catch (error) {
    response.status(500).send({ error: "Internal server error" });
  }
});

// 3. Add a book
app.post("/books/", async (request, response) => {
  if (!isValidBook(request.body)) {
    return response.status(400).send({
      error: "title and author must be non-empty strings; price and pages must be integers",
    });
  }
  const { title, author, price, pages } = request.body;
  try {
    const result = await db.run(
      "INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?);",
      [title, author, price, pages]
    );
    response.status(201).send({ message: "Book added successfully", bookId: result.lastID });
  } catch (error) {
    response.status(500).send({ error: "Internal server error" });
  }
});

// 4. Update a book
app.put("/books/:bookId/", async (request, response) => {
  const { bookId } = request.params;
  if (!isValidId(bookId)) return response.status(400).send({ error: "Invalid book id" });
  if (!isValidBook(request.body)) {
    return response.status(400).send({
      error: "title and author must be non-empty strings; price and pages must be integers",
    });
  }
  const { title, author, price, pages } = request.body;
  try {
    const result = await db.run(
      "UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?;",
      [title, author, price, pages, bookId]
    );
    if (result.changes === 0) return response.status(404).send({ error: "Book not found" });
    response.send({ message: "Book updated successfully" });
  } catch (error) {
    response.status(500).send({ error: "Internal server error" });
  }
});

// 5. Delete a book
app.delete("/books/:bookId/", async (request, response) => {
  const { bookId } = request.params;
  if (!isValidId(bookId)) return response.status(400).send({ error: "Invalid book id" });
  try {
    const result = await db.run("DELETE FROM book WHERE id = ?;", [bookId]);
    if (result.changes === 0) return response.status(404).send({ error: "Book not found" });
    response.send({ message: "Book deleted successfully" });
  } catch (error) {
    response.status(500).send({ error: "Internal server error" });
  }
});
