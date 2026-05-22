"use client";

import type { User } from "@/lib/types";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";
import { useLanguage } from "@/lib/LanguageContext";

type TopBarProps = {
  user: User;
  onMenuClick?: () => void;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
};

export default function TopBar({
  user,
  onMenuClick = () => {},
  title,
  showBack,
  onBack,
}: TopBarProps) {
  const router = useRouter();
  const { language } = useLanguage();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  // Translated role names
  const roleLabel = language === 'km'
    ? user.role === 'Admin'
      ? 'អ្នកគ្រប់គ្រង'
      : user.role === 'Accounting'
      ? 'គណនេយ្យ'
      : 'បុគ្គលិក'
    : user.role;

  return (
    <header className="sticky top-0 z-[200] bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm print:hidden">
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-4 max-w-[1920px] mx-auto">
        {/* Left Section - Menu/Back + Title */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {showBack ? (
            <button
              type="button"
              onClick={handleBack}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={language === 'km' ? 'ត្រឡប់ក្រោយ' : 'Go back'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-gray-700 dark:text-gray-300"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={language === 'km' ? 'បើកម៉ឺនុយ' : 'Open menu'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-gray-700 dark:text-gray-300"
              >
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            </button>
          )}

          {title && (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
              {title}
            </h1>
          )}
        </div>

        {/* Center Section - Logo & Brand */}
        {!title && (
          <div className="flex items-center gap-3 absolute left-1/2 transform -translate-x-1/2">
            <div className="relative h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-white">
              <Image
                src="/logo.png"
                alt="Emerald Cash"
                width={32}
                height={32}
                className="h-7 w-7 object-contain"
                priority
              />
            </div>
            <div className="hidden sm:block text-center">
              <div className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                {language === 'km' ? 'អេមើរ៉ល ឃែស' : 'Emerald Cash'}
              </div>
              <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                {language === 'km' ? 'ប្រព័ន្ធគ្រប់គ្រងយានយន្ត' : 'Vehicle Management'}
              </div>
            </div>
          </div>
        )}

        {/* Right Section - User Info */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* User Role Badge */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">
              {roleLabel}
            </span>
          </div>

          {/* User Name */}
          <div className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
            {user.username}
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={() => router.push("/logout")}
            className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            aria-label={language === 'km' ? 'ចាកចេញ' : 'Logout'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
