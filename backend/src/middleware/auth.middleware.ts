import { Request,Response,NextFunction } from "express";
import { verifyToken } from "../lib/jwt";


export interface AuthRequest extends Request{
    user?:{
        userId:string
        email:string
    }
}

export function protect(req:AuthRequest,res:Response,next:NextFunction){
    try{
        const authHeader= req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')){
            return res.status(401).json({message:'Unauthorized'})
        }
        const token = authHeader.split(' ')[1]

        const decoded = verifyToken(token)

        req.user=decoded
        next()
    }catch{
        return res.status(401).json({message:'Invalid Token'})
    }
}