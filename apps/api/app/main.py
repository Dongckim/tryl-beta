import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.settings import CORS_ORIGIN_REGEX, settings
from app.routes import auth, health, looks, me, profiles, products, tryon, uploads

logger = logging.getLogger(__name__)

app = FastAPI(title="Tryl API", version="0.0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Return JSON 500 with CORS so browser does not show CORS error when server fails."""
    logger.exception("Unhandled exception")
    origin = request.headers.get("origin") or ""
    allowed = list(settings.cors_origins) if settings.cors_origins else []
    if origin in allowed:
        headers = {"Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true"}
    elif allowed:
        headers = {"Access-Control-Allow-Origin": allowed[0], "Access-Control-Allow-Credentials": "true"}
    else:
        headers = {}
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers=headers,
    )

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(me.router)
app.include_router(profiles.router)
app.include_router(products.router)
app.include_router(tryon.router)
app.include_router(looks.router)
app.include_router(uploads.router)
