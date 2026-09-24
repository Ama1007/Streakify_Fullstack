# 🔥 Streakify 2.0 — Full-Stack Habit & Streak Tracker

[![Java](https://img.shields.io/badge/Java-17-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-blue.svg)](https://supabase.com/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED.svg)](https://www.docker.com/)
[![Render](https://img.shields.io/badge/Deployed-Render-46E3B7.svg)](https://streakify-fullstack-1.onrender.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Streakify 2.0** is an enterprise-ready, cloud-deployed full-stack habit and streak tracking platform. Built with **Spring Boot 3**, **PostgreSQL (Supabase)**, and a modern, modular **HTML5/CSS3/Vanilla JS** interface, Streakify empowers users to build unbreakable habits with daily check-ins, automated streak analytics, global leaderboards, and a dedicated **Admin Command Center**.

🌐 **Live Demo:** [https://streakify-fullstack-1.onrender.com](https://streakify-fullstack-1.onrender.com)  
📦 **GitHub Repository:** [https://github.com/Ama1007/Streakify_Fullstack](https://github.com/Ama1007/Streakify_Fullstack)

---

## 📚 Table of Contents

- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [REST API Reference](#-rest-api-reference)
- [Engineering Challenges & Highlights](#-engineering-challenges--highlights)
- [Frontend Architecture](#-frontend-architecture)
- [Local Setup & Installation](#-local-setup--installation)
- [Docker & Cloud Deployment](#-docker--cloud-deployment)
- [Author](#-author)

---

## ✨ Key Features

### 🔐 1. Authentication & Security
- **BCrypt Password Hashing**: Passwords are cryptographically salted and hashed using Spring Security's `BCryptPasswordEncoder` before storage.
- **Role-Based Access Control**:
  - `ROLE_USER`: Personal habit dashboard, daily check-ins, streak tracking, history view.
  - `ROLE_ADMIN`: Platform telemetry, full user management, account activation/deactivation, habit oversight.
- **Entity Security**: Passwords are annotated with `@JsonProperty(access = WRITE_ONLY)` to guarantee they are never serialized in API responses.

### 📊 2. User Habits & Streak Tracking
- **Interactive Habit Dashboard**: Visual summary of Active Habits, Best Personal Streak, and Today's completion rate with an animated gradient progress bar.
- **7-Day Mini Calendar Matrix**: Quick glance at the last 7 days; click any chip to toggle completion status.
- **Idempotent UPSERT Check-Ins**: Seamless single-click check-ins with automatic insert or update handling.
- **Historical Logs & Retroactive Tracking**: Modal interface allowing users to view and log past dates.
- **Timezone-Resilient Engine**: Prevents premature midnight streak resets and reconciles client timezones (e.g. IST +5:30) with UTC cloud servers.

### 🛡️ 3. Admin Command Center
- **Live Platform Telemetry**: Instant metrics for Registered Users, Total Habits, Active Streaks, and All-Time Record Streak.
- **User Directory**: Searchable directory displaying user status, total habits, current streak, and best streak.
- **User Account Controls**: Activate, deactivate, or delete user accounts with full cascade deletion.
- **Habit Oversight**: View detailed habit lists and streak metrics for any registered user.

### 🏆 4. Global Leaderboard
- Real-time ranking of top habit streaks across the entire platform.
- Automatically filtered for active accounts and sorted by current streak and longest streak.

---

## 🏗 System Architecture

Streakify follows the industry-standard **3-Tier Layered Architecture**:

```
┌────────────────────────────────────────────────────────┐
│             Presentation Layer (Client)                │
│       Modular Vanilla HTML5, CSS3, ES6 JavaScript      │
└───────────────────────────┬────────────────────────────┘
                            │ RESTful JSON over HTTPS
┌───────────────────────────▼────────────────────────────┐
│             Controller Layer (@RestController)         │
│  AuthController | HabitController | AdminController    │
└───────────────────────────┬────────────────────────────┘
                            │ Constructor Injection
┌───────────────────────────▼────────────────────────────┐
│             Service Layer (@Service, @Transactional)   │
│  HabitServiceImpl | HabitLogServiceImpl | UserServiceImpl│
└───────────────────────────┬────────────────────────────┘
                            │ Spring Data JPA / Hibernate
┌───────────────────────────▼────────────────────────────┐
│            Data Access Layer (@Repository)             │
│  UserRepository | HabitRepository | HabitLogRepository │
└───────────────────────────┬────────────────────────────┘
                            │ HikariCP Connection Pool
┌───────────────────────────▼────────────────────────────┐
│             Cloud PostgreSQL Database (Supabase)       │
└────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

| Domain | Technologies |
|---|---|
| **Backend** | Java 17, Spring Boot 3.x, Spring Data JPA, Spring Security (Crypto / BCrypt) |
| **Database** | PostgreSQL, Supabase (with PgBouncer connection pooler) |
| **Connection Pool**| HikariCP with custom prepared statement tuning (`prepareThreshold=0`) |
| **Frontend** | Vanilla HTML5, CSS3 (Modern Glassmorphism & Dark Mode), ES6+ JavaScript |
| **Containerization**| Docker (Multi-stage Eclipse Temurin JRE build) |
| **Cloud Hosting** | Render (Web Services) |
| **Build & Tooling**| Apache Maven 3.x, Lombok |

---

## 📡 REST API Reference

### 🔐 Authentication (`/auth`)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/auth/register` | Register a new user account | Public |
| `POST` | `/auth/login` | Authenticate with BCrypt password verification | Public |

### 🛡️ Admin Command Center (`/admin`)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/admin/stats` | Platform summary (users, habits, active/record streaks) | Admin |
| `GET` | `/admin/users` | All users with habit counts and streak metrics | Admin |
| `PUT` | `/admin/users/{id}/toggle-status` | Activate or deactivate a user account | Admin |
| `DELETE` | `/admin/users/{id}` | Permanently delete a user and cascade habits | Admin |

### 🏆 Leaderboard

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/habits/leaderboard` | Top 20 habit streaks platform-wide | Public / User |

### 📘 Habits & Tracking (`/habits`)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/habits?userId={id}` | Create a habit with weekly target days | User |
| `GET` | `/users/{userId}/habits` | Retrieve all habits belonging to a user | User |
| `DELETE` | `/habits/{habitId}` | Delete a habit and all associated logs | User |
| `POST` | `/habits/{habitId}/logs?date=YYYY-MM-DD&completed={bool}` | Idempotent UPSERT habit check-in | User |
| `PUT` | `/habits/{habitId}/logs/{date}?completed={bool}` | Update completion status for a date | User |
| `GET` | `/habits/{habitId}/logs` | Fetch all historical logs for a habit | User |
| `GET` | `/habits/{habitId}/streak` | Calculate current and all-time best streak | User |

---

## 💡 Engineering Challenges & Highlights

### 1. Idempotent UPSERT Check-Ins
* **Challenge**: Separate `POST` (create) and `PUT` (update) endpoints caused race conditions when users clicked rapidly or when the client-side state lagged behind the database, resulting in `DuplicateLogException` or `404/500` errors.
* **Solution**: Converted logging into an idempotent UPSERT pattern in `HabitLogServiceImpl`. If a record exists for that date, it updates it; if absent, it creates it. Network debouncing was also added to the frontend to eliminate redundant submissions.

### 2. Cross-Midnight Timezone Reconciliation
* **Challenge**: The cloud server runs in **UTC**, while users may check in from forward timezones (e.g. India at **IST / UTC+5:30**). At 12:15 AM IST on Sep 25, the cloud server clock was still at 6:45 PM on Sep 24. Standard `date.isAfter(LocalDate.now())` validation falsely rejected check-ins as "future dates," while streak calculations prematurely reset to 0.
* **Solution**: 
  - Adjusted future validation threshold to `LocalDate.now().plusDays(1)` to support all international timezones.
  - Rewrote the streak engine to evaluate consecutive completions based on the latest completed date, ensuring a streak stays active all through the new day until midnight.

### 3. PostgreSQL Transaction Aborts & `@Transactional`
* **Challenge**: An unhandled constraint check previously left PostgreSQL pooled connections in an "aborted transaction" state, breaking subsequent queries on the same connection with `ERROR: current transaction is aborted, commands ignored until end of transaction block`.
* **Solution**: Annotated service methods with Spring's `@Transactional`. If an exception occurs, Spring immediately issues a clean `ROLLBACK` to PostgreSQL, returning a healthy, un-aborted connection to the HikariCP pool.

### 4. Supabase PgBouncer Prepared Statement Cache Conflict
* **Challenge**: Supabase's transaction pooler on port `6543` rotates server connections after each transaction. Java's PostgreSQL driver default prepared statement caching produced `ERROR: prepared statement "S_2" does not exist`.
* **Solution**: Tuned HikariCP data source properties (`prepareThreshold=0`, `preparedStatementCacheQueries=0`) to disable named server-side statement caching, ensuring 100% compatibility with PgBouncer.

---

## 🎨 Frontend Architecture

The user interface is built using modular, lightweight Vanilla web technologies—requiring no heavy build steps, Webpack, or large node_modules:

```
frontend/ (and src/main/resources/static/)
├── css/
│   ├── main.css         # Design tokens, variables, typography, reset
│   ├── auth.css         # Login, registration, and role portal styling
│   ├── habits.css       # Cards, 7-day tracker matrix, metrics, history modal
│   ├── admin.css        # Admin command center, telemetry cards, user table
│   └── leaderboard.css  # Ranking table and trophy badges
├── js/
│   ├── api.js           # API base configuration, state, shared toast helpers
│   ├── auth.js          # Authentication controller and session management
│   ├── habits.js        # Habits CRUD, check-ins, history logging, debouncing
│   ├── admin.js         # Admin dashboard data sync and user controls
│   ├── leaderboard.js   # Leaderboard ranking loader
│   └── main.js          # SPA tab routing and initialization
└── index.html           # Semantic, clean HTML5 single-page container
```

---

## ⚙️ Local Setup & Installation

### Prerequisites
- **Java 17+** (JDK)
- **PostgreSQL 14+**
- **Git** & **Maven**

### 1. Clone the Repository
```bash
git clone https://github.com/Ama1007/Streakify_Fullstack.git
cd Streakify_Fullstack
```

### 2. Configure Database
Create a PostgreSQL database:
```sql
CREATE DATABASE streakify_db;
```

Update `src/main/resources/application.properties` (or set environment variables):
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/streakify_db
spring.datasource.username=postgres
spring.datasource.password=your_password
spring.jpa.hibernate.ddl-auto=update
```

### 3. Run the Application
```bash
# Using Maven wrapper (Windows PowerShell)
.\mvnw.cmd spring-boot:run

# Using Maven wrapper (macOS / Linux)
./mvnw spring-boot:run
```

Access the application in your browser at:  
👉 **`http://localhost:8080/`**

---

## 🐳 Docker & Cloud Deployment

Streakify includes a production-ready **Dockerfile** with a multi-stage build:

```dockerfile
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Render Deployment Configuration

When deploying on **Render** as a Web Service:
1. **Environment**: `Docker`
2. **Build Command**: Automatically handled by Dockerfile.
3. **Environment Variables**:

| Variable | Recommended Value |
|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://<HOST>:6543/postgres?sslmode=require&prepareThreshold=0` |
| `SPRING_DATASOURCE_USERNAME` | `postgres.<project-ref>` |
| `SPRING_DATASOURCE_PASSWORD` | `<your-supabase-db-password>` |
| `PORT` | `8080` |

---

## 👩‍💻 Author

**Amal Anish**  
*Full-Stack & Backend Developer*  
- **GitHub:** [@Ama1007](https://github.com/Ama1007)  
- **Live Project:** [Streakify 2.0 on Render](https://streakify-fullstack-1.onrender.com)

---

*Built with passion, clean code principles, and modern Spring Boot architecture.*
