import { Router } from "express";
import {login,register,getMe} from '../controllers/auth.controller'
import {authenticate} from '../middleware/auth.middleware'


export const authRouter = Router()

authRouter.post('/register',register)
authRouter.post('/login',login)
authRouter.get('/me',authenticate,getMe) //Protected - required JWT