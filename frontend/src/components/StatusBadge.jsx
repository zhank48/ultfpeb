import React from 'react';
import PropTypes from 'prop-types';
import { CheckCircle, Clock, XCircle, AlertTriangle, User } from 'lucide-react';

const StatusBadge = ({ 
  status, 
  variant = 'default',
  size = 'medium',
  showIcon = true,
  className = '',
  ...props 
}) => {
  const statusConfig = {
    active: {
      icon: Clock,
      label: 'Active',
      classes: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    completed: {
      icon: CheckCircle,
      label: 'Completed',
      classes: 'bg-green-50 text-green-700 border-green-200'
    },
    checked_out: {
      icon: CheckCircle,
      label: 'Checked Out',
      classes: 'bg-green-50 text-green-700 border-green-200'
    },
    checked_in: {
      icon: Clock,
      label: 'Checked In',
      classes: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    pending: {
      icon: Clock,
      label: 'Pending',
      classes: 'bg-yellow-50 text-yellow-700 border-yellow-200'
    },
    cancelled: {
      icon: XCircle,
      label: 'Cancelled',
      classes: 'bg-red-50 text-red-700 border-red-200'
    },
    rejected: {
      icon: XCircle,
      label: 'Rejected',
      classes: 'bg-red-50 text-red-700 border-red-200'
    },
    approved: {
      icon: CheckCircle,
      label: 'Approved',
      classes: 'bg-green-50 text-green-700 border-green-200'
    },
    open: {
      icon: AlertTriangle,
      label: 'Open',
      classes: 'bg-red-50 text-red-700 border-red-200'
    },
    in_progress: {
      icon: Clock,
      label: 'In Progress',
      classes: 'bg-yellow-50 text-yellow-700 border-yellow-200'
    },
    resolved: {
      icon: CheckCircle,
      label: 'Resolved',
      classes: 'bg-green-50 text-green-700 border-green-200'
    },
    found: {
      icon: CheckCircle,
      label: 'Found',
      classes: 'bg-green-50 text-green-700 border-green-200'
    },
    returned: {
      icon: User,
      label: 'Returned',
      classes: 'bg-blue-50 text-blue-700 border-blue-200'
    }
  };

  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    medium: 'px-3 py-1 text-sm',
    large: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    small: 12,
    medium: 14,
    large: 16
  };

  const config = statusConfig[status] || statusConfig.pending;
  const IconComponent = config.icon;

  return (
    <span 
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium
        ${sizeClasses[size]}
        ${config.classes}
        ${className}
      `}
      {...props}
    >
      {showIcon && <IconComponent size={iconSizes[size]} />}
      {variant === 'label-only' ? config.label : status}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(['default', 'label-only']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  showIcon: PropTypes.bool,
  className: PropTypes.string
};

export default StatusBadge;