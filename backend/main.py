from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Optional
import math 
import os # Imported to read environment variables dynamically

app = FastAPI()

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Database Connection Configuration
# Reads from Render's cloud environment when live, defaults to local compass when offline.
MONGO_DETAILS = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_DETAILS)
db = client.carbon_commute
profile_collection = db.get_collection("user_profiles")

# Static ID for our single MVP user profile demo
USER_ID = "demo_user_123"

# 2. Pydantic Schemas for validation
class CommuteLog(BaseModel):
    mechanism: str  # "walking", "cycling", "public_transit"
    distance: float # in kilometers
    steps: int = 0

class HistoryItem(BaseModel):
    mechanism: str
    distance: float
    steps: int
    karma_earned: int
    co2_saved_kg: float

# Helper to initialize a clean profile if a user doesn't exist yet
async def get_or_create_profile(user_id: str):
    profile = await profile_collection.find_one({"_id": user_id})
    if not profile:
        new_profile = {
            "_id": user_id,
            "total_steps": 0,
            "total_karma": 0,
            "co2_saved_kg": 0.0,
            "history": []
        }
        await profile_collection.insert_one(new_profile)
        return new_profile
    return profile


# 3. API Endpoints
@app.get("/api/profile")
async def get_profile():
    profile = await get_or_create_profile(USER_ID)
    return profile


@app.post("/api/log-commute")
async def log_commute(log: CommuteLog):
    profile = await get_or_create_profile(USER_ID)
    
    co2_saved_per_km = 120.0 
    karma_multipliers = {
        "walking": 15,
        "cycling": 10,
        "public_transit": 5
    }
    
    multiplier = karma_multipliers.get(log.mechanism, 0)
    
    # Use math.ceil() so short trips get partial/rounded-up credits
    earned_karma = math.ceil(log.distance * multiplier)
    
    # Safety net: If they covered any distance, guarantee at least 1 point
    if log.distance > 0 and earned_karma == 0:
        earned_karma = 1
        
    saved_co2_kg = (log.distance * co2_saved_per_km) / 1000.0
    
    new_history_entry = {
        "mechanism": log.mechanism,
        "distance": log.distance,
        "steps": log.steps,
        "karma_earned": earned_karma,
        "co2_saved_kg": round(saved_co2_kg, 3)
    }
    
    await profile_collection.update_one(
        {"_id": USER_ID},
        {
            "$inc": {
                "total_steps": log.steps,
                "total_karma": earned_karma,
                "co2_saved_kg": round(saved_co2_kg, 3)
            },
            "$push": {
                "history": new_history_entry
            }
        }
    )
    
    updated_profile = await profile_collection.find_one({"_id": USER_ID})
    return {"status": "success", "updated_profile": updated_profile}