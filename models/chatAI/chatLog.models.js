
const chatLogs = [];

export const saveChatLog = (question, answer) => {
  chatLogs.push({ question, answer, createdAt: new Date() });
};

export const getAllChatLogs = () => chatLogs;
