import React, { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppHeaderHeight } from '../components/home';
import OnboardingPage1 from '../../icon/onboarding_page1.svg';
import OnboardingPage2 from '../../icon/onboarding_page2.svg';
import OnboardingPage3 from '../../icon/onboarding_page3.svg';

const PAGES = [
  { key: 'page1', Component: OnboardingPage1 },
  { key: 'page2', Component: OnboardingPage2 },
  { key: 'page3', Component: OnboardingPage3 },
];

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { topInset } = useAppHeaderHeight();
  const [currentPage, setCurrentPage] = useState(0);
  const [containerWidth, setContainerWidth] = useState(Dimensions.get('window').width);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (containerWidth <= 0) return;
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / containerWidth);
    if (pageIndex !== currentPage && pageIndex >= 0 && pageIndex < PAGES.length) {
      setCurrentPage(pageIndex);
    }
  };

  const handleNext = () => {
    if (currentPage < PAGES.length - 1) {
      const nextIndex = currentPage + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * containerWidth, animated: true });
      setCurrentPage(nextIndex);
    } else {
      onDone();
    }
  };

  return (
    <View
      style={[s.root, { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 16) }]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && w !== containerWidth) {
          setContainerWidth(w);
        }
      }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={s.scrollView}
      >
        {PAGES.map(({ key, Component }, index) => (
          <View key={key} style={[s.pageContainer, { width: containerWidth }]}>
            <View style={s.pageSvgWrapper}>
              <Component width="100%" height="100%" preserveAspectRatio="xMidYMid meet" pointerEvents="none" />
              {/* 하단 '시작하기'/'다음' 버튼 터치 오버레이 (402x786 기준: x: 16, y: 784-54=730, w: 370, h: 56) */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={index === PAGES.length - 1 ? '시작하기' : '다음'}
                hitSlop={16}
                style={({ pressed }) => [s.buttonOverlay, pressed && { opacity: 0.7 }]}
                onPress={handleNext}
              />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  pageContainer: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageSvgWrapper: {
    width: '100%',
    maxHeight: '100%',
    aspectRatio: 402 / 786,
    maxWidth: 430,
    position: 'relative',
  },
  // 402 x 786 기준: left: 16/402 ≈ 4%, right: 4%, top: (784-54)/786 = 730/786 ≈ 92.9%, height: 56/786 ≈ 7.1%
  buttonOverlay: {
    position: 'absolute',
    left: '4%',
    right: '4%',
    top: '92.9%',
    height: '7.1%',
    zIndex: 100,
    elevation: 10,
    backgroundColor: 'rgba(0,0,0,0)',
  },
});
