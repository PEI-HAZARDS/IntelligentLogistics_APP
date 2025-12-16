import { Loader2 } from 'lucide-react';

interface ConfirmButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
}

const ConfirmButton = ({ className, isLoading, children, ...props }: ConfirmButtonProps) => {
    return (
        <button
            className={`btn-primary w-full text-lg py-4 flex items-center justify-center gap-2 ${className || ''}`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading ? (
                <>
                    <Loader2 size={20} className="animate-spin" />
                    Confirming...
                </>
            ) : (
                children || 'Confirm Delivery'
            )}
        </button>
    );
};

export default ConfirmButton;
