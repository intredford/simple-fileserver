const checkPassword = (req, res, next) => {

	const provided = req.get('Authorization'); // насрать
	const expected = `Basic ${process.env.PASSWORD}`;

	if (provided === expected) {
		next();
	} else {
		res.status(401).send({ message: 'Неверный пароль' });
	}
};

export { checkPassword };