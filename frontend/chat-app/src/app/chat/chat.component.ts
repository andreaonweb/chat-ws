import { Component, signal, NgZone, ChangeDetectorRef, ElementRef, ViewChild, AfterViewChecked, inject, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService, ChatMessage } from '../services/chat.service';
import { AuthService } from '../services/auth.service';
import { AiService } from '../services/ai.service';
import { InviteService } from '../services/invite.service';

interface TabInfo {
    room: string;
    label: string;
    messages: ChatMessage[];
    users: string[];
    isAi: boolean;
    hasNewMessages: boolean;
}

const CATEGORIES: Record<string, string> = {
    gaming: '🎮 Gaming',
    musica: '🎵 Musica',
    deporte: '⚽ Deporte',
    tecnologia: '💻 Tecnologia',
    cine: '🎬 Cine',
    arte: '🎨 Arte',
};

const GLOBAL_CHAT: Record<string, string> = {
    global: '🌐 Global',
};

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chat.component.html',
    styleUrl: './chat.component.scss'
})
export class ChatComponent implements AfterViewChecked, OnDestroy {
    @ViewChild('messagesContainer') messagesContainer!: ElementRef;
    @ViewChild('menuToggleBtn') menuToggleBtn!: ElementRef;

    private chatService = inject(ChatService);
    private authService = inject(AuthService);
    private aiService = inject(AiService);
    private inviteService = inject(InviteService);
    private zone = inject(NgZone);
    private cdr = inject(ChangeDetectorRef);
    private msgSub?: Subscription;

    tabs = signal<TabInfo[]>([]);
    activeTabIndex = signal(0);
    text = '';
    username = '';
    aiLoading = false;

    showInviteModal = signal(false);
    inviteCode = signal('');
    inviteCopied = false;

    showMenu = signal(false);
    menuTop = 0;
    menuLeft = 0;
    showCategoriesModal = signal(false);
    showJoinModal = signal(false);
    joinCode = '';
    joinLoading = false;
    joinError = signal('');
    categories = Object.entries(CATEGORIES).map(([id, label]) => ({ id, label }));

    get activeTab(): TabInfo | undefined {
        return this.tabs()[this.activeTabIndex()];
    }

    get isPrivateRoom(): boolean {
        return this.activeTab?.room.startsWith('priv_') ?? false;
    }

    get isAiMode(): boolean {
        return this.activeTab?.isAi ?? false;
    }

    constructor() {
        effect(() => {
            const user = this.authService.currentUser();
            if (user && !this.username) {
                this.username = user.email?.split('@')[0] ?? 'anon';
                const room = this.authService.getRoom();

        if (room === 'ia-chat') {
            this.openTab('ia-chat', '💬 IA', true);
        } else if (room === 'global') {
            this.openTab('global', '🌐 Global', false);
        } else {
            const label = CATEGORIES[room] || (room.startsWith('priv_') ? '🔒 ' + room.replace('priv_', '').toUpperCase() : room);
            this.openTab(room, label, false);
        }
            }
        });

        this.msgSub = this.chatService.messages$.subscribe((msg: ChatMessage) => {
            this.zone.run(() => {
                const tab = this.tabs().find(t => t.room === msg.room);
                if (tab) {
                    tab.messages = [...tab.messages, msg];
                    tab.users = msg.users ?? [];
                    if (this.activeTab?.room !== msg.room) {
                        tab.hasNewMessages = true;
                    }
                    this.cdr.detectChanges();
                }
            });
        });
    }

    ngOnDestroy() {
        this.msgSub?.unsubscribe();
        this.chatService.disconnectAll();
    }

    ngAfterViewChecked() {
        this.scrollToBottom();
    }

    scrollToBottom() {
        try {
            const el = this.messagesContainer?.nativeElement;
            if (el) el.scrollTop = el.scrollHeight;
        } catch { }
    }

    openTab(room: string, label: string, isAi: boolean) {
        const existing = this.tabs().findIndex(t => t.room === room);
        if (existing >= 0) {
            this.switchTab(existing);
            return;
        }

        const newTab: TabInfo = {
            room,
            label,
            messages: [],
            users: [],
            isAi,
            hasNewMessages: false
        };

        this.tabs.update(tabs => [...tabs, newTab]);
        this.activeTabIndex.set(this.tabs().length - 1);

        if (!isAi) {
            this.connectToRoom(room);
        } else {
            newTab.users = [this.username, '🤖 IA'];
        }

        this.cdr.detectChanges();
    }

    switchTab(index: number) {
        if (index === this.activeTabIndex()) return;

        this.activeTabIndex.set(index);
        const newTab = this.activeTab;
        if (newTab) {
            newTab.hasNewMessages = false;
            if (!newTab.isAi) {
                this.connectToRoom(newTab.room);
            }
        }

        this.cdr.detectChanges();
    }

    closeTab(index: number, event: Event) {
        event.stopPropagation();
        const tabs = this.tabs();
        const closedTab = tabs[index];

        if (closedTab && !closedTab.isAi) {
            this.chatService.disconnect(closedTab.room);
        }

        this.tabs.update(t => t.filter((_, i) => i !== index));

        if (this.tabs().length === 0) {
            return;
        }

        const wasActive = index === this.activeTabIndex();
        if (wasActive) {
            const newIndex = Math.min(index, this.tabs().length - 1);
            this.activeTabIndex.set(newIndex);
            const newTab = this.activeTab;
            if (newTab && !newTab.isAi) {
                this.connectToRoom(newTab.room);
            }
        } else if (index < this.activeTabIndex()) {
            this.activeTabIndex.update(i => i - 1);
        }

        this.cdr.detectChanges();
    }

