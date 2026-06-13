import React from 'react'

interface LogoProps {
  className?: string
  iconOnly?: boolean
  light?: boolean
}

export const Logo: React.FC<LogoProps> = ({ className = '', iconOnly = false, light = false }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center w-10 h-10 overflow-hidden rounded-lg bg-gradient-to-br from-primary to-[#008000] shadow-lg shadow-primary/20">
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          className="w-6 h-6 text-white" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      {!iconOnly && (
        <span className={`text-2xl font-bold tracking-tight ${light ? 'text-white' : 'text-navy'}`}>
          Orbi<span className="text-primary">Save</span>
        </span>
      )}
    </div>
  )
}
