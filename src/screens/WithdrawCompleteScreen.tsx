import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppHeaderHeight } from '../components/home';
import BuyerWithdrawComplete from '../../icon/buyer_withdraw_complete.svg';
import SellerWithdrawComplete from '../../icon/seller_withdraw_complete.svg';
import { colors } from '../theme';

interface WithdrawCompleteScreenProps {
  userType: 'buyer' | 'seller';
  onDone: () => void;
}

export function WithdrawCompleteScreen({ userType, onDone }: WithdrawCompleteScreenProps) {
  const insets = useSafeAreaInsets();
  const { topInset } = useAppHeaderHeight();
  const SvgComponent = userType === 'seller' ? SellerWithdrawComplete : BuyerWithdrawComplete;

  return (
    <View style={[s.container, { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={s.svgWrapper}>
        <SvgComponent width="100%" height="100%" preserveAspectRatio="xMidYMid meet" pointerEvents="none" />
        {/* 하단 확인 버튼 터치 오버레이 (402x786 기준: x: 16, y: 555-54=501, w: 370, h: 56) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="확인"
          hitSlop={16}
          style={({ pressed }) => [s.confirmButton, pressed && { opacity: 0.7 }]}
          onPress={onDone}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
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
  // 402 x 786 기준: left: 16/402 ≈ 4%, right: 4%, top: (555-54)/786 = 501/786 ≈ 63.7%, height: 56/786 ≈ 7.1%
  confirmButton: {
    position: 'absolute',
    left: '4%',
    right: '4%',
    top: '63.7%',
    height: '7.1%',
    zIndex: 100,
    elevation: 10,
    backgroundColor: 'rgba(0,0,0,0)',
  },
});
