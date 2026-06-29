import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';

import { routes } from './app.routes';

const firebaseConfig = {
  apiKey: "AIzaSyBcmkX2Fzbf0jBzyJOxTWs0ApkclS9Gfao",
  authDomain: "chat-websocket-47177.firebaseapp.com",
  projectId: "chat-websocket-47177",
  storageBucket: "chat-websocket-47177.firebasestorage.app",
  messagingSenderId: "497537389073",
  appId: "1:497537389073:web:2e6a91c2c81b82ed9857b0",
  measurementId: "G-X6G9H1SZLD"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
  ]
};