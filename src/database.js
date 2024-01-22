import { Database } from '@jsweb/jsdb'

const db = new Database('database')
const uploads = db.store('files')

export { uploads }