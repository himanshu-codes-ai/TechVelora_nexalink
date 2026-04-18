from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routers import trust, feed
import time

app = FastAPI(title="Nexalink Social OS API")

# CORS Configuration
# In production, specify actual origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Timing Middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Include Routers
app.include_router(trust.router, prefix="/api")
app.include_router(feed.router, prefix="/api")

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "Nexalink Social OS API is running",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
