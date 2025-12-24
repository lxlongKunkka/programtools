
const user = { _id: 7, uname: 'kunkka', role: 'teacher', priv: 16842765 };
const isAdmin = user && (user.role === 'admin' || user.priv === -1);
console.log('Is Admin:', isAdmin);
