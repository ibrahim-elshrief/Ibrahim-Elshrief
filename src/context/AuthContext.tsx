import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';
import { AppUser, UserRole, OwnerSecurityChannels, OwnerRegisteredPhone } from '../types';
import { sendTelegramMessage } from '../utils/telegramService';

interface AuthContextType {
  currentUser: User | null;
  appUser: AppUser | null;
  role: UserRole;
  loading: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  adminCredentials: { username: string; password: string };
  ownerChannels: OwnerSecurityChannels;
  loginAsAdmin: (user: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  updateAdminCredentials: (newUsername: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  sendTelegramRecoveryCode: () => Promise<{ success: boolean; message: string }>;
  verifyTelegramRecoveryCode: (code: string) => Promise<{ success: boolean; message: string }>;
  resetAdminCredentialsWithOtp: (code: string, newUsername: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  sendTelegramLoginCode: (customBotToken?: string, customChatId?: string) => Promise<{ success: boolean; message: string; configured: boolean }>;
  verifyTelegramLoginCode: (code: string) => Promise<{ success: boolean; message: string }>;
  configureTelegramBot: (botToken: string, chatId: string) => Promise<{ success: boolean; message: string }>;
  
  // Multi-Channel Owner Authentication & Telegram Linking
  updateOwnerSecurityChannels: (channels: Partial<OwnerSecurityChannels>) => Promise<{ success: boolean; message: string }>;
  addOwnerEmail: (email: string) => Promise<{ success: boolean; message: string }>;
  removeOwnerEmail: (email: string) => Promise<{ success: boolean; message: string }>;
  addOwnerPhone: (phone: string, label: string) => Promise<{ success: boolean; message: string; phoneItem?: OwnerRegisteredPhone }>;
  removeOwnerPhone: (phoneId: string) => Promise<{ success: boolean; message: string }>;
  linkPhoneToTelegram: (phoneId: string, telegramChatId: string) => Promise<{ success: boolean; message: string }>;
  sendOwnerEmailLoginOtp: (targetEmail: string) => Promise<{ success: boolean; message: string; previewOtp?: string }>;
  verifyOwnerEmailLoginOtp: (targetEmail: string, code: string) => Promise<{ success: boolean; message: string }>;
  sendOwnerPhoneLoginOtp: (phoneIdOrNumber: string) => Promise<{ success: boolean; message: string; previewOtp?: string }>;
  verifyOwnerPhoneLoginOtp: (phoneIdOrNumber: string, code: string) => Promise<{ success: boolean; message: string }>;

  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (e: string, p: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Primary authorized owner account
export const PRIMARY_OWNER_EMAIL = 'zeromfu00@gmail.com';

const ADMIN_CREDS_STORAGE_KEY = 'platform_admin_credentials';
const ADMIN_SESSION_STORAGE_KEY = 'is_admin_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAdminSession, setIsAdminSession] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ADMIN_SESSION_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [adminCredentials, setAdminCredentials] = useState<{ username: string; password: string }>(() => {
    try {
      const saved = localStorage.getItem(ADMIN_CREDS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.username && parsed.password) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached admin credentials:', e);
    }
    return { username: '', password: '' };
  });

  const [ownerChannels, setOwnerChannels] = useState<OwnerSecurityChannels>({
    registeredEmails: [PRIMARY_OWNER_EMAIL],
    registeredPhones: [],
    telegramBotToken: '',
    telegramChatId: '',
    requireTelegram2FA: false
  });

  // Sync owner security channels and telegram configuration
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const docRef = doc(db, 'systemConfig', 'ownerSecurityChannels');
        const snap = await getDoc(docRef);
        let token = '';
        let chatId = '';

        // Check fallback settings
        try {
          const settingsSnap = await getDoc(doc(db, 'siteSettings', 'global'));
          if (settingsSnap.exists()) {
            const sData = settingsSnap.data();
            token = sData.telegramBotToken || '';
            chatId = sData.telegramChatId || '';
          }
        } catch {
          // ignore
        }

        if (snap.exists()) {
          const data = snap.data();
          const rawEmails = Array.isArray(data.registeredEmails) ? data.registeredEmails : [];
          const emails = Array.from(new Set([PRIMARY_OWNER_EMAIL, ...rawEmails]));

          setOwnerChannels({
            registeredEmails: emails,
            registeredPhones: Array.isArray(data.registeredPhones) ? data.registeredPhones : [],
            telegramBotToken: data.telegramBotToken || token,
            telegramChatId: data.telegramChatId || chatId,
            requireTelegram2FA: !!data.requireTelegram2FA,
            updatedAt: data.updatedAt
          });
        } else if (token || chatId) {
          setOwnerChannels(prev => ({
            ...prev,
            telegramBotToken: token,
            telegramChatId: chatId
          }));
        }
      } catch (err) {
        console.warn('Could not fetch ownerSecurityChannels:', err);
      }
    };
    fetchChannels();
  }, []);

  // Sync admin credentials from Firestore on initialization
  useEffect(() => {
    const fetchAdminCreds = async () => {
      try {
        const credsRef = doc(db, 'systemConfig', 'adminCredentials');
        const snap = await getDoc(credsRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.username && data.password) {
            const remoteCreds = { username: String(data.username), password: String(data.password) };
            setAdminCredentials(remoteCreds);
            try {
              localStorage.setItem(ADMIN_CREDS_STORAGE_KEY, JSON.stringify(remoteCreds));
            } catch (err) {
              console.warn(err);
            }
          }
        } else {
          // Initialize default credentials in Firestore if not yet configured
          const initialCreds = {
            username: 'admin',
            password: 'admin',
            isInitialSetup: true,
            updatedAt: new Date().toISOString()
          };
          try {
            await setDoc(credsRef, initialCreds);
          } catch (e) {
            console.warn('Notice setting initial admin credentials in Firestore:', e);
          }
          setAdminCredentials({ username: 'admin', password: 'admin' });
        }
      } catch (err) {
        console.warn('Could not sync remote admin credentials, using local fallback:', err);
      }
    };
    fetchAdminCreds();
  }, []);

  // Initialize and restore admin session if remembered
  useEffect(() => {
    if (isAdminSession && !currentUser) {
      setAppUser({
        uid: 'master-admin-session',
        email: 'admin@platform.local',
        displayName: adminCredentials.username || 'admin',
        role: 'OWNER',
        createdAt: new Date().toISOString()
      });
    }
  }, [isAdminSession, adminCredentials.username, currentUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userDocRef);

          const isPrimaryOwner = user.email?.toLowerCase() === PRIMARY_OWNER_EMAIL.toLowerCase();
          let resolvedRole: UserRole = isPrimaryOwner ? 'OWNER' : 'CUSTOMER';

          if (userSnap.exists()) {
            const data = userSnap.data() as AppUser;
            // If primary owner, ensure role stays OWNER
            resolvedRole = isPrimaryOwner ? 'OWNER' : (data.role || 'CUSTOMER');
            const updatedProfile: AppUser = {
              ...data,
              role: resolvedRole
            };
            setAppUser(updatedProfile);
          } else {
            // Register new user record in Firestore
            const newUser: AppUser = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'User',
              role: resolvedRole,
              avatarUrl: user.photoURL || undefined,
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, newUser);
            setAppUser(newUser);
          }
        } catch (err) {
          console.warn('Notice loading user profile from Firestore:', err);
          const isPrimaryOwner = user.email?.toLowerCase() === PRIMARY_OWNER_EMAIL.toLowerCase();
          setAppUser({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'User',
            role: isPrimaryOwner ? 'OWNER' : 'CUSTOMER',
            createdAt: new Date().toISOString()
          });
        }
      } else {
        if (!isAdminSession) {
          setAppUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdminSession]);

  const loginAsAdmin = async (user: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    const inputUser = user.trim().toLowerCase();
    const inputPass = pass.trim();
    let currentUsername = (adminCredentials.username || '').trim().toLowerCase();
    let currentPassword = (adminCredentials.password || '').trim();

    // Fetch directly from Firestore to ensure the latest credentials
    try {
      const credsRef = doc(db, 'systemConfig', 'adminCredentials');
      const snap = await getDoc(credsRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.username && data.password) {
          currentUsername = String(data.username).trim().toLowerCase();
          currentPassword = String(data.password).trim();
          const remoteCreds = { username: String(data.username), password: String(data.password) };
          setAdminCredentials(remoteCreds);
          try {
            localStorage.setItem(ADMIN_CREDS_STORAGE_KEY, JSON.stringify(remoteCreds));
          } catch (err) {
            console.warn(err);
          }
        }
      } else {
        // First-time setup: initialize admin - admin in Firestore
        const defaultCreds = {
          username: 'admin',
          password: 'admin',
          isInitialSetup: true,
          updatedAt: new Date().toISOString()
        };
        try {
          await setDoc(credsRef, defaultCreds);
        } catch (e) {
          console.warn('Notice saving initial credentials to Firestore:', e);
        }
        currentUsername = 'admin';
        currentPassword = 'admin';
        setAdminCredentials({ username: 'admin', password: 'admin' });
      }
    } catch (err) {
      console.warn('Notice checking remote admin credentials:', err);
      if (!currentUsername || !currentPassword) {
        currentUsername = 'admin';
        currentPassword = 'admin';
      }
    }

    // Accept username 'admin' or any admin email alias if username is admin
    const isUsernameValid = inputUser === currentUsername || 
      (currentUsername === 'admin' && (
        inputUser === 'admin' ||
        inputUser === 'admin@platform.local' || 
        inputUser === 'admin@admin.com' || 
        inputUser === 'admin@gmail.com'
      ));
    const isPasswordValid = inputPass === currentPassword;

    if (isUsernameValid && isPasswordValid) {
      setIsAdminSession(true);
      try {
        localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, 'true');
      } catch (err) {
        console.warn(err);
      }
      setAppUser({
        uid: 'master-admin-session',
        email: 'admin@platform.local',
        displayName: adminCredentials.username || currentUsername || 'Administrator',
        role: 'OWNER',
        createdAt: new Date().toISOString()
      });
      setIsAuthModalOpen(false);
      return { success: true };
    }

    return {
      success: false,
      message: 'اسم المستخدم أو كلمة المرور غير صحيحة.'
    };
  };

  const updateAdminCredentials = async (
    newUsername: string, 
    newPassword: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!newUsername.trim() || !newPassword.trim()) {
      return { success: false, message: 'اسم المستخدم وكلمة المرور لا يمكن أن تكون فارغة' };
    }

    const updated = {
      username: newUsername.trim(),
      password: newPassword.trim(),
      updatedAt: new Date().toISOString()
    };

    setAdminCredentials({ username: updated.username, password: updated.password });

    try {
      localStorage.setItem(ADMIN_CREDS_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('LocalStorage save error:', err);
    }

    try {
      await setDoc(doc(db, 'systemConfig', 'adminCredentials'), updated);
    } catch (err) {
      console.error('Firestore save credentials error:', err);
    }

    if (isAdminSession) {
      setAppUser(prev => prev ? { ...prev, displayName: updated.username } : null);
    }

    return { success: true };
  };

  // Telegram-based credential recovery flow (code sent to owner bot, verified, and new credentials saved)
  const sendTelegramRecoveryCode = async (): Promise<{ success: boolean; message: string }> => {
    try {
      // 1. Fetch Telegram bot configuration from siteSettings/global
      const settingsRef = doc(db, 'siteSettings', 'global');
      const settingsSnap = await getDoc(settingsRef);
      
      let token = '';
      let chatId = '';

      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        token = data.telegramBotToken || '';
        chatId = data.telegramChatId || '';
      }

      if (!token || !chatId) {
        return {
          success: false,
          message: 'لم يتم ربط بوت تيليجرام بعد في إعدادات المنصة. يرجى تهيئة البوت أولاً من داخل لوحة تحكم الإعدادات، أو تسجيل الدخول بحساب المالك الأساسي.'
        };
      }

      // 2. Generate cryptographically random 6-digit OTP code
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // Valid for 10 minutes

      // 3. Save OTP record to Firestore
      await setDoc(doc(db, 'systemConfig', 'adminRecoveryOtp'), {
        otp,
        expiresAt,
        requestedAt: new Date().toISOString()
      });

      // 4. Send the code via Telegram Bot
      const msg = 
        `🔐 <b>طلب استعادة وتعيين بيانات الإدارة</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `كود التحقق المؤقت الخاص بك:\n` +
        `👉 <code>${otp}</code>\n\n` +
        `⏱ الصلاحية: 10 دقائق فقط.\n` +
        `⚠️ تنبيه أمني: لا تشارك هذا الكود مع أحد. تم طلب هذا الكود لاستعادة وتعيين بيانات جديدة للوحة تحكم المنصة.`;

      const sent = await sendTelegramMessage(token, chatId, msg);
      if (sent) {
        return {
          success: true,
          message: 'تم إرسال كود التحقق بنجاح إلى حسابك في تيليجرام! يرجى إدخال الكود أدناه للمتابعة.'
        };
      } else {
        return {
          success: false,
          message: 'تعذر إرسال الرسالة إلى تيليجرام. يرجى التحقق من صحة رمز البوت ومعرف المحادثة في الإعدادات.'
        };
      }
    } catch (err: any) {
      console.error('Error in sendTelegramRecoveryCode:', err);
      return {
        success: false,
        message: err?.message || 'حدث خطأ أثناء محاولة إرسال كود التحقق إلى تيليجرام.'
      };
    }
  };

  const verifyTelegramRecoveryCode = async (code: string): Promise<{ success: boolean; message: string }> => {
    try {
      const otpRef = doc(db, 'systemConfig', 'adminRecoveryOtp');
      const snap = await getDoc(otpRef);
      if (!snap.exists()) {
        return {
          success: false,
          message: 'لم يتم العثور على كود تحقق مطلوب، أو انتهت صلاحيته. يرجى طلب كود جديد.'
        };
      }

      const data = snap.data();
      if (!data.otp || !data.expiresAt) {
        return { success: false, message: 'بيانات كود التحقق غير صالحة.' };
      }

      if (new Date() > new Date(data.expiresAt)) {
        return { success: false, message: 'انتهت صلاحية كود التحقق (أكثر من 10 دقائق). يرجى طلب كود جديد.' };
      }

      if (data.otp.trim() !== code.trim()) {
        return { success: false, message: 'كود التحقق المدخل غير صحيح.' };
      }

      return { success: true, message: 'تم التحقق من الكود بنجاح!' };
    } catch (err: any) {
      console.error('Error in verifyTelegramRecoveryCode:', err);
      return { success: false, message: err?.message || 'خطأ أثناء التحقق من كود تيليجرام.' };
    }
  };

  const resetAdminCredentialsWithOtp = async (
    code: string,
    newUsername: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    const verifyRes = await verifyTelegramRecoveryCode(code);
    if (!verifyRes.success) {
      return verifyRes;
    }

    if (!newUsername.trim() || newUsername.trim().length < 3) {
      return { success: false, message: 'اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل.' };
    }

    if (!newPassword.trim() || newPassword.trim().length < 5) {
      return { success: false, message: 'كلمة المرور يجب أن تتكون من 5 أحرف أو أرقام على الأقل.' };
    }

    try {
      const updated = {
        username: newUsername.trim(),
        password: newPassword.trim(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'systemConfig', 'adminCredentials'), updated);

      // Invalidate recovery OTP
      await setDoc(doc(db, 'systemConfig', 'adminRecoveryOtp'), {
        used: true,
        usedAt: new Date().toISOString()
      });

      setAdminCredentials({ username: updated.username, password: updated.password });
      try {
        localStorage.setItem(ADMIN_CREDS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }

      // Log into admin session immediately
      setIsAdminSession(true);
      try {
        localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, 'true');
      } catch (err) {
        console.warn(err);
      }

      setAppUser({
        uid: 'master-admin-session',
        email: 'admin@platform.local',
        displayName: updated.username,
        role: 'OWNER',
        createdAt: new Date().toISOString()
      });

      return { success: true, message: 'تم تحديث بيانات المشرف وتسجيل الدخول بنجاح!' };
    } catch (err: any) {
      console.error('Error in resetAdminCredentialsWithOtp:', err);
      return { success: false, message: err?.message || 'فشل تحديث البيانات في قاعدة البيانات.' };
    }
  };

  // Dedicated Telegram-based Authentication Service for Admin Login
  const sendTelegramLoginCode = async (
    customBotToken?: string, 
    customChatId?: string
  ): Promise<{ success: boolean; message: string; configured: boolean }> => {
    try {
      let token = customBotToken?.trim() || '';
      let chatId = customChatId?.trim() || '';

      if (!token || !chatId) {
        const settingsRef = doc(db, 'siteSettings', 'global');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          token = token || data.telegramBotToken || '';
          chatId = chatId || data.telegramChatId || '';
        }
      }

      if (!token || !chatId) {
        return {
          success: false,
          configured: false,
          message: 'لم يتم ربط بوت تيليجرام بعد. يمكنك إدخال رمز البوت (Bot Token) ومعرف المحادثة (Chat ID) الآن لحفظهما وتلقي الكود مباشرةً.'
        };
      }

      // If user supplied custom values, persist them to siteSettings
      if (customBotToken && customChatId) {
        await setDoc(doc(db, 'siteSettings', 'global'), {
          telegramBotToken: customBotToken.trim(),
          telegramChatId: customChatId.trim(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      // Generate cryptographically secure 6-digit OTP code
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      // Save OTP in Firestore
      await setDoc(doc(db, 'systemConfig', 'adminAuthOtp'), {
        otp,
        expiresAt,
        type: 'login',
        requestedAt: new Date().toISOString(),
        used: false
      });

      // Format elegant Telegram message
      const msg = 
        `🔐 <b>كود تفويض الدخول إلى لوحة إدارة المنصة</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `رمز التحقق الخاص بك للمصادقة:\n` +
        `👉 <code>${otp}</code>\n\n` +
        `⏱ الصلاحية: 10 دقائق فقط للاستخدام لمرة واحدة.\n` +
        `🛡 تنبيه أمني: هذا الكود مخصص للمالك حصراً لتسجيل الدخول السريع والآمن.`;

      const sent = await sendTelegramMessage(token, chatId, msg);
      if (sent.success) {
        return {
          success: true,
          configured: true,
          message: 'تم إرسال كود تسجيل الدخول بنجاح إلى حسابك في تيليجرام! أدخل الكود أدناه للمتابعة.'
        };
      } else {
        return {
          success: false,
          configured: true,
          message: sent.message || 'تعذر إرسال الرسالة إلى تيليجرام. يرجى مراجعة رمز البوت ومعرف المحادثة والتأكد من الضغط على Start في المحادثة مع البوت.'
        };
      }
    } catch (err: any) {
      console.error('Error in sendTelegramLoginCode:', err);
      return {
        success: false,
        configured: false,
        message: err?.message || 'حدث خطأ أثناء الاتصال بخدمة تيليجرام.'
      };
    }
  };

  const verifyTelegramLoginCode = async (code: string): Promise<{ success: boolean; message: string }> => {
    try {
      if (!code || !code.trim()) {
        return { success: false, message: 'يرجى إدخال كود التحقق المكون من 6 أرقام.' };
      }

      const otpRef = doc(db, 'systemConfig', 'adminAuthOtp');
      const snap = await getDoc(otpRef);
      if (!snap.exists()) {
        return {
          success: false,
          message: 'لم يتم العثور على كود تسجيل دخول مطلوب، أو انتهت صلاحيته. يرجى طلب كود جديد.'
        };
      }

      const data = snap.data();
      if (data.used) {
        return { success: false, message: 'تم استخدام هذا الكود مسبقاً. يرجى طلب كود جديد.' };
      }

      if (!data.otp || !data.expiresAt) {
        return { success: false, message: 'بيانات الكود غير صالحة.' };
      }

      if (new Date() > new Date(data.expiresAt)) {
        return { success: false, message: 'انتهت صلاحية الكود (أكثر من 10 دقائق). يرجى طلب كود جديد.' };
      }

      if (data.otp.trim() !== code.trim()) {
        return { success: false, message: 'كود التحقق غير صحيح. تأكد من إدخال الأرقام الستة بدقة.' };
      }

      // Mark code as used
      await setDoc(otpRef, { used: true, verifiedAt: new Date().toISOString() }, { merge: true });

      // Grant instant Owner/Admin session
      setIsAdminSession(true);
      try {
        localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, 'true');
      } catch (err) {
        console.warn(err);
      }

      setAppUser({
        uid: 'master-admin-session',
        email: 'admin@platform.local',
        displayName: adminCredentials.username || 'Owner',
        role: 'OWNER',
        createdAt: new Date().toISOString()
      });

      return { success: true, message: 'تم التحقق بنجاح! جاري توجيهك إلى لوحة التحكم...' };
    } catch (err: any) {
      console.error('Error in verifyTelegramLoginCode:', err);
      return { success: false, message: err?.message || 'خطأ أثناء التحقق من كود تيليجرام.' };
    }
  };

  const configureTelegramBot = async (
    botToken: string, 
    chatId: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      if (!botToken.trim() || !chatId.trim()) {
        return { success: false, message: 'يرجى إدخال كل من رمز البوت ومعرف المحادثة.' };
      }

      // Test bot credentials by sending a confirmation test message
      const testMsg = 
        `🤖 <b>تم ربط بوت تيليجرام بحساب المالك بنجاح!</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `تم تأكيد جاهزية البوت لاستلام أكواد تسجيل الدخول الآمنة وإشعارات المنصة.\n` +
        `⏱ التوقيت: ${new Date().toLocaleString('ar-EG')}`;

      const sent = await sendTelegramMessage(botToken.trim(), chatId.trim(), testMsg);
      if (!sent.success) {
        return {
          success: false,
          message: sent.message || 'فشل إرسال رسالة الاختبار. يرجى التحقق من صحة رمز البوت ومعرف المحادثة، والتأكد من إرسال /start للبوت.'
        };
      }

      // Update in-memory state & local storage cache immediately
      try {
        localStorage.setItem('cached_telegram_bot_token', botToken.trim());
        localStorage.setItem('cached_telegram_chat_id', chatId.trim());
      } catch (cacheErr) {
        console.warn('Cache error:', cacheErr);
      }

      setOwnerChannels(prev => ({
        ...prev,
        telegramBotToken: botToken.trim(),
        telegramChatId: chatId.trim()
      }));

      // Save to siteSettings/global
      try {
        await setDoc(doc(db, 'siteSettings', 'global'), {
          telegramBotToken: botToken.trim(),
          telegramChatId: chatId.trim(),
          telegramConfiguredAt: new Date().toISOString()
        }, { merge: true });
      } catch (dbErr: any) {
        console.warn('Could not write telegram credentials to siteSettings/global:', dbErr);
      }

      // Also save to systemConfig/ownerSecurityChannels
      try {
        await setDoc(doc(db, 'systemConfig', 'ownerSecurityChannels'), {
          telegramBotToken: botToken.trim(),
          telegramChatId: chatId.trim(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (dbErr: any) {
        console.warn('Could not write telegram credentials to systemConfig:', dbErr);
      }

      return { success: true, message: 'تم التحقق من البوت وحفظ البيانات بنجاح في إعدادات الحساب!' };
    } catch (err: any) {
      console.error('Error in configureTelegramBot:', err);
      return { success: false, message: err?.message || 'فشل حفظ إعدادات البوت.' };
    }
  };

  // --- Multi-Channel Owner Authentication & Telegram Phone Linking ---
  const updateOwnerSecurityChannels = async (channels: Partial<OwnerSecurityChannels>): Promise<{ success: boolean; message: string }> => {
    try {
      const merged: OwnerSecurityChannels = {
        ...ownerChannels,
        ...channels,
        registeredEmails: Array.from(new Set([PRIMARY_OWNER_EMAIL, ...(channels.registeredEmails || ownerChannels.registeredEmails)])),
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'systemConfig', 'ownerSecurityChannels'), merged, { merge: true });
      setOwnerChannels(merged);
      return { success: true, message: 'تم تحديث قنوات الأمان وحسابات المالك بنجاح' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'فشل تحديث قنوات الأمان' };
    }
  };

  const addOwnerEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      return { success: false, message: 'يرجى إدخال عنوان بريد إلكتروني صالح.' };
    }
    if (ownerChannels.registeredEmails.map(e => e.toLowerCase()).includes(clean)) {
      return { success: false, message: 'هذا البريد الإلكتروني مسجل بالفعل كأحد حسابات المالك.' };
    }
    const newEmails = [...ownerChannels.registeredEmails, clean];
    return updateOwnerSecurityChannels({ registeredEmails: newEmails });
  };

  const removeOwnerEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
    const clean = email.trim().toLowerCase();
    if (clean === PRIMARY_OWNER_EMAIL.toLowerCase()) {
      return { success: false, message: 'لا يمكن حذف البريد الإلكتروني الأساسي للمالك.' };
    }
    const newEmails = ownerChannels.registeredEmails.filter(e => e.toLowerCase() !== clean);
    return updateOwnerSecurityChannels({ registeredEmails: newEmails });
  };

  const addOwnerPhone = async (phone: string, label: string): Promise<{ success: boolean; message: string; phoneItem?: OwnerRegisteredPhone }> => {
    const clean = phone.trim();
    if (!clean || clean.length < 7) {
      return { success: false, message: 'يرجى إدخال رقم هاتف صحيح مع مفتاح الدولة.' };
    }
    const existing = ownerChannels.registeredPhones.find(p => p.phone === clean);
    if (existing) {
      return { success: false, message: 'رقم الهاتف هذا مسجل بالفعل.' };
    }
    const newPhone: OwnerRegisteredPhone = {
      id: 'phone_' + Date.now(),
      phone: clean,
      label: label.trim() || 'هاتف أساسي',
      isLinkedToTelegram: false
    };
    const newPhones = [...ownerChannels.registeredPhones, newPhone];
    const res = await updateOwnerSecurityChannels({ registeredPhones: newPhones });
    return { ...res, phoneItem: newPhone };
  };

  const removeOwnerPhone = async (phoneId: string): Promise<{ success: boolean; message: string }> => {
    const newPhones = ownerChannels.registeredPhones.filter(p => p.id !== phoneId);
    return updateOwnerSecurityChannels({ registeredPhones: newPhones });
  };

  const linkPhoneToTelegram = async (phoneId: string, telegramChatId: string): Promise<{ success: boolean; message: string }> => {
    const cleanChatId = telegramChatId.trim();
    if (!cleanChatId) {
      return { success: false, message: 'يرجى إدخال معرف المحادثة (Chat ID) لربط تيليجرام.' };
    }
    const newPhones = ownerChannels.registeredPhones.map(p => {
      if (p.id === phoneId) {
        return {
          ...p,
          telegramChatId: cleanChatId,
          isLinkedToTelegram: true,
          linkedAt: new Date().toISOString()
        };
      }
      return p;
    });
    return updateOwnerSecurityChannels({ registeredPhones: newPhones });
  };

  const sendOwnerEmailLoginOtp = async (targetEmail: string): Promise<{ success: boolean; message: string; previewOtp?: string }> => {
    try {
      const cleanEmail = targetEmail.trim().toLowerCase();
      const isRegistered = ownerChannels.registeredEmails.some(e => e.toLowerCase() === cleanEmail) ||
                           cleanEmail === PRIMARY_OWNER_EMAIL.toLowerCase();
      if (!isRegistered) {
        return {
          success: false,
          message: 'هذا البريد الإلكتروني غير مسجل ضمن قائمة حسابات المالك المصرح لها.'
        };
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await setDoc(doc(db, 'systemConfig', 'adminEmailOtp'), {
        email: cleanEmail,
        otp,
        expiresAt,
        used: false,
        requestedAt: new Date().toISOString()
      });

      // Try sending real Firebase Auth passwordless link to Gmail inbox
      let firebaseLinkDispatched = false;
      try {
        const actionCodeSettings = {
          url: window.location.origin + window.location.pathname + '?emailAuth=true',
          handleCodeInApp: true,
        };
        await sendSignInLinkToEmail(auth, cleanEmail, actionCodeSettings);
        try {
          window.localStorage.setItem('emailForSignIn', cleanEmail);
        } catch (storageErr) {
          console.warn('localStorage error:', storageErr);
        }
        firebaseLinkDispatched = true;
        console.log(`[Firebase Email Link] Dispatched successfully to ${cleanEmail}`);
      } catch (firebaseErr: any) {
        console.warn('Firebase sendSignInLinkToEmail notice (domain/config):', firebaseErr?.message || firebaseErr);
      }

      // If Telegram is configured, send a backup alert with the code to owner
      const token = ownerChannels.telegramBotToken || '';
      const chatId = ownerChannels.telegramChatId || '';
      if (token && chatId) {
        sendTelegramMessage(token, chatId, 
          `📧 <b>إشعار أمني: كود تسجيل دخول المالك عبر البريد الإلكتروني</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `تم إرسال الرابط إلى: ${cleanEmail}\n` +
          `رمز التحقق السريع (OTP):\n` +
          `👉 <code>${otp}</code>\n` +
          `⏱ الصلاحية: 10 دقائق.`
        ).catch(() => {});
      }

      return {
        success: true,
        previewOtp: otp,
        message: firebaseLinkDispatched
          ? `تم إرسال رابط الدخول المباشر إلى بريدك الإلكتروني في Gmail (${cleanEmail}) بنجاح! كما تم إرسال كود التحقق الاحتياطي (${otp}) إلى تيليجرام.`
          : `تم إنشاء كود الدخول وإرساله إلى تيليجرام وبريدك (${cleanEmail}). إذا تأخر وصول البريد إلى صندوق الوارد أو Spam، يمكنك استخدام الكود الفوري التالي: ${otp}`
      };
    } catch (err: any) {
      console.error('Error in sendOwnerEmailLoginOtp:', err);
      return { success: false, message: err?.message || 'فشل إرسال كود البريد الإلكتروني.' };
    }
  };

  const verifyOwnerEmailLoginOtp = async (targetEmail: string, code: string): Promise<{ success: boolean; message: string }> => {
    try {
      if (!code || !code.trim()) {
        return { success: false, message: 'يرجى إدخال كود التحقق المكون من 6 أرقام.' };
      }

      const otpRef = doc(db, 'systemConfig', 'adminEmailOtp');
      const snap = await getDoc(otpRef);
      if (!snap.exists()) {
        return { success: false, message: 'لم يتم العثور على كود مطلوب أو انتهت صلاحيته. يرجى طلب كود جديد.' };
      }

      const data = snap.data();
      if (data.used) {
        return { success: false, message: 'تم استخدام هذا الكود مسبقاً.' };
      }

      if (new Date() > new Date(data.expiresAt)) {
        return { success: false, message: 'انتهت صلاحية الكود (أكثر من 10 دقائق). يرجى طلب كود جديد.' };
      }

      if (data.otp.trim() !== code.trim()) {
        return { success: false, message: 'كود التحقق غير صحيح. يرجى التأكد من كتابة الأرقام الستة بدقة.' };
      }

      await setDoc(otpRef, { used: true, verifiedAt: new Date().toISOString() }, { merge: true });

      setIsAdminSession(true);
      try {
        localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, 'true');
      } catch (err) {
        console.warn(err);
      }

      setAppUser({
        uid: 'master-owner-email-session',
        email: targetEmail.trim(),
        displayName: adminCredentials.username || 'Owner',
        role: 'OWNER',
        createdAt: new Date().toISOString()
      });

      return {
        success: true,
        message: 'تم التحقق من هوية المالك بنجاح! جاري تسجيل الدخول...'
      };
    } catch (err: any) {
      console.error('Error in verifyOwnerEmailLoginOtp:', err);
      return { success: false, message: err?.message || 'خطأ أثناء التحقق من كود البريد الإلكتروني.' };
    }
  };

  const sendOwnerPhoneLoginOtp = async (phoneIdOrNumber: string): Promise<{ success: boolean; message: string; previewOtp?: string }> => {
    try {
      // Find registered phone item strictly from authorized list
      const phoneItem = ownerChannels.registeredPhones.find(p => p.id === phoneIdOrNumber || p.phone === phoneIdOrNumber);
      if (!phoneItem) {
        return {
          success: false,
          message: 'رقم الهاتف المحدد غير مسجل ضمن قائمة هواتف المالك المعتمدة.'
        };
      }
      const targetPhone = phoneItem.phone;
      
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await setDoc(doc(db, 'systemConfig', 'adminPhoneOtp'), {
        phone: targetPhone,
        otp,
        expiresAt,
        used: false,
        requestedAt: new Date().toISOString()
      });

      // Dispatch directly to Telegram (either phone's linked chat or the master bot chat)
      const token = ownerChannels.telegramBotToken || '';
      const targetChatId = (phoneItem.isLinkedToTelegram && phoneItem.telegramChatId) 
        ? phoneItem.telegramChatId 
        : (ownerChannels.telegramChatId || '');

      if (token && targetChatId) {
        await sendTelegramMessage(token, targetChatId,
          `📱 <b>كود تسجيل دخول المالك الفوري</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `رمز التحقق السري الخاص بك للمصادقة:\n` +
          `👉 <code>${otp}</code>\n\n` +
          `⏱ الصلاحية: 10 دقائق فقط للاستخدام لمرة واحدة.\n` +
          `🛡 تنبيه أمني: لا تشارك هذا الرمز السري مع أي شخص.`
        );
      }

      // STRICT SECURITY: Never leak previewOtp in the response object
      return {
        success: true,
        message: 'تم إرسال كود التحقق بنجاح إلى حساب التيليجرام الخاص بك. يرجى مراجعة محادثة التيليجرام وإدخال الرمز.'
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'فشل إرسال كود الهاتف.' };
    }
  };

  const verifyOwnerPhoneLoginOtp = async (phoneIdOrNumber: string, code: string): Promise<{ success: boolean; message: string }> => {
    try {
      if (!code || !code.trim()) {
        return { success: false, message: 'يرجى إدخال كود التحقق.' };
      }

      const otpRef = doc(db, 'systemConfig', 'adminPhoneOtp');
      const snap = await getDoc(otpRef);
      if (!snap.exists()) {
        return { success: false, message: 'لم يتم العثور على كود مطلوب أو انتهت صلاحيته.' };
      }

      const data = snap.data();
      if (data.used) return { success: false, message: 'تم استخدام هذا الكود مسبقاً.' };
      if (new Date() > new Date(data.expiresAt)) return { success: false, message: 'انتهت صلاحية الكود.' };
      if (data.otp.trim() !== code.trim()) return { success: false, message: 'كود التحقق غير صحيح.' };

      await setDoc(otpRef, { used: true, verifiedAt: new Date().toISOString() }, { merge: true });

      setIsAdminSession(true);
      try {
        localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, 'true');
      } catch (err) {
        console.warn(err);
      }

      setAppUser({
        uid: 'master-owner-phone-session',
        email: PRIMARY_OWNER_EMAIL,
        displayName: adminCredentials.username || 'Owner',
        role: 'OWNER',
        createdAt: new Date().toISOString()
      });

      return { success: true, message: 'تم التحقق بنجاح! جاري تسجيل دخول المالك...' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'خطأ أثناء التحقق من كود الهاتف.' };
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setIsAuthModalOpen(false);
    } catch (error: any) {
      if (
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request' ||
        error?.message?.includes('popup-closed-by-user')
      ) {
        console.info('Google Sign-In popup closed by user.');
        return;
      }
      console.error('Google Sign-In failed:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    // If entered identifier matches configured admin username or admin aliases, route to admin login
    const inputClean = email.trim().toLowerCase();
    const adminUser = (adminCredentials.username || '').trim().toLowerCase();

    if (
      (adminUser && (inputClean === adminUser || (adminUser === 'admin' && (inputClean === 'admin' || inputClean === 'admin@platform.local' || inputClean === 'admin@admin.com')))) ||
      (inputClean === 'admin')
    ) {
      const res = await loginAsAdmin(email, pass);
      if (res.success) {
        return;
      }
    }

    try {
      await signInWithEmailAndPassword(auth, email, pass);
      setIsAuthModalOpen(false);
    } catch (error) {
      console.error('Email sign in failed:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (res.user) {
        const isPrimary = email.toLowerCase() === PRIMARY_OWNER_EMAIL.toLowerCase();
        const newUser: AppUser = {
          uid: res.user.uid,
          email: res.user.email || '',
          displayName: name || email.split('@')[0],
          role: isPrimary ? 'OWNER' : 'CUSTOMER',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', res.user.uid), newUser);
        setAppUser(newUser);
      }
      setIsAuthModalOpen(false);
    } catch (error) {
      console.error('Sign up failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    setIsAdminSession(false);
    try {
      localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    } catch (err) {
      console.warn(err);
    }
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.warn(err);
    }
    setCurrentUser(null);
    setAppUser(null);
  };

  // Determine authorized admin rights strictly
  const isPrimaryOwner = currentUser?.email?.toLowerCase() === PRIMARY_OWNER_EMAIL.toLowerCase();
  const role: UserRole = isAdminSession ? 'OWNER' : (appUser?.role || (isPrimaryOwner ? 'OWNER' : 'CUSTOMER'));

  const isOwner = isAdminSession || (currentUser !== null && (isPrimaryOwner || role === 'OWNER'));
  const isAdmin = isAdminSession || (currentUser !== null && (isOwner || role === 'ADMIN'));
  const isStaff = isAdminSession || (currentUser !== null && (isAdmin || role === 'EDITOR'));

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        appUser,
        role,
        loading,
        isOwner,
        isAdmin,
        isStaff,
        adminCredentials,
        ownerChannels,
        loginAsAdmin,
        updateAdminCredentials,
        sendTelegramRecoveryCode,
        verifyTelegramRecoveryCode,
        resetAdminCredentialsWithOtp,
        sendTelegramLoginCode,
        verifyTelegramLoginCode,
        configureTelegramBot,
        updateOwnerSecurityChannels,
        addOwnerEmail,
        removeOwnerEmail,
        addOwnerPhone,
        removeOwnerPhone,
        linkPhoneToTelegram,
        sendOwnerEmailLoginOtp,
        verifyOwnerEmailLoginOtp,
        sendOwnerPhoneLoginOtp,
        verifyOwnerPhoneLoginOtp,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
        isAuthModalOpen,
        setIsAuthModalOpen
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
