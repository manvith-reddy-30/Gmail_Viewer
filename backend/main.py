from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
from dotenv import load_dotenv
import base64
load_dotenv()

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1"
USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

client_id = os.getenv("GOOGLE_CLIENT_ID")
client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
redirect_uri = os.getenv("REDIRECT_URI")

app = FastAPI()

# CORS middleware to allow the frontend to make requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "CORS works!"}


@app.post("/userinfo")
async def get_userinfo(request: Request):
    data = await request.json()
    code = data.get("code")

    token_payload = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }

    async with httpx.AsyncClient() as client:
        token_res = await client.post(GOOGLE_TOKEN_URL, data=token_payload)
        token_data = token_res.json()

        access_token = token_data.get("access_token")
        if not access_token:
            return {"error": "Token exchange failed", "details": token_data}

        # Get user's email
        profile_res = await client.get(
            f"{GMAIL_API_BASE}/users/me/profile",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        email = profile_res.json().get("emailAddress")

        # Get user's name
        userinfo_res = await client.get(
            USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        name = userinfo_res.json().get("name")

        return {
            "access_token": access_token,
            "email": email,
            "name": name,
        }

@app.post('/getemails')
async def get_emails(request: Request):
    data = await request.json()
    access_token = data.get("access_token")
    count = int(data.get("count", 5))

    emails = []

    async with httpx.AsyncClient() as client:
        email_res = await client.get(
            f"https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults={count}",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        messages = email_res.json().get("messages", [])

        for message in messages:
            message_id = message["id"]

            message_res = await client.get(
                f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}?format=full",
                headers={"Authorization": f"Bearer {access_token}"}
            )

            message_json = message_res.json()
            payload = message_json.get("payload", {})
            headers = payload.get("headers", [])
            subject = next((h["value"] for h in headers if h["name"] == "Subject"), None)
            snippet = message_json.get("snippet")

            # Extract body (handling plain text inside multipart or direct body)
            body = ""
            if "parts" in payload:
                for part in payload["parts"]:
                    if part.get("mimeType") == "text/plain":
                        body_data = part.get("body", {}).get("data")
                        if body_data:
                            body = base64.urlsafe_b64decode(body_data.encode("utf-8")).decode("utf-8")
                            break
            else:
                body_data = payload.get("body", {}).get("data")
                if body_data:
                    body = base64.urlsafe_b64decode(body_data.encode("utf-8")).decode("utf-8")

            emails.append({
                "id": message_id,
                "subject": subject,
                "snippet": snippet,
                "body": body
            })

    return {"emails": emails}
