from bson import ObjectId
from datetime import datetime


def serialize_doc(value):
    """
    Recursively convert MongoDB/BSON values into JSON-safe values.
    """

    if value is None:
        return None

    # MongoDB ObjectId
    if isinstance(value, ObjectId):
        return str(value)

    # datetime
    if isinstance(value, datetime):
        return value.isoformat()

    # Dictionary
    if isinstance(value, dict):
        return {
            str(key): serialize_doc(val)
            for key, val in value.items()
        }

    # List / tuple
    if isinstance(value, (list, tuple)):
        return [serialize_doc(item) for item in value]

    # Other primitive values
    return value


def to_objectid(value):
    if value is None:
        return None

    if isinstance(value, ObjectId):
        return value

    try:
        return ObjectId(value)
    except Exception:
        return None