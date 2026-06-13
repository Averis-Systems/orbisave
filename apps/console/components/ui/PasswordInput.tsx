'use client'

import React, { useState } from 'react'
import { Eye, EyeOff, Lock, Check, X } from 'lucide-react'

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  showStrength?: boolean
}

export const PasswordInput: React.FC<PasswordInputProps> = ({ 
  label = 'Password', 
  error, 
  showStrength = false,
  value = '',
  onChange,
  ...props 
}) => {
  const [show, setShow] = useState(false)
  const password = String(value)

  const getStrength = (val: string) => {
    let strength = 0
    if (val.length >= 8) strength++
    if (/[A-Z]/.test(val)) strength++
    if (/[0-9]/.test(val)) strength++
    if (/[^A-Za-z0-9]/.test(val)) strength++
    return strength
  }

  const strength = getStrength(password)
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong']
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-primary']

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-white/80">{label}</label>}
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          {...props}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          className={`w-full bg-white/5 border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-lg py-3 pl-10 pr-10 text-white placeholder:text-white/20 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all`}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {showStrength && password.length > 0 && (
        <div className="space-y-2">
          <div className="flex gap-1 h-1">
            {[1, 2, 3, 4].map((step) => (
              <div 
                key={step} 
                className={`flex-1 rounded-full transition-all duration-500 ${step <= strength ? strengthColors[strength - 1] : 'bg-white/10'}`} 
              />
            ))}
          </div>
          <div className="flex justify-between items-center text-[10px] text-white/40 uppercase tracking-wider font-bold">
            <span>Security Strength</span>
            <span className={strength > 0 ? strengthColors[strength - 1].replace('bg-', 'text-') : ''}>
              {strengthLabels[strength - 1] || 'Very Weak'}
            </span>
          </div>
        </div>
      )}
      
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}
