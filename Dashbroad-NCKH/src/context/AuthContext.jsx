import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import initialWhitelist from '../data/whitelist.json';

// Khởi tạo Context
const AuthContext = createContext(null);

const STORAGE_USER_KEY = 'ctump_auth_user';
const STORAGE_CLIENT_ID_KEY = 'ctump_google_client_id';
const STORAGE_WHITELIST_KEY = 'ctump_auth_whitelist';

/**
 * Hàm giải mã JWT an toàn hỗ trợ đầy đủ ký tự UTF-8 (tiếng Việt có dấu)
 */
export function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Lỗi giải mã Google ID Token:', error);
    return null;
  }
}

export function AuthProvider({ children }) {
  // Lấy Client ID từ file .env, biến môi trường Cloudflare hoặc Client ID mặc định
  const DEFAULT_CLIENT_ID = '155584685837-ggv7pj77tb2r1entrs988ocg5qvmpp4t.apps.googleusercontent.com';
  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;
  const [clientId, setClientId] = useState(() => {
    const saved = localStorage.getItem(STORAGE_CLIENT_ID_KEY);
    return saved || envClientId;
  });

  // State thông tin người dùng
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_USER_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // State danh sách phân quyền (Whitelist)
  const [whitelist, setWhitelist] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_WHITELIST_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const fileTime = new Date(initialWhitelist.lastUpdated || 0).getTime();
        const savedTime = new Date(parsed.lastUpdated || 0).getTime();

        // 1. Nếu file whitelist.json trong mã nguồn mới hơn hoặc bằng bản lưu trình duyệt,
        // hoặc superAdmin trong mã nguồn đã thay đổi, hoặc cache không đúng định dạng:
        // -> Luôn ưu tiên dùng file whitelist.json của mã nguồn và đồng bộ lại cache
        const isFileNewerOrEqual = fileTime >= savedTime;
        const isSuperAdminChanged = Boolean(
          initialWhitelist.superAdmin && initialWhitelist.superAdmin !== parsed.superAdmin
        );

        if (isFileNewerOrEqual || isSuperAdminChanged || !Array.isArray(parsed.delegatedEmails)) {
          localStorage.setItem(STORAGE_WHITELIST_KEY, JSON.stringify(initialWhitelist));
          return initialWhitelist;
        }

        // 2. Nếu cache trình duyệt mới hơn (do người dùng vừa chỉnh sửa tạm thời trên giao diện):
        return {
          ...initialWhitelist,
          ...parsed,
          superAdmin: initialWhitelist.superAdmin || parsed.superAdmin,
          delegatedEmails: Array.isArray(parsed.delegatedEmails) && parsed.delegatedEmails.length > 0
            ? parsed.delegatedEmails
            : (initialWhitelist.delegatedEmails || []),
          lastUpdated: parsed.lastUpdated || initialWhitelist.lastUpdated,
        };
      }
    } catch (e) {
      console.warn('Không thể đọc whitelist từ localStorage:', e);
    }
    return initialWhitelist;
  });

  // Khôi phục và đồng bộ lại danh sách phân quyền từ file mã nguồn (whitelist.json)
  const resetWhitelistToDefault = useCallback(() => {
    localStorage.removeItem(STORAGE_WHITELIST_KEY);
    localStorage.setItem(STORAGE_WHITELIST_KEY, JSON.stringify(initialWhitelist));
    setWhitelist(initialWhitelist);
    return initialWhitelist;
  }, []);

  // Cập nhật và lưu Whitelist (đồng thời lưu localStorage và gửi tới dev server)
  const updateWhitelist = async (newWhitelist) => {
    const updated = {
      ...newWhitelist,
      lastUpdated: new Date().toISOString(),
    };
    setWhitelist(updated);
    localStorage.setItem(STORAGE_WHITELIST_KEY, JSON.stringify(updated));

    // Thử gửi lưu trực tiếp vào file src/data/whitelist.json thông qua Vite endpoint ở môi trường dev
    try {
      await fetch('/_api/save-whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      // Môi trường production tĩnh sẽ không có endpoint này, lưu vào state và localStorage là đủ
      console.log('Chạy trên môi trường tĩnh hoặc không có dev server endpoint');
    }

    return updated;
  };

  // Xác định Role của người dùng theo 4 cấp độ quy định
  const { role, isGuest, isUser, isDelegated, isSuperAdmin, canViewFullData } = useMemo(() => {
    if (!user || user.isGuest) {
      return {
        role: 'GUEST',
        isGuest: true,
        isUser: false,
        isDelegated: false,
        isSuperAdmin: false,
        canViewFullData: false,
      };
    }

    const email = (user.email || '').trim().toLowerCase();
    const defaultSuperAdmin = (initialWhitelist.superAdmin || 'chuyendoiso@ctump.edu.vn').trim().toLowerCase();
    const superAdminEmail = (whitelist.superAdmin || defaultSuperAdmin).trim().toLowerCase();
    const delegatedList = (whitelist.delegatedEmails || []).map((e) => e.trim().toLowerCase());

    // 1. View 3 (Super Admin): Tài khoản quản trị tối cao
    if (email === superAdminEmail) {
      return {
        role: 'SUPER_ADMIN',
        isGuest: false,
        isUser: false,
        isDelegated: false,
        isSuperAdmin: true,
        canViewFullData: true,
      };
    }

    // 2. View 3 (Delegated): Email có trong danh sách Whitelist
    if (delegatedList.includes(email)) {
      return {
        role: 'DELEGATED',
        isGuest: false,
        isUser: false,
        isDelegated: true,
        isSuperAdmin: false,
        canViewFullData: true,
      };
    }

    // 3. View 2 (User): Đăng nhập bằng Gmail có đuôi trường @ctump.edu.vn hoặc @student.ctump.edu.vn
    if (email.endsWith('@ctump.edu.vn') || email.endsWith('@student.ctump.edu.vn')) {
      return {
        role: 'USER',
        isGuest: false,
        isUser: true,
        isDelegated: false,
        isSuperAdmin: false,
        canViewFullData: false, // Chỉ xem dòng của chính mình
      };
    }

    // 4. Nếu là Gmail cá nhân (@gmail.com) nhưng không có trong Whitelist -> Cho phép xem ở chế độ User Thử Nghiệm
    return {
      role: 'USER',
      isGuest: false,
      isUser: true,
      isDelegated: false,
      isSuperAdmin: false,
      canViewFullData: false, // Xem chế độ User cá nhân
    };
  }, [user, whitelist]);

  // Kiểm tra xem Client ID đã được cấu hình hợp lệ chưa
  const isConfigured = Boolean(
    clientId &&
    clientId.trim() !== '' &&
    !clientId.includes('your_client_id') &&
    clientId.includes('.apps.googleusercontent.com')
  );

  // Cập nhật và lưu Client ID tùy biến
  const updateClientId = (newId) => {
    const trimmed = (newId || '').trim();
    setClientId(trimmed);
    if (trimmed) {
      localStorage.setItem(STORAGE_CLIENT_ID_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_CLIENT_ID_KEY);
    }
  };

  // Đăng nhập bằng Google Credential (JWT)
  const loginWithCredential = useCallback((credential) => {
    const payload = parseJwt(credential);
    if (!payload || !payload.email) {
      throw new Error('Không thể trích xuất thông tin người dùng từ Google Token.');
    }

    const email = payload.email.trim().toLowerCase();
    const defaultSuperAdmin = (initialWhitelist.superAdmin || 'chuyendoiso@ctump.edu.vn').trim().toLowerCase();
    const superAdminEmail = (whitelist.superAdmin || defaultSuperAdmin).trim().toLowerCase();
    const delegatedList = (whitelist.delegatedEmails || []).map((e) => e.trim().toLowerCase());

    const isCtumpDomain = email.endsWith('@ctump.edu.vn') || email.endsWith('@student.ctump.edu.vn');
    const isSuperAdminUser = email === superAdminEmail;
    const isDelegatedUser = delegatedList.includes(email);

    const userData = {
      id: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture || '',
      hd: payload.hd || (isCtumpDomain ? 'ctump.edu.vn' : 'gmail.com'),
      loginAt: new Date().toISOString(),
      isGuest: false,
      isPersonalTestAccount: !isCtumpDomain && !isSuperAdminUser && !isDelegatedUser,
    };

    setUser(userData);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
    return userData;
  }, [whitelist]);

  // Chế độ đăng nhập xem trước (Khách thử nghiệm)
  const loginAsGuest = useCallback(() => {
    const guestUser = {
      id: 'guest_' + Date.now(),
      email: 'khach.demo@ctump.edu.vn',
      name: 'Khách Tham Quan (Demo)',
      picture: '',
      hd: 'ctump.edu.vn',
      loginAt: new Date().toISOString(),
      isGuest: true,
    };
    setUser(guestUser);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(guestUser));
    return guestUser;
  }, []);

  // Chức năng chuyển đổi tài khoản thử nghiệm nhanh (chỉ phục vụ thử nghiệm các View)
  const switchSimulatedUser = useCallback((simulatedEmail, simulatedName) => {
    const simulatedUser = {
      id: 'sim_' + Date.now(),
      email: simulatedEmail,
      name: simulatedName || simulatedEmail.split('@')[0],
      picture: '',
      hd: simulatedEmail.includes('@ctump.edu.vn') ? 'ctump.edu.vn' : '',
      loginAt: new Date().toISOString(),
      isGuest: false,
    };
    setUser(simulatedUser);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(simulatedUser));
  }, []);

  // Đăng xuất
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_USER_KEY);
    // Vô hiệu hóa tính năng tự động chọn tài khoản Google của GIS
    if (window.google?.accounts?.id?.disableAutoSelect) {
      window.google.accounts.id.disableAutoSelect();
    }
  }, []);

  const value = {
    user,
    isAuthenticated: Boolean(user && !user.isGuest),
    role,
    isGuest,
    isUser,
    isDelegated,
    isSuperAdmin,
    canViewFullData,
    whitelist,
    updateWhitelist,
    resetWhitelistToDefault,
    clientId,
    isConfigured,
    updateClientId,
    loginWithCredential,
    loginAsGuest,
    switchSimulatedUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
}
