import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { Subject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

export interface ChatMessage {
    type: 'message' | 'system';
    text: string;
    username?: string;
    users: string[];
    room?: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
    private sockets = new Map<string, WebSocket>();
    messages$ = new Subject<ChatMessage>();

    constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

    connect(room: string, username: string, token: string) {
        if (!isPlatformBrowser(this.platformId)) return;
        if (this.sockets.has(room)) return;

        const socket = new WebSocket(
            `ws://localhost:8000/ws/${room}/${username}?token=${token}`
        );
        socket.onmessage = (event) => {
            const data: ChatMessage = JSON.parse(event.data);
            this.messages$.next({ ...data, room });
        };
        socket.onopen = () => console.log(`✅ Conectado a ${room}`);
        socket.onerror = (e) => console.error(`❌ Error en ${room}:`, e);
        this.sockets.set(room, socket);
    }

    emit(message: string, room: string) {
        const socket = this.sockets.get(room);
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(message);
        }
    }

    disconnect(room: string) {
        const socket = this.sockets.get(room);
        if (socket) {
            socket.close();
            this.sockets.delete(room);
            console.log(`🔌 Desconectado de ${room}`);
        }
    }

    disconnectAll() {
        for (const [room, socket] of this.sockets) {
            socket.close();
        }
        this.sockets.clear();
    }
}
