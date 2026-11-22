const API_BASE = "http://localhost:8080/api/v1";
const FALLBACK_MOVIES = [
    { id: 1, title: "Dune: Part Two", language: "English", genre: "Sci-Fi / Adventure", certificate: "UA", posterUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=900" },
    { id: 2, title: "Monkey Man", language: "English", genre: "Action / Thriller", certificate: "A", posterUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900" },
    { id: 3, title: "Kung Fu Panda 4", language: "English", genre: "Animation / Comedy", certificate: "U", posterUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=900" },
    { id: 4, title: "Jawan", language: "Hindi", genre: "Action / Thriller", certificate: "UA", posterUrl: "https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=900" },
    { id: 5, title: "Stree 2: Sarkate Ka Aatank", language: "Hindi", genre: "Horror / Comedy", certificate: "UA", posterUrl: "https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=900" }
];

const savedProfile = JSON.parse(localStorage.getItem("showtimeProfile") || "null");
const state = { movies: [], shows: [], selectedShow: null, selectedSeats: [], selectedDate: dateKey(new Date()), heroIndex: 0, showMovieId: null, autoDate: true, dateTries: 0, activeFilter: "All", profile: savedProfile, pendingShowId: null };
const $ = (selector) => document.querySelector(selector);

function dateKey(date) { const z = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); }
function formatTime(value) { return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
function money(value) { return `₹${Number(value).toLocaleString("en-IN")}`; }
function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character])); }
function normShow(s) { return { ...s, startsAt: s.startsAt ?? s.startAt, endsAt: s.endsAt ?? s.endAt, availableSeatLabels: s.availableSeatLabels ?? s.availableSeatsLabels ?? [] }; }
function paintAvatar() { const p = state.profile; $("#profileButton").textContent = p ? p.name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase() : "\u263A"; }
function normalizePhone(value) { return String(value || "").replace(/\D/g, ""); }

async function fetchJson(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, { headers: { "Content-Type": "application/json" }, ...options });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Something went wrong");
    }
    return response.json();
}

function renderMovies() {
    const query = $("#searchInput").value.toLowerCase().trim();
    const movies = state.movies.filter(movie => {
        const matchesQuery = `${movie.title} ${movie.genre} ${movie.language}`.toLowerCase().includes(query);
        const matchesFilter = state.activeFilter === "All" || movie.language === state.activeFilter || movie.genre.includes(state.activeFilter);
        return matchesQuery && matchesFilter;
    });
    $("#movieGrid").innerHTML = movies.length ? movies.map((movie, index) => `
        <article class="movie-card" data-open="${movie.id}" tabindex="0" style="animation-delay:${index * 90}ms">
            <div class="poster-wrap">
                <img src="${escapeHtml(movie.posterUrl)}" alt="${escapeHtml(movie.title)} poster" loading="lazy">
                <span class="poster-badge">${escapeHtml(movie.certificate || "NOW SHOWING")}</span>
            </div>
            <div class="movie-info">
                <div><h3>${escapeHtml(movie.title)}</h3><p>${escapeHtml(movie.language)} · ${escapeHtml(movie.genre)}</p></div>
                <div class="movie-rating"><span>★</span> 8.${index + 1}</div>
            </div>
            <button class="movie-action" type="button">View details <span>↗</span></button>
        </article>`).join("") : `<div class="empty-state">No movies match that search yet.</div>`;
    document.querySelectorAll(".movie-card").forEach(card => {
        const open = () => openMovie(Number(card.dataset.open));
        card.addEventListener("click", open);
        card.addEventListener("keydown", event => { if (event.key === "Enter") open(); });
    });
}

function renderHero() {
    const movie = state.movies[state.heroIndex % state.movies.length || 0];
    if (!movie) return;
    $("#heroImage").src = movie.posterUrl;
    $("#heroImage").alt = `${movie.title} artwork`;
    $("#heroTitle").innerHTML = `${escapeHtml(movie.title)}<br><em>on the biggest screen.</em>`;
    $("#heroDescription").textContent = movie.description || "Big screens, first-day energy, and a seat with your name on it.";
    $("#heroLanguage").textContent = movie.language;
    $("#heroGenre").textContent = movie.genre;
    $("#heroCount").textContent = String(state.movies.length).padStart(2, "0");
    $("#heroIndex").textContent = String(state.heroIndex + 1).padStart(2, "0");
    if (window.onHeroRender) window.onHeroRender();
}

