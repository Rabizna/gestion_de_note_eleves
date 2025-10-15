//server/src/env.js
import 'dotenv/config';

export const PORT = process.env.PORT || 4000;
export const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
export const NODE_ENV = process.env.NODE_ENV || 'development';
