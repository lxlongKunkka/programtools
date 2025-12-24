
import mongoose from 'mongoose';
import User from './server/models/User.js';
import { MONGODB_URI } from './server/config.js';

async function checkUser() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        const user = await User.findById(7);
        if (!user) {
            console.log('User 7 not found');
        } else {
            console.log('User 7 found:', {
                _id: user._id,
                uname: user.uname,
                role: user.role,
                priv: user.priv
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

checkUser();