function renderDates() {
    const dates = Array.from({ length: 7 }, (_, index) => new Date(Date.now() + index * 86400000));
    $("#datePicker").innerHTML = dates.map(date => {
        const key = dateKey(date);
        const day = indexDay(date);
        return `<button class="date-button ${key === state.selectedDate ? "active" : ""}" data-date="${key}" type="button"><span>${day}</span><strong>${date.getDate()}</strong></button>`;
    }).join("");
    document.querySelectorAll(".date-button").forEach(button => button.addEventListener("click", () => {
        state.selectedDate = button.dataset.date;
        renderDates();
        loadShows();
    }));
}
function indexDay(date) { return dateKey(date) === dateKey(new Date()) ? "Today" : date.toLocaleDateString([], { weekday: "short" }); }

function renderShows() {
    const pool = state.showMovieId ? state.shows.filter(show => show.movie.id === state.showMovieId) : state.shows;
    const grouped = pool.reduce((groups, show) => {
        const key = `${show.movie.id}-${show.theatre.id}`;
        (groups[key] ||= { movie: show.movie, theatre: show.theatre, shows: [] }).shows.push(show);
        return groups;
    }, {});
    const entries = Object.values(grouped).sort((a, b) => a.theatre.name.localeCompare(b.theatre.name));
    const picked = state.movies.find(movie => movie.id === state.showMovieId);
    const chip = state.showMovieId ? `<div class="active-filter">Showing <strong>${escapeHtml(picked ? picked.title : "selected movie")}</strong><button id="clearShowFilter" type="button" aria-label="Show all movies">×</button></div>` : "";
    $("#showList").innerHTML = chip + (entries.length ? entries.map(group => `
        <article class="show-row">
            <div class="show-movie"><img class="mini-poster" src="${escapeHtml(group.movie.posterUrl)}" alt=""><div><h3>${escapeHtml(group.movie.title)}</h3><p>${escapeHtml(group.movie.language)} · ${escapeHtml(group.movie.durationMinutes)} min</p></div></div>
            <div class="show-theatre"><strong>${escapeHtml(group.theatre.name)}</strong><p class="theatre-address">${escapeHtml(group.theatre.address)}</p></div>
            <div class="show-times">${group.shows.sort((a, b) => a.startsAt < b.startsAt ? -1 : 1).map(show => {
                const left = show.availableSeatLabels.length, past = new Date(show.startsAt) < new Date();
                const fast = left > 0 && left < show.totalSeats * 0.3;
                return `<button class="time-button ${left === 0 ? "sold" : fast ? "fast" : ""}" data-show-id="${show.id}" type="button" ${left === 0 || past ? "disabled" : ""}>${formatTime(show.startsAt)} · ${money(show.ticketPrice)}<small>${left === 0 ? "Sold out" : past ? "Started" : fast ? `Filling fast · ${left} left` : `${left} seats left`}</small></button>`;
            }).join("")}</div>
        </article>`).join("") : `<div class="empty-state">No shows found for this date. Try another day.</div>`);
    const clear = $("#clearShowFilter");
    if (clear) clear.addEventListener("click", () => { state.showMovieId = null; renderShows(); });
    document.querySelectorAll(".time-button").forEach(button => button.addEventListener("click", () => openSeatModal(Number(button.dataset.showId))));
}

async function loadMovies() {
    try { state.movies = await fetchJson("/movies"); } catch (error) { state.movies = FALLBACK_MOVIES; showToast("Showing sample movies. Start the backend to book tickets.", false); }
    renderHero();
    renderMovies();
}
async function loadShows() {
    const city = encodeURIComponent($("#citySelect").value);
    $("#showList").innerHTML = `<div class="loading-state"><span class="loader"></span>Finding shows in ${escapeHtml($("#citySelect").value)}...</div>`;
    try {
        state.shows = (await fetchJson(`/shows?city=${city}&date=${state.selectedDate}`)).map(normShow);
        if (!state.shows.length && state.autoDate && state.dateTries++ < 6) {
            state.selectedDate = dateKey(new Date(new Date(`${state.selectedDate}T00:00`).getTime() + 86400000));
            renderDates();
            return loadShows();
        }
        state.autoDate = false;
        renderShows();
    }
    catch (error) { state.shows = []; $("#showList").innerHTML = `<div class="empty-state">Connect the Spring Boot backend to see live showtimes.</div>`; }
}

