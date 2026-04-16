import os

from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_url: str = os.environ["SUPABASE_URL"]

# Prefer the service-role key (needed to bypass RLS for server-side writes).
# Falls back to the publishable/anon key so the server still starts during
# development when only the publishable key is available.
_key: str = (
    os.environ.get("SUPABASE_KEY")
    or os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    or ""
)

if not _key:
    raise EnvironmentError(
        "No Supabase key found. Set SUPABASE_KEY (service-role) or "
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your .env file."
    )

supabase: Client = create_client(_url, _key)
