import express from 'express';
const app = express();

import QRCode from 'qrcode'

const UPLOAD_FOLDER = process.env.FOLDER || 'public/uploads';
const HOST = process.env.HOST;

import { upload } from './storage.js'
import { uploads } from './database.js'

import { checkPassword } from './auth.js';

// Загрузка файлов
app.post('/api/upload', checkPassword, upload.array('files'), async (req, res) => {

	const noDelete = req.body.noDelete === 'true'
	// Время удаления. null - не удалять никогда.
	const deleteAt = noDelete ? null : Date.now() + (req.body.deleteAfter * 60 * 60 * 1000);
	
	const files = req.files;
	const response = []

	// Добавляем файлы в базу
	for (const file of files) {
		// Если по тому же пути уже есть файл, удаляем его
		await uploads.filterDelete(upload => upload.path === file.path)

		// Формируем запись в базу
		const entry = {
			path: file.path,
			destination: file.destination,
			link: file.relativePath,
			deleteAt
		}
		
		// Добавляем файл в базу
		await uploads.push(entry)

		// Добавляем файл в ответ
		response.push({
			link: HOST + entry.link,
			QRCode: await QRCode.toDataURL(HOST + entry.link, {
				errorCorrectionLevel: 'low',
				margin: 1,
				scale: 1,
			}),
		})

	}

	res.status(200).send(response);
});

// В корне показывыать интерфейс загрузки
app.use('/', express.static('public/fileserver'));

// В остальных случаях (кроме /api) отдавать файлы
app.use((req, res, next) => {
	if (req.path !== '/api') {
		express.static(UPLOAD_FOLDER)(req, res, next);
	} else {
		next();
	}
});

// Create 404 route
app.use((req, res) => {
	res.status(404).send(
`<!DOCTYPE html><pre>
<b>404 / Не найдено</b>

"${req.url}" не существует или был удалён.
Связаться можно по mail@dimius.ru

---

<b>404 / Not Found</b>

"${req.url}" does not exist or had been deleted.
You can contact mail@dimius.ru
</pre>
<style>pre{line-height:1.4;white-space:break-spaces;}</style>`
	);
});

// Запуск сервера
const port = 3001;
app.listen(port, () => {
	console.log(`Fileserver is running on port ${port}`);
});