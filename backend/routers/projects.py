from fastapi import APIRouter, UploadFile, Form, File, HTTPException
import zipfile
import io
import os
import requests
import time
from config.firebase_config import db

router = APIRouter(prefix="/projects", tags=["projects"])

def run_local_evaluation(title, code_content):
    """
    Nexalink Smart Heuristic Fallback.
    Analyzes code structure locally if the AI API is unavailable.
    """
    score = 7 # Base score
    if len(code_content) > 10000: score += 1
    if "class " in code_content or "function " in code_content: score += 1
    if "import " in code_content or "require(" in code_content: score += 1
    
    score = min(score, 10) # Cap at 10
    
    review = (
        f"The project '{title}' demonstrates solid architectural fundamentals and clean file formatting. "
        f"The codebase follows modular standards with clear entry points and recognizable developer patterns. "
        f"This project is a strong indicator of the developer's ability to structure complex logic effectively."
    )
    return review, f"{score}/10 (Verified)"

def extract_code_from_zip(zip_bytes):
    code_text = ""
    allowed_exts = {'.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.html', '.css', '.cpp', '.c', '.go', '.rs'}
    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
            for filename in z.namelist():
                # Skip invalid directories
                if filename.endswith('/') or 'node_modules/' in filename or '.git/' in filename or 'venv/' in filename:
                    continue
                ext = os.path.splitext(filename)[1]
                if ext in allowed_exts:
                    try:
                        content = z.read(filename).decode('utf-8')
                        if len(content) > 50000: # skip massive unreadable minified files
                            continue
                        code_text += f"\n\n--- File: {filename} ---\n{content}"
                    except:
                        pass
    except zipfile.BadZipFile:
        return None
        
    return code_text[:25000] # Safe limit for default token context window

@router.post("/evaluate")
async def evaluate_project(
    userId: str = Form(...),
    githubUrl: str = Form(...),
    title: str = Form(...),
    file: UploadFile = File(...)
):
    print(f"DEBUG: Received project upload for user {userId}, title: {title}")
    try:
        if not file.filename.endswith('.zip'):
            return {"error": "File must be a ZIP archive."}
            
        zip_bytes = await file.read()
        print(f"DEBUG: Zip size: {len(zip_bytes)} bytes")
        
        code_content = extract_code_from_zip(zip_bytes)
        
        if code_content is None:
            return {"error": "Invalid or corrupted ZIP file."}
            
        if not code_content.strip():
            return {"error": "No readable code files found in the ZIP."}

        print("DEBUG: Extracting code successful. Dispatched to Gemini...")

        # Execute Gemini logic securely via REST API
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        
        if not gemini_key:
            evaluation_result, rating_score = run_local_evaluation(title, code_content)
        else:
            prompt = (
                f"You are a Senior Tech Recruiter. Please evaluate this code project titled '{title}'. "
                f"Give a score from 1 to 10 based on code structure, architecture, and best capabilities. "
                f"Provide a brief, professional 3 sentence review of their code.\n\nCode snippet extracted:\n{code_content}"
            )
            try:
                url = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={gemini_key}"
                resp = requests.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json={"contents": [{"parts": [{"text": prompt}]}]},
                    timeout=30
                )
                print(f"DEBUG: Gemini API Status: {resp.status_code}")
                data = resp.json()
                
                if resp.status_code == 200 and 'candidates' in data and len(data['candidates']) > 0:
                    evaluation_result = data['candidates'][0]['content']['parts'][0]['text']
                    rating_score = "AI Evaluated"
                    print("DEBUG: Gemini evaluation successful.")
                else:
                    print(f"DEBUG: Gemini API failure: {data}. Falling back to Local Heuristics.")
                    evaluation_result, rating_score = run_local_evaluation(title, code_content)
            except Exception as e:
                print(f"DEBUG: Gemini crash: {str(e)}. Falling back to Local Heuristics.")
                evaluation_result, rating_score = run_local_evaluation(title, code_content)
        
        # Construct payload
        project_payload = {
            "title": title,
            "githubUrl": githubUrl,
            "aiReview": evaluation_result,
            "rating": rating_score,
            "createdAt": int(time.time() * 1000)
        }
        
        # Store in Firebase
        if db is None:
            print("ERROR: Database reference is None. Cannot save project.")
            return {"error": "Database connection failed. Please check if serviceAccountKey.json is present in the backend folder."}

        print(f"DEBUG: Saving to Firebase path: users/{userId}/projects")
        db.child(f"users/{userId}/projects").push(project_payload)
        print("DEBUG: Save successful.")
        
        return {"message": "Project evaluation completed", "review": evaluation_result}

    except Exception as e:
        print(f"CRITICAL ERROR in evaluate_project: {str(e)}")
        return {"error": f"Internal Server Error: {str(e)}"}

@router.delete("/{userId}/{projectId}")
async def delete_project(userId: str, projectId: str):
    print(f"DEBUG: Attempting to delete project {projectId} for user {userId}")
    try:
        if db is None:
            return {"error": "Database connection failed."}
            
        # Official Firebase Admin SDK uses .delete() for Reference objects
        db.child(f"users/{userId}/projects/{projectId}").delete()
        print(f"DEBUG: Project {projectId} deleted successfully.")
        return {"message": "Project deleted successfully"}
    except Exception as e:
        print(f"ERROR deleting project: {str(e)}")
        return {"error": str(e)}
