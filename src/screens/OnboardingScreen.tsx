import React, { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppHeaderHeight } from '../components/home';
import { ActionButton } from '../components/ui';
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
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScroll}
        style={s.scrollView}
      >
        {PAGES.map(({ key, Component }) => (
          <View key={key} style={[s.pageContainer, { width: containerWidth }]}>
            <View style={s.pageSvgWrapper}>
              <Component width="100%" height="100%" preserveAspectRatio="xMidYMid meet" pointerEvents="none" />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 하단 고정 액션 버튼: 스와이프나 클릭 시 버튼이 밀려나지 않고 고정되어 있음 */}
      <View style={s.bottomBar}>
        <ActionButton onPress={handleNext}>
          {currentPage === PAGES.length - 1 ? '시작하기' : '다음'}
        </ActionButton>
      </View>
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
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
