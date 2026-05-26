import  express   from 'express';
import dotenv from 'dotenv'
import cors from 'cors'
import { createServer } from 'node:http';
import {Server} from 'socket.io'
import { authRouter } from './routes/auth.routes';
import { WorkspaceRouter } from './routes/workspace.routes';
import {boardRouter} from './routes/board.routes'
import {messageRouter} from './routes/message.routes'
import
