import React from 'react';

interface UKFlagProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { width: 20, height: 14 },
  md: { width: 36, height: 24 },
  lg: { width: 48, height: 32 },
};

export const UKFlag: React.FC<UKFlagProps> = ({ 
  className = '',
  size = 'md'
}) => {
  const { width, height } = sizeMap[size];
  
  return (
    <>
      { }
      <img
        src="https://flagcdn.com/gb.svg"
        alt="UK Flag"
        loading="lazy"
        width={width}
        height={height}
        className={`object-cover rounded-sm shadow-sm border-[0.5px] border-slate-200 ${className}`}
      />
    </>
  );
};

export default UKFlag;
