import express from 'express';
const app = express();

import QRCode from 'qrcode'

const HOST = process.env.HOST;

import { upload } from './storage.js'
import { uploads } from './database.js'

import { checkPassword } from './auth.js';

Array.prototype.last = function() { return this[this.length - 1] }

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

// Дерево файлов
app.get('/api/filetree', checkPassword, async (req, res) => {

	const files = await uploads.parse()
	const tree = []
	
	for (const file of files) {
		
		let fileNode = { type: 'file', name: file.link.split('/').last(), link: HOST + file.link }

		const folders = file.link.split('/').slice(0, -1).filter(folder => folder)

		if (!folders.length) {
			tree.push(fileNode)
		} else {

			let parent = tree
			for (const folder of folders) {
				let found = parent.find(node => node.name === folder)
				if (!found) {
					found = {
						type: 'folder',
						name: folder,
						children: []
					}
					parent.push(found)
				}
				parent = found.children
			}
			parent.push(fileNode)
			
		}
	}

	res.json(tree)
})

// Статичные папки
app.use(express.static('public/fileserver'));
app.use(express.static('public/uploads'));


// Короткий адрес для списка файлов
app.get('/ls', (req, res) => {
	res.redirect('/ls.html')
})

// Create 404 route
app.use((req, res) => {
	res.status(404).send(
`<!DOCTYPE html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" type="image/png" href="/favicon.svg">
<title>[404] - ${req.path}</title>
</head>
<pre>
<b>404</b>

Контент на "${req.url}" не существует или был удалён.
Связаться можно по mail@dimius.ru

---

<b>404 / Not Found</b>

Content on "${req.url}" does not exist or had been deleted.
You can contact mail@dimius.ru
</pre>
<style>pre{line-height:1.4;white-space:break-spaces;}</style>`
	);
});

// Запуск сервера
const port = process.env.PORT;
app.listen(port, () => {
	console.log(`Fileserver is running on port ${port}`);
});
