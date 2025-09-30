import { uploads } from '#config'

import { db, sql } from '#lib/db'
import { promises as fs } from 'fs'
import { join } from 'path/posix'

import { schedule } from 'node-cron'

schedule('* * * * *', async () => {

	const now = new Date()
	
	const files = await db.query(sql`SELECT * FROM files WHERE expires_at IS NOT NULL AND expires_at < ${now}`)
	for (const file of files) {
		const destination = join(process.cwd(), uploads.folder, file.path)
		try { await fs.access(destination) } catch (error) { if (error.code === 'ENOENT') continue }
		await fs.unlink(destination)
		console.log(`File "${file.path}" expired and got deleted`)
	}
	await db.query(sql`DELETE FROM files WHERE expires_at IS NOT NULL AND expires_at < ${now}`)

	const destination = join(process.cwd(), uploads.folder)

	const deleteEmptyFolders = async (path) => {
		const entries = await fs.readdir(path, { withFileTypes: true })

		for (const entry of entries) {
			if (entry.isDirectory()) {
				const entryPath = join(path, entry.name)
				await deleteEmptyFolders(entryPath)
			}
		}

		const remaining = await fs.readdir(path)
		if (remaining.length === 0 && path !== destination) await fs.rmdir(path)
	}

	await deleteEmptyFolders(destination)

})