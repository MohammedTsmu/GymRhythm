# GymRhythm 🏋️‍♂️

GymRhythm is a simple **local web application** to track your workouts, schedules, and stats.  
This guide will help you install and run the project on your own PC using PHP and a local server.

---

## 📦 Requirements

Before you start, make sure you have:

- [PHP](https://www.php.net/downloads.php) **8.0 or higher**
- A local server (choose one):
  - [XAMPP](https://www.apachefriends.org/index.html) (recommended, includes PHP + Apache + MySQL)
  - [Laragon](https://laragon.org/) (lightweight alternative)
- A web browser (Chrome, Edge, Firefox, etc.)
- Git (optional, for cloning the repo)

---

## 🚀 Installation Steps

### 1. Install PHP + Server
- **Option A: XAMPP**
  1. Download and install [XAMPP](https://www.apachefriends.org/index.html).
  2. Open the **XAMPP Control Panel** and start:
     - **Apache** (for PHP)
     - **MySQL** (for database)

- **Option B: Laragon**
  1. Download [Laragon](https://laragon.org/download/).
  2. Run Laragon and click **Start All**.

---

### 2. Clone or Download the Project
- Clone using Git:
  ```bash
  git clone https://github.com/MohammedTsmu/GymRhythm.git
  ```
- Or download as ZIP and extract into:
  - `C:\xampp\htdocs\GymRhythm` (if using XAMPP)
  - `C:\laragon\www\GymRhythm` (if using Laragon)

---

### 3. Set Up Database
1. Open [http://localhost/phpmyadmin](http://localhost/phpmyadmin).
2. Create a new database, e.g. **gymrhythm**.
3. Import the SQL file from the project:
   - File: `/database/gymrhythm.sql`
4. Confirm tables (e.g. `Workouts`, `Photos`, etc.) exist.

---

### 4. Configure the Project
- Open `/config.php` and update:
  ```php
  $db_host = "localhost";
  $db_name = "gymrhythm";
  $db_user = "root";
  $db_pass = ""; // leave empty for XAMPP default
  ```

---

### 5. Run the App
- Open your browser and visit:
  ```
  http://localhost/GymRhythm
  ```

🎉 You should now see GymRhythm running locally!

---

## ⚡ Features
- 📅 Workout scheduling (alternating / weekly)
- 📊 Statistics with charts
- 🖼️ Store photos in database
- 💾 Import & Export backup support
- 🌓 Dark theme (easy on the eyes)

---

## 🛠️ Troubleshooting
- **Port conflict with Apache?**  
  Stop other apps using port `80` or change Apache’s port in XAMPP settings.
- **Database errors?**  
  Make sure MySQL is running and the database is imported.
- **PHP errors?**  
  Check your PHP version with:
  ```bash
  php -v
  ```

---

## 📜 License
This project is open-source. You’re free to use, modify, and share it.

---

## 🤝 Contributing
Pull requests are welcome! For major changes, open an issue first to discuss.

---

## 👨‍💻 Author
Developed by **Dr. Mohammed**  
GitHub: [MohammedTsmu](https://github.com/MohammedTsmu)
