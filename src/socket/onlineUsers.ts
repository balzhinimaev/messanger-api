// src/socket/onlineUsers.ts
const onlineUsers = new Map<string, string[]>();

export const addUser = (userId: string, socketId: string) => {
    const userSockets = onlineUsers.get(userId) || [];
    if (!userSockets.includes(socketId)) {
        userSockets.push(socketId);
    }
    onlineUsers.set(userId, userSockets);
};

export const removeUser = (userId: string, socketId: string) => {
    // Проверяем, существует ли запись для этого пользователя
    if (onlineUsers.has(userId)) {
        // Оставляем только те сокеты, ID которых не совпадает с отключаемым
        const updatedSockets = onlineUsers.get(userId)?.filter(
            (id) => id !== socketId
        ) || [];

        // Если после фильтрации у пользователя не осталось активных сокетов, удаляем запись о нем
        if (updatedSockets.length === 0) {
            onlineUsers.delete(userId);
            console.log(`User ${userId} completely offline. Entry removed.`);
        } else {
            onlineUsers.set(userId, updatedSockets);
        }
    } else {
        console.log(`Attempted to remove user ${userId}, but they were not in the map.`);
    }
};

export const isUserOnline = (userId: string): boolean => {
    return onlineUsers.has(userId);
};

export const getOnlineUsers = (): { userId: string }[] => {
    return Array.from(onlineUsers.keys()).map((userId) => ({ userId }));
}; 