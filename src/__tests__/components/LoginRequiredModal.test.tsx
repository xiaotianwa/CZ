import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LoginRequiredModal from '@/components/LoginRequiredModal';
import { useRouter } from 'next/navigation';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginRequiredModal', () => {
  it('test_modal_hiddenWhenOpenIsFalse', () => {
    render(<LoginRequiredModal open={false} redirectTo="/community" onCancel={vi.fn()} />);
    expect(screen.queryByText('需要登录')).toBeNull();
  });

  it('test_modal_visibleWhenOpenIsTrue', () => {
    render(<LoginRequiredModal open={true} redirectTo="/community" onCancel={vi.fn()} />);
    expect(screen.getByText('需要登录')).toBeInTheDocument();
    expect(screen.getByText('请先登录后再进行此操作')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '去登录' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();
  });

  it('test_modal_clickCancel_callsOnCancel', () => {
    const onCancel = vi.fn();
    render(<LoginRequiredModal open={true} redirectTo="/community" onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('test_modal_clickConfirm_navigatesToLoginWithRedirect', () => {
    const onCancel = vi.fn();
    render(<LoginRequiredModal open={true} redirectTo="/community" onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: '去登录' }));
    expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2Fcommunity');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('test_modal_clickBackdrop_callsOnCancel', () => {
    const onCancel = vi.fn();
    const { container } = render(<LoginRequiredModal open={true} redirectTo="/community" onCancel={onCancel} />);
    const backdrop = container.querySelector('.absolute.inset-0') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('test_modal_redirectTo_usesDefaultWhenNotProvided', () => {
    const onCancel = vi.fn();
    render(<LoginRequiredModal open={true} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: '去登录' }));
    expect(mockPush).toHaveBeenCalledWith('/login?redirect=%2F');
  });
});
