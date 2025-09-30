export default (bytes) => {
	if (!bytes) return '0 B'
	const s = bytes < 0 ? '-' : ''
	bytes = Math.abs(bytes)
	let type = 0
	while (bytes >= 1024 && type < 3) {
		bytes /= 1024
		type++
	}
	return (s + bytes.toFixed([0, 0, 0, 1][type]) + ' ' + ['б','Кб','Мб','Гб'][type]).replace('.00', '')
}