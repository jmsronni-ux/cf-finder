import jwt from 'jsonwebtoken';
const token = jwt.sign({ userId: '68ee230a6a15098aadd84738' }, 'fiufiu', { expiresIn: '7d' });
console.log(token);
