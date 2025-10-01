"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { User } from "@supabase/supabase-js";
import { signOut } from "@/lib/actions/auth-actions";

interface UserMenuProps {
  user: User;
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("已登出");
      router.push("/login");
      router.refresh();
    } catch (_error) {
      toast.error("登出失败");
    }
  };

  return (
    <div className="relative" ref={menuRef} data-testid="user-menu">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        data-testid="user-menu-button"
      >
        <div
          className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-medium"
          data-testid="user-avatar"
        >
          {user.email?.[0]?.toUpperCase()}
        </div>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          data-testid="user-menu-dropdown"
        >
          <div className="px-4 py-2 border-b border-gray-100">
            <p
              className="text-sm font-medium text-gray-900 truncate"
              data-testid="user-email-display"
            >
              {user.email}
            </p>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            data-testid="signout-button"
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
