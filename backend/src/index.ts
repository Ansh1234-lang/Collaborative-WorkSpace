import  express   from 'express';
import dotenv from 'dotenv'
import cors from 'cors'
import { createServer } from 'node:http';
import {Server} from 'socket.io'
import { AuthRequest } from './routes/auth.auth.routes';

