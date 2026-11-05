# Postman / Thunder Client test checklist

Base URL: `http://localhost:3000`
Set `Content-Type: application/json` for POST and PUT requests. A newly created database is seeded with sample books, including book `1` ("The Alchemist").

1. **GET `/books`** — expect `200` and a JSON list.
2. **POST `/books`** — send raw JSON below; expect `201`.
   ```json
   {
     "title": "The Alchemist",
     "author": "Paulo Coelho",
     "price": 350,
     "pages": 208
   }
   ```
3. **GET `/books?search_q=alch`** — expect a matching title.
4. **GET `/books?order_by=price&order=DESC`** — expect prices sorted high to low.
5. **GET `/books?min_price=100&max_price=500`** — expect only prices in the range.
6. **GET `/books?limit=2&offset=0`** — expect at most two books.
7. **POST `/books`** without `title` — expect `400`.
8. **POST `/books`** with `"price": "abc"` — expect `400`.
9. **GET `/books/999999`** — expect `404` if absent.
10. **GET `/books/1`** — expect `200` while book 1 exists.
11. **PUT `/books/1`** with a valid JSON body — expect `200`.
12. **DELETE `/books/1`** — expect `200`.
13. **DELETE `/books/999999`** — expect `404` if absent.
