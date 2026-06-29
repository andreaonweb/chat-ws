import { Component, signal, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { InviteService, InviteValidation } from '../services/invite.service';

const CATEGORIES = [
    { id: 'gaming', label: '🎮 Gaming', icon: '🎮' },
    { id: 'musica', label: '🎵 Música', icon: '🎵' },
    { id: 'deporte', label: '⚽ Deporte', icon: '⚽' },
    { id: 'tecnologia', label: '💻 Tecnología', icon: '💻' },
    { id: 'cine', label: '🎬 Cine', icon: '🎬' },
    { id: 'arte', label: '🎨 Arte', icon: '🎨' },
];

const GLOBAL_CHAT = {
    id: 'global',
    label: '🌐 Chat Global',
    icon: '🌐'
};

@Component({
    selector: 'app-auth',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './auth.component.html',
    styleUrl: './auth.component.scss'
})
export class AuthComponent implements OnInit {
    email = '';
    password = '';
    isRegister = signal(false);
    error = signal('');
    step = signal<'credentials' | 'category' | 'invite' | 'private-menu' | 'private-join'>('credentials');
    selectedCategory = signal('');
    categories = CATEGORIES;

    inviteCode = signal<string | null>(null);
    inviteInfo = signal<InviteValidation | null>(null);
    inviteLoading = signal(false);
    inviteError = signal('');

    joinCode = '';
    joinLoading = false;
    joinError = signal('');

    private authService = inject(AuthService);
    private inviteService = inject(InviteService);

    ngOnInit() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('invite');
        if (code) {
            this.inviteCode.set(code);
            this.validateInvite(code);
        }
    }

    validateInvite(code: string) {
        this.inviteLoading.set(true);
        this.inviteError.set('');
        this.inviteService.validateInvite(code).subscribe({
            next: (info) => {
                this.inviteInfo.set(info);
                this.inviteLoading.set(false);
                this.step.set('invite');
            },
            error: () => {
                this.inviteError.set('Invitación no valida o expirada');
                this.inviteLoading.set(false);
                this.inviteCode.set(null);
                window.history.replaceState({}, '', window.location.pathname);
            }
        });
    }

    async submit() {
        this.error.set('');
        try {
            if (this.isRegister()) {
                await this.authService.register(this.email, this.password);
                if (this.inviteCode()) {
                    await this.joinInvitedRoom();
                } else {
                    this.step.set('category');
                }
            } else {
                await this.authService.login(this.email, this.password);
                if (this.inviteCode()) {
                    await this.joinInvitedRoom();
                } else {
                    this.step.set('category');
                }
            }
        } catch (e: any) {
            const msg = e.message || '';
            if (msg.includes('auth/email-already-in-use')) {
                this.error.set('Este email ya esta registrado. Inicia sesion.');
            } else if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
                this.error.set('Email o password incorrecto.');
            } else if (msg.includes('auth/weak-password')) {
                this.error.set('El password debe tener al menos 6 caracteres.');
            } else if (msg.includes('auth/invalid-email')) {
                this.error.set('El formato del email no es valido.');
            } else {
                this.error.set(msg || 'Error desconocido.');
            }
        }
    }

    async joinInvitedRoom() {
        const info = this.inviteInfo();
        if (info) {
            await this.authService.setRoom(info.room);
            window.history.replaceState({}, '', window.location.pathname);
        }
    }

    async selectGlobal() {
        await this.authService.setRoom(GLOBAL_CHAT.id);
    }

    async selectCategory(categoryId: string) {
        this.selectedCategory.set(categoryId);
        await this.authService.setRoom(categoryId);
    }

    async selectIa() {
        await this.authService.setRoom('ia-chat');
    }

    openPrivateMenu() {
        this.step.set('private-menu');
    }

    async createPrivateRoom() {
        const token = await this.authService.getToken();
        if (!token) return;

        this.inviteService.createPrivateRoom(token).subscribe({
            next: async (res) => {
                await this.authService.setRoom(res.room_code);
            },
            error: () => {
                this.error.set('Error al crear sala privada');
            }
        });
    }

    openJoinByCode() {
        this.step.set('private-join');
        this.joinCode = '';
        this.joinError.set('');
    }

    async joinByCode() {
        if (!this.joinCode.trim()) return;
        this.joinLoading = true;
        this.joinError.set('');

        this.inviteService.validateInvite(this.joinCode.trim()).subscribe({
            next: async (info) => {
                await this.authService.setRoom(info.room);
                this.joinLoading = false;
            },
            error: () => {
                this.joinError.set('Codigo no valido o expirado');
                this.joinLoading = false;
            }
        });
    }

    backToCategories() {
        this.step.set('category');
        this.error.set('');
    }

    toggle() {
        this.isRegister.update(v => !v);
        this.error.set('');
        this.step.set('credentials');
    }

    backToLogin() {
        this.step.set('credentials');
        this.error.set('');
    }
}