function openSeatModal(showId) {
    if (!state.profile) {
        state.pendingShowId = showId;
        openAccountModal();
        showToast("Create a profile or log in before choosing seats.", false);
        return;
    }
    state.selectedShow = state.shows.find(show => show.id === showId);
    state.selectedSeats = [];
    $("#modalTitle").textContent = "Select your seats";
    $("#modalSubtitle").textContent = `${state.selectedShow.movie.title} · ${state.selectedShow.theatre.name} · ${formatTime(state.selectedShow.startsAt)}`;
    renderSeats();
    $("#bookingModal").hidden = false;
    document.body.style.overflow = "hidden";
}
function renderSeats() {
    const show = state.selectedShow, available = new Set(show.availableSeatLabels);
    const perRow = Math.max(10, ...[...available].map(label => parseInt(label.slice(1), 10) || 0));
    const labels = Array.from({ length: show.totalSeats }, (_, index) => `${String.fromCharCode(65 + Math.floor(index / perRow))}${index % perRow + 1}`);
    const rows = labels.reduce((map, label) => ((map[label[0]] ||= []).push(label), map), {});
    $("#seatGrid").innerHTML = Object.entries(rows).map(([row, seats]) => `<div class="seat-row" style="--n:${seats.length}"><span class="row-label">${row}</span>${seats.map((label, i) => {
        const occupied = !available.has(label), selected = state.selectedSeats.includes(label);
        return `<button class="seat ${occupied ? "occupied" : ""} ${selected ? "selected" : ""} ${i === Math.ceil(perRow / 2) ? "aisle" : ""}" ${occupied ? "disabled" : ""} data-seat="${label}" title="${label} · ${money(show.ticketPrice)}" aria-pressed="${selected}" type="button">${label.slice(1)}</button>`;
    }).join("")}</div>`).join("");
    document.querySelectorAll(".seat:not(.occupied)").forEach(button => button.addEventListener("click", () => {
        const label = button.dataset.seat, chosen = state.selectedSeats.includes(label);
        if (!chosen && state.selectedSeats.length >= 8) return showToast("You can book up to 8 seats at a time.", false);
        state.selectedSeats = chosen ? state.selectedSeats.filter(seat => seat !== label) : [...state.selectedSeats, label];
        renderSeats();
    }));
    const count = state.selectedSeats.length;
    $("#totalAmount").textContent = money(count * Number(show.ticketPrice));
    $("#continueButton").innerHTML = `Continue${count ? ` · ${count} seat${count > 1 ? "s" : ""}` : ""} <span>→</span>`;
    $("#continueButton").disabled = !count;
}
function closeModals() {
    $("#bookingModal").hidden = true;
    $("#customerModal").hidden = true;
    $("#accountModal").hidden = true;
    $("#movieModal").hidden = true;
    $("#ticketModal").hidden = true;
    document.body.style.overflow = "";
}
function showToast(message, success = true) { const toast = $("#successToast"); toast.textContent = message; toast.style.borderLeftColor = success ? "#48bd8c" : "#f5c84b"; toast.classList.add("visible"); setTimeout(() => toast.classList.remove("visible"), 5000); }

function openAccountModal() {
    $("#accountModal").hidden = false;
    document.body.style.overflow = "hidden";
    renderProfile();
}

function renderProfile() {
    const profile = state.profile;
    paintAvatar();
    $("#profileAuth").hidden = Boolean(profile);
    $("#profileView").hidden = !profile;
    if (!profile) return;
    $("#profileDisplayName").textContent = profile.name;
    $("#profileDisplayContact").textContent = `${profile.email} · ${profile.phone}`;
    loadBookingHistory();
}

function setProfile(profile) {
    state.profile = profile;
    localStorage.setItem("showtimeProfile", JSON.stringify(profile));
    renderProfile();
    if (state.pendingShowId) {
        const showId = state.pendingShowId;
        state.pendingShowId = null;
        closeModals();
        openSeatModal(showId);
    }
}

function renderBookingHistory(bookings) {
    $("#bookingHistory").innerHTML = bookings.length ? bookings.map(booking => `
        <article class="booking-card ${booking.status === "CANCELLED" ? "cancelled" : ""}">
            <div class="booking-card-heading"><strong>${escapeHtml(booking.movieTitle)}</strong><span class="booking-status">${escapeHtml(booking.status)}</span></div>
            <p>${escapeHtml(booking.theatreName)} · ${new Date(booking.bookedAt).toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
            <div class="booking-card-meta"><span>Seats <strong>${escapeHtml(booking.seatLabels.join(", "))}</strong></span><strong>${money(booking.totalAmount)}</strong></div>
            ${booking.status === "CONFIRMED" ? `<button class="cancel-booking" data-booking-id="${booking.id}" type="button">Cancel booking</button>` : ""}
        </article>`).join("") : `<div class="empty-state booking-empty">No bookings found for this number.</div>`;
    document.querySelectorAll(".cancel-booking").forEach(button => button.addEventListener("click", () => cancelBooking(Number(button.dataset.bookingId))));
}

async function loadBookingHistory() {
    if (!state.profile) return;
    $("#bookingHistory").innerHTML = `<div class="loading-state"><span class="loader"></span>Finding your bookings...</div>`;
    try {
        const bookings = await fetchJson(`/profiles/${state.profile.id}/bookings`);
        renderBookingHistory(bookings);
    } catch (error) {
        $("#bookingHistory").innerHTML = `<p class="form-error">${escapeHtml(error.message || "Unable to load bookings")}</p>`;
    }
}

