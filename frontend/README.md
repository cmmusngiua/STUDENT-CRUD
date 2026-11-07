# StudentHub Frontend

Modern, responsive frontend portal for the Spring Boot Student Management API.

## Features
- **Full CRUD operations**: Create, Read, Update, and Delete students.
- **Search & Filter**: Real-time multi-field search and filters by Course and Section.
- **Sorting**: Sort ascending and descending by ID, Student Name, Course, and Section.
- **Dual Views**: Switch between Table View and Card Grid View.
- **Stats Dashboard**: Live metric counters for total students, courses, sections, and search results.
- **Dark / Light Mode**: Beautiful theme toggle with localStorage persistence.
- **Export Options**: 1-click Export to CSV, Export to JSON, and clean Print view.
- **Quick Seed Button**: 1-click button to populate sample student records into the database.
- **Status Indicator & Auto Reconnect**: Real-time indicator for Spring Boot backend health and configurable API URL.

---

## How to Run

### Option 1: Directly via Spring Boot (Recommended - Zero Setup!)
The frontend is already built into `src/main/resources/static`.
1. Run your Spring Boot application in IntelliJ IDEA (run `StudentApplication.java`) or via command line:
   ```powershell
   .\mvnw.cmd spring-boot:run
   ```
2. Open your browser and navigate to:
   ```
   http://localhost:8080/
   ```
   No separate server, npm installs, or configuration needed!

---

### Option 2: Standalone Browser Launch
Simply double-click `frontend/index.html` or open it with your favorite browser.
- The app automatically detects standalone mode and connects to `http://localhost:8080/musngi/students`.
- CORS has already been enabled in `StudentController.java` (`@CrossOrigin(origins = "*")`).

---

### Option 3: Local Node.js / Static Server
Inside the `frontend` folder:
```powershell
npx serve . -p 3000
```
Then visit `http://localhost:3000`.

---

## Backend Requirements
- **Backend Port**: `8080`
- **PostgreSQL Database**: `jdbc:postgresql://localhost:5432/db_user`
- **REST Endpoints**:
  - `GET /musngi/students` - Get all students
  - `GET /musngi/students/{id}` - Get student by ID
  - `POST /musngi/students` - Add student (`firstname`, `lastname`, `course`, `section`)
  - `PUT /musngi/students/{id}` - Update student
  - `DELETE /musngi/students/{id}` - Delete student
