import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from "react-native-svg";
import { colors, fonts, radius } from "../theme";
import { useAppHeaderHeight } from "../components/home";
import ChevronLeftIcon from "../../icon/chevron_left.svg";
import ChevronRightIcon from "../../icon/chevron_right.svg";

const locationIllustration = require("../../assets/images/illustration_location_coupon.png");
const iconClock   = require("../../assets/images/icon_coupon_clock.png");
const iconCoins   = require("../../assets/images/icon_coupon_coins.png");
const iconHouse   = require("../../assets/images/icon_coupon_house.png");
const iconWeather = require("../../assets/images/icon_coupon_weather.png");

export type BenefitItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
};

const exclusiveBenefits: BenefitItem[] = [
  {
    id: "ex1",
    title: "신규 가입자, 최대 70% 혜택",
    subtitle: "선물 쿠폰 + 결제 할인 받기",
    icon: iconCoins,
  },
  {
    id: "ex2",
    title: "AI가 찾은 제주 로컬 특가",
    subtitle: "내 주변의 할인 상품을 한눈에 확인하기",
    icon: iconClock,
  },
  {
    id: "ex3",
    title: "신규 입점 상품 특별 할인",
    subtitle: "새롭게 만나는 제주 로컬 상품 할인 받기",
    icon: iconHouse,
  },
];

const monthlyBenefits: BenefitItem[] = [
  {
    id: "mo1",
    title: "이번 달 마감딜 최대 50% 할인",
    subtitle: "제주 로컬 상품을 특별한 가격에!",
    icon: iconClock,
  },
  {
    id: "mo2",
    title: "여행객을 위한 제주 특별 혜택",
    subtitle: "다양한 할인 혜택 확인하기",
    icon: iconWeather,
  },
  {
    id: "mo3",
    title: "놓치면 아쉬운 이달의 특가",
    subtitle: "이번 달에만 만날 수 있는 할인 상품",
    icon: iconCoins,
  },
];

/** 연파랑 → 흰색 그라데이션 배경 (헤더 아래부터 시작) */
function GradientBg({ screenHeight, headerHeight }: { screenHeight: number; headerHeight: number }) {
  const { width } = useWindowDimensions();
  const gradH = screenHeight - headerHeight; // 헤더 아래부터
  return (
    <Svg
      width={width}
      height={gradH}
      style={[StyleSheet.absoluteFillObject, { top: headerHeight }]}
      pointerEvents="none"
    >
      <Defs>
        <SvgLinearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#E3EEF8" stopOpacity="1" />
          <Stop offset="0.22" stopColor="#F2F7FC" stopOpacity="1" />
          <Stop offset="0.48" stopColor="#FFFFFF" stopOpacity="1" />
        </SvgLinearGradient>
      </Defs>
      <Rect x="0" y="0" width={width} height={gradH} fill="url(#bgGrad)" />
    </Svg>
  );
}

