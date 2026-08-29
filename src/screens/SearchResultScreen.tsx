import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  AppHeader,
  BottomNavigation,
  Product,
  getBadgeInfo,
} from "../components/home";
import { colors, fonts, radius } from "../theme";
import { buyerApi, Product as ApiProduct, ProductCategory } from "../api";
import { apiProductToCard } from "./BuyerHomeScreen";
import ChevronLeftIcon from "../../icon/chevron_left.svg";
import ChevronDownIcon from "../../icon/chevron_down.svg";
import SearchIcon from "../../icon/search.svg";
import CloseIcon from "../../icon/x.svg";
import MapPinSolidIcon from "../../icon/map_pin_solid.svg";
import ArrowUpIcon from "../../icon/arrow_up.svg";

const searchCategories = ["전체", "음식점", "숙박", "체험", "렌탈/모빌리티"] as const;
type SearchCategory = (typeof searchCategories)[number];

const sortOptions = ["높은 할인율순", "AI 추천순", "마감임박순", "낮은 가격순", "가까운 거리순"] as const;
type SortOption = (typeof sortOptions)[number];

const categoryMap: Record<SearchCategory, ProductCategory | undefined> = {
  전체: undefined,
  음식점: "SAME_DAY_INVENTORY",
  숙박: "SAME_DAY_ROOM",
  체험: "TOUR_REMAINDER",
  "렌탈/모빌리티": "EMPTY_TIME_RESOURCE",
};

function getProductInsightTip(product: Product): string {
  if (product.insight && product.insight.trim()) {
    return product.insight;
  }
  const title = (product.title || "").toLowerCase();
  const detail = (product.detail || "").toLowerCase();
  const shop = (product.shop || "").toLowerCase();

  if (
    detail.includes("공실") ||
    detail.includes("숙박") ||
    shop.includes("호텔") ||
    shop.includes("게스트하우스") ||
    shop.includes("펜션") ||
    title.includes("숙박") ||
    title.includes("게스트하우스") ||
    title.includes("호텔") ||
    title.includes("커플룸")
  ) {
    return "당일 공실 특별 할인 · 2연박 이상 투숙 시 추가 할인";
  }

  if (
    detail.includes("재고") ||
    shop.includes("흑돼지") ||
    shop.includes("식당") ||
    shop.includes("집") ||
    title.includes("돼지") ||
    title.includes("갈치") ||
    title.includes("도시락") ||
    title.includes("감귤") ||
    title.includes("세트")
  ) {
    return "당일 재고 마감 임박 특가 · 수량 소진 시 조기 마감";
  }

  if (
    detail.includes("관광") ||
    detail.includes("체험") ||
    shop.includes("체험") ||
    title.includes("투어") ||
    title.includes("버스") ||
    title.includes("레저") ||
    title.includes("패키지")
  ) {
    return "제주 인기 체험 코스 · 마감 전 할인 혜택 적용 중";
  }

  if (
    detail.includes("자원") ||
    detail.includes("시간") ||
    title.includes("렌탈") ||
    title.includes("모빌리티")
  ) {
    return "빈 시간대 대여 자원 특별 할인가 적용 중";
  }

  return "당일 타임세일 상품 · 마감 전 파격 할인 혜택 적용";
}

const promoBanners = [
  require("../../assets/images/promo_newuser.jpg"),
  require("../../assets/images/promo_snack.jpg"),
];

