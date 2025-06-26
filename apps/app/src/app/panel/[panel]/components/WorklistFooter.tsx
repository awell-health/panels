'use client'

import { StorageStatusIndicator } from '@/components/StorageStatusIndicator';
import { History, Home, MessageSquare, RotateCcw } from 'lucide-react';

interface WorklistFooterProps {
    columnsCounter: number;
    rowsCounter: number;
    isAISidebarOpen: boolean;
    navigateToHome: () => void;
}

export default function WorklistFooter({ columnsCounter, rowsCounter, isAISidebarOpen, navigateToHome }: WorklistFooterProps) {
    return (
        <div className="border-t border-gray-200 p-2 flex items-center justify-between bg-white">
            <div className="flex items-center space-x-3">
                <button
                    type="button"
                    className="btn text-xs font-normal h-8 px-2 flex items-center text-gray-700"
                    onClick={navigateToHome}
                >
                    <Home className="mr-1 h-3 w-3" />
                    Home
                </button>

                {/* Moved columns and rows buttons here */}
                <button
                    type="button"
                    className="btn text-xs font-normal h-8 px-2 flex items-center text-gray-700"
                >
                    {`${columnsCounter} columns`}
                </button>
                <button
                    type="button"
                    className="btn text-xs font-normal h-8 px-2 flex items-center text-gray-700"
                >
                    {`${rowsCounter} rows`}
                </button>
            </div>
            <div className="flex items-center space-x-2 relative">
                <button
                    type="button"
                    className="btn text-xs font-normal h-8 px-2 flex items-center text-gray-700"
                >
                    <History className="mr-1 h-3 w-3" /> View table history
                </button>
                <button
                    type="button"
                    className="btn text-xs font-normal h-8 px-2 flex items-center text-gray-700"
                >
                    <RotateCcw className="h-3 w-3" />
                </button>

                {/* AI Assistant Button */}
                <button
                    type="button"
                    className={`btn text-xs font-normal h-8 px-2 flex items-center justify-center ${isAISidebarOpen ? "bg-blue-500 text-white" : "text-gray-700"}`}
                    title="AI Assistant"
                >
                    <MessageSquare className="h-3 w-3" />
                </button>

                {/* Storage Status Indicator */}
                <StorageStatusIndicator />
            </div>
        </div>
    )
}