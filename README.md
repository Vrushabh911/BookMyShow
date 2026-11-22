# BookMyShow — Full-Stack Movie Ticket Booking Application

A full-stack movie ticket booking web application built with **Spring Boot**, **MySQL**, and **Vanilla JavaScript/HTML/CSS**[cite: 1, 2]. Users can browse active movies, filter showtimes by city and date, create or log into a profile, select seats, and book tickets[cite: 1, 2, 3].

---

## Project Structure

```text
BookMyShow/
├── BookMyShowBE/       # Spring Boot REST API backend (Java 21, Spring Data JPA, MySQL)
├── bookmyshow-ui/      # Frontend web application (HTML5, CSS3, JavaScript)
└── BookMyShowApp.sql   # MySQL database schema and seed data
Tech StackBackend: Java 21, Spring Boot 4.1.1, Spring WebMVC, Spring Data JPA, Hibernate, Jakarta ValidationDatabase: MySQL 8.0+ (HikariCP connection pooling)Frontend: HTML5, CSS3, Vanilla JavaScript (index.html, style.css, app.js)Build Tool: Maven (mvnw)Core FeaturesCustomer Profiles: Create a profile (full name, email, 10-digit mobile number) or log in using an existing email or mobile number.Movie & Theatre Catalog: View active movies, theatres, and city-based showtimes.Real-Time Seat Selection: View available and reserved seats per show and book tickets with seat validation.Booking Management: Create and view ticket bookings with structured API exception handling.Getting StartedPrerequisitesJDK 21 or higherMySQL 8.0+ running on localhost:3306Maven (or use the included ./mvnw wrapper)1. Database SetupThe backend automatically creates the bookmyshow database if it does not exist. To populate initial tables and sample movies/shows, import BookMyShowApp.sql:Bashmysql -u root -p bookmyshow < BookMyShowApp.sql
Update your database credentials in BookMyShowBE/src/main/resources/application.properties if needed:Propertiesspring.datasource.url=jdbc:mysql://localhost:3306/bookmyshow?createDatabaseIfNotExist=true
spring.datasource.username=root
spring.datasource.password=your_password
2. Run the BackendNavigate to the backend directory and start the Spring Boot server:Bashcd BookMyShowBE
./mvnw spring-boot:run
The API server runs at http://localhost:8080.3. Run the FrontendOpen bookmyshow-ui/index.html directly in your browser (or serve it via VS Code Live Server / any static HTTP server) and ensure it connects to http://localhost:8080.API OverviewResourceControllerDescriptionMoviesMovieControllerFetch active movies and movie detailsTheatresTheatreControllerList theatres by cityShowsShowControllerBrowse showtimes and available seatsProfilesProfileControllerRegister or retrieve customer profilesBookingsBookingControllerCreate and retrieve ticket bookings
