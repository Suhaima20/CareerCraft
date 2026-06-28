from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")

db = client["careercraft"]

users_collection = db["users"]
resumes_collection = db["resumes"]
careers_collection = db["careers"]