import os
import json
import re

PROJECTS_DIR = "projects"

def ensure_projects_dir_exists():
    """Creates the 'projects/' directory if it doesn't exist."""
    os.makedirs(PROJECTS_DIR, exist_ok=True)

def normalize_name(name):
    """Converts a project name to a filesystem-safe folder name."""
    name = name.lower()
    name = re.sub(r'\s+', '-', name)
    name = re.sub(r'[^a-z0-9-]', '', name)
    return name

def get_unique_folder_name(normalized_name):
    """Finds a unique folder name by appending a number if necessary."""
    path = os.path.join(PROJECTS_DIR, normalized_name)
    if not os.path.exists(path):
        return normalized_name
    
    counter = 1
    while True:
        new_name = f"{normalized_name}-{counter}"
        new_path = os.path.join(PROJECTS_DIR, new_name)
        if not os.path.exists(new_path):
            return new_name
        counter += 1

def create_project(project_name):
    """Creates the project structure on the filesystem and returns the project path."""
    ensure_projects_dir_exists()
    
    normalized = normalize_name(project_name)
    unique_folder_name = get_unique_folder_name(normalized)
    
    project_path = os.path.join(PROJECTS_DIR, unique_folder_name)
    os.makedirs(project_path)
    
    # Create project.json
    project_meta = {"name": project_name}
    with open(os.path.join(project_path, "project.json"), "w") as f:
        json.dump(project_meta, f, indent=4)
        
    # Create conversation_history.json
    with open(os.path.join(project_path, "conversation_history.json"), "w") as f:
        json.dump([], f)
        
    print(f"Project '{project_name}' created at: {project_path}")
    return project_path

def load_project_details(project_folder):
    """Loads project metadata from its JSON file."""
    path = os.path.join(PROJECTS_DIR, project_folder, "project.json")
    with open(path, 'r') as f:
        details = json.load(f)
    return details

def list_projects():
    """Lists all existing projects by scanning the projects directory."""
    ensure_projects_dir_exists()
    return [d for d in os.listdir(PROJECTS_DIR) if os.path.isdir(os.path.join(PROJECTS_DIR, d))]

def save_conversation_history(project_folder, history):
    """Saves the conversation history to its JSON file."""
    path = os.path.join(PROJECTS_DIR, project_folder, "conversation_history.json")
    with open(path, "w") as f:
        json.dump(history, f, indent=4)