import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from uuid import UUID
import logging
from app.config import settings

logger = logging.getLogger("dimebox")
security = HTTPBearer()

# Initialize JWK Client if supabase_url is available
jwk_client = None
if settings.supabase_url:
    jwks_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    jwk_client = PyJWKClient(jwks_url)

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UUID:
    """
    Validates the Supabase JWT token passed in the Authorization header.
    Supports both HS256 (symmetric) and ES256 (asymmetric JWKS) algorithms.
    Returns the user's UUID if valid, otherwise raises a 401 Unauthorized exception.
    """
    token = credentials.credentials
    try:
        # 1. Get the algorithm from the token header
        header = jwt.get_unverified_header(token)
        alg = header.get("alg")
        
        if alg == "HS256":
            # Verify using symmetric JWT secret
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated"
            )
        elif alg == "ES256":
            if not jwk_client:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Server configuration error: VITE_SUPABASE_URL is not set"
                )
            # Verify using asymmetric JWKS public key
            signing_key = jwk_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256"],
                audience="authenticated"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Unsupported signing algorithm: {alg}. Only HS256 and ES256 are supported."
            )
        
        # 'sub' contains the Supabase user's unique UUID
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token payload is missing the 'sub' claim"
            )
            
        return UUID(user_id_str)
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again"
        )
    except jwt.InvalidAlgorithmError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}"
        )
    except Exception as e:
        logger.error(f"JWT validation error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}"
        )
