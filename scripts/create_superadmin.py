#!/usr/bin/env python3
"""
Create or promote a user to super admin status on DevNetwork / AiAS v1.2.
Usage: python scripts/create_superadmin.py <username>

Storage follows DEVNET_STORAGE (nedb default, redis fallback) — the same
adapter the server uses, so this works against either engine.
"""

import sys
import os
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.storage import make_client  # noqa: E402

redis_client = make_client()

def get_user_by_name(name: str):
    """Get user by display name"""
    normalized = name.lower().strip().replace(" ", "")
    user_id = redis_client.get(f"user:name:{normalized}")
    if not user_id:
        return None, None
    user_data = redis_client.get(f"user:{user_id}")
    if not user_data:
        return None, None
    return user_id, json.loads(user_data)

def make_superadmin(username: str):
    """Promote user to super admin"""
    user_id, user = get_user_by_name(username)
    
    if not user:
        print(f"Error: User '{username}' not found")
        print("\nExisting users:")
        for key in redis_client.scan_iter("user:name:*"):
            uid = redis_client.get(key)
            udata = redis_client.get(f"user:{uid}")
            if udata:
                u = json.loads(udata)
                print(f"  - {u.get('displayName', 'unknown')}")
        return False
    
    user["is_admin"] = True
    user["isSuperAdmin"] = True
    
    redis_client.set(f"user:{user_id}", json.dumps(user))
    
    print(f"Success! User '{user['displayName']}' is now an ACO super admin.")
    print(f"User ID: {user_id}")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python aco/scripts/create_superadmin.py <username>")
        print("Example: python aco/scripts/create_superadmin.py johndoe")
        sys.exit(1)
    
    username = sys.argv[1]
    success = make_superadmin(username)
    sys.exit(0 if success else 1)
