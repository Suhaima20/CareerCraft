import pandas as pd
from database.db import db


# Excel file path
excel_file = "data/career_roadmap.xlsx"


# Reading Excel sheets
careers_df = pd.read_excel(
    excel_file,
    sheet_name="Careers"
)

skills_df = pd.read_excel(
    excel_file,
    sheet_name="Skills"
)

chapters_df = pd.read_excel(
    excel_file,
    sheet_name="Chapters"
)

career_skill_df = pd.read_excel(
    excel_file,
    sheet_name="Career_Skill_Mapping"
)

skill_chapter_df = pd.read_excel(
    excel_file,
    sheet_name="Skill_Chapter_Mapping"
)


# Replace empty cells with empty string
careers_df = careers_df.fillna("")
skills_df = skills_df.fillna("")
chapters_df = chapters_df.fillna("")
career_skill_df = career_skill_df.fillna("")
skill_chapter_df = skill_chapter_df.fillna("")


# Convert Excel data into dictionaries

careers_data = careers_df.to_dict("records")

skills_data = skills_df.to_dict("records")

chapters_data = chapters_df.to_dict("records")

career_skill_data = career_skill_df.to_dict("records")

skill_chapter_data = skill_chapter_df.to_dict("records")



# MongoDB collections

careers_collection = db["careers"]

skills_collection = db["skills"]

chapters_collection = db["chapters"]

career_skill_collection = db["career_skill_mapping"]

skill_chapter_collection = db["skill_chapter_mapping"]



# Remove previous data

careers_collection.delete_many({})

skills_collection.delete_many({})

chapters_collection.delete_many({})

career_skill_collection.delete_many({})

skill_chapter_collection.delete_many({})



# Insert data

if careers_data:
    careers_collection.insert_many(careers_data)


if skills_data:
    skills_collection.insert_many(skills_data)


if chapters_data:
    chapters_collection.insert_many(chapters_data)


if career_skill_data:
    career_skill_collection.insert_many(career_skill_data)


if skill_chapter_data:
    skill_chapter_collection.insert_many(skill_chapter_data)



print("\n===================================")

print("CareerCraft Roadmap Data Imported")

print("===================================")

print("Careers inserted:", len(careers_data))

print("Skills inserted:", len(skills_data))

print("Chapters inserted:", len(chapters_data))

print("Career-Skill mappings inserted:", len(career_skill_data))

print("Skill-Chapter mappings inserted:", len(skill_chapter_data))

print("===================================")