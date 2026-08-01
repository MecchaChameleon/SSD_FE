import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppHeader, BottomNavigation, Product, getBadgeInfo } from "../components/home";
import { Chip } from "../components/ui";
import { colors, fonts, radius } from "../theme";
import { buyerApi } from "../api";
import { apiProductToCard } from "./BuyerHomeScreen";
import HeartIcon from "../../icon/heart.svg";
import MapPinSolidIcon from "../../icon/map_pin_solid.svg";

const filterCategories = ["전체", "음식점", "숙박", "체험", "렌탈 / 자원"] as const;
type FilterCategory = (typeof filterCategories)[number];

export function LikesScreen({
  onHome,
  onMap,
  onPurchases,
  onMyPage,
  onSelectProduct,
  showChrome=true,
}: {
  onHome: () => void;
  onMap: () => void;
  onPurchases: () => void;
  onMyPage: () => void;
  onSelectProduct: (product: Product) => void;
  showChrome?: boolean;
}) {
  const [items, setItems] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("전체");

  const refresh = useCallback(
    () =>
      buyerApi
        .wishlist({ size: 50 })
        .then((page) => setItems(page.content.map(apiProductToCard)))
        .catch(() => setItems([]))
        .finally(() => setLoaded(true)),
    [],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const unlike = async (id: number) => {
    setItems((v) => v.filter((item) => item.id !== id));
    try {
      await buyerApi.removeWishlist(id);
    } catch {
      void refresh();
    }
  };

  const clearCategoryWishlist = async () => {
    const idsToClear = filteredItems.map((x) => x.id);
    setItems((prev) => prev.filter((item) => !idsToClear.includes(item.id)));
    for (const id of idsToClear) {
      try {
        await buyerApi.removeWishlist(id);
      } catch {
        // ignore
      }
    }
  };

  const filteredItems = items.filter((item) => {
    if (selectedCategory === "전체") return true;
    if (selectedCategory === "음식점") return item.detail.includes("당일 재고") || item.shop.includes("식당") || item.shop.includes("카페");
    if (selectedCategory === "숙박") return item.detail.includes("당일 공실") || item.shop.includes("호텔") || item.shop.includes("펜션") || item.shop.includes("숙박");
    if (selectedCategory === "체험") return item.detail.includes("관광") || item.shop.includes("체험");
    if (selectedCategory === "렌탈 / 자원") return item.detail.includes("빈 시간대 자원") || item.shop.includes("렌탈");
    return true;
  });

  return (
    <View style={s.root}>
      {showChrome?<AppHeader />:null}

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Title Header Section */}
        <View style={s.headerSection}>
          <View style={s.titleRow}>
            <Text style={s.title}>찜한 상품</Text>
            <View style={s.badge}>
              <Text style={s.badgeText}>{items.length}</Text>
            </View>
          </View>
          <Text style={s.subtitle}>
            관심 있는 당일재고 및 빈 시간 자원을 확인하고 빠르게 구매해보세요.
          </Text>
        </View>

        {/* Category Filter Chips & Sub Bar */}
        {items.length > 0 ? (
          <View style={s.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsScroll}>
              {filterCategories.map((cat) => (
                <Chip
                  key={cat}
                  selected={selectedCategory === cat}
                  onPress={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Chip>
              ))}
            </ScrollView>
            {filteredItems.length > 0 ? (
              <View style={s.subBarRow}>
                <Text style={s.subCountText}>총 {filteredItems.length}개</Text>
                <Pressable style={s.clearButton} onPress={clearCategoryWishlist}>
                  <Text style={s.clearButtonText}>
                    {selectedCategory === "전체" ? "전체 삭제" : `${selectedCategory} 삭제`}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Main Content Area */}
        {!loaded ? null : filteredItems.length === 0 ? (
          <View style={s.emptyWrap}>
            <View style={s.emptyIconCircle}>
              <HeartIcon width={36} height={36} color={colors.primary500} fill={colors.primary500} />
            </View>
            <Text style={s.emptyTitle}>
              {items.length === 0 ? "찜한 상품이 없습니다." : "해당 카테고리의 찜한 상품이 없습니다."}
            </Text>
            <Text style={s.emptyBody}>
              {items.length === 0
                ? "마음에 드는 마감 임박 상품이나 자원을 찜하고 할인 혜택을 놓치지 마세요!"
                : "다른 카테고리를 선택하거나 전체 목록을 확인해보세요."}
            </Text>
            {items.length === 0 ? (
              <Pressable style={s.homeButton} onPress={onHome}>
                <Text style={s.homeButtonText}>인기 상품 둘러보기</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={s.listContainer}>
            {filteredItems.map((item, idx) => (
              <React.Fragment key={item.id}>
                <Pressable
                  style={s.listItemRow}
                  onPress={() => onSelectProduct(item)}
                >
                  {/* Left Square Thumbnail */}
                  <View style={s.thumbWrap}>
                    {item.imageUrls?.[0] ? (
                      <Image source={{ uri: item.imageUrls[0] }} style={s.thumbImage} resizeMode="cover" />
                    ) : (
                      <View style={s.thumbFallback} />
                    )}
                    <Pressable
                      accessibilityLabel="찜 해제"
                      hitSlop={8}
                      style={s.heartBadge}
                      onPress={(e) => {
                        e.stopPropagation();
                        unlike(item.id);
                      }}
                    >
                      <HeartIcon width={16} height={16} color={colors.primary500} fill={colors.primary500} />
                    </Pressable>
                  </View>

                {/* Right Item Info */}
                {(() => {
                  const badgeInfo = getBadgeInfo(item);

                  return (
                    <View style={s.info}>
                      <View style={s.titleRowText}>
                        <Text numberOfLines={1} style={s.listTitle}>
                          {item.title}
                        </Text>
                        {badgeInfo ? (
                          <View style={s.urgentBadge}>
                            <Text style={s.urgentBadgeText}>{badgeInfo.text}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={s.storeRow}>
                        <MapPinSolidIcon width={14} height={14} color={colors.g600} />
                        <Text numberOfLines={1} style={s.shopText}>
                          {item.shop}
                        </Text>
                      </View>

                      <View style={s.priceRow}>
                        <View style={s.discountBadge}>
                          <Text style={s.discountBadgeText}>{item.discountRate ?? 0}%</Text>
                        </View>
                        <Text style={s.priceText}>{item.price}</Text>
                        <Text style={s.originalText}>{item.original}</Text>
                      </View>
                    </View>
                  );
                })()}
                </Pressable>
                {idx < filteredItems.length - 1 ? <View style={s.rowDivider} /> : null}
              </React.Fragment>
            ))}
          </View>
        )}
      </ScrollView>

      {showChrome?<BottomNavigation
        active="likes"
        onSelect={(tab) =>
          tab === "home"
            ? onHome()
            : tab === "map"
            ? onMap()
            : tab === "purchases"
            ? onPurchases()
            : tab === "mypage"
            ? onMyPage()
            : undefined
        }
      />:null}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 96,
  },
  headerSection: {
    marginBottom: 16,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.black,
    letterSpacing: -0.3,
  },
  badge: {
    backgroundColor: colors.primary500,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.white,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.g600,
    lineHeight: 18,
  },
  filterContainer: {
    marginBottom: 16,
    gap: 8,
  },
  chipsScroll: {
    gap: 8,
    paddingRight: 14,
  },
  subBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginTop: 2,
  },
  subCountText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    fontWeight: "500",
    color: colors.g600,
  },
  clearButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  clearButtonText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    fontWeight: "500",
    color: colors.g500,
    textDecorationLine: "underline",
  },
  listContainer: {
    gap: 14,
  },
  listItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 4,
  },
  thumbWrap: {
    width: 112,
    height: 112,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.g100,
    position: "relative",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbFallback: {
    flex: 1,
    backgroundColor: colors.g100,
  },
  heartBadge: {
    position: "absolute",
    right: 6,
    top: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  info: {
    flex: 1,
    justifyContent: "center",
    gap: 8,
  },
  titleRowText: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  listTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.black,
    lineHeight: 20,
  },
  urgentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.primary500,
    alignSelf: "flex-start",
  },
  urgentBadgeText: {
    fontSize: 11,
    fontFamily: fonts.semibold,
    fontWeight: "600",
    color: colors.white,
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
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
    marginTop: 2,
  },
  discountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.info,
  },
  discountBadgeText: {
    fontSize: 11,
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
    color: colors.g500,
    textDecorationLine: "line-through",
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.g100,
  },
  emptyWrap: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: 56,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.g200,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#FFEBEE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    fontWeight: "700",
    color: colors.g900,
  },
  emptyBody: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.g600,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 260,
  },
  homeButton: {
    marginTop: 12,
    height: 44,
    paddingHorizontal: 24,
    backgroundColor: colors.primary500,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  homeButtonText: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    fontWeight: "600",
    color: colors.white,
  },
});
