import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InviteResponse {
    invite_code: string;
    room: string;
    expires_in: number;
}

export interface InviteValidation {
    room: string;
    created_by: string;
}

export interface PrivateRoomResponse {
    room_code: string;
}

@Injectable({ providedIn: 'root' })
export class InviteService {
    private apiUrl = 'http://localhost:8000/api';

    constructor(private http: HttpClient) {}

    createPrivateRoom(token: string): Observable<PrivateRoomResponse> {
        return this.http.post<PrivateRoomResponse>(`${this.apiUrl}/rooms/private`, { token });
    }

    createInvite(token: string, room: string): Observable<InviteResponse> {
        return this.http.post<InviteResponse>(`${this.apiUrl}/invites`, { token, room });
    }

    validateInvite(code: string): Observable<InviteValidation> {
        return this.http.get<InviteValidation>(`${this.apiUrl}/invites/${code}`);
    }
}
