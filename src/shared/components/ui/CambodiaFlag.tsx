import React from 'react';

interface CambodiaFlagProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { width: 20, height: 14 },
  md: { width: 36, height: 24 },
  lg: { width: 48, height: 32 },
};

export const CambodiaFlag: React.FC<CambodiaFlagProps> = ({ 
  className = '',
  size = 'md'
}) => {
  const { width, height } = sizeMap[size];
  
  return (
    <>
      { }
      <img
        src="https://flagcdn.com/kh.svg"
        alt="Cambodia Flag"
        loading="lazy"
        width={width}
        height={height}
        className={`object-cover rounded-sm shadow-sm border-[0.5px] border-slate-200 ${className}`}
      />
    </>
  );
};

export default CambodiaFlag;
