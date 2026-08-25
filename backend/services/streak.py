from datetime import datetime, timezone, timedelta
from db import get_collection

KOLKATA_TZ = timezone(timedelta(hours=5, minutes=30))


def get_kolkata_date():
    return datetime.now(KOLKATA_TZ).strftime("%Y-%m-%d")


def update_streak(user_id):
    users = get_collection("users")
    user = users.find_one({"_id": user_id})
    if user is None:
        return 0

    today = get_kolkata_date()
    last = user.get("lastActivityDate")

    if last == today:
        return user.get("streak", 0)

    if last is None:
        new_streak = 1
    else:
        try:
            last_date = datetime.strptime(last, "%Y-%m-%d").date()
            today_date = datetime.strptime(today, "%Y-%m-%d").date()
            delta = (today_date - last_date).days
            if delta == 1:
                new_streak = user.get("streak", 0) + 1
            elif delta == 0:
                new_streak = user.get("streak", 0)
            else:
                new_streak = 1
        except (ValueError, TypeError):
            new_streak = 1

    users.update_one(
        {"_id": user_id},
        {"$set": {"streak": new_streak, "lastActivityDate": today}},
    )
    return new_streak
