import 'dotenv/config'

import cors from 'cors'

import { schedule } from 'node-cron'

import app from './src/server.js'

app.use(cors({ origin: false }))

import { deleteExpiredFiles, deleteEmptyFolders } from './src/cleaner.js'
import { pathToUploads } from './src/storage.js'

const clean = async () => {
	await deleteExpiredFiles()
	console.log('Истёкшие файлы удалены')
	await deleteEmptyFolders(pathToUploads)
	console.log('Пустые папки удалены')
}

await clean()

schedule('0 * * * *', clean);

