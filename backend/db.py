from pymongo import MongoClient
from config import Config

_client = None
_db = None


def get_db():
    global _client, _db
    if _db is None:
        _client = MongoClient(Config.MONGODB_URI)
        _db = _client.get_default_database()
    return _db


def get_collection(name):
    return get_db()[name]
