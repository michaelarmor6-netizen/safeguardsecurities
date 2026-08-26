import { useState } from 'react';

export interface ContactSupportOptions {
  subject?: string;
  category?: 'account_opening' | 'technical' | 'transactions' | 'security' | 'billing' | 'general';
  message?: string;
}

export const useContactSupport = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalOptions, setModalOptions] = useState<ContactSupportOptions>({});

  const openContactModal = (options: ContactSupportOptions = {}) => {
    setModalOptions(options);
    setIsModalOpen(true);
  };

  const closeContactModal = () => {
    setIsModalOpen(false);
    setModalOptions({});
  };

  return {
    isModalOpen,
    modalOptions,
    openContactModal,
    closeContactModal
  };
};

export default useContactSupport;