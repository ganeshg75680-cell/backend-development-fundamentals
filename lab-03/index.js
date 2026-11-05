const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const app = express();
const PORT = process.env.PORT === undefined ? 3000 : Number(process.env.PORT);
const DB_PATH = path.resolve(process.env.DB_PATH || path.join(__dirname, "books.db"));
let db;

const sampleBooks = [
  ["The Alchemist", "Paulo Coelho", 350, 208],
  ["Atomic Habits", "James Clear", 450, 320],
  ["Rich Dad Poor Dad", "Robert Kiyosaki", 299, 336],
  ["The Power of Now", "Eckhart Tolle", 399, 236],
  ["Wings of Fire", "A.P.J. Abdul Kalam", 250, 180],
  ["Ikigai", "Hector Garcia", 320, 194],
  ["Think and Grow Rich", "Napoleon Hill", 280, 238],
  ["Deep Work", "Cal Newport", 420, 296],
  ["The Psychology of Money", "Morgan Housel", 375, 256],
  ["Harry Potter", "J.K. Rowling", 550, 400],
  ["The Great Gatsby", "F. Scott Fitzgerald", 199, 180],
  ["Zero to One", "Peter Thiel", 340, 210],
  ["The Intelligent Investor", "Benjamin Graham", 650, 640],
  ["Richest Man in Babylon", "George S. Clason", 220, 160],
  ["The 5 AM Club", "Robin Sharma", 390, 336]
];

app.use(express.json());

const sendError = (res, status, message) => res.status(status).json({ message });

