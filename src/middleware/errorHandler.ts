// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

// Вспомогательный класс для создания операционных ошибок
export class AppError extends Error {
    statusCode: number;
    status: string;
    isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

const sendErrorDev = (err: AppError, res: Response) => {
    res.status(err.statusCode || 500).json({
        status: err.status || 'error',
        error: err,
        message: err.message,
        stack: err.stack,
    });
};

const sendErrorProd = (err: AppError, res: Response) => {
    // Операционная, доверенная ошибка: отправляем сообщение клиенту
    if (err.isOperational) {
        res.status(err.statusCode || 500).json({
            status: err.status || 'error',
            message: err.message,
        });
    // Ошибка программирования или другая неизвестная ошибка: не раскрываем детали
    } else {
        // 1) Логируем ошибку
        console.error('ERROR 💥', err);
        // 2) Отправляем общее сообщение
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!',
        });
    }
};

export const globalErrorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else if (process.env.NODE_ENV === 'production') {
        sendErrorProd(err, res);
    }
}; 