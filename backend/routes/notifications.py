from flask import Blueprint, jsonify, g
from datetime import datetime, timezone

from db import get_collection
from utils.auth import token_required
from utils.serialization import serialize_doc, to_objectid


notifications_bp = Blueprint(
    "notifications",
    __name__,
    url_prefix="/notifications"
)


# =========================================================
# GET NOTIFICATIONS
# =========================================================

@notifications_bp.route("", methods=["GET"])
@token_required
def list_notifications():

    try:

        notifications = list(
            get_collection("notifications")
            .find({
                "userId": g.current_user_id
            })
            .sort(
                "createdAt",
                -1
            )
            .limit(50)
        )

        return jsonify({
            "notifications": serialize_doc(
                notifications
            )
        }), 200

    except Exception as e:

        print(
            "Notification fetch error:",
            str(e)
        )

        return jsonify({
            "error": "Failed to load notifications"
        }), 500


# =========================================================
# MARK ONE NOTIFICATION AS READ
# =========================================================

@notifications_bp.route(
    "/<notification_id>/read",
    methods=["PUT"]
)
@token_required
def mark_read(notification_id):

    try:

        result = get_collection(
            "notifications"
        ).update_one(

            {
                "_id": to_objectid(notification_id),
                "userId": g.current_user_id
            },

            {
                "$set": {
                    "read": True,
                    "updatedAt": datetime.now(
                        timezone.utc
                    )
                }
            }
        )

        if result.matched_count == 0:

            return jsonify({
                "error": "Notification not found"
            }), 404

        return jsonify({
            "read": True
        }), 200

    except Exception as e:

        print(
            "Mark notification read error:",
            str(e)
        )

        return jsonify({
            "error": "Failed to mark notification as read"
        }), 500


# =========================================================
# MARK ALL NOTIFICATIONS AS READ
# =========================================================

@notifications_bp.route(
    "/read-all",
    methods=["PUT"]
)
@token_required
def mark_all_read():

    try:

        get_collection(
            "notifications"
        ).update_many(

            {
                "userId": g.current_user_id,
                "read": False
            },

            {
                "$set": {
                    "read": True,
                    "updatedAt": datetime.now(
                        timezone.utc
                    )
                }
            }
        )

        return jsonify({
            "read": True
        }), 200

    except Exception as e:

        print(
            "Mark all notifications read error:",
            str(e)
        )

        return jsonify({
            "error": "Failed to mark notifications as read"
        }), 500