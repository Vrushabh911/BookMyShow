/* Showtime UI enhancements: hero carousel, movie details dialog, ticket confirmation, demo-mode notice. */
let heroTimer = null, heroHover = false;
const pad2 = n => String(n).padStart(2, "0");

function setHero(index) {
    const count = state.movies.length;
    if (!count) return;
    state.heroIndex = (index + count) % count;
    const image = $("#heroImage");
    image.classList.remove("fade");
    void image.offsetWidth;
    image.classList.add("fade");
    renderHero();
}

window.onHeroRender = () => {
    const count = state.movies.length, dots = $("#heroDots");
    if (dots.children.length !== count) {
        dots.innerHTML = state.movies.map((movie, i) => `<button type="button" data-i="${i}" aria-label="Show ${escapeHtml(movie.title)}"></button>`).join("");
    }
    [...dots.children].forEach((dot, i) => dot.classList.toggle("on", i === state.heroIndex));
    if (!heroTimer && count > 1) heroTimer = setInterval(() => { if (!heroHover && !document.hidden) setHero(state.heroIndex + 1); }, 6500);
};

function openMovie(id) {
    const movie = state.movies.find(m => m.id === id);
    if (!movie) return;
    const today = state.shows.filter(show => show.movie.id === id).length;
    const city = $("#citySelect").value;
    const tags = [movie.certificate, `${movie.durationMinutes} min`, ...String(movie.genre || "").split("/").map(g => g.trim())].filter(Boolean);
    const trailer = /^https?:\/\//.test(movie.trailerUrl || "") ? `<a class="ghost-button" href="${escapeHtml(movie.trailerUrl)}" target="_blank" rel="noopener">▶ Watch trailer</a>` : "";
    $("#movieDetail").innerHTML = `<div class="movie-detail">
        <img src="${escapeHtml(movie.posterUrl)}" alt="${escapeHtml(movie.title)} poster">
        <div>
            <p class="eyebrow">${escapeHtml(movie.language)}</p>
            <h2 id="movieModalTitle">${escapeHtml(movie.title)}</h2>
            <div class="tag-row">${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
            <p class="movie-desc">${escapeHtml(movie.description || "Book the best seats for this one before they go.")}</p>
            <p class="muted-text">${today ? `${today} show${today > 1 ? "s" : ""} on ${new Date(`${state.selectedDate}T00:00`).toLocaleDateString([], { day: "numeric", month: "short" })} in ${escapeHtml(city)}` : `No shows on the selected date in ${escapeHtml(city)}`}</p>
            <div class="detail-actions"><button id="detailBook" class="primary-button" type="button">Find showtimes <span>→</span></button>${trailer}</div>
        </div></div>`;
    $("#detailBook").addEventListener("click", () => {
        state.showMovieId = id;
        closeModals();
        renderShows();
        $("#showtimesSection").scrollIntoView({ behavior: "smooth" });
    });
    $("#movieModal").hidden = false;
    document.body.style.overflow = "hidden";
}

function showTicket(booking, show) {
    const when = show ? new Date(show.startsAt).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";
    $("#ticketBody").innerHTML = `<div class="ticket">
        <p class="eyebrow">Booking confirmed</p>
        <h2>${escapeHtml(booking.movieTitle)}</h2>
        <p class="muted-text">${escapeHtml(booking.theatreName)}</p>
        <div class="ticket-grid">
            <div><span>Date &amp; time</span><strong>${escapeHtml(when || "—")}</strong></div>
            <div><span>Seats</span><strong>${escapeHtml(booking.seatLabels.join(", "))}</strong></div>
            <div><span>Amount paid</span><strong>${money(booking.totalAmount)}</strong></div>
            <div><span>Booking ID</span><strong>#${escapeHtml(booking.id)}</strong></div>
        </div>
        <div class="ticket-cut"></div><div class="barcode" aria-hidden="true"></div>
        <button id="viewTickets" class="primary-button" type="button">View my bookings <span>→</span></button></div>`;
    $("#viewTickets").addEventListener("click", () => { closeModals(); openAccountModal(); });
    $("#ticketModal").hidden = false;
    document.body.style.overflow = "hidden";
}

$("#heroDots").addEventListener("click", event => { const dot = event.target.closest("button[data-i]"); if (dot) setHero(Number(dot.dataset.i)); });
$(".hero-section").addEventListener("mouseenter", () => { heroHover = true; });
$(".hero-section").addEventListener("mouseleave", () => { heroHover = false; });
$("#heroBookButton").addEventListener("click", () => { const movie = state.movies[state.heroIndex]; if (movie) openMovie(movie.id); });
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", closeModals));
document.querySelectorAll(".modal-backdrop").forEach(backdrop => backdrop.addEventListener("mousedown", event => { if (event.target === backdrop) closeModals(); }));
window.addEventListener("demo-mode", () => showToast("Backend not reachable – running on demo data. Start the Spring Boot app to use live data.", false));
