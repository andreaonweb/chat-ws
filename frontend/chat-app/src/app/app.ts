import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { AuthComponent } from './auth/auth.component';
import { ChatComponent } from './chat/chat.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, AuthComponent, ChatComponent],
    templateUrl: './app.html',
    styleUrl: './app.scss'
})
export class App {
    authService = inject(AuthService);
}
