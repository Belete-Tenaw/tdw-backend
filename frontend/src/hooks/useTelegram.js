import { useState, useEffect, useCallback } from 'react';

export function useTelegram() {
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (tg) {
            tg.ready();
            tg.expand();
            setIsReady(true);
        }
    }, [tg]);

    const isTMA = Boolean(tg && (tg.initData || (tg.platform && tg.platform !== 'unknown')));
    const user = tg?.initDataUnsafe?.user || null;
    const initData = tg?.initData || '';
    const colorScheme = tg?.colorScheme || 'light';
    const themeParams = tg?.themeParams || {};

    const onClose = useCallback(() => {
        if (tg) tg.close();
    }, [tg]);

    const triggerHaptic = useCallback((type = 'light') => {
        if (!tg?.HapticFeedback) return;
        try {
            if (['light', 'medium', 'heavy', 'rigid', 'soft'].includes(type)) {
                tg.HapticFeedback.impactOccurred(type);
            } else if (['error', 'success', 'warning'].includes(type)) {
                tg.HapticFeedback.notificationOccurred(type);
            } else if (type === 'selection') {
                tg.HapticFeedback.selectionChanged();
            }
        } catch (e) {
            console.debug('[TelegramHaptic] Error:', e);
        }
    }, [tg]);

    const showMainButton = useCallback((text, onClick) => {
        if (!tg?.MainButton) return;
        tg.MainButton.text = text;
        tg.MainButton.show();
        if (onClick) {
            tg.MainButton.onClick(onClick);
        }
    }, [tg]);

    const hideMainButton = useCallback(() => {
        if (tg?.MainButton) {
            tg.MainButton.hide();
        }
    }, [tg]);

    const showBackButton = useCallback((onClick) => {
        if (!tg?.BackButton) return;
        tg.BackButton.show();
        if (onClick) {
            tg.BackButton.onClick(onClick);
        }
    }, [tg]);

    const hideBackButton = useCallback(() => {
        if (tg?.BackButton) {
            tg.BackButton.hide();
        }
    }, [tg]);

    const openLink = useCallback((url, options = {}) => {
        if (tg?.openLink) {
            tg.openLink(url, options);
        } else {
            window.open(url, '_blank');
        }
    }, [tg]);

    const openTelegramLink = useCallback((url) => {
        if (tg?.openTelegramLink) {
            tg.openTelegramLink(url);
        } else {
            window.location.href = url;
        }
    }, [tg]);

    return {
        tg,
        isTMA,
        isReady,
        user,
        initData,
        colorScheme,
        themeParams,
        onClose,
        triggerHaptic,
        showMainButton,
        hideMainButton,
        showBackButton,
        hideBackButton,
        openLink,
        openTelegramLink
    };
}

export default useTelegram;
