import { Injectable, signal, inject } from '@angular/core';
import {
    Auth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User,
    updateProfile
} from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private auth = inject(Auth);

    currentUser = signal<User | null>(null);
    initialized = signal(false);
    token = signal<string | null>(null);
    roomSelected = signal(false);

    constructor() {
        onAuthStateChanged(this.auth, (user) => {
            if (this.initialized()) return;
            this.currentUser.set(user);
            this.initialized.set(true);
            if (user) {
                this.roomSelected.set(!!user.displayName);
                user.getIdToken().then((t) => this.token.set(t));
            }
        });
    }

    private async syncUser() {
        const user = this.auth.currentUser;
        this.currentUser.set(user);
        if (user) {
            this.token.set(await user.getIdToken());
        }
    }

    async register(email: string, password: string) {
        const result = await createUserWithEmailAndPassword(this.auth, email, password);
        await this.syncUser();
        return result;
    }

    async login(email: string, password: string) {
        const result = await signInWithEmailAndPassword(this.auth, email, password);
        await this.syncUser();
        return result;
    }

    async logout() {
        this.roomSelected.set(false);
        this.currentUser.set(null);
        this.token.set(null);
        return signOut(this.auth);
    }

    async getToken(): Promise<string | null> {
        const user = this.auth.currentUser;
        if (!user) return null;
        return user.getIdToken();
    }

    async setRoom(room: string): Promise<void> {
        const user = this.auth.currentUser;
        if (!user) return;
        await updateProfile(user, { displayName: room });
        this.roomSelected.set(true);
    }

    getRoom(): string {
        return this.auth.currentUser?.displayName ?? 'general';
    }
}
