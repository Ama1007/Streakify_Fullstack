# 🔥 Streakify — Habit Streak Tracker Backend

A **Spring Boot** REST API backend for tracking user habits, logging daily completions, and calculating streaks. Built as part of the **Litmus7 Microservices Internship Assignment**.

---

## 📚 Table of Contents

- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Features](#-features)
- [Frontend (HTML/CSS/JS)](#-frontend-html-css-js)
- [Setup Instructions](#-setup-instructions)
- [API Reference](#-api-reference)
- [Business Logic](#-business-logic)
- [Future Improvements](#-future-improvements)
- [Author](#-author)

---

## 🛠 Tech Stack

| Technology | Version |
|---|---|
| Java | 17 |
| Spring Boot | 3.x |
| Spring Data JPA + Hibernate | — |
| PostgreSQL | — |
| Maven | — |
| Lombok | — |

---

## 🏗 Architecture

The project follows a clean **layered architecture**:

```
controller → service → repository → database
```

**Package Structure:**

```
com.streakify.streakify
├── controller
├── service
├── repository
├── entity
└── exception
```

---

## ✨ Features

### 👤 User Management
- Create a user
- Get user by ID
- Get all users
- Delete a user

### 📘 Habit Management
- Create a habit for a user
- Get habits by user
- Delete a habit

### 📅 Habit Logging
- Log habit completion by date
- Prevent duplicate logs on the same day
- Prevent logging future dates
- Update log status
- Fetch all logs for a habit

### 🔥 Streak Calculation
- Current streak calculation
- Longest streak calculation

### ⚠️ Exception Handling
- Custom exceptions
- Global exception handler
- Proper HTTP status codes (`400`, `404`)

---

## 🎨 Frontend (HTML / CSS / JS)

A clean, modern, and responsive user interface built using **Vanilla HTML5, CSS3, and JavaScript** (no heavy frameworks or node_modules needed):

- **User Profile Switcher**: Switch between profiles or create new users on the fly.
- **Habit Dashboard**: Overview metrics showing Active Habits, Personal Best Streak, and Today's completion rate with an animated progress bar.
- **Interactive Habit Cards**:
  - One-click **"Check In Today"** toggle.
  - **7-Day Mini Calendar Matrix**: Visual representation of the last 7 days; click any day to toggle completion status.
  - 🔥 **Current Streak** & 🏆 **Longest Streak** counters.
- **Log History & Past Dates Modal**: View all past logs and retroactively log or update dates (preventing future dates per backend rules).
- **Toast Notifications**: Real-time feedback for logs, habit additions, and deletions.
- **Dual Launch Option**: Served directly via Spring Boot at `http://localhost:8080/` (`src/main/resources/static/`) or opened via VS Code Live Server from `frontend/index.html`.

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Ama1007/streakify-backend.git
cd streakify-backend
```

### 2. Configure PostgreSQL

Create the database:

```sql
CREATE DATABASE streakify_db;
```

Update `src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/streakify_db
spring.datasource.username=your_username
spring.datasource.password=your_password
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
```

### 3. Run the Application

**Via IntelliJ:** Open the project and run `StreakifyApplication`

**Via terminal:**

```bash
mvn spring-boot:run
```

Server starts at: **http://localhost:8080**

---

## 📡 API Reference

### 👤 Users

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/users` | Create a new user |
| `GET` | `/users` | Get all users |
| `GET` | `/users/{userId}` | Get user by ID |
| `DELETE` | `/users/{userId}` | Delete a user |

**Create User — Request Body:**
```json
{
  "name": "Amal",
  "email": "amal@example.com"
}
```

---

### 📘 Habits

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/habits?userId={id}` | Create a habit for a user |
| `GET` | `/users/{userId}/habits` | Get all habits for a user |
| `DELETE` | `/habits/{habitId}` | Delete a habit |

**Create Habit — Request Body:**
```json
{
  "name": "Morning Workout",
  "targetDaysPerWeek": 5
}
```

---

### 📅 Habit Logs

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/habits/{habitId}/logs?date=YYYY-MM-DD&completed=true` | Log habit completion |
| `PUT` | `/habits/{habitId}/logs/{date}?completed=false` | Update log status |
| `GET` | `/habits/{habitId}/logs` | Get all logs for a habit |

---

### 🔥 Streaks

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/habits/{habitId}/streak` | Get current and longest streak |

**Response:**
```json
{
  "habitId": 2,
  "currentStreak": 3,
  "longestStreak": 7
}
```

---

## 📐 Business Logic

| Rule | Description |
|---|---|
| ❌ No future logging | Cannot log a habit completion for a future date |
| ❌ No duplicate logs | Cannot log the same habit twice on the same day |
| ✅ Streak calculation | Counts consecutive days of habit completion |
| ✅ Longest streak | Tracks the all-time longest completion streak |

---

## 🚀 Future Improvements

- [ ] DTO layer for cleaner API responses
- [ ] Swagger / OpenAPI documentation
- [ ] JWT Authentication
- [ ] Pagination support
- [ ] Docker containerization
- [ ] Full microservice separation

---

## 👩‍💻 Author

**Amal Anish**  
Backend Developer · Spring Boot Enthusiast  
[GitHub](https://github.com/Ama1007)
