import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, fonts, radius } from "../theme";
import ChevronLeftIcon from "../../icon/chevron_left.svg";
import ChevronRightIcon from "../../icon/chevron_right.svg";
import CoinsIcon from "../../icon/coins.svg";

const recycleIcon = require("../../assets/images/icon_recycle_green.png");
const locationIllustration = require("../../assets/images/illustration_location_coupon.png");

export type BenefitItem = {
  id: string;
  title: string;
  subtitle: string;
};

const exclusiveBenefits: BenefitItem[] = [
  {
    id: "ex1",
    title: "신규 가입자, 최대 70% 혜택",
    subtitle: "선물 쿠폰 + 결제 할인 받기",
  },
  {
    id: "ex2",
    title: "첫 결제 감사 5,000원 쿠폰",
    subtitle: "당일재고 & 시간대 자원 전용",
  },
  {
    id: "ex3",
    title: "친구 초대로 최대 10,000원",
    subtitle: "초대할 때마다 누적 할인 혜택",
  },
];

const monthlyBenefits: BenefitItem[] = [
  {
    id: "mo1",
    title: "친환경 자원순환 특별 혜택",
    subtitle: "빈 시간대 자원 예약 시 10% 추가 할인",
  },
  {
    id: "mo2",
    title: "8월 무더위 탈출 여름 쿠폰",
    subtitle: "숙박 및 모빌리티 15% 즉시 할인",
  },
  {
    id: "mo3",
    title: "오늘 마감 임박 푸드 특가",
    subtitle: "음식점 당일재고 3,000원 중복 쿠폰",
  },
];

export function CouponScreen({ onBack }: { onBack: () => void }) {
  const [showAllExclusive, setShowAllExclusive] = useState(false);
  const [showAllMonthly, setShowAllMonthly] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);

  const handleSelectBenefit = (title: string) => {
    setSelectedMessage(`'${title}' 혜택이 적용되었습니다!`);
    setTimeout(() => {
      setSelectedMessage(null);
    }, 2500);
  };

  return (
    <View style={s.container}>
      {/* Top Header */}
      <View style={s.header}>
        <Pressable hitSlop={12} onPress={onBack} style={s.backButton}>
          <ChevronLeftIcon width={24} height={24} color={colors.g900} />
        </Pressable>
        <Text style={s.headerTitle}>쿠폰 · 혜택</Text>
        <View style={s.headerRightPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Decorative Location Illustration Top Background */}
        <View style={s.topBgGraphic}>
          <Image source={locationIllustration} style={s.illustrationImage} resizeMode="contain" />
        </View>

        {selectedMessage ? (
          <View style={s.toastBanner}>
            <Text style={s.toastText}>{selectedMessage}</Text>
          </View>
        ) : null}

        {/* Section 1: 오직 로컬타임에서! */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>오직 로컬타임에서!</Text>
        </View>

        <View style={s.cardContainer}>
          {exclusiveBenefits.map((item, idx) => (
            <React.Fragment key={item.id}>
              <Pressable style={s.benefitRow} onPress={() => handleSelectBenefit(item.title)}>
                <View style={s.coinIconWrap}>
                  <CoinsIcon width={28} height={28} />
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
            <Text style={s.seeAllText}>
              {showAllExclusive ? "접기" : "전체 보기"}
            </Text>
          </Pressable>
        </View>

        {/* Section 2: 이 달의 할인 혜택 */}
        <View style={[s.sectionHeader, { marginTop: 32 }]}>
          <Text style={s.sectionTitle}>이 달의 할인 혜택</Text>
        </View>

        <View style={s.cardContainer}>
          {monthlyBenefits.map((item, idx) => (
            <React.Fragment key={item.id}>
              <Pressable style={s.benefitRow} onPress={() => handleSelectBenefit(item.title)}>
                <View style={s.recycleIconWrap}>
                  <Image source={recycleIcon} style={s.recycleImage} resizeMode="contain" />
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
            <Text style={s.seeAllText}>
              {showAllMonthly ? "접기" : "전체 보기"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F5F8",
  },
  header: {
    height: 54,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
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
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 48,
    position: "relative",
  },
  topBgGraphic: {
    position: "absolute",
    right: -10,
    top: -15,
    width: 260,
    height: 240,
    pointerEvents: "none",
  },
  illustrationImage: {
    width: "100%",
    height: "100%",
  },
  toastBanner: {
    backgroundColor: colors.g900,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  toastText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    fontWeight: "600",
    color: colors.white,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.black,
    letterSpacing: -0.3,
  },
  cardContainer: {
    backgroundColor: colors.white,
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    gap: 16,
  },
  coinIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#FFF3D6",
    alignItems: "center",
    justifyContent: "center",
  },
  recycleIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  recycleImage: {
    width: 38,
    height: 38,
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
