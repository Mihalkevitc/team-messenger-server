# Указываем базовый образ
FROM node:18

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# Копируем package.json и package-lock.json
COPY server/package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь код сервера
COPY server .

# Открываем нужный порт (например, 5000)
EXPOSE 5000

# Стартуем приложение
CMD ["node", "index.js"]
