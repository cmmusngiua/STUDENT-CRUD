# Deploying StudentHub to Render.com

This project is prepared for 1-click **Render Blueprint** deployment using [`render.yaml`](file:///C:/Users/crans/IdeaProjects/student/render.yaml).

---

## What `render.yaml` Configures

| Service | Type | Plan | Description |
| :--- | :--- | :--- | :--- |
| **`student-db`** | PostgreSQL Database | Free | Managed PostgreSQL database (`db_user`) |
| **`student-backend`** | Web Service (Docker) | Free | Spring Boot Java 21 REST API containerized with Docker |
| **`student-frontend`** | Static Web Service | Free | Fast static frontend built with Vite (`frontend/dist`) |

---

## Step-by-Step Deployment Instructions

### Step 1: Push Project to GitHub

If you haven't initialized Git yet, run these commands inside your project folder (`C:\Users\crans\IdeaProjects\student`):

```powershell
cd C:\Users\crans\IdeaProjects\student
git init
git add .
git commit -m "Initial commit with Render deployment configuration"
```

Create a new repository on your GitHub account (e.g. `student`), then push:

```powershell
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/student.git
git branch -M main
git push -u origin main
```

---

### Step 2: Deploy on Render.com via Blueprint

1. Go to [dashboard.render.com](https://dashboard.render.com/) and sign in.
2. Click the **"New +"** button in the top right corner and select **"Blueprint"**.
3. Connect your GitHub account and select your **`student`** repository.
4. Render will automatically read [`render.yaml`](file:///C:/Users/crans/IdeaProjects/student/render.yaml) and display:
   - **`student-db`** (PostgreSQL Database)
   - **`student-backend`** (Web Service via Docker)
   - **`student-frontend`** (Static Site via Vite)
5. Click **"Apply"** to start the build and deployment!

---

### Step 3: Connect Frontend to Backend URL

Once your backend finishes deploying on Render:
1. Render will assign your backend a live URL, for example:
   `https://student-backend-xxxx.onrender.com`
2. Update the `VITE_API_BASE_URL` environment variable in your `student-frontend` service settings (or in `render.yaml`):
   ```
   VITE_API_BASE_URL = https://student-backend-xxxx.onrender.com
   ```
3. Trigger a manual deploy of `student-frontend` (or push the commit).

Your frontend dashboard is now live on the internet! 🚀
