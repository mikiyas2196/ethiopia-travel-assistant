# Complete Setup & Run Guide: Ethiopian Tourist Destination Assistant

This step-by-step guide walks you through setting up and running the application on a fresh computer, starting from cloning the Git repository.

---

## 📋 Table of Contents
1. [System Prerequisites & Tools](#1-system-prerequisites--tools)
2. [Step 1: Clone the Git Repository](#step-1-clone-the-git-repository)
3. [Step 2: MySQL Database Setup](#step-2-mysql-database-setup)
4. [Step 3: Backend Setup (Laravel API)](#step-3-backend-setup-laravel-api)
5. [Step 4: Frontend Setup (Next.js Application)](#step-4-frontend-setup-nextjs-application)
6. [Step 5: Running the System & Verifying](#step-5-running-the-system--verifying)
7. [Default Administrator Credentials](#default-administrator-credentials)
8. [Troubleshooting & Common Fixes](#troubleshooting--common-fixes)

---

## 1. System Prerequisites & Tools

Ensure the following tools are installed on the computer before proceeding:

### A. Git
- Download & install Git from [git-scm.com](https://git-scm.com/).
- Verify in your terminal:
  ```bash
  git --version
  ```

### B. PHP (Version 8.2 or higher)
- If you use **XAMPP**, PHP 8.2+ is already included in `C:\xampp\php`.
- Make sure PHP is added to your system's `PATH` environment variable.
- Verify in your terminal:
  ```bash
  php -v
  ```
- **Crucial PHP Extensions**: Open your `php.ini` file (found in `C:\xampp\php\php.ini` if using XAMPP) and ensure the following lines do **NOT** have a leading semicolon (`;`):
  ```ini
  extension=curl
  extension=fileinfo
  extension=mbstring
  extension=openssl
  extension=pdo_mysql
  extension=zip
  extension=gd
  ```
  *(After enabling any extensions, restart Apache / your terminal).*

### C. Composer (PHP Dependency Manager)
- Download the installer `Composer-Setup.exe` from [getcomposer.org/download](https://getcomposer.org/download/).
- Run the installer. It will automatically detect your `php.exe`.
- Verify in your terminal:
  ```bash
  composer --version
  ```

### D. Node.js (Version 20 or higher) & npm
- Download the LTS version from [nodejs.org](https://nodejs.org/).
- Verify in your terminal:
  ```bash
  node -v
  npm -v
  ```

### E. MySQL Database (e.g. XAMPP)
- Download and install XAMPP from [apachefriends.org](https://www.apachefriends.org/).
- Start the **Apache** and **MySQL** services in the XAMPP Control Panel.

### F. Google Gemini API Key
- Get a free API key from [Google AI Studio](https://aistudio.google.com/).

---

## Step 1: Clone the Git Repository

Open your terminal (PowerShell, Command Prompt, or Git Bash) and run:

```bash
git clone https://github.com/mikiyas2196/ethiopia-travel-assistant.git
cd ethiopia-travel-assistant
```

---

## Step 2: MySQL Database Setup

1. Open **XAMPP Control Panel** and make sure **MySQL** is started (green indicator, port `3306`).
2. Open your web browser and navigate to **phpMyAdmin**:
   ```
   http://localhost/phpmyadmin
   ```
3. Click on **New** (or open the **SQL** tab) and create a new database named `ethiopia_tourism`:
   ```sql
   CREATE DATABASE ethiopia_tourism CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
4. Confirm that the database `ethiopia_tourism` appears in the left sidebar list.

---

## Step 3: Backend Setup (Laravel API)

Open a terminal window and navigate into the `backend` directory:

```bash
cd backend
```

### 1. Install PHP Dependencies via Composer
```bash
composer install
```
*(This installs Laravel 12, Sanctum, PDF Parser, PhpSpreadsheet, and all required packages).*

### 2. Set Up Environment File (`.env`)
Copy the sample environment file to create `.env`:

- On **Windows (PowerShell or CMD)**:
  ```bash
  copy .env.example .env
  ```
- On **Linux / macOS / Git Bash**:
  ```bash
  cp .env.example .env
  ```

### 3. Generate Laravel Application Key
```bash
php artisan key:generate
```

### 4. Configure Database and Gemini API in `.env`
Open `backend/.env` in any text editor (VS Code, Notepad, etc.) and configure the following:

```ini
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ethiopia_tourism
DB_USERNAME=root
DB_PASSWORD=

GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
RAG_SIMILARITY_THRESHOLD=0.15
RAG_TOP_K=4

CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```
> **Note**: If your MySQL `root` user has a password, enter it in `DB_PASSWORD`. If using default XAMPP, leave it empty.

### 5. Create Storage Symlink
Run this command so uploaded documents and avatars can be accessed properly:
```bash
php artisan storage:link
```

### 6. Run Database Migrations and Seed Default Admin
Execute the database migrations to create the required tables (documents, chunks, embeddings, chat sessions, users) and seed the initial administrator account:

```bash
php artisan migrate --seed
```

### 7. Start the Backend API Server
```bash
php artisan serve
```
The backend API server will now start and listen at:
```
http://127.0.0.1:8000
```
*(Keep this terminal window open).*

---

## Step 4: Frontend Setup (Next.js Application)

Open a **new, separate terminal window** and navigate into the `frontend` directory:

```bash
cd ethiopia-travel-assistant/frontend
```

### 1. Install Node Dependencies via npm
```bash
npm install
```

### 2. Configure Frontend Environment (Optional)
By default, the frontend connects to `http://localhost:8000/api`. If you want to configure it explicitly, create a `.env.local` file in the `frontend` folder:

```ini
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 3. Start the Next.js Development Server
```bash
npm run dev
```
The frontend application will start and listen at:
```
http://localhost:3000
```
*(Keep this terminal window open).*

---

## Step 5: Running the System & Verifying

1. Open your browser and go to:
   ```
   http://localhost:3000
   ```
2. You will see the **Ethiopian Tourist Destination Assistant** interface with the chat guide, knowledge base dashboard, and document management.
3. Test the chatbot by asking questions (e.g., *"What attractions can I visit in Lalibela?"*).
4. If you haven't uploaded any documents yet, the bot will welcome you and advise you to upload your first verified tourism documents.

---

## Default Administrator Credentials

To upload documents (PDF, Excel, CSV), manage categories, or reprocess files:

1. Click the **Staff Login** button in the top navigation bar.
2. Enter the default administrator credentials created by the database seeder:
   - **Email**: `admin@ethiopiatravel.com`
   - **Password**: `admin123456`
3. Once signed in, you will have access to:
   - **Upload Document**: Upload tourism PDFs, Excel files, or CSVs.
   - **Documents Page**: View, filter, inspect chunks, edit metadata, or re-process documents.
   - **Dashboard**: View live metrics (documents processed, total chunks, vector embeddings generated).

---

## Troubleshooting & Common Fixes

### 1. `SQLSTATE[HY000] [2002] No connection could be made because the target machine actively refused it`
- **Cause**: MySQL server is not running.
- **Fix**: Open XAMPP Control Panel and start the **MySQL** service. Verify port `3306` is active.

### 2. `Call to undefined function curl_init()` or `could not find driver`
- **Cause**: Required PHP extensions are disabled.
- **Fix**: Open `php.ini` (e.g. `C:\xampp\php\php.ini`), remove the semicolon `;` from `extension=curl` and `extension=pdo_mysql`, save, and restart Apache and your terminal.

### 3. `CORS Error / Failed to fetch from frontend`
- **Cause**: Backend server is not running or CORS origin is mismatched.
- **Fix**: 
  1. Ensure `php artisan serve` is running in your backend terminal on port `8000`.
  2. In `backend/.env`, ensure `CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000` is present.

### 4. `Notice: AI synthesis is currently experiencing temporary high demand on Google servers`
- **Cause**: Using an outdated model or invalid Gemini API key.
- **Fix**: In `backend/.env`, verify that your `GEMINI_API_KEY` is valid and `GEMINI_MODEL=gemini-3.5-flash-lite` is set.
