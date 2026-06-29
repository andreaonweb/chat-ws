from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials, auth
import json
import os
import uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv
from groq import Groq
from contextlib import asynccontextmanager

load_dotenv()

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

ai_clients: dict[str, list[dict]] = {}
invites: dict[str, dict] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio
    async def cleanup_expired_invites():
        while True:
            await asyncio.sleep(3600)
            now = datetime.now()
            expired = [code for code, data in invites.items() if data["expires_at"] < now]
            for code in expired:
                del invites[code]
    task = asyncio.create_task(cleanup_expired_invites())
    yield
    task.cancel()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

rooms: dict[str, dict[WebSocket, str]] = {}


def verify_token(token: str) -> dict:
    try:
        return auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")


async def broadcast(room: str, data: dict):
    message = json.dumps(data)
    for connection in rooms[room]:
        await connection.send_text(message)


@app.get("/")
def root():
    return {"status": "ok", "rooms": list(rooms.keys())}


@app.get("/rooms")
def get_rooms():
    return {room: list(users.values()) for room, users in rooms.items()}


class AiMessage(BaseModel):
    message: str
    room: str


@app.post("/api/ai/chat")
def ai_chat(payload: AiMessage):
    room = payload.room
    user_message = payload.message

    if room not in ai_clients:
        ai_clients[room] = []

    history = ai_clients[room]
    history.append({"role": "user", "content": user_message})

    if len(history) > 20:
        history = history[-20:]
        ai_clients[room] = history

    try:
        messages_for_api = [
            {"role": "system", "content": "Eres un asistente amigable y divertido. Responde en español, se conciso y usa un tono casual. Usa emojis con moderacion."}
        ]
        for msg in history:
            role = "assistant" if msg["role"] == "model" else msg["role"]
            messages_for_api.append({"role": role, "content": msg["content"]})

        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages_for_api,
            max_tokens=300,
            temperature=0.7
        )
        reply = response.choices[0].message.content
        history.append({"role": "model", "content": reply})
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class TokenRequest(BaseModel):
    token: str

class InviteRequest(BaseModel):
    token: str
    room: str


@app.post("/api/rooms/private")
def create_private_room(payload: TokenRequest):
    try:
        auth.verify_id_token(payload.token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

    room_code = f"priv_{uuid.uuid4().hex[:8]}"
    return {"room_code": room_code}


@app.post("/api/invites")
def create_invite(payload: InviteRequest):
    try:
        user = auth.verify_id_token(payload.token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

    room = payload.room

    code = uuid.uuid4().hex[:8]
    invites[code] = {
        "room": room,
        "created_by": user["email"].split("@")[0],
        "created_at": datetime.now(),
        "expires_at": datetime.now() + timedelta(hours=24)
    }
    return {"invite_code": code, "room": room, "expires_in": 86400}


@app.get("/api/invites/{code}")
def get_invite(code: str):
    if code not in invites:
        raise HTTPException(status_code=404, detail="Invitación no encontrada")

    invite = invites[code]
    if invite["expires_at"] < datetime.now():
        del invites[code]
        raise HTTPException(status_code=410, detail="Invitación expirada")

    return {"room": invite["room"], "created_by": invite["created_by"]}


@app.websocket("/ws/{room}/{username}")
async def websocket_endpoint(
    websocket: WebSocket,
    room: str,
    username: str,
    token: str
):
    await websocket.accept()

    try:
        verify_token(token)
    except HTTPException:
        await websocket.close(code=1008)
        return

    if room not in rooms:
        rooms[room] = {}
    rooms[room][websocket] = username

    users = list(rooms[room].values())
    await broadcast(room, {
        "type": "system",
        "text": f"🟢 {username} se ha unido",
        "users": users
    })

    try:
        while True:
            data = await websocket.receive_text()
            users = list(rooms[room].values())
            await broadcast(room, {
                "type": "message",
                "text": data,
                "username": username,
                "users": users
            })

    except WebSocketDisconnect:
        del rooms[room][websocket]
        users = list(rooms[room].values())
        if users:
            await broadcast(room, {
                "type": "system",
                "text": f"🔴 {username} ha salido",
                "users": users
            })
        else:
            del rooms[room]
