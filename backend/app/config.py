from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # Supabase connection string (pooler or direct)
    # E.g. postgresql://postgres.xxxx:[password]@aws-0-xxxx.pooler.supabase.com:6543/postgres
    database_url: str = Field(..., validation_alias="DATABASE_URL")
    
    # Supabase JWT Secret (from Project Settings -> API)
    supabase_jwt_secret: str = Field(..., validation_alias="SUPABASE_JWT_SECRET")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
