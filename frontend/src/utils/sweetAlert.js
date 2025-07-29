import Swal from 'sweetalert2';

// SweetAlert2 configuration for the ULT FPEB project
const swalConfig = {
  customClass: {
    popup: 'swal2-popup-custom',
    title: 'swal2-title-custom',
    content: 'swal2-content-custom',
    confirmButton: 'swal2-confirm-custom',
    cancelButton: 'swal2-cancel-custom'
  },
  buttonsStyling: false,
  allowOutsideClick: false,
  allowEscapeKey: true,
  allowEnterKey: true
};

// Toast configuration for quick notifications
const toastConfig = {
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
};

export const sweetAlert = {
  // Generic alert function for flexible usage
  alert: (options) => {
    const {
      title = 'Notifikasi',
      message = '',
      text = message, // fallback for text
      type = 'info',
      showCancelButton = false,
      confirmText = 'OK',
      cancelText = 'Batal',
      inputPlaceholder = '',
      input = type === 'input' ? 'text' : undefined
    } = options;

    const config = {
      ...swalConfig,
      title,
      text,
      showCancelButton,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText
    };

    // Handle different types
    switch (type) {
      case 'success':
        config.icon = 'success';
        config.confirmButtonColor = '#198754';
        break;
      case 'error':
        config.icon = 'error';
        config.confirmButtonColor = '#dc3545';
        break;
      case 'warning':
        config.icon = 'warning';
        config.confirmButtonColor = '#ffc107';
        break;
      case 'input':
        config.input = 'text';
        config.inputPlaceholder = inputPlaceholder;
        config.showCancelButton = true;
        config.icon = 'question';
        config.confirmButtonColor = '#0d6efd';
        config.cancelButtonColor = '#6c757d';
        break;
      default:
        config.icon = 'info';
        config.confirmButtonColor = '#0dcaf0';
    }

    if (type === 'input') {
      return Swal.fire(config).then((result) => {
        if (result.isConfirmed) {
          return result.value;
        }
        return null;
      });
    }

    return Swal.fire(config);
  },

  // Success alert
  success: (message, title = 'Berhasil!') => {
    return Swal.fire({
      ...swalConfig,
      icon: 'success',
      title,
      text: message,
      confirmButtonText: 'OK',
      confirmButtonColor: '#198754'
    });
  },

  // Error alert
  error: (message, title = 'Error!') => {
    return Swal.fire({
      ...swalConfig,
      icon: 'error',
      title,
      text: message,
      confirmButtonText: 'OK',
      confirmButtonColor: '#dc3545'
    });
  },

  // Warning alert
  warning: (message, title = 'Peringatan!') => {
    return Swal.fire({
      ...swalConfig,
      icon: 'warning',
      title,
      text: message,
      confirmButtonText: 'OK',
      confirmButtonColor: '#ffc107'
    });
  },

  // Info alert
  info: (message, title = 'Informasi') => {
    return Swal.fire({
      ...swalConfig,
      icon: 'info',
      title,
      text: message,
      confirmButtonText: 'OK',
      confirmButtonColor: '#0dcaf0'
    });
  },

  // Confirm dialog
  confirm: (message, options = {}) => {
    const {
      title = 'Konfirmasi',
      confirmButtonText = 'Ya',
      cancelButtonText = 'Batal',
      icon = 'question'
    } = options;

    return Swal.fire({
      ...swalConfig,
      icon,
      title,
      text: message,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
      confirmButtonColor: '#0d6efd',
      cancelButtonColor: '#6c757d',
      reverseButtons: true
    }).then((result) => result.isConfirmed);
  },

  // Toast notifications (quick notifications)
  toast: {
    success: (message) => {
      return Swal.fire({
        ...toastConfig,
        icon: 'success',
        title: message
      });
    },

    error: (message) => {
      return Swal.fire({
        ...toastConfig,
        icon: 'error',
        title: message
      });
    },

    warning: (message) => {
      return Swal.fire({
        ...toastConfig,
        icon: 'warning',
        title: message
      });
    },

    info: (message) => {
      return Swal.fire({
        ...toastConfig,
        icon: 'info',
        title: message
      });
    }
  },

  // Loading indicator
  loading: (message = 'Memproses...') => {
    return Swal.fire({
      title: message,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  },

  // Close any open Swal
  close: () => {
    Swal.close();
  }
};

// Global override for backward compatibility
export const globalSweetAlert = () => {
  // Override global alert function
  window.alert = (message) => {
    sweetAlert.info(message);
  };

  // Override global confirm function
  window.confirm = (message) => {
    return sweetAlert.confirm(message);
  };
};

export default sweetAlert;
