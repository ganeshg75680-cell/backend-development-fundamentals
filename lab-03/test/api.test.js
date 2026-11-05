const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.join(__dirname, "..");

function startServer(databasePath) {
  const child = spawn(process.execPath, [path.join(projectRoot, "index.js")], {
    cwd: projectRoot,
    env: { ...process.env, PORT: "0", DB_PATH: databasePath },
    stdio: ["ignore", "pipe", "pipe"]
  });

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Server did not start in time. ${stderr}`));
    }, 10000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      const match = stdout.match(/API running at http:\/\/localhost:(\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve({ child, baseUrl: `http://localhost:${match[1]}` });
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited with code ${code}. ${stderr}`));
    });
  });
}

async function stopServer(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 3000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
    child.kill();
  });
}

test("book API covers the documented Postman checklist", async (t) => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "lab-03-api-"));
  const databasePath = path.join(tempDirectory, "books.db");
  let child;
  t.after(async () => {
    await stopServer(child);
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  });

  const server = await startServer(databasePath);
  child = server.child;
  let baseUrl = server.baseUrl;
  const request = (route, options = {}) => fetch(`${baseUrl}${route}`, options);
  const jsonRequest = (route, method, body) => request(route, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  let response = await request("/books");
  assert.equal(response.status, 200);
  assert.equal((await response.json()).length, 10);

  response = await jsonRequest("/books", "POST", {
    title: "Test Book",
    author: "Test Author",
    price: 250,
    pages: 120
  });
  assert.equal(response.status, 201);
  const created = (await response.json()).book;
  assert.equal(created.title, "Test Book");

  response = await request("/books?search_q=alch");
  assert.equal(response.status, 200);
  assert.equal((await response.json())[0].title, "The Alchemist");

  response = await request("/books?order_by=price&order=DESC");
  assert.equal(response.status, 200);
  assert.equal((await response.json())[0].price, 650);

  response = await request("/books?min_price=100&max_price=500");
  assert.equal(response.status, 200);
  assert.ok((await response.json()).every((book) => book.price >= 100 && book.price <= 500));

  response = await request("/books?limit=2&offset=0");
  assert.equal(response.status, 200);
  assert.equal((await response.json()).length, 2);

  response = await jsonRequest("/books", "POST", { author: "Missing title", price: 100 });
  assert.equal(response.status, 400);

  response = await jsonRequest("/books", "POST", {
    title: "Invalid Price",
    author: "Test Author",
    price: "abc"
  });
  assert.equal(response.status, 400);

  response = await request("/books/999999");
  assert.equal(response.status, 404);

  response = await request("/books/1");
  assert.equal(response.status, 200);

  response = await jsonRequest("/books/1", "PUT", {
    title: "Updated Book",
    author: "Updated Author",
    price: 300,
    pages: 200
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).book.title, "Updated Book");

  response = await request("/books/1", { method: "DELETE" });
  assert.equal(response.status, 200);

  response = await request("/books/999999", { method: "DELETE" });
  assert.equal(response.status, 404);

  response = await request("/books?order_by=id&order_by=price");
  assert.equal(response.status, 400);

  response = await request("/books", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{"
  });
  assert.equal(response.status, 400);

  await stopServer(child);
  child = null;
  const restartedServer = await startServer(databasePath);
  child = restartedServer.child;
  baseUrl = restartedServer.baseUrl;

  response = await request(`/books/${created.id}`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).title, "Test Book");
  response = await request("/books/1");
  assert.equal(response.status, 404);
});
