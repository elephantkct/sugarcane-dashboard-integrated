from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import farmers, surveys, dashboard

app = FastAPI(title="EDF Sugarcane Survey Dashboard API")

# Allow the Vite dev server (and later, your deployed frontend URL) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite default dev port
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(farmers.router)
app.include_router(surveys.router)
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {"status": "ok", "message": "EDF Sugarcane Survey Dashboard API is running"}
