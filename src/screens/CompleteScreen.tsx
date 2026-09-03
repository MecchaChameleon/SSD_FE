import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppHeaderHeight } from '../components/home';
import BuyerSignupComplete from '../../icon/buyer_signup_complete.svg';
import SellerSignupComplete from '../../icon/seller_signup_complete.svg';
import { authApi } from '../api';
import { CachedUser, USER_CACHE_KEY, readCache } from '../cache/appCache';
import { colors } from '../theme';

export function CompleteScreen({
  name: propName,
  userType,
  onStart,
}: {
  name: string;
  userType: 'buyer' | 'seller';
  onStart: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { topInset } = useAppHeaderHeight();
  const SvgComponent = userType === 'seller' ? SellerSignupComplete : BuyerSignupComplete;
  const [nickname, setNickname] = useState(propName);

  useEffect(() => {
    if (propName && propName !== '로컬이') {
      setNickname(propName);
      return;
    }
    readCache<CachedUser>(USER_CACHE_KEY).then(user => {
      if (user?.nickname && user.nickname !== '로컬이') {
        setNickname(user.nickname);
      }
    });
    authApi.me().then(me => {
      if (me?.nickname) {
        setNickname(me.nickname);
      }
    }).catch(() => undefined);
  }, [propName]);

  const cleanName = (nickname || '').trim();
  const displayName = cleanName
    ? cleanName.endsWith('님') ? cleanName : `${cleanName}님`
    : '로컬이님';

  return (
    <View style={[s.root, { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={s.svgWrapper}>
        <SvgComponent width="100%" height="100%" preserveAspectRatio="xMidYMid meet" pointerEvents="none" />
        <Text style={s.welcomeTitle} numberOfLines={1} adjustsFontSizeToFit>
          {displayName}, 환영합니다!
        </Text>
        {/* 하단 '시작하기' 버튼 터치 오버레이 (402x786 기준: x: 16, y: 559-54=505, w: 370, h: 56) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="시작하기"
          hitSlop={16}
          style={({ pressed }) => [s.startButton, pressed && { opacity: 0.7 }]}
          onPress={onStart}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgWrapper: {
    width: '100%',
    maxHeight: '100%',
    aspectRatio: 402 / 786,
    maxWidth: 430,
    position: 'relative',
    transform: [{ translateY: 24 }],
  },
  welcomeTitle: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: '42.7%',
    textAlign: 'center',
    fontSize: 19,
    fontWeight: '700',
    color: colors.black,
  },
  // 402 x 786 기준: left: 16/402 ≈ 4%, right: 4%, top: (559-54)/786 = 505/786 ≈ 64.2%, height: 56/786 ≈ 7.1%
  startButton: {
    position: 'absolute',
    left: '4%',
    right: '4%',
    top: '64.2%',
    height: '7.1%',
    zIndex: 100,
    elevation: 10,
    backgroundColor: 'rgba(0,0,0,0)',
  },
});
