/**
 * Keyboard shortcuts modal component
 */

import { motion, AnimatePresence } from 'framer-motion';

interface ShortcutsModalProps {
    show: boolean;
}

export function ShortcutsModal({ show }: ShortcutsModalProps) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-50 max-w-sm"
                >
                    <h3 className="font-semibold mb-2">Keyboard Shortcuts</h3>
                    <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-300">
                        <li>
                            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">I</kbd>
                            {' '}Switch to itinerary (mobile)
                        </li>
                        <li>
                            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">C</kbd>
                            {' '}Switch to chat (mobile)
                        </li>
                        <li>
                            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">?</kbd>
                            {' '}Toggle shortcuts
                        </li>
                    </ul>
                </motion.div>
            )}
        </AnimatePresence>
    );
}