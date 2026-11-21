
import os

from app.database import Base, engine, SessionLocal
from app.models import Equipment, Intervention, SparePart, User
from app.core.security import hash_password


def create_admin():
    email = os.getenv("ADMIN_EMAIL")
    password = os.getenv("ADMIN_PASSWORD")
    full_name = os.getenv("ADMIN_NAME", "System Administrator")

    if not email or not password:
        raise ValueError(
            "Set ADMIN_EMAIL and ADMIN_PASSWORD first."
        )

    if len(password) < 12:
        raise ValueError(
            "Admin password must contain at least 12 characters."
        )

    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        existing = db.query(User).filter(
            User.email == email.strip().lower()
        ).first()

        if existing:
            print("Administrator already exists.")
            return

        admin = User(
            full_name=full_name,
            email=email.strip().lower(),
            hashed_password=hash_password(password),
            role="ADMIN",
            is_active=True
        )

        db.add(admin)
        db.commit()

        print("Administrator created successfully.")

    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
