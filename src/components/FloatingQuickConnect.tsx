import React, { useState, useRef, useEffect } from 'react';
import { 
  Phone, 
  Globe, 
  Mail,
  Instagram
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WhatsAppIcon } from './icons/WhatsAppIcon';
import { TelegramIcon } from './icons/TelegramIcon';
import { FacebookIcon, MessengerIcon } from './icons/FacebookIcon';
import { XIcon } from './icons/XIcon';
import { FloatingContactConfig, FloatingContactChannel, FloatingContactPosition } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface FloatingQuickConnectProps {
  config?: FloatingContactConfig;
}

export const FloatingQuickConnect: React.FC<FloatingQuickConnectProps> = ({ config }) => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<any>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!config || config.enabled === false) {
    return null;
  }

  const enabledChannels = (config.channels || []).filter((ch) => ch.enabled && ch.value?.trim());
  if (enabledChannels.length === 0) {
    return null;
  }

  // Determine Primary Channel (Featured on front)
  let primaryChannel = enabledChannels.find(
    (ch) => ch.id === config.primaryChannelId || ch.isPrimary
  );
  if (!primaryChannel) {
    primaryChannel = enabledChannels[0];
  }

  // Secondary channels to display when expanded
  const secondaryChannels = enabledChannels.filter((ch) => ch.id !== primaryChannel?.id);

  // Determine screen corner positioning
  const position: FloatingContactPosition = config.position || 'bottom-right';

  const isTopPosition = position === 'top-right' || position === 'top-left';
  const isRightPosition = position === 'bottom-right' || position === 'top-right';

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-right':
        return 'bottom-6 right-6';
      case 'bottom-left':
        return 'bottom-6 left-6';
      case 'top-right':
        return 'top-24 right-6';
      case 'top-left':
        return 'top-24 left-6';
      default:
        return 'bottom-6 right-6';
    }
  };

  // Format link for each channel type
  const formatChannelUrl = (channel: FloatingContactChannel): string => {
    const val = channel.value.trim();
    if (!val) return '#';

    switch (channel.type) {
      case 'whatsapp': {
        const cleanNumber = val.replace(/[^\d+]/g, '').replace(/^\+/, '');
        return `https://wa.me/${cleanNumber}`;
      }
      case 'telegram':
      case 'telegram_group': {
        if (val.startsWith('http://') || val.startsWith('https://')) return val;
        const cleanUser = val.replace(/^@/, '');
        return `https://t.me/${cleanUser}`;
      }
      case 'facebook': {
        if (val.startsWith('http://') || val.startsWith('https://')) return val;
        return `https://facebook.com/${val.replace(/^@/, '')}`;
      }
      case 'messenger': {
        if (val.startsWith('http://') || val.startsWith('https://')) return val;
        return `https://m.me/${val.replace(/^@/, '')}`;
      }
      case 'phone': {
        return `tel:${val.replace(/[^\d+]/g, '')}`;
      }
      case 'instagram': {
        if (val.startsWith('http://') || val.startsWith('https://')) return val;
        return `https://instagram.com/${val.replace(/^@/, '')}`;
      }
      case 'x': {
        if (val.startsWith('http://') || val.startsWith('https://')) return val;
        return `https://x.com/${val.replace(/^@/, '')}`;
      }
      case 'email': {
        return `mailto:${val}`;
      }
      default: {
        if (!val.startsWith('http://') && !val.startsWith('https://')) {
          return `https://${val}`;
        }
        return val;
      }
    }
  };

  // Helper icons and brand styling
  const renderChannelIcon = (type: FloatingContactChannel['type']) => {
    switch (type) {
      case 'whatsapp':
        return <WhatsAppIcon className="w-7 h-7 text-white" />;
      case 'telegram':
      case 'telegram_group':
        return <TelegramIcon className="w-7 h-7 text-white -ml-0.5 mt-0.5" />;
      case 'facebook':
        return <FacebookIcon className="w-7 h-7 text-white" />;
      case 'messenger':
        return <MessengerIcon className="w-7 h-7 text-white" />;
      case 'phone':
        return <Phone className="w-6 h-6 text-white" />;
      case 'instagram':
        return <Instagram className="w-6 h-6 text-white" />;
      case 'x':
        return <XIcon className="w-5 h-5 text-white" />;
      case 'email':
        return <Mail className="w-6 h-6 text-white" />;
      default:
        return <Globe className="w-6 h-6 text-white" />;
    }
  };

  const getChannelBgClass = (channel: FloatingContactChannel): string => {
    if (channel.color) return '';
    switch (channel.type) {
      case 'whatsapp':
        return 'bg-[#25D366] hover:bg-[#20ba59] shadow-emerald-500/20';
      case 'telegram':
      case 'telegram_group':
        return 'bg-[#24A1DE] hover:bg-[#1f8fc4] shadow-sky-500/20';
      case 'facebook':
        return 'bg-[#1877F2] hover:bg-[#166fe5] shadow-blue-500/20';
      case 'messenger':
        return 'bg-[#0084FF] hover:bg-[#0077e6] shadow-blue-500/20';
      case 'phone':
        return 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20';
      case 'instagram':
        return 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:opacity-95 shadow-pink-500/20';
      case 'x':
        return 'bg-black hover:bg-neutral-900 text-white shadow-neutral-900/30';
      default:
        return 'bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500';
    }
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (enabledChannels.length > 1) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 350);
  };

  const handlePrimaryClick = (e: React.MouseEvent) => {
    // If only 1 channel, open directly
    if (enabledChannels.length === 1 && primaryChannel) {
      window.open(formatChannelUrl(primaryChannel), '_blank', 'noopener,noreferrer');
      return;
    }
    // If multiple channels: on click on mobile or desktop, toggle open or open primary if already open
    if (!isOpen) {
      e.preventDefault();
      setIsOpen(true);
    } else if (primaryChannel) {
      // If already open and user clicked the primary button, open primary link directly
      window.open(formatChannelUrl(primaryChannel), '_blank', 'noopener,noreferrer');
    }
  };

  const primaryTitle = language === 'ar' ? primaryChannel.titleAr : primaryChannel.titleEn;

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed z-50 flex flex-col items-center select-none ${getPositionClasses()}`}
    >
      {/* Expanded Secondary Channels: Emerging smoothly with spring animation from behind primary button */}
      <AnimatePresence>
        {isOpen && secondaryChannels.length > 0 && (
          <div 
            className={`flex flex-col gap-3 ${
              isTopPosition ? 'order-2 mt-3' : 'order-1 mb-3'
            }`}
          >
            {secondaryChannels.map((channel, index) => {
              const title = language === 'ar' ? channel.titleAr : channel.titleEn;
              const bgClass = getChannelBgClass(channel);
              const distanceToPrimary = isTopPosition ? index : (secondaryChannels.length - 1 - index);
              const startY = isTopPosition ? -((distanceToPrimary + 1) * 28) : ((distanceToPrimary + 1) * 28);

              return (
                <motion.a
                  key={channel.id}
                  href={formatChannelUrl(channel)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={title || channel.type}
                  onClick={() => setIsOpen(false)}
                  initial={{ opacity: 0, scale: 0.15, y: startY }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ 
                    opacity: 0, 
                    scale: 0.15, 
                    y: startY, 
                    transition: { duration: 0.16, ease: 'easeIn' } 
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 24,
                    mass: 0.7,
                    delay: distanceToPrimary * 0.05
                  }}
                  whileHover={{ scale: 1.12, transition: { duration: 0.15 } }}
                  whileTap={{ scale: 0.92 }}
                  className={`relative group w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl cursor-pointer border-2 border-white dark:border-slate-800 ${bgClass}`}
                  style={channel.color ? { backgroundColor: channel.color } : undefined}
                  aria-label={title || channel.type}
                >
                  {/* Authentic Full Icon Perfectly Centered */}
                  {renderChannelIcon(channel.type)}

                  {/* Minimal Label Tag on Hover (Sleek pill on the side, always towards screen center) */}
                  <span className={`absolute top-1/2 -translate-y-1/2 ${isRightPosition ? 'right-16' : 'left-16'} hidden md:group-hover:inline-flex items-center px-3 py-1 rounded-xl bg-slate-900/95 dark:bg-white text-white dark:text-slate-950 text-xs font-bold shadow-lg whitespace-nowrap pointer-events-none transition-all`}>
                    {title}
                  </span>
                </motion.a>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Primary Floating Action Button (Always Visible, full w-14 h-14 circular button) */}
      <div className={`relative ${isTopPosition ? 'order-1' : 'order-2'}`}>
        <motion.button
          type="button"
          onClick={handlePrimaryClick}
          aria-label={primaryTitle}
          title={primaryTitle}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          animate={{ scale: isOpen ? 1.04 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={`relative group w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl cursor-pointer border-2 border-white dark:border-slate-800 ${getChannelBgClass(primaryChannel)}`}
          style={primaryChannel.color ? { backgroundColor: primaryChannel.color } : undefined}
        >
          {/* Authentic Full Icon Perfectly Centered */}
          {renderChannelIcon(primaryChannel.type)}

          {/* Badge indicator when multiple channels exist and menu is closed */}
          {enabledChannels.length > 1 && !isOpen && (
            <span 
              className={`absolute -top-1 ${isRightPosition ? '-left-1' : '-right-1'} w-5 h-5 rounded-full bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-[10px] font-black flex items-center justify-center shadow-md border border-white/40`}
              title={`${enabledChannels.length} ${language === 'ar' ? 'وسائل تواصل' : 'channels'}`}
            >
              +{secondaryChannels.length}
            </span>
          )}

          {/* Minimal Side Tag on Hover */}
          <span className={`absolute top-1/2 -translate-y-1/2 ${isRightPosition ? 'right-16' : 'left-16'} hidden md:group-hover:inline-flex items-center px-3 py-1 rounded-xl bg-slate-900/95 dark:bg-white text-white dark:text-slate-950 text-xs font-bold shadow-lg whitespace-nowrap pointer-events-none transition-all`}>
            {primaryTitle}
          </span>
        </motion.button>
      </div>
    </div>
  );
};

