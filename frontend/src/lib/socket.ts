import { io,Socket } from "socket.io-client";

let socket : Socket | null = null


export function getSocket():Socket{
    if (!socket){
        socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'),{
            authConnect:false,
            auth:{
                token : typeof window !== 'undefined'?localStorage.getItem('token'):null,
            }
        }
    }
    return socket
}

export function connectSocket (token :string):Socket{
    const s = getSocket()
    s.auth = {token}

    if (!s.connected){
        s.connect()
    }
    return s
}

export function disconnectSocket(){
    if (socket?.connected){
        socket.disconnect()
        socket = null
    }
}