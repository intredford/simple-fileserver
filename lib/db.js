import connect, { sql } from '@databases/sqlite'

const db = connect('./db.sqlite')

sql.registerFormatter(Date, date =>
	sql.value(date.toISOString().replace('T', ' ').substring(0, 19))
)

export { db, sql }