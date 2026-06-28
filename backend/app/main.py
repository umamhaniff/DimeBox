import logging
import asyncpg
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.database import lifespan
from app.routers import items, tags, outfits, trips

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dimebox")

app = FastAPI(
    title="DimeBox Pocket Dimension API",
    description="Backend API for DimeBox - Physical inventory, gear, capsule wardrobe, and travel packing list tracker.",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production (e.g., Vercel URL)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handler for Database Errors
@app.exception_handler(asyncpg.PostgresError)
async def postgres_exception_handler(request: Request, exc: asyncpg.PostgresError):
    logger.error(f"Database error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Database transaction failed. The pocket dimension vault is temporarily unstable. Please try again."
        }
    )

# Exception Handler for general unhandled exceptions
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected server error occurred. Please verify your request parameters."
        }
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

