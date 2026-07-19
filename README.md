# Carbon Commute 🌿

Carbon Commute is a gamified full-stack web application designed to incentivize eco-friendly travel options like walking, cycling, and public transit. By tracking real-time movement and calculating carbon offsets, the platform rewards users with "Karma Points" for making sustainable transportation choices.
**Website url:** https://carbon-commute.vercel.app/
**Backend:**  https://carbon-commute.onrender.com

---

## 🚀 Features

* **Live Commute Tracking:** Leverages the native HTML5 Geolocation API with high-accuracy configurations to track live coordinates, using the Haversine formula to compute distance covered.
* **Eco-Metrics Engine:** An asynchronous calculation pipeline that estimates kilograms of $CO_2$ saved compared to conventional driving.
* **Micro-Commute Protections:** Implements partial-credit point allocations using ceiling rounding logic to ensure short trips (under 1 km) are accurately rewarded.
* **Persistent Dashboard:** A unified user profile display featuring live aggregations of lifetime steps, accumulated Karma points, and total carbon offsets.

---

## 🛠️ Tech Stack

### Frontend
* **Core:** JavaScript (ES6+), HTML5 Geolocation API, CSS3
* **Framework:** React.js (via Vite)

### Backend
* **Core:** Python 3.x
* **Framework:** FastAPI (ASGI Server via Uvicorn)
* **Validation:** Pydantic v2

### Database & Storage
* **Database:** MongoDB
* **Driver:** Motor (Async MongoDB Driver)

---

## 📦 Project Structure

```text
carbon_commute/
│
├── backend/
│   ├── main.py               # FastAPI server application logic & endpoints
│   └── requirements.txt      # Python dependencies (FastAPI, Motor, Pydantic)
│
└── frontend/
    ├── src/
    │   ├── App.jsx           # Main React tracking component & state dashboard
    │   └── main.jsx          # Vite application entry point
    ├── package.json          # Node modules and build configurations
    └── vite.config.js