function parseInteger(value, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (typeof value !== "string" || !/^-?\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function parseNumber(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function validateBook(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }
  if (typeof body.title !== "string" || !body.title.trim()) return "title is required.";
  if (typeof body.author !== "string" || !body.author.trim()) return "author is required.";

  const price = parseNumber(body.price);
  if (price === null || price < 0) return "price is required and must be a non-negative number.";

  if (body.pages !== undefined) {
    const pages = parseNumber(body.pages);
    if (pages === null || !Number.isInteger(pages) || pages < 1) {
      return "pages must be a positive integer.";
    }
  }
  return null;
}

function validateId(value) {
  return parseInteger(value, { min: 1 });
}

app.get("/books", async (req, res) => {
  try {
    const queryValue = (key, fallback) => {
      const value = req.query[key];
      return value === undefined ? fallback : typeof value === "string" ? value : null;
    };

    const search = queryValue("search_q", "");
    const orderByText = queryValue("order_by", "id");
    const orderText = queryValue("order", "ASC");
    const allowedColumns = ["id", "title", "author", "price", "pages"];

    if (search === null) return sendError(res, 400, "search_q must be a single string.");
    if (orderByText === null) return sendError(res, 400, "order_by must be a single value.");
    if (orderText === null) return sendError(res, 400, "order must be a single value.");
    const orderBy = orderByText.toLowerCase();
    const order = orderText.toUpperCase();
    if (!allowedColumns.includes(orderBy)) return sendError(res, 400, "Invalid order_by value.");
    if (!["ASC", "DESC"].includes(order)) return sendError(res, 400, "order must be ASC or DESC.");

    const limit = parseInteger(queryValue("limit", "10"), { min: 1 });
    const offset = parseInteger(queryValue("offset", "0"), { min: 0 });
    if (limit === null) return sendError(res, 400, "limit must be a positive integer.");
    if (offset === null) return sendError(res, 400, "offset must be a non-negative integer.");

    const conditions = [];
    const params = [];
    if (search.trim()) {
      conditions.push("title LIKE ?");
      params.push(`%${search.trim()}%`);
    }

    const minPriceText = queryValue("min_price");
    const maxPriceText = queryValue("max_price");
    if (minPriceText === null || maxPriceText === null) {
      return sendError(res, 400, "Price filters must be single numeric values.");
    }
    const minPrice = minPriceText === undefined ? undefined : parseNumber(minPriceText);
    const maxPrice = maxPriceText === undefined ? undefined : parseNumber(maxPriceText);
    if (minPriceText !== undefined && (minPrice === null || minPrice < 0)) {
      return sendError(res, 400, "min_price must be a non-negative number.");
    }
    if (maxPriceText !== undefined && (maxPrice === null || maxPrice < 0)) {
      return sendError(res, 400, "max_price must be a non-negative number.");
    }
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      return sendError(res, 400, "min_price cannot be greater than max_price.");
    }
    if (minPrice !== undefined) {
      conditions.push("price >= ?");
      params.push(minPrice);
    }
    if (maxPrice !== undefined) {
      conditions.push("price <= ?");
      params.push(maxPrice);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await db.all(
      `SELECT * FROM book ${where} ORDER BY ${orderBy} ${order} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("GET /books failed:", error);
    sendError(res, 500, "Unable to retrieve books.");
  }
});

app.get("/books/:id", async (req, res) => {
  const id = validateId(req.params.id);
  if (id === null) return sendError(res, 400, "id must be a positive integer.");
  try {
    const book = await db.get("SELECT * FROM book WHERE id = ?", [id]);
    if (!book) return sendError(res, 404, "Book not found.");
    res.status(200).json(book);
  } catch (error) {
    console.error("GET /books/:id failed:", error);
    sendError(res, 500, "Unable to retrieve book.");
  }
});

app.post("/books", async (req, res) => {
  const invalid = validateBook(req.body);
  if (invalid) return sendError(res, 400, invalid);

  const { title, author, price, pages } = req.body;
  try {
    const result = await db.run(
      "INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)",
      [title.trim(), author.trim(), parseNumber(price), pages === undefined ? 1 : parseNumber(pages)]
    );
    const book = await db.get("SELECT * FROM book WHERE id = ?", [result.lastID]);
    res.status(201).json({ message: "Book created successfully.", book });
  } catch (error) {
    console.error("POST /books failed:", error);
    sendError(res, 500, "Unable to create book.");
  }
});

app.put("/books/:id", async (req, res) => {
  const invalid = validateBook(req.body);
  if (invalid) return sendError(res, 400, invalid);
  const id = validateId(req.params.id);
  if (id === null) return sendError(res, 400, "id must be a positive integer.");

  const { title, author, price, pages } = req.body;
  try {
    const existing = await db.get("SELECT id FROM book WHERE id = ?", [id]);
    if (!existing) return sendError(res, 404, "Book not found.");
    await db.run(
      "UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?",
      [title.trim(), author.trim(), parseNumber(price), pages === undefined ? 1 : parseNumber(pages), id]
    );
    const book = await db.get("SELECT * FROM book WHERE id = ?", [id]);
    res.status(200).json({ message: "Book updated successfully.", book });
  } catch (error) {
    console.error("PUT /books/:id failed:", error);
    sendError(res, 500, "Unable to update book.");
  }
});

app.delete("/books/:id", async (req, res) => {
  const id = validateId(req.params.id);
  if (id === null) return sendError(res, 400, "id must be a positive integer.");
  try {
    const result = await db.run("DELETE FROM book WHERE id = ?", [id]);
    if (!result.changes) return sendError(res, 404, "Book not found.");
    res.status(200).json({ message: "Book deleted successfully." });
  } catch (error) {
    console.error("DELETE /books/:id failed:", error);
    sendError(res, 500, "Unable to delete book.");
  }
});

app.use((req, res) => sendError(res, 404, "Route not found."));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === "entity.parse.failed") {
    return sendError(res, 400, "Request body must contain valid JSON.");
  }
  if (error.type === "entity.too.large") {
    return sendError(res, 413, "Request body is too large.");
  }
  console.error("Request failed:", error);
  return sendError(res, 500, "Internal server error.");
});

async function initializeDatabase(database) {
  await database.exec(`
    CREATE TABLE IF NOT EXISTS book (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      price REAL NOT NULL CHECK (price >= 0),
      pages INTEGER NOT NULL DEFAULT 1 CHECK (pages > 0)
    )
  `);

  const { count } = await database.get("SELECT COUNT(*) AS count FROM book");
  if (count === 0) {
    await database.exec("BEGIN");
    try {
      const insert = await database.prepare(
        "INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?)"
      );
      try {
        for (const book of sampleBooks) await insert.run(book);
      } finally {
        await insert.finalize();
      }
      await database.exec("COMMIT");
      console.log(`Inserted ${sampleBooks.length} sample books.`);
    } catch (error) {
      await database.exec("ROLLBACK");
      throw error;
    }
  }
}

async function start() {
  if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
    throw new Error("PORT must be an integer between 0 and 65535.");
  }

  db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  try {
    await initializeDatabase(db);
    const server = app.listen(PORT);
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const address = server.address();
    console.log(`API running at http://localhost:${address.port}`);
    return { server, database: db };
  } catch (error) {
    await db.close();
    throw error;
  }
}

if (require.main === module) {
  start()
    .then(({ server, database }) => {
      const shutdown = () => {
        server.close(async (error) => {
          if (error) console.error("Server shutdown error:", error);
          await database.close();
          process.exit(error ? 1 : 0);
        });
      };
      process.once("SIGINT", shutdown);
      process.once("SIGTERM", shutdown);
    })
    .catch((error) => {
      console.error("Startup error:", error);
      process.exit(1);
    });
}

module.exports = { app, start };
