'use client';

import * as React from 'react';
import { MoreVertical } from 'lucide-react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    Copy01Icon,
    Delete02Icon,
    FavouriteIcon,
    PencilEdit02Icon,
    Share01Icon,
} from '@hugeicons/core-free-icons';
import {
    AnimatePresence,
    LayoutGroup,
    motion,
    type Transition,
    type Variants,
} from 'motion/react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

export interface MenuItemProps {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    className?: string;
}

export interface InlineDisclosureMenuProps {
    menuItems?: MenuItemProps[];
    showDelete?: boolean;
    onDelete?: () => void;
    trigger?: React.ReactNode;
    contentClassName?: string;
    className?: string;
}

const spring: Transition = {
    type: 'spring',
    bounce: 0,
    duration: 0.25,
};

// FIX: Animate on the Y-axis so it drops down from underneath the trigger
const menuVariants: Variants = {
    hidden: { opacity: 0, scale: 0.96, y: -6 },
    visible: { opacity: 1, scale: 1, y: 0, transition: spring },
};

const deleteVariants: Variants = {
    initial: (confirm: boolean) => ({ y: confirm ? 40 : -40 }),
    animate: { y: 0, transition: spring },
    exit: (confirm: boolean) => ({ y: confirm ? -40 : 40, transition: spring }),
};

const confirmVariants: Variants = {
    initial: (confirm: boolean) => ({ y: confirm ? 40 : -40 }),
    animate: { y: 0, transition: spring },
    exit: (confirm: boolean) => ({ y: confirm ? -40 : 40, transition: spring }),
};

const MenuItem: React.FC<MenuItemProps> = ({
    icon,
    label,
    onClick,
    className = '',
}) => (
    <button
        onClick={(e) => {
            e.stopPropagation();
            onClick?.();
        }}
        className={cn(
            "text-gray-200 hover:bg-[#0A0A0A] hover:text-white flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
            className
        )}
    >
        <span className="text-gray-400 flex items-center justify-center">{icon}</span>
        <span className="font-medium tracking-tight">
            {label}
        </span>
    </button>
);

export function InlineDisclosureMenu({
    menuItems = [
        { icon: <HugeiconsIcon icon={PencilEdit02Icon} size={18} />, label: 'Edit' },
        { icon: <HugeiconsIcon icon={Copy01Icon} size={18} />, label: 'Duplicate' },
        { icon: <HugeiconsIcon icon={FavouriteIcon} size={18} />, label: 'Favourite' },
        { icon: <HugeiconsIcon icon={Share01Icon} size={18} />, label: 'Share' },
    ],
    showDelete = true,
    onDelete,
    trigger,
    contentClassName,
    className,
}: InlineDisclosureMenuProps) {
    const [open, setOpen] = React.useState(false);
    const [confirm, setConfirm] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const [position, setPosition] = React.useState({ top: 0, left: 0 });
    const ref = React.useRef<HTMLDivElement>(null);
    const contentRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        setMounted(true);
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                if (contentRef.current && contentRef.current.contains(e.target as Node)) return;

                setOpen(false);
                setConfirm(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    React.useEffect(() => {
        if (open && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            // FIX: Position underneath the button (rect.bottom) and align to its left edge (rect.left)
            setPosition({
                top: rect.bottom + 4, // 4px gap below the dots
                left: rect.left
            });
        }
    }, [open]);

    const toggleOpen = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setOpen((v) => !v);
        if (open) setConfirm(false);
    };

    return (
        // ADDED: data-state attribute so Tailwind's group-has can detect when this is open
        <div className={cn("relative", className)} data-state={open ? "open" : "closed"}>
            <div ref={ref} className="relative">
                {trigger ? (
                    <div onClick={toggleOpen} className="cursor-pointer flex items-center justify-center">
                        {trigger}
                    </div>
                ) : (
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleOpen}
                        className="border-[#0A0A0A] bg-[#151414] text-muted-foreground flex h-8 w-8 items-center justify-center rounded-md border hover:bg-[#0A0A0A]"
                    >
                        <MoreVertical className="h-4 w-4" />
                    </motion.button>
                )}

                {mounted && createPortal(
                    <AnimatePresence>
                        {open && (
                            <motion.div
                                key="menu-content"
                                ref={contentRef}
                                role="menu"
                                data-menu-portal
                                variants={menuVariants}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                style={{
                                    position: 'fixed',
                                    top: position.top,
                                    left: position.left,
                                    zIndex: 9999,
                                }}
                                className={cn(
                                    // FIX: Changed origin to top-left so it expands downward and rightward
                                    "bg-[#1C1B1B] border-[#0A0A0A] overflow-hidden rounded-md border shadow-2xl w-[200px] origin-top-left",
                                    contentClassName
                                )}
                            >
                                <LayoutGroup>
                                    <div className="flex flex-col p-1.5 gap-0.5">
                                        {menuItems.map((item, i) => (
                                            <MenuItem key={i} {...item} />
                                        ))}
                                    </div>

                                    {showDelete && (
                                        <div className="border-[#0A0A0A] relative h-[48px] overflow-hidden border-t">
                                            <AnimatePresence
                                                custom={confirm}
                                                mode="popLayout"
                                                initial={false}
                                            >
                                                {!confirm ? (
                                                    <motion.div
                                                        key="delete"
                                                        custom={confirm}
                                                        variants={deleteVariants}
                                                        initial="initial"
                                                        animate="animate"
                                                        exit="exit"
                                                        className="absolute inset-0 flex items-center px-1.5"
                                                    >
                                                        <MenuItem
                                                            icon={
                                                                <HugeiconsIcon
                                                                    icon={Delete02Icon}
                                                                    size={18}
                                                                    className="text-red-500"
                                                                />
                                                            }
                                                            label="Delete"
                                                            className="text-red-500 hover:bg-[#0A0A0A] hover:text-red-400 cursor-pointer"
                                                            onClick={() => setConfirm(true)}
                                                        />
                                                    </motion.div>
                                                ) : (
                                                    <motion.div
                                                        key="confirm"
                                                        custom={confirm}
                                                        variants={confirmVariants}
                                                        initial="initial"
                                                        animate="animate"
                                                        exit="exit"
                                                        className="absolute inset-0 flex items-center gap-1.5 px-2 py-1.5"
                                                    >
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDelete?.();
                                                                setOpen(false);
                                                            }}
                                                            className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex-1 cursor-pointer rounded-sm text-xs font-semibold h-full transition-colors"
                                                        >
                                                            Confirm
                                                        </button>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConfirm(false);
                                                            }}
                                                            className="bg-transparent hover:bg-[#0A0A0A] text-gray-300 flex-1 cursor-pointer rounded-sm text-xs font-medium h-full transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </LayoutGroup>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
            </div>
        </div>
    );
}