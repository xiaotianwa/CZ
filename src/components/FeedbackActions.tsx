'use client';

import { useState } from 'react';
import { HelpCircle, Lightbulb } from 'lucide-react';
import { FeedbackModal, type FeedbackType } from '@/components/Footer';

export default function FeedbackActions() {
  const [modalType, setModalType] = useState<FeedbackType>('suggestion');
  const [open, setOpen] = useState(false);

  const showModal = (type: FeedbackType) => {
    setModalType(type);
    setOpen(true);
  };

  return (
    <>
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => showModal('suggestion')}
          className="btn-primary inline-flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Lightbulb className="w-4 h-4" />
          提交建议
        </button>
        <button
          type="button"
          onClick={() => showModal('question')}
          className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-btn border border-border bg-white text-body font-medium text-text-body hover:border-primary hover:text-primary transition-colors duration-150 w-full sm:w-auto"
        >
          <HelpCircle className="w-4 h-4" />
          我要提问
        </button>
      </div>

      <FeedbackModal open={open} onClose={() => setOpen(false)} defaultType={modalType} />
    </>
  );
}