    async connectToRoom(room: string) {
        const token = await this.authService.getToken();
        if (!token) return;

        this.chatService.connect(room, this.username, token);
    }

    send() {
        if (!this.text.trim()) return;

        if (this.isAiMode) {
            this.sendAiMessage();
        } else {
            const room = this.activeTab?.room;
            if (room) this.chatService.emit(this.text, room);
            this.text = '';
        }
    }

    sendAiMessage() {
        if (!this.text.trim() || this.aiLoading) return;

        const tab = this.activeTab;
        if (!tab) return;

        const userMsg: ChatMessage = {
            type: 'message',
            text: this.text,
            username: this.username,
            users: []
        };
        tab.messages = [...tab.messages, userMsg];
        const messageToSend = this.text;
        this.text = '';
        this.aiLoading = true;

        this.aiService.chat(messageToSend, tab.room).subscribe({
            next: (res) => {
                this.zone.run(() => {
                    const aiMsg: ChatMessage = {
                        type: 'message',
                        text: res.reply,
                        username: '🤖 IA',
                        users: []
                    };
                    tab.messages = [...tab.messages, aiMsg];
                    this.aiLoading = false;
                    this.cdr.detectChanges();
                });
            },
            error: () => {
                this.zone.run(() => {
                    const errMsg: ChatMessage = {
                        type: 'message',
                        text: 'Error al conectar con la IA',
                        username: '🤖 IA',
                        users: []
                    };
                    tab.messages = [...tab.messages, errMsg];
                    this.aiLoading = false;
                    this.cdr.detectChanges();
                });
            }
        });
    }

    async openInvite() {
        const token = await this.authService.getToken();
        if (!token || !this.activeTab) return;

        this.inviteService.createInvite(token, this.activeTab.room).subscribe({
            next: (res) => {
                this.inviteCode.set(res.invite_code);
                this.showInviteModal.set(true);
                this.inviteCopied = false;
            },
            error: () => {
                this.showInviteModal.set(true);
            }
        });
    }

    closeInvite() {
        this.showInviteModal.set(false);
    }

    async copyInviteCode() {
        const textToCopy = this.inviteCode();
        if (!textToCopy) return;
        try {
            await navigator.clipboard.writeText(textToCopy);
            this.inviteCopied = true;
            setTimeout(() => this.inviteCopied = false, 2000);
        } catch {
            const input = document.createElement('input');
            input.value = textToCopy;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            this.inviteCopied = true;
            setTimeout(() => this.inviteCopied = false, 2000);
        }
    }

    async logout() {
        await this.authService.logout();
        this.tabs.set([]);
        this.username = '';
    }

    toggleMenu(event?: Event) {
        if (this.showMenu()) {
            this.showMenu.set(false);
            return;
        }
        const btn = this.menuToggleBtn?.nativeElement;
        if (btn) {
            const rect = btn.getBoundingClientRect();
            this.menuTop = rect.bottom + 2;
            this.menuLeft = rect.right - 184;
        }
        this.showMenu.set(true);
    }

    closeMenu() {
        this.showMenu.set(false);
    }

    goToCategories() {
        this.closeMenu();
        this.showCategoriesModal.set(true);
    }

    selectCategory(categoryId: string) {
        this.showCategoriesModal.set(false);
        const label = CATEGORIES[categoryId] || categoryId;
        this.openTab(categoryId, label, false);
    }

    closeCategoriesModal() {
        this.showCategoriesModal.set(false);
    }

    openCreatePrivateRoom() {
        this.closeMenu();
        this.authService.getToken().then(t => {
            if (!t) return;
            this.inviteService.createPrivateRoom(t).subscribe({
                next: (res) => {
                    const label = '🔒 ' + res.room_code.replace('priv_', '').toUpperCase();
                    this.openTab(res.room_code, label, false);
                    this.cdr.detectChanges();
                    setTimeout(() => this.openInvite(), 300);
                }
            });
        });
    }

    openJoinModal() {
        this.closeMenu();
        this.joinCode = '';
        this.joinError.set('');
        this.showJoinModal.set(true);
    }

    closeJoinModal() {
        this.showJoinModal.set(false);
    }

    async joinByCode() {
        if (!this.joinCode.trim()) return;
        this.joinLoading = true;
        this.joinError.set('');

        this.inviteService.validateInvite(this.joinCode.trim()).subscribe({
            next: (info) => {
                this.showJoinModal.set(false);
                this.joinLoading = false;
                const label = '🔒 ' + info.room.replace('priv_', '').toUpperCase();
                this.openTab(info.room, label, false);
            },
            error: () => {
                this.joinError.set('Codigo no valido o expirado');
                this.joinLoading = false;
            }
        });
    }

    openGlobalChat() {
        this.closeMenu();
        this.openTab('global', '🌐 Global', false);
    }

    openAiFromMenu() {
        this.closeMenu();
        this.openTab('ia-chat', '💬 IA', true);
    }

    logoutFromMenu() {
        this.closeMenu();
        this.logout();
    }
}
