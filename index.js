import 'dotenv/config'

import { schedule } from 'node-cron'

import './src/server.js'

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
