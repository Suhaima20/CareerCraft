import sys
import os
import getpass
import bcrypt

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import get_collection
from datetime import datetime, timezone


def create_admin():
    print("=== CareerCraft Admin Creation ===")
    name = input("Admin name: ").strip()
    if not name:
        print("Name is required.")
        sys.exit(1)

    email = input("Admin email: ").strip().lower()
    if not email or "@" not in email:
        print("Valid email is required.")
        sys.exit(1)

    users = get_collection("users")
    existing = users.find_one({"email": email})
    if existing:
        print(f"A user with email '{email}' already exists.")
        promote = input("Promote this user to admin? (y/n): ").strip().lower()
        if promote == "y":
            users.update_one({"_id": existing["_id"]}, {"$set": {"role": "admin", "updatedAt": datetime.now(timezone.utc)}})
            print(f"User '{email}' is now an admin.")
            return
        else:
            print("Aborted.")
            sys.exit(1)

    password = getpass.getpass("Admin password (min 8 chars): ")
    if len(password) < 8:
        print("Password must be at least 8 characters.")
        sys.exit(1)

    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        print("Passwords do not match.")
        sys.exit(1)

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    user_doc = {
        "name": name,
        "email": email,
        "password_hash": password_hash,
        "role": "admin",
        "profession": "Administrator",
        "activeCareerId": None,
        "activeCareerName": None,
        "streak": 0,
        "lastActivityDate": None,
        "onboardingStep": "complete",
        "createdAt": datetime.now(timezone.utc),
    }
    result = users.insert_one(user_doc)
    print(f"\nAdmin created successfully: {email} (ID: {result.inserted_id})")
    print("You can now log in at /admin/login")


if __name__ == "__main__":
    create_admin()
