import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env from project root (two levels up from this file)
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

class Config:
    # Congress.gov API Configuration
    CONGRESS_API_KEY = os.getenv('CONGRESS_API_KEY')
    CONGRESS_API_BASE_URL = os.getenv('CONGRESS_API_BASE_URL', 'https://api.congress.gov/v3/')
    
    # Supabase Configuration
    SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    # Database Configuration
    DATABASE_URL = os.getenv('DATABASE_URL')
    
    # Application Configuration
    MAX_RETRIES = int(os.getenv('MAX_RETRIES', '3'))
    REQUEST_DELAY = float(os.getenv('REQUEST_DELAY', '1'))
    BATCH_SIZE = int(os.getenv('BATCH_SIZE', '100'))
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    
    # Database Configuration
    DISABLE_DATABASE = os.getenv('DISABLE_DATABASE', 'false').lower() == 'true'
    
    # Validation
    @classmethod
    def validate(cls):
        required_vars = [
            'CONGRESS_API_KEY',
            'NEXT_PUBLIC_SUPABASE_URL',
            'SUPABASE_SERVICE_ROLE_KEY'
        ]
        
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")
        
        return True 