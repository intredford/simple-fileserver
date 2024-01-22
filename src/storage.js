// storage.js
import multer from 'multer';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

fs.mkdirSync(process.env.FOLDER, { recursive: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_FOLDER = process.env.FOLDER || 'public/uploads';
const pathToUploads = path.join(__dirname, '../', UPLOAD_FOLDER);

function extractFolderPath(filePath) {
	const match = filePath.match(/^(.*[\/\\])?(.*?)$/);
	return match && match[1] ? match[1] : '';
}

// Установка хранилища для загруженных файлов
const storage = multer.diskStorage({
	destination: (req, file, callback) => {

		const filePath = Array.isArray(req.body[file.originalname]) ? 
			req.body[file.originalname][0] 
			: req.body[file.originalname]

		const folderPath = extractFolderPath(filePath); // Получаем путь к папке для каждого файла
		const fullPath = path.join(pathToUploads, folderPath);

		fs.mkdirSync(fullPath, { recursive: true }); // Создаём папки

		file.relativePath = path.posix.normalize('/' + filePath) // Путь для ссылки.
		
		callback(null, fullPath);

	},
	filename: (req, file, callback) => {
		const filePath = Array.isArray(req.body[file.originalname]) ? 
		req.body[file.originalname][0] 
		: req.body[file.originalname]

		const fileName = filePath.split('/').reverse()[0]; // Извлекаем имя файла из формы
		callback(null, fileName);
	},
});

const upload = multer({ storage });

export { storage, upload, pathToUploads };