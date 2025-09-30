# 💾 Простой файловый сервер

## Описание

Проект написан чтобы было проще делиться файлами. Например, перекинуть себе что-то с чужого компьютера (лень заходить в Телеграм), просто выставить файл в интернет.

## Функционал

### Загрузка файлов

Находится на главной странице. Закидываете файл, указываете время хранения и загружаете. Загрузка защищена паролем. 

Файл будет доступен по указанному пути, без пароля.

Список всех файлов — на странице `/ls`. Страница защищена паролем.

### Блокнот

Находится на странице `/note`. Работает как обычный блокнот. Защищён паролем.

## Запуск

Для работы сервера нужен Node JS.

**Шаг 1:** клонируйте репозиторий
```bash
git clone https://github.com/intredford/simple-fileserver
cd simple-fileserver
```

**Шаг 2:** установите зависимости
```bash
npm install
```

**Шаг 3:** переименуйте файл `config.example.js` в `config.js`, измените под себя

**Шаг 4:** создайте базу данных `db.sqlite`
```sql
CREATE TABLE "files" (`path` TEXT PRIMARY KEY UNIQUE NOT NULL, `name` TEXT NOT NULL, `size` INTEGER NOT NULL, `size_readable` TEXT, `created_at` TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP), `expires_at` TEXT, `mime_type` TEXT NOT NULL, `mime_extension` TEXT NOT NULL);
CREATE TABLE "note" ("content" TEXT);
INSERT INTO "note" ("content") VALUES ('Edit me');
```

**Шаг 5:** запустите сервер
```bash
node index.js
# или
pm2 start index.js --name "fileserver"
```

### Разработка

Выполните шаги 1-4, вместо шага 5 пропишите
```bash
npm run dev
```

## Планы

- Защищённые паролем файлы;
- «Сжечь после просмотра».