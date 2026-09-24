# This is the starting point of our backend (the API).

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import BaseTable, database_engine
from app.routes import auth_routes, employee_routes, payroll_routes, user_routes

# Create all tables (like "users", "employees" and "payrolls") in the database if they do not exist yet
BaseTable.metadata.create_all(bind=database_engine)

# Create the FastAPI application
app = FastAPI(title="Employee Management System")

# The React frontend runs on a different address (port 5173).
# Browsers block this by default, so we allow that address here.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add the login, user, employee and payroll routes to the application
app.include_router(auth_routes.router)
app.include_router(user_routes.router)
app.include_router(employee_routes.router)
app.include_router(payroll_routes.router)


@app.get("/api/health")
def check_health():
    """A simple test page to confirm the backend is running."""
    return {"status": "ok"}
