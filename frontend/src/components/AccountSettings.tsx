import React from 'react'
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';

const AccountSettings = () => {
  const navigate = useNavigate();
  return (
    <div className="absolute top-5 right-6 z-50">
      <button
        onClick={() => navigate('/profile')}
        className="bg-[#141414] border border-white/[0.15] rounded-xl shadow-2xl p-2.5 cursor-pointer group transition-all duration-200 hover:bg-white/[0.06] hover:border-white/[0.25] flex items-center justify-center"
      >
        <User className="w-4 h-4 text-neutral-400 group-hover:text-neutral-200 transition-colors" />
      </button>
    </div>
  )
}
export default AccountSettings