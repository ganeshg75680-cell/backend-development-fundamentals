# Lab 1: Node.js and Express server

**Name:** Ganesh  
**Registration Number:** 9041  
**Section:** CSE-GenAI

## Live link

Not deployed yet. Add your public deployment URL here after deployment.

## Objective

Create a basic HTTP server using Node.js and an Express server with routes, JSON responses, current date/time, and a 404 handler.

## Requirements

- Node.js and npm
- A web browser
- Git (for GitHub submission)

## How to install and run

1. Open a terminal in this `lab-01` folder.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the Express server:

   ```bash
   npm start
   ```

4. Open `http://localhost:3000` in your browser.

### Run the basic Node.js HTTP server

Stop the Express server first with `Ctrl+C`, then run:

```bash
npm run start:basic
```

Both programs use port 3000 by default, so do not run them at the same time on the same port.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | Returns a welcome message |
| GET | `/about` | Returns name and section as JSON |
| GET | `/time` | Returns the current date and time as JSON |
| GET | `/unknown` | Example unmatched path; returns 404 |

## Screenshots

After running and testing the endpoints, save your own screenshots in the `screenshots/` folder and uncomment/update these links as appropriate:

- Home: `screenshots/home.png`
- About: `screenshots/about.png`
- Time: `screenshots/time.png`
- 404: `screenshots/not-found.png`

## Status codes

- `200 OK`: the three defined GET endpoints return successfully.
- `404 Not Found`: a path that does not match a defined route.

## Notes

Replace the name and section placeholders in `server.js` and this README. Record any problems you encountered and how you solved them.

Do not commit `node_modules/` or `.env` files.