export function CouponScreen({ onBack }: { onBack: () => void }) {
  const [showAllExclusive, setShowAllExclusive] = useState(false);
  const [showAllMonthly, setShowAllMonthly] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const { height: screenH } = useWindowDimensions();
  const { topInset } = useAppHeaderHeight();
  const headerHeight = 54 + topInset;

  const handleSelectBenefit = (title: string) => {
    setSelectedMessage(`'${title}' 혜택이 적용되었습니다!`);
    setTimeout(() => {
      setSelectedMessage(null);
    }, 2500);
  };

  return (
    <View style={s.container}>
      {/* 연파랑 → 흰색 그라데이션 배경 (헤더 아래부터) */}
      <GradientBg screenHeight={screenH} headerHeight={headerHeight} />

      {/* 헤더 */}
      <View style={[s.header, { paddingTop: topInset, height: headerHeight }]}>
        <Pressable hitSlop={12} onPress={onBack} style={s.backButton}>
          <ChevronLeftIcon width={24} height={24} color={colors.g900} />
        </Pressable>
        <Text style={s.headerTitle}>쿠폰 · 혜택</Text>
        <View style={s.headerRightPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 우측 상단 배경 일러스트 */}
        <Image
          source={locationIllustration}
          style={s.bgIllustration}
          resizeMode="contain"
        />

        {/* 상단 타이틀 영역 */}
        <View style={s.topTitleWrap}>
          <Text style={s.heroTitle}>오직 로컬타임에서!</Text>
        </View>

        {selectedMessage ? (
          <View style={s.toastBanner}>
            <Text style={s.toastText}>{selectedMessage}</Text>
          </View>
        ) : null}

        {/* 섹션 1 카드 */}
        <View style={s.cardContainer}>
          {exclusiveBenefits.map((item, idx) => (
            <React.Fragment key={item.id}>
              <Pressable style={s.benefitRow} onPress={() => handleSelectBenefit(item.title)}>
                <View style={s.iconWrap}>
                  <Image source={item.icon} style={s.iconImage} resizeMode="contain" />
                </View>
                <View style={s.benefitTextWrap}>
                  <Text style={s.benefitTitle}>{item.title}</Text>
                  <Text style={s.benefitSub}>{item.subtitle}</Text>
                </View>
                <ChevronRightIcon width={18} height={18} color={colors.g400} />
              </Pressable>
              {idx < exclusiveBenefits.length - 1 ? <View style={s.divider} /> : null}
            </React.Fragment>
          ))}
          <Pressable style={s.seeAllButton} onPress={() => setShowAllExclusive(!showAllExclusive)}>
            <Text style={s.seeAllText}>{showAllExclusive ? "접기" : "전체 보기"}</Text>
          </Pressable>
        </View>

        {/* 섹션 2 */}
        <View style={s.sectionHeader}>
          <Text style={s.heroTitle}>이달의 할인 혜택</Text>
        </View>

        <View style={s.cardContainer2}>
          {monthlyBenefits.map((item, idx) => (
            <React.Fragment key={item.id}>
              <Pressable style={s.benefitRow} onPress={() => handleSelectBenefit(item.title)}>
                <View style={s.iconWrap}>
                  <Image source={item.icon} style={s.iconImage} resizeMode="contain" />
                </View>
                <View style={s.benefitTextWrap}>
                  <Text style={s.benefitTitle}>{item.title}</Text>
                  <Text style={s.benefitSub}>{item.subtitle}</Text>
                </View>
                <ChevronRightIcon width={18} height={18} color={colors.g400} />
              </Pressable>
              {idx < monthlyBenefits.length - 1 ? <View style={s.divider} /> : null}
            </React.Fragment>
          ))}
          <Pressable style={s.seeAllButton} onPress={() => setShowAllMonthly(!showAllMonthly)}>
            <Text style={s.seeAllText}>{showAllMonthly ? "접기" : "전체 보기"}</Text>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    height: 54,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.g200,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    justifyContent: "space-between",
    zIndex: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.black,
  },
  headerRightPlaceholder: {
    width: 36,
  },
  scrollContent: {
    paddingBottom: 56,
    position: "relative",
  },
  bgIllustration: {
    position: "absolute",
    right: -10,
    top: 0,
    width: 220,
    height: 200,
    pointerEvents: "none",
  },
  topTitleWrap: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 14,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.black,
    letterSpacing: -0.4,
  },
  toastBanner: {
    backgroundColor: colors.g900,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    alignItems: "center",
  },
  toastText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    fontWeight: "600",
    color: colors.white,
  },
  cardContainer: {
    backgroundColor: colors.white,
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 32,
    marginBottom: 14,
  },
  cardContainer2: {
    backgroundColor: colors.white,
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    gap: 16,
  },
  iconWrap: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  iconImage: {
    width: 54,
    height: 54,
  },
  benefitTextWrap: {
    flex: 1,
    gap: 4,
  },
  benefitTitle: {
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.black,
  },
  benefitSub: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.g500,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
  },
  seeAllButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#F5F5F5",
    marginTop: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.g500,
  },
});
