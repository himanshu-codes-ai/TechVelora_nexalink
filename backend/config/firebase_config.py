import firebase_admin
from firebase_admin import credentials, db as db_admin
import os
from dotenv import load_dotenv

load_dotenv()

def initialize_firebase():
    """
    Initializes Firebase Admin SDK with Realtime Database.
    """
    if not firebase_admin._apps:
        cred_path = os.path.join(os.path.dirname(__file__), '..', 'serviceAccountKey.json')
        
        try:
            if os.path.exists(cred_path):
                print(f"DEBUG: Initializing Firebase with {cred_path}")
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred, {
                    'databaseURL': 'https://hirex-d80c6-default-rtdb.firebaseio.com'
                })
            else:
                print("WARNING: serviceAccountKey.json missing. Attempting default credentials...")
                # Attempt to initialize without explicit creds (will only work if gcloud auth is set)
                firebase_admin.initialize_app(None, {
                    'databaseURL': 'https://hirex-d80c6-default-rtdb.firebaseio.com'
                })
        except Exception as e:
            print(f"CRITICAL ERROR: Firebase Admin failed to initialize: {e}")
            return None

    try:
        return db_admin.reference()
    except:
        return None

db = initialize_firebase()
