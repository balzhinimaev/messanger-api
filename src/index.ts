import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http'; // Импортируем стандартный модуль http
import { Server } from 'socket.io'; // Импортируем Server из socket.io
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes';
import chatRoutes from './routes/chatRoutes';
import { initSocketServer } from './socket';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { globalErrorHandler, AppError } from './middleware/errorHandler';

const app = express();
const server = http.createServer(app); // Создаем HTTP сервер на основе Express приложения
const io = new Server(server, { // Инициализируем Socket.IO поверх HTTP сервера
    cors: {
        origin: "http://localhost:3000", // !!! Укажите URL вашего фронтенд-приложения
        methods: ["GET", "POST"]
    }
});

const port = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet());

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per windowMs
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(limiter);


app.use(express.json());

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
    console.error('MONGO_URI is not defined in .env file');
    process.exit(1);
}

mongoose.connect(mongoUri, {
    dbName: 'hey'
})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

app.get('/api', (req, res) => {
    res.send('API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);

// Handle unhandled routes
// Express 5 требует именованный wildcard-параметр — используем "splat".
app.all('/*splat', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handling Middleware
app.use(globalErrorHandler);

initSocketServer(io); // Вызываем функцию для настройки логики сокетов

const runningServer = server.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`); // Запускаем server, а не app
});

process.on('unhandledRejection', (err: Error) => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    runningServer.close(() => {
        process.exit(1);
    });
});

process.on('uncaughtException', (err: Error) => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    runningServer.close(() => {
        process.exit(1);
    });
}); 