export function SearchResultScreen({
  initialQuery = "바다",
  onBack,
  onSelectProduct,
  onHome,
  onMap,
  onPurchases,
  onLikes,
  onMyPage,
}: {
  initialQuery?: string;
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
  onHome?: () => void;
  onMap?: () => void;
  onPurchases?: () => void;
  onLikes?: () => void;
  onMyPage?: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<SearchCategory>("전체");
  const [sort, setSort] = useState<SortOption>("높은 할인율순");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);
  const [promoBannerSource] = useState(() => promoBanners[Math.floor(Math.random() * promoBanners.length)]);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setVisibleCount(10);

    const sortApiMap: Record<SortOption, any> = {
      "AI 추천순": "AI_RECOMMENDED",
      "마감임박순": "DEADLINE_ASC",
      "높은 할인율순": "DISCOUNT_DESC",
      "낮은 가격순": "PRICE_ASC",
      "가까운 거리순": "DISTANCE_ASC",
    };

    const q = query.trim();
    const qLower = q.toLowerCase();
    const isUrgentKey = qLower.includes("마감임박") || qLower.includes("마감");
    const isSoldOutKey =
      qLower.includes("품절임박") ||
      qLower.includes("매진임박") ||
      qLower.includes("품절") ||
      qLower.includes("매진");
    const isMaxDiscountKey =
      qLower.includes("최대할인") || qLower.includes("최대");
    const isSpecialKeyword = isUrgentKey || isSoldOutKey || isMaxDiscountKey;

    buyerApi
      .products({
        query: isSpecialKeyword ? undefined : q || undefined,
        category: categoryMap[category],
        sort: sortApiMap[sort],
        urgent: isUrgentKey ? true : undefined,
        size: 50,
      })
      .then((page) => {
        if (!active) return;
        let list = page.content.map(apiProductToCard);

        if (isUrgentKey) {
          list = list.filter(
            (p) =>
              p.urgent ||
              (p.deadlineAt !== undefined &&
                p.deadlineAt > Date.now() &&
                p.deadlineAt - Date.now() <= 60 * 60 * 1000)
          );
        } else if (isSoldOutKey) {
          list = list.filter(
            (p) =>
              p.soldOutUrgent ||
              (p.qty !== undefined && p.qty > 0 && p.qty < 5)
          );
        } else if (isMaxDiscountKey) {
          list = list.filter(
            (p) =>
              p.isMaxDiscount ||
              (p.minPrice !== undefined &&
                p.currentPrice !== undefined &&
                p.currentPrice <= p.minPrice)
          );
        }

        setProducts(list);
      })
      .catch(() => {
        if (!active) return;
        setProducts([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query, category, sort]);

  const handleSearchSubmit = () => {
    // Re-trigger search
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <View style={s.root}>
      {/* Header Search Bar Row */}
      <View style={s.headerRow}>
        <Pressable onPress={onBack} hitSlop={10} style={s.backButton}>
          <ChevronLeftIcon width={22} height={22} color={colors.black} />
        </Pressable>

        <View style={s.searchBarContainer}>
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearchSubmit}
            placeholder="지역명, 가게 이름, 키워드로 검색"
            placeholderTextColor={colors.g400}
            returnKeyType="search"
          />

          <Pressable onPress={handleSearchSubmit} hitSlop={8}>
            <SearchIcon width={20} height={20} color={colors.g700} />
          </Pressable>
        </View>
      </View>


      {/* Main Content Scroll View */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Sort Filter Header */}
        <View style={s.sortBarRow}>
          <Pressable
            style={s.sortTrigger}
            onPress={() => setSortMenuOpen((prev) => !prev)}
          >
            <Text style={s.sortTriggerText}>{sort}</Text>
            <ChevronDownIcon width={14} height={14} color={colors.g600} />
          </Pressable>

          {/* Sort Menu Dropdown */}
          {sortMenuOpen ? (
            <View style={s.sortMenu}>
              {sortOptions.map((opt) => (
                <Pressable
                  key={opt}
                  style={s.sortOptionItem}
                  onPress={() => {
                    setSort(opt);
                    setSortMenuOpen(false);
                  }}
                >
                  <Text
                    style={[
                      s.sortOptionText,
                      sort === opt && s.sortOptionTextSelected,
                    ]}
                  >
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {/* Product Items List & Banners */}
        {loading ? (
          <View style={s.loadingWrap}>
            <Text style={s.loadingText}>검색 결과를 불러오는 중입니다...</Text>
          </View>
        ) : products.length === 0 ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyTitle}>검색 결과가 없습니다.</Text>
            <Text style={s.emptyBody}>다른 검색어나 카테고리를 선택해보세요.</Text>
          </View>
        ) : (
          <View style={s.listWrap}>
            {products.slice(0, visibleCount).map((product, idx) => {
              const badgeInfo = getBadgeInfo(product);
              const showInsightBanner = idx === 1 || idx === 4 || idx === 7;
              const insightText = getProductInsightTip(product);
              const showCampingBanner = idx === 4;

              return (
                <React.Fragment key={product.id}>
                  <Pressable
                    style={s.productRow}
                    onPress={() => onSelectProduct(product)}
                  >
                    {/* Left Thumbnail */}
                    <View style={s.thumbWrap}>
                      {product.imageUrls?.[0] ? (
                        <Image
                          source={{ uri: product.imageUrls[0] }}
                          style={s.thumbImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={s.thumbFallback} />
                      )}
                    </View>

                    {/* Right Info */}
                    <View style={s.infoWrap}>
                      <View style={s.titleRow}>
                        <Text numberOfLines={1} style={s.productTitle}>
                          {product.title}
                        </Text>
                        {badgeInfo ? (
                          <View style={s.badgeWrap}>
                            <Text style={s.badgeText}>{badgeInfo.text}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={s.storeRow}>
                        <MapPinSolidIcon width={14} height={14} color={colors.g600} />
                        <Text numberOfLines={1} style={s.shopText}>
                          {product.shop}
                        </Text>
                      </View>

                      <View style={s.priceRow}>
                        <View style={s.discountBadge}>
                          <Text style={s.discountBadgeText}>
                            {product.discountRate ?? 0}%
                          </Text>
                        </View>
                        <Text style={s.priceText}>{product.price}</Text>
                        <Text style={s.originalText}>{product.original}</Text>
                      </View>
                    </View>
                  </Pressable>

                  {/* AI Insight Tip Banner */}
                  {showInsightBanner ? (
                    <View style={s.insightBanner}>
                      <Text style={s.insightBannerText}>{insightText}</Text>
                    </View>
                  ) : null}

                  {/* Promo Banner inserted mid list */}
                  {showCampingBanner ? (
                    <View style={s.promoBannerContainer}>
                      <Image
                        source={promoBannerSource}
                        style={s.promoBannerImage}
                        resizeMode="cover"
                      />
                    </View>
                  ) : null}

                  {idx < visibleCount - 1 && idx < products.length - 1 ? (
                    <View style={s.rowDivider} />
                  ) : null}
                </React.Fragment>
              );
            })}

            {visibleCount < products.length ? (
              <Pressable
                style={s.seeMoreButton}
                onPress={() => setVisibleCount((prev) => prev + 10)}
              >
                <Text style={s.seeMoreText}>
                  상품 더보기
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Floating Back-to-Top Button */}
      <Pressable style={s.scrollTopButton} onPress={scrollToTop} hitSlop={4}>
        <ArrowUpIcon width={20} height={20} color={colors.g700} />
      </Pressable>

      {/* Bottom Navigation */}
      <BottomNavigation
        active="home"
        onSelect={(t) => {
          if (t === "home") onHome?.();
          else if (t === "map") onMap?.();
          else if (t === "purchases") onPurchases?.();
          else if (t === "likes") onLikes?.();
          else if (t === "mypage") onMyPage?.();
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
  },
  backButton: {
    padding: 2,
  },
  searchBarContainer: {
    flex: 1,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.g100,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.g200,
    gap: 4,
  },
  tagChipText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.g700,
  },
  tagClose: {
    padding: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.black,
    padding: 0,
  },
  tabBarRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.g200,
    paddingHorizontal: 14,
  },
  tabItem: {
    paddingVertical: 12,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemSelected: {
    borderBottomColor: colors.black,
  },
  tabText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.g500,
  },
  tabTextSelected: {
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.black,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 80,
  },
  sortBarRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingVertical: 12,
    zIndex: 10,
    position: "relative",
  },
  sortTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sortTriggerText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.g600,
  },
  sortMenu: {
    position: "absolute",
    right: 0,
    top: 36,
    width: 120,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.g200,
    paddingVertical: 4,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    zIndex: 50,
  },
  sortOptionItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortOptionText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.g600,
  },
  sortOptionTextSelected: {
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.black,
  },
  loadingWrap: {
    paddingVertical: 60,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.g500,
  },
  emptyWrap: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.black,
  },
  emptyBody: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.g500,
  },
  listWrap: {
    gap: 12,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  thumbWrap: {
    width: 112,
    height: 112,
    borderRadius: radius.md,
    backgroundColor: colors.g100,
    overflow: "hidden",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbFallback: {
    flex: 1,
    backgroundColor: colors.g100,
  },
  infoWrap: {
    flex: 1,
    justifyContent: "center",
    gap: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  productTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.black,
    lineHeight: 20,
  },
  badgeWrap: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.primary500,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 11,
    fontFamily: fonts.semibold,
    fontWeight: "600",
    color: colors.white,
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  shopText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.g600,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  discountBadge: {
    width: 32,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.info,
    alignItems: "center",
    justifyContent: "center",
  },
  discountBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.white,
  },
  priceText: {
    fontSize: 16,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.info,
  },
  originalText: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.g600,
    textDecorationLine: "line-through",
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.g200,
    marginVertical: 4,
  },
  insightBanner: {
    backgroundColor: "#E8F3FF",
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: 6,
  },
  insightBannerText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.info,
  },
  promoBannerContainer: {
    marginHorizontal: -14,
    height: 96,
    marginVertical: 12,
    overflow: "hidden",
  },
  promoBannerImage: {
    width: "100%",
    height: "100%",
  },
  scrollTopButton: {
    position: "absolute",
    right: 16,
    bottom: 80,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors.g200,
    zIndex: 40,
  },
  seeMoreButton: {
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.g100,
    borderWidth: 1,
    borderColor: colors.g200,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 14,
  },
  seeMoreText: {
    fontSize: 13,
    fontFamily: fonts.semibold,
    fontWeight: "600",
    color: colors.g700,
  },
});
