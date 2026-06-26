import asyncpg
from typing import AsyncGenerator
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.config import settings

class Database:
    def __init__(self):
        self.pool: asyncpg.Pool | None = None

    async def connect(self):
        if not self.pool:
            # Create a connection pool for high-performance async queries
            self.pool = await asyncpg.create_pool(
                settings.database_url,
                min_size=2,
                max_size=10,
                max_inactive_connection_lifetime=300.0
            )

    async def disconnect(self):
        if self.pool:
            await self.pool.close()
            self.pool = None

db = Database()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Establish connection pool on startup
    await db.connect()
    yield
    # Clean up connection pool on shutdown
    await db.disconnect()

async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    """
    Dependency that yields a database connection from the connection pool.
    Releases the connection back to the pool once the request is complete.
    """
    if not db.pool:
        raise RuntimeError("Database connection pool is not initialized")
    
    async with db.pool.acquire() as connection:
        yield connection
