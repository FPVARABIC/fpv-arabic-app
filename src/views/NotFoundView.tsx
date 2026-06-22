import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

export const NotFoundView: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4 fade-in">
        <p className="text-6xl">🚁</p>
        <h1 className="text-2xl font-bold text-white">الصفحة غير موجودة</h1>
        <p className="text-slate-400">هذه الصفحة لم تُعثر عليها</p>
        <button className="btn-primary" onClick={() => navigate('/home')}><Home size={18}/>العودة للرئيسية</button>
      </div>
    </div>
  );
};
