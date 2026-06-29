import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AiMessage {
    role: 'user' | 'assistant';
    content: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {
    private apiUrl = 'http://localhost:8000/api/ai';

    constructor(private http: HttpClient) {}

    chat(message: string, room: string): Observable<{ reply: string }> {
        return this.http.post<{ reply: string }>(`${this.apiUrl}/chat`, {
            message,
            room
        });
    }
}
