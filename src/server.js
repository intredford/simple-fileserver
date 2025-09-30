import { website, uploads } from '#config'

import express from 'express'
const app = express()
app.use(express.json())

import { db, sql } from "#lib/db"
import toReadable from '#utils/to-readable-filesize'
import icons from '#utils/icons'

import cors from 'cors'
import QRCode from 'qrcode'
import fileUpload from 'express-fileupload'
import { join, normalize } from 'path/posix'
import fs from 'fs/promises'

import { checkPassword } from './auth.js'

Array.prototype.last = function() { return this[this.length - 1] }

const fileUploadOptions = {
	createParentPath: true,
	abortOnLimit: true,
	useTempFiles: true,
	defParamCharset: 'utf-8',
	tempFileDir: join(process.cwd(), uploads.tempFolder),
	limits: { fileSize: uploads.maxFileSize }
}

// Загрузка файлов
app.post('/api/upload', checkPassword, fileUpload(fileUploadOptions), async (req, res) => {

	const files = [].concat(req.files?.files || []) // Чел зачем-то сделал, что один файл выдаётся объектом, а несколько — массивом
	let records = req.body

	if (!files || !records || Object.entries(records).length-1 !== files.length) {
		return res.status(400).send()
	}

	const response = []

	const expiration = new Date(+records.expires_at) || null
	delete records.expires_at

	records = Object.entries(records).map(([path, name]) => ({ path: normalize(path), name }))

	for (const [i, record] of records.entries()) {
		record.size = files[i].size
		record.size_readable = toReadable(files[i].size)
		record.mime_type = files[i].mimetype
		
		const extension = files[i].mimetype.split('/').last()
		if (icons.includes(extension)) {
			record.mime_extension = extension
		} else record.mime_extension = record.name.split('.').last()

		record.destination = join(process.cwd(), uploads.folder, record.path)

		if (!record.destination.startsWith(join(process.cwd(), uploads.folder))) {
			return res.status(400).send(`Относительный путь "${record.path}" указывает вне загрузочной папки`)
		}
	}

	await db.tx(async (db) => {

		await db.query(sql`
			INSERT INTO files (path, name, size, size_readable, expires_at, mime_type, mime_extension)
			VALUES ${sql.join(records.map((record, i) => sql`(
				${record.path},
				${record.name},
				${record.size},
				${record.size_readable},
				${expiration},
				${record.mime_type},
				${record.mime_extension}
			)`), sql`, `)}
			ON CONFLICT (path) DO UPDATE SET
				name = EXCLUDED.name,
				size = EXCLUDED.size,
				size_readable = EXCLUDED.size_readable,
				expires_at = EXCLUDED.expires_at,
				mime_type = EXCLUDED.mime_type,
				mime_extension = EXCLUDED.mime_extension
		`)

		for (const [i, record] of records.entries()) {
			const file = files[i]
			await file.mv(record.destination)
			response.push({
				link: decodeURI(new URL(record.path, website.host).toString()),
				QRCode: await QRCode.toDataURL(new URL(record.path, website.host).toString(), {
					errorCorrectionLevel: 'low',
					margin: 1,
					scale: 1,
				}),
			})
			console.log(`Uploaded "${record.path}"`)
		}

	})

	const tempFiles = await fs.readdir(fileUploadOptions.tempFileDir)
	for (const file of tempFiles) {
		await fs.rm(join(fileUploadOptions.tempFileDir, file), { recursive: true, force: true })
	}

	res.status(200).send(response)
})

// Дерево файлов
app.get('/api/files', checkPassword, async (req, res) => {
	const files = await db.query(sql`SELECT * FROM files ORDER BY created_at`)
	const tree = { children: new Map(), files: [] }
	const pathMap = new Map([['', tree]])

	for (const file of files) {
		const parts = file.path.split('/').filter(Boolean)
		const destination = parts.slice(0, -1).join('/')
		const filename = parts[parts.length - 1] || file.path

		if (!pathMap.has(destination)) {
			let current = tree
			let currentPath = ''
			for (const part of parts.slice(0, -1)) {
				currentPath += (currentPath ? '/' : '') + part
				if (!current.children.has(part)) {
					current.children.set(part, { children: new Map(), files: [], path: '/' + currentPath })
				}
				current = current.children.get(part)
			}
			pathMap.set(destination, current)
		}

		pathMap.get(destination).files.push({ ...file, name: filename })
	}

	const result = []
	const traverse = (node, level) => {
		for (const file of node.files) {
			result.push({ ...file, type: 'file', level })
		}

		const folders = Array.from(node.children.entries()).map(([name, folder]) => ({ name, folder })).sort((a, b) => {
			const aTime = a.folder.files[0]?.created_at || '9999'
			const bTime = b.folder.files[0]?.created_at || '9999'
			return aTime.localeCompare(bTime)
		})

		for (const { name, folder } of folders) {
			result.push({ type: 'folder', name, path: folder.path, level })
			traverse(folder, level + 1)
		}
	}

	traverse(tree, 0)
	res.json(result)
})

// Заметки
app.get('/api/note', checkPassword, async (req, res) => {
	const [{ content }] = await db.query(sql`SELECT * FROM note`)
	res.send(content)
})
app.post('/api/note', checkPassword, async (req, res) => {
	await db.query(sql`UPDATE note SET content = ${req.body.text}`)
	res.status(200).send()
})

// Статичные папки
app.use(express.static('public/fileserver'));
app.use(cors({ origin: false }), express.static(uploads.folder));


// Короткий адрес для списка файлов
app.get('/ls', (req, res) => {
	res.sendFile(process.cwd() + '/public/fileserver/ls.html')
})

// Короткий адрес заметок
app.get('/note', (req, res) => {
	res.sendFile(process.cwd() + '/public/fileserver/note.html')
})

// 404
app.use((req, res) => {
	res.status(404).send(
`<!DOCTYPE html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" type="image/png" href="/favicon.svg">
<title>${req.path} not found</title>
<style>
body { font-size: 20px; padding: 0 1em; }
pre { width: fit-content; }
a {
	color:inherit;
	text-decoration-color:color-mix(in srgb, currentColor, transparent 70%);
	text-decoration-skip-ink: none;
	text-underline-offset: 0.2em;
}
a:hover { text-decoration-color:color-mix(in srgb, currentColor, transparent 50%); }
.en { opacity: 0.5; padding-bottom: 4em; }
.en:hover { opacity: 1; }
</style>
</head>
<pre>
<b>404</b>
На <i><b>${req.url}</b></i> ничего нет.
Вопросы — на почту <a href="mailto:mail@dimius.ru">mail@dimius.ru</a>.

<div class="en">
<b>404</b>
Nothing at <i><b>${req.url}</b></i>.
You can contact <a href="mailto:mail@dimius.ru">mail@dimius.ru</a>.
</div>
</pre>
<style>pre{line-height:1.4;white-space:break-spaces;}</style>`
	);
})

// Запуск сервера
app.listen(website.port, () => {
	console.log(`Fileserver is running on :${website.port}`)
})

export default app