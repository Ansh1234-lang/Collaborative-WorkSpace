'use client'

import { useEffect } from "react";
import { useAuthStore } from "@/src/store/auth.store";


export function AuthProvider({children}:{children:React.ReactNode}){
    const initialize = useAuthStore((state)=>state.initialize)

    useEffect(()=>{
        initialize()
    },[])

    return<>{children}</>
}

// loginpage.tsx
// registerpage.tsx
// dashboardpage.tsx
// kanbanBoard.tsx
// kanbanColumn.tsx
// Carditem.tsx
// chatPanel.tsx
