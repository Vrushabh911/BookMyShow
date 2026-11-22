/* Demo backend: used only when http://localhost:8080 is unreachable. Data lives in localStorage. */
(() => {
    const API = "http://localhost:8080/api/v1", realFetch = window.fetch.bind(window);
    let offline = false;
    const db = JSON.parse(localStorage.getItem("showtimeDemo") || '{"users":[],"bookings":[],"taken":{}}');
    const save = () => localStorage.setItem("showtimeDemo", JSON.stringify(db));
    const img = id => `https://images.unsplash.com/photo-${id}?w=900`;
    const MOVIES = [
        ["Dune: Part Two", "English", "Sci-Fi / Adventure", 166, "UA", "1534447677768-be436bb09401", "Paul Atreides unites with the Fremen while seeking revenge against the conspirators who destroyed his family."],
        ["Monkey Man", "English", "Action / Thriller", 113, "A", "1489599849927-2ee91cede3ba", "An anonymous young man unleashes a campaign of vengeance against the leaders who murdered his mother."],
        ["Kung Fu Panda 4", "English", "Animation / Comedy", 94, "U", "1517604931442-7e0c8ed2963c", "Po must train a new warrior while facing a powerful shape-shifting chameleon."],
        ["Jawan", "Hindi", "Action / Thriller", 169, "UA", "1574267432553-4b4628081c31", "A high-octane drama about a man driven by a personal vendetta to correct the wrongs in society."],
        ["Stree 2: Sarkate Ka Aatank", "Hindi", "Horror / Comedy", 149, "UA", "1509248961158-e54f6934749c", "The residents of Chanderi return to face a new supernatural threat."],
        ["12th Fail", "Hindi", "Drama", 147, "U", "1524995997946-a1c2e315a42f", "A determined student overcomes setbacks to pursue a dream bigger than his circumstances."],
        ["Interstellar", "English", "Sci-Fi / Adventure", 169, "UA", "1446776811953-b23d57bd21aa", "Explorers travel beyond the limits of space to secure a future for humanity."],
        ["3 Idiots", "Hindi", "Comedy / Drama", 170, "U", "1523240795612-9a054b0db644", "Three college friends navigate friendship, pressure, ambition and the meaning of success."]
    ].map((m, i) => ({ id: i + 1, title: m[0], language: m[1], genre: m[2], durationMinutes: m[3], certificate: m[4], posterUrl: img(m[5]), description: m[6],
        trailerUrl: "https://www.youtube.com/results?search_query=" + encodeURIComponent(m[0] + " trailer") }));
    const THEATRES = { Bengaluru: ["INOX: Megaplex", "PVR: Orion Mall"], Mumbai: ["INOX: R-City"], Delhi: ["PVR: Select Citywalk"] };
    const SEATS = Array.from({ length: 20 }, (_, i) => (i < 10 ? "A" : "B") + (i % 10 + 1));
    const live = {};
    const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 900000, 7) + 100;
    const pad = n => String(n).padStart(2, "0");

    function shows(city, date) {
        const out = [], day = Number(date.slice(8, 10));
        (THEATRES[city] || []).forEach((name, ti) => [0, 1, 2].forEach(j => {
            const movie = MOVIES[(ti * 3 + j + day) % MOVIES.length];
            ["11:00", "15:30", "19:00", "22:00"].slice(j % 2, j % 2 + 3).forEach(time => {
                const id = hash(city + date + ti + movie.id + time), start = new Date(`${date}T${time}:00`), end = new Date(start.getTime() + movie.durationMinutes * 60000);
                const taken = db.taken[id] || (db.taken[id] = SEATS.filter(() => Math.random() < 0.18));
                const local = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
                out.push(live[id] = { id, movie, theatre: { id: ti + 1, name, city, address: `${name}, ${city}` }, startAt: local(start), endAt: local(end),
                    ticketPrice: 180 + (movie.id * 13 % 5) * 30, totalSeats: 20, availableSeats: 20, availableSeatsLabels: SEATS.filter(s => !taken.includes(s)) });
            });
        }));
        save();
        return out;
    }

    function route(path, opt) {
        const url = new URL("http://x" + path), p = url.pathname, body = opt.body ? JSON.parse(opt.body) : null;
        const fail = (status, message) => ({ status, data: { message } });
        let m;
        if (p === "/movies") return { data: MOVIES };
        if (p === "/shows") return { data: shows(url.searchParams.get("city"), url.searchParams.get("date")) };
        if (p === "/profiles/login") {
            const raw = url.searchParams.get("identifier").trim().toLowerCase(), key = raw.includes("@") ? raw : raw.replace(/\D/g, "");
            const user = db.users.find(u => u.email.toLowerCase() === key || u.phone.replace(/\D/g, "") === key);
            return user ? { data: user } : fail(404, "No profile found for that email or mobile number");
        }
        if (p === "/profiles") {
            if (db.users.some(u => u.email === body.email || u.phone === body.phone)) return fail(409, "A profile with this email or phone already exists");
            const user = { id: db.users.length + 1, ...body }; db.users.push(user); save(); return { status: 201, data: user };
        }
        if ((m = p.match(/^\/profiles\/(\d+)\/bookings$/))) return { data: db.bookings.filter(b => b.profileId === +m[1]).reverse() };
        if ((m = p.match(/^\/bookings\/shows\/(\d+)$/))) {
            const show = live[m[1]], user = db.users.find(u => u.id === body.profileId), taken = db.taken[show.id];
            const labels = body.seatLabels.map(l => l.trim().toUpperCase());
            if (labels.some(l => taken.includes(l) || !SEATS.includes(l))) return fail(409, "One or more selected seats are unavailable");
            taken.push(...labels);
            const booking = { id: db.bookings.length + 1, showId: show.id, profileId: user.id, movieTitle: show.movie.title, theatreName: show.theatre.name, customerName: user.name,
                customerEmail: user.email, customerPhone: user.phone, seatLabels: labels, totalAmount: show.ticketPrice * labels.length, status: "CONFIRMED", bookedAt: new Date().toISOString() };
            db.bookings.push(booking); save(); return { status: 201, data: booking };
        }
        if ((m = p.match(/^\/bookings\/(\d+)\/cancel$/))) {
            const booking = db.bookings.find(b => b.id === +m[1] && b.profileId === Number(url.searchParams.get("profileId") || opt.body));
            if (!booking) return fail(404, "Booking not found");
            if (booking.status === "CONFIRMED") { booking.status = "CANCELLED"; db.taken[booking.showId] = (db.taken[booking.showId] || []).filter(l => !booking.seatLabels.includes(l)); save(); }
            return { data: booking };
        }
        return fail(404, "Not found");
    }

    window.fetch = async (url, opt = {}) => {
        if (!String(url).startsWith(API)) return realFetch(url, opt);
        if (!offline) {
            try { return await realFetch(url, opt); }
            catch (error) { offline = true; window.dispatchEvent(new Event("demo-mode")); }
        }
        const { status = 200, data } = route(String(url).slice(API.length), opt);
        return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
    };
})();
