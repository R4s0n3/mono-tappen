'use client'

import { useState } from "react"

export function SettingsNav(){
    const [isSettingsMode, setIsSettingsMode] = useState(false)

    return <div className={`${isSettingsMode ? "w-3/4 max-w-xs bg-tappen-blue-900/90" : ""} hidden fixed z-50 top-0 right-0 lg:flex justify-start items-center`}>
    <button onClick={() => setIsSettingsMode(prev => !prev)} className="w-full lg:h-screen flex justify-end items-start p-8">
       
        </button>
    </div>
}