import json
from database.db import careers_collection

# Load careers.json
with open("data/careers.json", "r", encoding="utf-8") as file:
    careers = json.load(file)

# Remove old data (optional)
careers_collection.delete_many({})

# Insert new data
careers_collection.insert_many(careers)

print(f"Successfully inserted {len(careers)} careers into MongoDB.")