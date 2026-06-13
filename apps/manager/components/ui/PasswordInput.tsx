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
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          {...props}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          className={`w-full bg-white border ${error ? 'border-red-500' : 'border-slate-200'} rounded-lg py-3 pl-10 pr-10 text-navy placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all`}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {showStrength && password.length > 0 && (
        <div className="space-y-2">
          <div className="flex gap-1.5 h-1">
            {[1, 2, 3, 4].map((step) => (
              <div 
                key={step} 
                className={`flex-1 rounded-full transition-all duration-500 ${step <= strength ? strengthColors[strength - 1] : 'bg-slate-100'}`} 
              />
            ))}
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            <span>Security Strength</span>
            <span className={strength > 0 ? strengthColors[strength - 1].replace('bg-', 'text-') : ''}>
              {strengthLabels[strength - 1] || 'Very Weak'}
            </span>
          </div>
        </div>
      )}
      
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}
