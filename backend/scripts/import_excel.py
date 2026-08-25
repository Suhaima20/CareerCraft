import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timezone
from db import get_collection
from utils.serialization import to_objectid


def upsert_career(name, description=""):
    careers = get_collection("careers")
    existing = careers.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}})
    if existing:
        if description and not existing.get("description"):
            careers.update_one({"_id": existing["_id"]}, {"$set": {"description": description}})
        return existing["_id"]
    result = careers.insert_one({
        "name": name,
        "description": description,
        "active": True,
        "createdAt": datetime.now(timezone.utc),
    })
    return result.inserted_id


def upsert_skill(name, category="", description=""):
    skills = get_collection("skills")
    existing = skills.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}})
    if existing:
        return existing["_id"]
    result = skills.insert_one({
        "name": name,
        "category": category,
        "description": description,
        "active": True,
        "createdAt": datetime.now(timezone.utc),
    })
    return result.inserted_id


def upsert_chapter(title, description="", youtube_url="", duration="", order=0):
    chapters = get_collection("chapters")
    existing = chapters.find_one({"title": {"$regex": f"^{title}$", "$options": "i"}})
    if existing:
        update = {}
        if youtube_url and not existing.get("youtubeUrl"):
            update["youtubeUrl"] = youtube_url
        if duration and not existing.get("duration"):
            update["duration"] = duration
        if description and not existing.get("description"):
            update["description"] = description
        if update:
            chapters.update_one({"_id": existing["_id"]}, {"$set": update})
        return existing["_id"]
    result = chapters.insert_one({
        "title": title,
        "description": description,
        "youtubeUrl": youtube_url,
        "duration": duration,
        "order": order,
        "active": True,
        "createdAt": datetime.now(timezone.utc),
    })
    return result.inserted_id


def map_career_skill(career_id, skill_id):
    mappings = get_collection("career_skill_mapping")
    existing = mappings.find_one({"careerId": career_id, "skillId": skill_id})
    if existing:
        return
    mappings.insert_one({
        "careerId": career_id,
        "skillId": skill_id,
        "createdAt": datetime.now(timezone.utc),
    })


def map_skill_chapter(skill_id, chapter_id):
    mappings = get_collection("skill_chapter_mapping")
    existing = mappings.find_one({"skillId": skill_id, "chapterId": chapter_id})
    if existing:
        return
    mappings.insert_one({
        "skillId": skill_id,
        "chapterId": chapter_id,
        "createdAt": datetime.now(timezone.utc),
    })


def import_workbook(wb):
    result = {"careers": 0, "skills": 0, "chapters": 0, "careerMappings": 0, "skillMappings": 0}

    if "Careers" in wb.sheetnames:
        ws = wb["Careers"]
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or not row[0]:
                continue
            name = str(row[0]).strip()
            description = str(row[1]).strip() if len(row) > 1 and row[1] else ""
            upsert_career(name, description)
            result["careers"] += 1

    if "Skills" in wb.sheetnames:
        ws = wb["Skills"]
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or not row[0]:
                continue
            name = str(row[0]).strip()
            category = str(row[1]).strip() if len(row) > 1 and row[1] else ""
            description = str(row[2]).strip() if len(row) > 2 and row[2] else ""
            upsert_skill(name, category, description)
            result["skills"] += 1

    if "Chapters" in wb.sheetnames:
        ws = wb["Chapters"]
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or not row[0]:
                continue
            title = str(row[0]).strip()
            description = str(row[1]).strip() if len(row) > 1 and row[1] else ""
            youtube_url = str(row[2]).strip() if len(row) > 2 and row[2] else ""
            duration = str(row[3]).strip() if len(row) > 3 and row[3] else ""
            order = int(row[4]) if len(row) > 4 and row[4] else 0
            upsert_chapter(title, description, youtube_url, duration, order)
            result["chapters"] += 1

    if "CareerSkillMapping" in wb.sheetnames:
        ws = wb["CareerSkillMapping"]
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or not row[0] or not row[1]:
                continue
            career_name = str(row[0]).strip()
            skill_name = str(row[1]).strip()
            career = get_collection("careers").find_one({"name": {"$regex": f"^{career_name}$", "$options": "i"}})
            skill = get_collection("skills").find_one({"name": {"$regex": f"^{skill_name}$", "$options": "i"}})
            if career and skill:
                map_career_skill(career["_id"], skill["_id"])
                result["careerMappings"] += 1

    if "SkillChapterMapping" in wb.sheetnames:
        ws = wb["SkillChapterMapping"]
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or not row[0] or not row[1]:
                continue
            skill_name = str(row[0]).strip()
            chapter_title = str(row[1]).strip()
            skill = get_collection("skills").find_one({"name": {"$regex": f"^{skill_name}$", "$options": "i"}})
            chapter = get_collection("chapters").find_one({"title": {"$regex": f"^{chapter_title}$", "$options": "i"}})
            if skill and chapter:
                map_skill_chapter(skill["_id"], chapter["_id"])
                result["skillMappings"] += 1

    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python import_excel.py <path-to-excel-file>")
        sys.exit(1)

    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        sys.exit(1)

    from openpyxl import load_workbook
    wb = load_workbook(file_path, data_only=True)
    result = import_workbook(wb)
    print(f"Import complete: {result}")
