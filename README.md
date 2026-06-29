# Chat WebSocket

Una aplicación de chat en tiempo real con WebSockets, autenticación Firebase y soporte para IA.

## 🚀 Características

- 🔌 Comunicación en tiempo real con WebSockets
- 🔐 Autenticación con Firebase
- 💬 Soporte para IA integrada
- 🏠 Chat Global: accesible para todos los usuarios
- 📂 Categorías de salas personalizables
- 🔒 Salas privadas con invitación privada
- 🖥️ Interfaz de usuario moderna y responsive
- 🎨 Diseño inspirado en Game Boy
- 💾 Persistente de sesiones y usuarios

## 🛠️ Tecnologías

### Backend
- **FastAPI**: Servidor WebSocket
- **Python**: Lenguaje principal
- **Firebase**: Autenticación y bases de datos
- **Groq**: Modelo de IA para respuestas

### Frontend
- **Angular**: Framework JavaScript
- **TypeScript**: Tipado estático
- **Tailwind CSS**: Estilos

## 📋 Requisitos

### Backend
```bash
cd backend
pip install -r requirements.txt

# Configuración necesaria
# 1. Firebase service account
# 2. Groq API key en .env
```

### Frontend
```bash
cd frontend/chat-app
npm install
npm run dev
```

## 🚀 Ejecución

### Desarrollo
```bash
# Inicia frontend y backend juntos
concurrently "cd frontend/chat-app && npm run dev" "cd backend && pip install -r requirements.txt && python -m uvicorn src.main:app --host 0.0.0.0 --port 8000"
```

### Separado

**Terminal 1 - Frontend:**
```bash
cd frontend/chat-app && npm run dev
```

**Terminal 2 - Backend:**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000
```

## 🌐 URLs de Acceso

- **Interfaz de Usuario**: `http://localhost:5173`
- **API de Backend**: `http://localhost:8000`
- **WebSocket**: `ws://localhost:8000/ws/{room}/{username}`

## 📁 Estructura del Proyecto

```
chat-websocket/
├── frontend/chat-app/              # Frontend Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/            # Componente de login/auth
│   │   │   ├── chat/             # Interfaz de chat
│   │   │   └── ...               # Otros componentes
│   │   └── ...                   # Angular config
│   └── ...
├── backend/                      # Backend FastAPI
│   ├── src/                       # Source code
│   │   └── main.py              # Servidor WebSocket
│   ├── requirements.txt         # Dependencias Python
│   └── ...                     # Configuración backend
└── package.json                 # Configuración del proyecto
```

## 🔧 Configuración

### Backend (.env)
```env
GROQ_API_KEY=your_groq_api_key_here
```

### Service Account
Necesitas una cuenta de servicio de Firebase con estos permisos:
- `https://www.googleapis.com/auth/cloud-platform`

## 📝 Características Detalladas

### 🏠 Chat Global
- **Accesible desde el inicio**
- **Entrada libre para todos**
- **Donde todos pueden unirse**
- **Sin necesidad de categoría**

### 📂 Categorías de Salas
- **Gaming** 🎮
- **Música** 🎵
- **Deporte** ⚽
- **Tecnología** 💻
- **Cine** 🎬
- **Arte** 🎨

### 🔒 Salas Privadas
- **Crea salas privadas**
- **Codigo de invitación único**
- **Acceso restringido**

### 💬 IA Integrada
- **Chat con inteligencia artificial**
- **Respuestas contextuales**
- **Modo separado**

## 🧪 Testing

```bash
npm test
# Pruebas del frontend

# Para probar el backend localmente
python -m pytest
```

## 🤝 Contribuciones

¡Siempre son bienvenidas! Por favor, abre un issue o un pull request.

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver `LICENSE` para más detalles.

## 🔄 Estado del Proyecto

- **Versión 1.0.0**
- **Activo en desarrollo**
- **Características principales completas**

## 🚨 Nota Importante

Para uso en producción, necesitas configurar:
1. Firebase Service Account
2. Groq API key
3. Dominios de autorización correctos

## 📞 Contacto

Para preguntas o soporte, contacta a través de los canales oficiales del repositorio.
