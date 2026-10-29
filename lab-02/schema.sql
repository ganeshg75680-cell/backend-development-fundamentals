CREATE TABLE IF NOT EXISTS book (
  id INTEGER PRIMARY KEY,
  title TEXT,
  author TEXT,
  price INTEGER,
  pages INTEGER
);

INSERT INTO book (title, author, price, pages) VALUES
  ('The Alchemist', 'Paulo Coelho', 299, 208),
  ('Wings of Fire', 'A. P. J. Abdul Kalam', 250, 180),
  ('The Guide', 'R. K. Narayan', 325, 240),
  ('Malgudi Days', 'R. K. Narayan', 280, 256),
  ('The White Tiger', 'Aravind Adiga', 399, 321),
  ('Train to Pakistan', 'Khushwant Singh', 310, 181),
  ('The God of Small Things', 'Arundhati Roy', 450, 340),
  ('Godan', 'Munshi Premchand', 220, 330),
  ('Midnight''s Children', 'Salman Rushdie', 499, 536),
  ('The Namesake', 'Jhumpa Lahiri', 380, 291);
