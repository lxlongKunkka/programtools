import mongoose from 'mongoose';
import User from './server/models/User.js';

mongoose.connect('mongodb://localhost:27017/programtools').then(async () => {
  console.log('Connected to DB');
  
  const allUsers = await User.find({});
  console.log('All Users:', allUsers.map(u => `${u.uname} (${u.role || 'no-role'})`));

  const teachers = await User.find({ role: 'teacher' });
  console.log('Teachers:', teachers.map(u => `${u.uname} (${u.role})`));

  const premiums = await User.find({ role: 'premium' });
  console.log('Premiums:', premiums.map(u => `${u.uname} (${u.role})`));

  const admins = await User.find({ role: 'admin' });
  console.log('Admins:', admins.map(u => `${u.uname} (${u.role})`));
  
  // Find Wang Xiao specifically if possible (assuming uname or part of it)
  const wang = await User.findOne({ uname: /王/ });
  if (wang) console.log('Wang:', wang.uname, wang.role);

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
