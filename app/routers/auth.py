
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserStatusUpdate,
    UserLogin,
    UserResponse,
    TokenResponse
)
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token
)
from app.core.dependencies import (
    get_current_user,
    require_roles
)


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)


def normalize_email(email: str) -> str:
    email = email.strip().lower()

    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(
            status_code=422,
            detail="Invalid email address"
        )

    return email


def get_user_or_404(user_id: int, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return user


def protect_last_admin(user: User, db: Session):
    if user.role != "ADMIN" or not user.is_active:
        return

    active_admins = db.query(User).filter(
        User.role == "ADMIN",
        User.is_active.is_(True)
    ).count()

    if active_admins <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot remove or deactivate the last active administrator"
        )


# LOGIN
@router.post("/login", response_model=TokenResponse)
def login(
    data: UserLogin,
    db: Session = Depends(get_db)
):
    email = data.email.strip().lower()

    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(
        data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive"
        )

    token = create_access_token({
        "sub": str(user.id)
    })

    return {
        "access_token": token,
        "token_type": "bearer"
    }


# CURRENT USER
@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user)
):
    return current_user


# LIST USERS - ADMIN ONLY
@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN"))
):
    return db.query(User).order_by(User.id.desc()).all()


# CREATE USER - ADMIN ONLY
@router.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN"))
):
    email = normalize_email(data.email)

    existing_user = db.query(User).filter(
        User.email == email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )

    new_user = User(
        full_name=data.full_name.strip(),
        email=email,
        hashed_password=hash_password(data.password),
        role=data.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# GET USER BY ID - ADMIN ONLY
@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN"))
):
    return get_user_or_404(user_id, db)


# UPDATE USER - ADMIN ONLY
@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN"))
):
    user = get_user_or_404(user_id, db)
    updates = data.model_dump(exclude_unset=True)

    if "full_name" in updates and updates["full_name"] is not None:
        user.full_name = updates["full_name"].strip()

    if "email" in updates and updates["email"] is not None:
        email = normalize_email(updates["email"])

        existing_user = db.query(User).filter(
            User.email == email,
            User.id != user_id
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=409,
                detail="Email already registered"
            )

        user.email = email

    if "password" in updates and updates["password"] is not None:
        user.hashed_password = hash_password(updates["password"])

    if "role" in updates and updates["role"] is not None:
        if user.role == "ADMIN" and updates["role"] != "ADMIN":
            protect_last_admin(user, db)

        user.role = updates["role"]

    db.commit()
    db.refresh(user)

    return user


# ACTIVATE / DEACTIVATE USER - ADMIN ONLY
@router.patch(
    "/users/{user_id}/status",
    response_model=UserResponse
)
def update_user_status(
    user_id: int,
    data: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN"))
):
    user = get_user_or_404(user_id, db)

    if user.id == current_user.id and not data.is_active:
        raise HTTPException(
            status_code=400,
            detail="You cannot deactivate your own account"
        )

    if user.is_active and not data.is_active:
        protect_last_admin(user, db)

    user.is_active = data.is_active

    db.commit()
    db.refresh(user)

    return user


# DELETE USER - ADMIN ONLY
@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN"))
):
    user = get_user_or_404(user_id, db)

    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account"
        )

    protect_last_admin(user, db)

    db.delete(user)
    db.commit()

    return {
        "message": "User deleted successfully",
        "user_id": user_id
    }
