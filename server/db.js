import mongoose from 'mongoose'
import { HYDRO_MONGODB_URI, APP_MONGODB_URI } from './config.js'

// Connection to Hydro database (read-only usage)
export const hydroConn = mongoose.createConnection(HYDRO_MONGODB_URI)
hydroConn.on('connected', () => console.log('Connected to Hydro MongoDB'))
hydroConn.on('error', (err) => console.error('Hydro MongoDB connection error:', err))

// Connection to programtools database (read-write)
export const appConn = mongoose.createConnection(APP_MONGODB_URI)
appConn.on('connected', () => console.log('Connected to programtools MongoDB'))
appConn.on('error', (err) => console.error('App MongoDB connection error:', err))
