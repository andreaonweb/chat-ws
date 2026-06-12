from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, auth
import json

app = FastAPI()

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
    """Lanza excepción si el token no es válido."""
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