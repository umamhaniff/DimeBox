from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import lifespan
from app.routers import items, tags, outfits, trips

app = FastAPI(
    title="DimeBox Pocket Dimension API",
    description="Backend API for DimeBox - Physical inventory, gear, capsule wardrobe, and travel packing list tracker.",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS (Cross-Origin Resource Sharing)
# Allows our React frontend to communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production (e.g., Vercel URL)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(tags.router)
app.include_router(items.router)
app.include_router(outfits.router)
app.include_router(trips.router)

@app.get("/status")
def get_status():
    """
    General health check endpoint.
    """
    return {
        "status": "online",
        "service": "DimeBox Pocket Dimension API",
        "version": "0.1.0"
    }
