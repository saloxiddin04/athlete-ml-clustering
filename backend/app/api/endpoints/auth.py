from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from pydantic import BaseModel

router = APIRouter()

class UserLogin(BaseModel):
    username: str
    password: str

class UserRegister(BaseModel):
    username: str
    password: str
    role: str = "sportsman"

@router.post("/register")
async def register(user: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check if exists
    res = await db.execute(text("SELECT id FROM users WHERE username = :u"), {"u": user.username})
    if res.first():
        raise HTTPException(status_code=400, detail="Username taken")
    
    hashed = get_password_hash(user.password)
    await db.execute(
        text("INSERT INTO users (username, password, role) VALUES (:u, :p, :r)"),
        {"u": user.username, "p": hashed, "r": user.role}
    )
    await db.commit()
    return {"success": True}

@router.post("/login")
async def login(user: UserLogin, db: AsyncSession = Depends(get_db)):
    res = await db.execute(text("SELECT * FROM users WHERE username = :u"), {"u": user.username})
    db_user = res.fetchone()
    
    if not db_user or not verify_password(user.password, db_user._mapping["password"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    token = create_access_token({"sub": db_user._mapping["username"], "id": db_user._mapping["id"], "role": db_user._mapping["role"]})
    
    return {
        "success": True,
        "token": token,
        "user": {
            "id": db_user._mapping["id"],
            "username": db_user._mapping["username"],
            "role": db_user._mapping["role"]
        }
    }
