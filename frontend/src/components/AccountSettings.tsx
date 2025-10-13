import React from 'react'
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';

const AccountSettings = () => {
  const navigate = useNavigate();
  return (
    <div className="absolute top-6 right-6 flex items-center gap-10 z-50">
        <User className="size-10 bg-[#19191A] p-2 text-white cursor-pointer border border-gray-500 rounded-lg hover:text-violet-500  hover:border-violet-500 hover:bg-violet-500/10" onClick={() => navigate('/profile')} />
    </div>
  )
}
export default AccountSettings