import React from 'react';
import PropTypes from 'prop-types';
import Card from './Card';

const StatCard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  trendLabel,
  color = 'blue',
  isLoading = false,
  onClick,
  className = '',
  ...props 
}) => {
  const colorClasses = {
    blue: {
      accent: 'bg-blue-500',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      trendPositive: 'text-green-600',
      trendNegative: 'text-red-600'
    },
    green: {
      accent: 'bg-green-500',
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      trendPositive: 'text-green-600',
      trendNegative: 'text-red-600'
    },
    yellow: {
      accent: 'bg-yellow-500',
      iconBg: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      trendPositive: 'text-green-600',
      trendNegative: 'text-red-600'
    },
    red: {
      accent: 'bg-red-500',
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
      trendPositive: 'text-green-600',
      trendNegative: 'text-red-600'
    },
    indigo: {
      accent: 'bg-indigo-500',
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      trendPositive: 'text-green-600',
      trendNegative: 'text-red-600'
    },
    purple: {
      accent: 'bg-purple-500',
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      trendPositive: 'text-green-600',
      trendNegative: 'text-red-600'
    }
  };

  const colors = colorClasses[color] || colorClasses.blue;
  const trendColor = trend >= 0 ? colors.trendPositive : colors.trendNegative;

  return (
    <Card 
      className={`relative overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-lg' : ''} ${className}`}
      onClick={onClick}
      hover={!!onClick}
      {...props}
    >
      {/* Accent bar */}
      <div className={`absolute top-0 left-0 w-1 h-full ${colors.accent}`} />
      
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-gray-600 text-sm font-medium mb-2">
            {title}
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {isLoading ? (
              <div className="animate-pulse bg-gray-200 h-8 w-20 rounded" />
            ) : (
              typeof value === 'number' ? value.toLocaleString() : value
            )}
          </div>
          {(trend !== undefined || trendLabel) && (
            <div className="flex items-center gap-1 text-xs">
              {trend !== undefined && (
                <>
                  {trend >= 0 ? (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L10 4.414 4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L10 15.586l5.293-5.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className={trendColor}>
                    {trend >= 0 ? '+' : ''}{trend}%
                  </span>
                </>
              )}
              {trendLabel && (
                <span className="text-gray-500 ml-1">
                  {trendLabel}
                </span>
              )}
            </div>
          )}
        </div>
        
        {icon && (
          <div className={`w-12 h-12 ${colors.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
            <div className={colors.iconColor}>
              {React.cloneElement(icon, { size: 24 })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

StatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.element,
  trend: PropTypes.number,
  trendLabel: PropTypes.string,
  color: PropTypes.oneOf(['blue', 'green', 'yellow', 'red', 'indigo', 'purple']),
  isLoading: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string
};

export default StatCard;