async function cancelBooking(bookingId) {
    if (!state.profile || !window.confirm("Cancel this booking and release the seats?")) return;
    try {
        await fetchJson(`/bookings/${bookingId}/cancel?profileId=${state.profile.id}`, { method: "POST", body: String(state.profile.id) });
        showToast("Booking cancelled and seats released.");
        await loadBookingHistory();
        loadShows();
    } catch (error) {
        showToast(error.message || "Unable to cancel booking", false);
    }
}

$("#searchInput").addEventListener("input", renderMovies);
document.querySelectorAll(".filter-button").forEach(button => button.addEventListener("click", () => {
    state.activeFilter = button.dataset.filter;
    document.querySelectorAll(".filter-button").forEach(item => item.classList.toggle("active", item === button));
    renderMovies();
}));
$("#citySelect").addEventListener("change", loadShows);
$("#heroBrowseButton").addEventListener("click", () => $("#moviesSection").scrollIntoView({ behavior: "smooth" }));
$("#viewAllButton").addEventListener("click", () => {
    $("#searchInput").value = "";
    state.activeFilter = "All";
    document.querySelectorAll(".filter-button").forEach(item => item.classList.toggle("active", item.dataset.filter === "All"));
    renderMovies();
    $("#moviesSection").scrollIntoView({ behavior: "smooth" });
});
$("#closeModalButton").addEventListener("click", closeModals);
$("#closeCustomerButton").addEventListener("click", closeModals);
$("#closeAccountButton").addEventListener("click", closeModals);
$("#profileButton").addEventListener("click", openAccountModal);
$("#createTab").addEventListener("click", () => {
    $("#createTab").classList.add("active");
    $("#loginTab").classList.remove("active");
    $("#profileCreateForm").hidden = false;
    $("#profileLoginForm").hidden = true;
});
$("#loginTab").addEventListener("click", () => {
    $("#loginTab").classList.add("active");
    $("#createTab").classList.remove("active");
    $("#profileCreateForm").hidden = true;
    $("#profileLoginForm").hidden = false;
});
$("#profileCreateForm").addEventListener("submit", async event => {
    event.preventDefault();
    const error = $("#profileCreateError");
    error.textContent = "";
    try {
        const profile = await fetchJson("/profiles", { method: "POST", body: JSON.stringify({ name: $("#profileName").value, email: $("#profileEmail").value, phone: $("#profilePhone").value }) });
        setProfile(profile);
        showToast(`Welcome, ${profile.name}. Your profile is ready.`);
    } catch (profileError) { error.textContent = profileError.message; }
});
$("#profileLoginForm").addEventListener("submit", async event => {
    event.preventDefault();
    const error = $("#profileLoginError");
    error.textContent = "";
    try {
        const profile = await fetchJson(`/profiles/login?identifier=${encodeURIComponent($("#profileIdentifier").value)}`);
        setProfile(profile);
        showToast(`Welcome back, ${profile.name}.`);
    } catch (profileError) { error.textContent = profileError.message; }
});
$("#logoutButton").addEventListener("click", () => {
    state.profile = null;
    localStorage.removeItem("showtimeProfile");
    renderProfile();
    showToast("You have been logged out.");
});
$("#continueButton").addEventListener("click", () => {
    $("#bookingModal").hidden = true;
    $("#formSeats").textContent = `${state.selectedSeats.join(", ")} · ${state.selectedSeats.length} seat${state.selectedSeats.length > 1 ? "s" : ""}`;
    $("#formTotal").textContent = money(state.selectedSeats.length * Number(state.selectedShow.ticketPrice));
    $("#bookingProfileLabel").textContent = `Booking as ${state.profile.name} · ${state.profile.email}`;
    $("#customerModal").hidden = false;
});
$("#customerForm").addEventListener("submit", async event => {
    event.preventDefault();
    const error = $("#bookingError");
    error.textContent = "";
    const submit = event.target.querySelector("button[type=submit]");
    submit.disabled = true;
    try {
        const booking = await fetchJson(`/bookings/shows/${state.selectedShow.id}`, { method: "POST", body: JSON.stringify({ profileId: state.profile.id, seatLabels: state.selectedSeats }) });
        closeModals();
        event.target.reset();
        showTicket(booking, state.selectedShow);
        loadShows();
    } catch (bookingError) { error.textContent = bookingError.message; }
    finally { submit.disabled = false; }
});

document.addEventListener("keydown", event => { if (event.key === "Escape") closeModals(); });
paintAvatar();
renderDates();
loadMovies();
loadShows();
