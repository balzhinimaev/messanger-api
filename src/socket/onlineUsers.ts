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
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
        const updatedSockets = userSockets.filter(id => id !== socketId);
        if (updatedSockets.length > 0) {
            onlineUsers.set(userId, updatedSockets);
        } else {
            onlineUsers.delete(userId);
        }
    }
};

export const isUserOnline = (userId: string): boolean => {
    return onlineUsers.has(userId);
};

export const getOnlineUsers = (): string[] => {
    return Array.from(onlineUsers.keys());
}; 