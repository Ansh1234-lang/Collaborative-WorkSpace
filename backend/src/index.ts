import express from "express";
import {createServer}from 'http'
import { Server } from "socket.io";
import cors from 'cors'
import dotenv from 'dotenv'

import { authRouter } from "./routes/auth.routes";
import { workspaceRouter } from "./routes/workspace.routes";
import { boardRouter } from "./routes/board.routes";
import { messageRouter } from "./routes/board.routes";
import { errorHandler } from "./middleware/error.middleware";
import { registerSocketHandlers } from "./lib/socket";


dotenv.config()

const app = express()
const httpserver  = createServer(app)

// socket.io setup
const io = new Server(httpserver,{
    cors:{
        origin : process.env.CLIENT_URL || 'http://localhost:3000',
        methods:['GET','POST'],
        credentials:true,
    }
})

// express Middleware
app.use(cors({
    origin:process.env.CLIENT_URL || 'http://localhost:4000',
    credentials:true,
}))

app.use(express.json())

// REST ROUTEs

app.use('/api/auth',authRouter)
app.use('/api/workspaces',workspaceRouter)
app.use('/api/boards',boardRouter)
app.use('/api/messages',messageRouter)

// health check - useful when deploying
app.get('/health',(_res,res)=>{
    res.json({status:'ok',timeStamp:new Date().toISOString()})
})

// global error handler - always last
app.use(errorHandler)



registerSocketHandlers(io)

// start server

const PORT = process.env.PORT || 4000
httpserver.listen(PORT,()=>{
    console.log(`server running on port ${PORT}`)
    console.log(`socket.io ready`)
})

export {io}