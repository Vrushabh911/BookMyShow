# Showtime UI (enhanced)

Plain HTML, CSS and JavaScript frontend for the BookMyShow-style Spring Boot API (`/api/v1`).

## Run

1. Start the backend on port 8080 (`mvn spring-boot:run`).
2. Serve this folder: `python -m http.server 5500`
3. Open http://localhost:5500 (the backend CORS config only allows `localhost` / `127.0.0.1` origins, so don't open the file directly).

If the backend is unreachable, `demo.js` serves sample data from localStorage so the whole flow (sign up, book, cancel) still works. Delete `demo.js` and its `<script>` tag to disable that.

## What's new

- Auto-rotating hero carousel with dots; "Book tickets" opens the movie
- Movie details dialog (genres, duration, description, trailer) with "Find showtimes" that filters the list
- Showtimes grouped per movie **and** theatre (previously shows from other theatres were merged), 7-day date picker starting today, and automatic jump to the first date that has shows
- Availability on every showtime: seats left, "filling fast", sold out, already started
- Seat map with row labels, an aisle, 8-seat limit and live seat count
- Ticket-style confirmation after booking; richer booking history with date and time
- Initials avatar for the logged-in profile
- Local-time date handling (`toISOString` shifted the date in non-UTC time zones)
- Accepts both API field spellings (`startAt`/`startsAt`, `availableSeatsLabels`/`availableSeatLabels`); cancel sends the profile id as a query param and as the body

## Files

`index.html` · `style.css` (original) · `enhance.css` · `app.js` (patched) · `enhance.js` · `demo.js`
