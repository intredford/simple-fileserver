import { promises as fs } from 'fs';
import { join } from 'path';

import { uploads as uploadsDB } from './database.js'
import { pathToUploads } from './storage.js'

const deleteEmptyFolders = async (path) => {
	const entries = await fs.readdir(path, { withFileTypes: true });

	if (entries.length === 0 && path !== pathToUploads) {
		console.log(path, pathToUploads)
		await fs.rmdir(path);
		return;
	}

	for (const entry of entries) {
		const entryPath = join(path, entry.name);
		if (entry.isDirectory()) {
			await deleteEmptyFolders(entryPath);
		}
	}

	const updatedEntries = await fs.readdir(path);
	if (updatedEntries.length === 0 && path !== pathToUploads) {
		await fs.rmdir(path);
	}
}

const deleteExpiredFiles = async () => {

	const now = Date.now()

	const expiration = (upload) => upload.deleteAt !== null && upload.deleteAt < now
	const expiredFiles = await uploadsDB.filter(expiration) // Отбираем истёкшие файлы

	for (const file of expiredFiles) {

		try {
			await fs.access(file.path); // Проверка, что файл существует и доступен
			await fs.unlink(file.path);
		} catch (err) {
			throw err
		} finally {
			await uploadsDB.delete(file.id);
		}
	}   
}

export { deleteExpiredFiles, deleteEmptyFolders }