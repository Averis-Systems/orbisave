import React from 'react'

interface LogoProps {
  className?: string
  iconOnly?: boolean
  light?: boolean
}

export const Logo: React.FC<LogoProps> = ({ className = '', iconOnly = false, light = false }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#00ab00]">
        <span className="text-lg font-black leading-none text-white">O</span>
      </div>
      {!iconOnly && (
        <span className={`text-2xl font-bold tracking-tight ${light ? 'text-white' : 'text-navy'}`}>
          Orbi<span className="text-primary">Save</span>
        </span>
      )}
    </div>
  )
}
